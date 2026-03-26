import { DOWNLOAD_PREPARE_TIMEOUT_MS } from '../shared/constants';
import type { ConvertErrorMessage, DownloadUrlResultMessage, ExtensionMessage } from '../types/messages';
import { closeOffscreenDocument, ensureOffscreenDocument } from './offscreen-manager';

interface DownloadManagerDependencies {
  closeOffscreenDocument: () => Promise<void>;
  download: (options: chrome.downloads.DownloadOptions) => Promise<number | undefined>;
  ensureOffscreenDocument: () => Promise<void>;
  postMessage: (message: ExtensionMessage) => void;
  sendMessageWithResponse: <TResponse extends ExtensionMessage>(
    message: ExtensionMessage,
    timeoutMs: number
  ) => Promise<TResponse>;
}

const pendingOutputFilenames = new Map<string, string>();

export function consumeOutputFilename(url: string): string | undefined {
  const filename = pendingOutputFilenames.get(url);
  pendingOutputFilenames.delete(url);
  return filename;
}

export class ConvertedDownloadStartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConvertedDownloadStartError';
  }
}

export function createDownloadManager(dependencies: DownloadManagerDependencies) {
  async function prepareDownloadUrl(requestId: string, mimeType: string): Promise<string> {
    await dependencies.ensureOffscreenDocument();

    const response = await dependencies.sendMessageWithResponse<DownloadUrlResultMessage | ConvertErrorMessage>(
      { type: 'CREATE_DOWNLOAD_URL', requestId, mimeType },
      DOWNLOAD_PREPARE_TIMEOUT_MS
    );

    if (response.type === 'CONVERT_ERROR') {
      throw new Error(response.error);
    }

    return response.url;
  }

  async function startDownload(url: string, filename: string): Promise<number> {
    pendingOutputFilenames.set(url, filename);
    const downloadId = await dependencies.download({ url, filename, saveAs: false });
    if (downloadId === undefined) {
      pendingOutputFilenames.delete(url);
      throw new Error('Unable to start converted download');
    }

    return downloadId;
  }

  async function runConvertedDownloadAttempt(
    requestId: string,
    filename: string,
    mimeType: string
  ): Promise<number> {
    let preparedUrl: string | undefined;

    try {
      preparedUrl = await prepareDownloadUrl(requestId, mimeType);
      return await startDownload(preparedUrl, filename);
    } finally {
      if (preparedUrl) {
        dependencies.postMessage({ type: 'REVOKE_DOWNLOAD_URL', url: preparedUrl });
      }
    }
  }

  async function downloadConvertedPayload(
    requestId: string,
    filename: string,
    mimeType: string
  ): Promise<number> {
    try {
      return await runConvertedDownloadAttempt(requestId, filename, mimeType);
    } catch {
      try {
        await dependencies.closeOffscreenDocument();
      } catch {
        // Offscreen recreation is best effort only.
      }
    }

    try {
      return await runConvertedDownloadAttempt(requestId, filename, mimeType);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to start converted download';
      throw new ConvertedDownloadStartError(`Converted download startup failed after retry: ${detail}`);
    }
  }

  async function downloadOriginal(url: string, filename: string): Promise<number> {
    pendingOutputFilenames.set(url, filename);
    const downloadId = await dependencies.download({ url, filename, saveAs: false });

    if (downloadId === undefined) {
      pendingOutputFilenames.delete(url);
      throw new Error('Unable to start original download');
    }

    return downloadId;
  }

  return { downloadConvertedPayload, downloadOriginal };
}

function sendMessageWithResponse<TResponse extends ExtensionMessage>(
  message: ExtensionMessage,
  timeoutMs: number
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for offscreen response')), timeoutMs);

    chrome.runtime.sendMessage(message, (response: TResponse | undefined) => {
      clearTimeout(timer);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error('No offscreen response received'));
        return;
      }

      resolve(response);
    });
  });
}

function postMessage(message: ExtensionMessage): void {
  try {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // Revocation is best effort only.
  }
}

const downloadManager = createDownloadManager({
  closeOffscreenDocument,
  download: (options) => chrome.downloads.download(options),
  ensureOffscreenDocument,
  postMessage,
  sendMessageWithResponse,
});

export const downloadConvertedPayload = downloadManager.downloadConvertedPayload;
export const downloadOriginal = downloadManager.downloadOriginal;
