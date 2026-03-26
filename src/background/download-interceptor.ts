import { CONVERSION_TIMEOUT_MS, type OutputFormat } from '../shared/constants';
import {
  createRequestId,
  deriveSinglePhotoOutputFilename,
  zipToOutputFilename,
} from '../shared/utils';
import { createStatus } from '../shared/status';
import { deletePayloadPair, writePayload } from '../shared/payload-store';
import { ensureOffscreenDocument } from './offscreen-manager';
import {
  ConvertedDownloadStartError,
  consumeOutputFilename,
  downloadConvertedPayload,
  downloadOriginal,
} from './download-manager';
import { createSerializedCountUpdater, setLastStatus } from './state';
import {
  getInterceptKind,
  isExtensionOwnedDownload,
  isGooglePhotosDownload,
  isPermittedDownloadFetchUrl,
  type InterceptKind,
} from './download-rules';
import type {
  ConvertErrorMessage,
  ConvertResultMessage,
  ExtensionMessage,
  ZipResultMessage,
} from '../types/messages';

interface PendingIntercept {
  filename: string;
  kind: InterceptKind;
  outputFormat: OutputFormat;
  url: string;
}

const activeIntercepts = new Map<number, PendingIntercept>();
const incrementConvertedCount = createSerializedCountUpdater(chrome.storage.local);
let singlePhotoFallbackSequence = 0;

export function registerDownloadInterceptor(
  isEnabled: () => boolean,
  getOutputFormat: () => OutputFormat
): void {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    if (isExtensionOwnedDownload(item, chrome.runtime.id)) {
      const intendedFilename = consumeOutputFilename(item.url);
      suggest(intendedFilename ? { filename: intendedFilename } : undefined);
      return;
    }

    if (!isEnabled() || !isGooglePhotosDownload(item)) {
      suggest();
      return;
    }

    const interceptKind = getInterceptKind(item);
    if (!interceptKind) {
      suggest();
      return;
    }

    activeIntercepts.set(item.id, {
      filename: item.filename,
      kind: interceptKind,
      outputFormat: getOutputFormat(),
      url: item.finalUrl || item.url,
    });

    suggest();
    void cancelAndConvert(item.id);
  });
}

async function cancelAndConvert(downloadId: number): Promise<void> {
  const pending = activeIntercepts.get(downloadId);
  if (!pending) {
    return;
  }

  const cancelled = await cancelOriginalDownload(downloadId);
  if (!cancelled) {
    activeIntercepts.delete(downloadId);
    return;
  }

  try {
    await chrome.downloads.erase({ id: downloadId });
  } catch {
    // History cleanup is best effort only.
  }

  try {
    if (pending.kind === 'heic') {
      await handleSingleHeic(pending);
    } else {
      await handleBulkZip(pending);
    }
  } finally {
    activeIntercepts.delete(downloadId);
  }
}

async function handleSingleHeic(pending: PendingIntercept): Promise<void> {
  const requestId = createRequestId();

  await setLastStatus(createStatus('processing', 'Converting', `Converting ${pending.filename}...`));

  try {
    const response = await fetchInterceptSource(pending.url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const outputFilename = deriveSinglePhotoOutputFilename(
      response.headers.get('Content-Disposition'),
      pending.filename,
      pending.outputFormat,
      ++singlePhotoFallbackSequence
    );

    await writePayload('input', requestId, await response.arrayBuffer());
    await ensureOffscreenDocument();

    const result = await sendToOffscreenWithTimeout<ConvertResultMessage | ConvertErrorMessage>(
      { type: 'CONVERT_HEIC', requestId, filename: pending.filename, outputFormat: pending.outputFormat },
      CONVERSION_TIMEOUT_MS
    );

    if (result.type === 'CONVERT_ERROR') {
      throw new Error(result.error);
    }

    await downloadConvertedPayload(requestId, outputFilename, pending.outputFormat);
    await incrementConvertedCount(1);
    await setLastStatus(createStatus('success', 'Converted', `${pending.filename} -> ${outputFilename}`));
  } catch (error) {
    await recoverOriginalDownload(pending, error, getRecoveryTitle(pending.kind, error));
  } finally {
    await deletePayloadPair(requestId);
  }
}

async function handleBulkZip(pending: PendingIntercept): Promise<void> {
  const requestId = createRequestId();
  const outputFilename = zipToOutputFilename();

  await setLastStatus(
    createStatus('processing', 'Processing ZIP', `Converting HEIC files in ${pending.filename}...`)
  );

  try {
    const response = await fetchInterceptSource(pending.url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    await writePayload('input', requestId, await response.arrayBuffer());
    await ensureOffscreenDocument();

    const result = await sendToOffscreenWithTimeout<ZipResultMessage | ConvertErrorMessage>(
      { type: 'CONVERT_BULK_ZIP', requestId, filename: pending.filename, outputFormat: pending.outputFormat },
      CONVERSION_TIMEOUT_MS * 10
    );

    if (result.type === 'CONVERT_ERROR') {
      throw new Error(result.error);
    }

    await downloadConvertedPayload(requestId, outputFilename, 'application/zip');
    await incrementConvertedCount(result.stats.converted);

    const hasFailures = result.stats.skipped > 0;
    const statusTitle = hasFailures ? 'Partial conversion' : 'Bulk conversion complete';
    const detail =
      `${result.stats.converted} converted, ${result.stats.passthrough} kept` +
      (hasFailures ? `, ${result.stats.skipped} failed` : '');
    await setLastStatus(createStatus('success', statusTitle, detail));
  } catch (error) {
    await recoverOriginalDownload(pending, error, getRecoveryTitle(pending.kind, error));
  } finally {
    await deletePayloadPair(requestId);
  }
}

export async function recoverOriginalDownload(
  pending: PendingIntercept,
  error: unknown,
  title: string
): Promise<void> {
  let detail = error instanceof Error ? error.message : 'Unknown error';

  try {
    await downloadOriginal(pending.url, pending.filename);
    detail = `${detail} - original file downloaded`;
  } catch {
    detail = `${detail} - original redownload failed`;
  }

  await setLastStatus(createStatus('error', title, detail));
}

export function getRecoveryTitle(kind: InterceptKind, error: unknown): string {
  if (error instanceof ConvertedDownloadStartError) {
    return kind === 'zip' ? 'Converted ZIP download failed' : 'Converted download failed';
  }

  return kind === 'zip' ? 'Bulk conversion failed' : 'Conversion failed';
}

export async function fetchInterceptSource(
  url: string,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  if (!isPermittedDownloadFetchUrl(url)) {
    throw new Error('Download URL is outside the extension host permissions');
  }

  return fetchImpl(url);
}

async function cancelOriginalDownload(downloadId: number): Promise<boolean> {
  try {
    await chrome.downloads.cancel(downloadId);
  } catch {
    return false;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const [download] = await chrome.downloads.search({ id: downloadId });
    if (!download) {
      return true;
    }
    if (download.state === 'interrupted') {
      return true;
    }
    if (download.state === 'complete') {
      return false;
    }

    await sleep(25);
  }

  const [download] = await chrome.downloads.search({ id: downloadId });
  return download?.state !== 'complete';
}

function sendToOffscreenWithTimeout<TResponse extends ExtensionMessage>(
  message: ExtensionMessage,
  timeoutMs: number
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Conversion timed out')), timeoutMs);

    chrome.runtime.sendMessage(message, (response: TResponse | undefined) => {
      clearTimeout(timer);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error('No conversion response received'));
        return;
      }

      resolve(response);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
