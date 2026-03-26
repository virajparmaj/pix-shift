import { GOOGLEUSERCONTENT_PATTERN, USERCONTENT_PATTERN, CONVERSION_TIMEOUT_MS, STORAGE_KEYS, type OutputFormat } from '../shared/constants';
import { arrayBufferToBase64, isHeicFile, heicToOutputFilename } from '../shared/utils';
import { ensureOffscreenDocument } from './offscreen-manager';
import { downloadConverted, downloadZip } from './download-manager';
import type { ExtensionMessage } from '../types/messages';

// Track download IDs we initiated ourselves to avoid re-intercepting
const ourDownloads = new Set<number>();
// FIFO queue of filenames for our converted data-URL downloads
const pendingOurFilenames: string[] = [];

export function registerDownloadInterceptor(
  isEnabled: () => boolean,
  getOutputFormat: () => OutputFormat
): void {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // Our converted downloads come through as data: URLs — apply correct filename
    if (item.url.startsWith('data:') && pendingOurFilenames.length > 0) {
      const filename = pendingOurFilenames.shift()!;
      ourDownloads.add(item.id);
      suggest({ filename });
      return;
    }

    // Skip our own downloads
    if (ourDownloads.has(item.id)) {
      ourDownloads.delete(item.id);
      suggest();
      return;
    }

    if (!isEnabled()) {
      suggest();
      return;
    }

    // Only intercept downloads from Google Photos / googleusercontent
    const isFromGoogle =
      item.url.includes(GOOGLEUSERCONTENT_PATTERN) ||
      item.url.includes(USERCONTENT_PATTERN) ||
      item.referrer?.includes('photos.google.com');

    if (!isFromGoogle) {
      suggest();
      return;
    }

    const filename = item.filename;
    const isHeic = isHeicFile(filename);
    const isZip =
      filename.toLowerCase().endsWith('.zip') ||
      item.mime === 'application/zip';

    if (isHeic) {
      suggest({ filename: item.filename });
      setTimeout(() => {
        chrome.downloads.cancel(item.id, () => {
          if (chrome.runtime.lastError) {
            console.warn('[PixShift] Cancel warning:', chrome.runtime.lastError.message);
          }
          chrome.downloads.erase({ id: item.id });
        });
      }, 100);
      handleSingleHeic(item.url, filename, getOutputFormat());
      return;
    }

    if (isZip) {
      suggest({ filename: item.filename });
      setTimeout(() => {
        chrome.downloads.cancel(item.id, () => {
          if (chrome.runtime.lastError) {
            console.warn('[PixShift] Cancel warning:', chrome.runtime.lastError.message);
          }
          chrome.downloads.erase({ id: item.id });
        });
      }, 100);
      handleBulkZip(item.url, filename, getOutputFormat());
      return;
    }

    // Not HEIC or ZIP — let it through
    suggest();
  });
}

export function markOurDownload(downloadId: number): void {
  ourDownloads.add(downloadId);
}

async function handleSingleHeic(url: string, filename: string, outputFormat: OutputFormat): Promise<void> {
  try {
    console.log(`[PixShift] Intercepted HEIC download: ${filename}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const heicBase64 = arrayBufferToBase64(buffer);

    await ensureOffscreenDocument();

    const result = await sendToOffscreenWithTimeout(
      { type: 'CONVERT_HEIC', heicBase64, filename, outputFormat },
      CONVERSION_TIMEOUT_MS
    );

    if (result.type === 'CONVERT_RESULT') {
      const outputFilename = heicToOutputFilename(filename, outputFormat);
      pendingOurFilenames.push(outputFilename);
      await downloadConverted(result.convertedBase64, outputFilename, outputFormat);
      await incrementConvertedCount(1);
      showNotification('Converted', `${filename} → ${outputFilename}`);
    } else if (result.type === 'CONVERT_ERROR') {
      throw new Error(result.error);
    }
  } catch (err) {
    // Fall back: re-download original HEIC
    try {
      const downloadId = await redownloadOriginal(url, filename);
      ourDownloads.add(downloadId);
    } catch {
      // Complete failure
    }
    showNotification(
      'Conversion failed',
      `${err instanceof Error ? err.message : 'Unknown error'} — original file downloaded`
    );
  }
}

async function handleBulkZip(url: string, filename: string, outputFormat: OutputFormat): Promise<void> {
  try {
    console.log(`[PixShift] Intercepted ZIP download: ${filename}`);
    showNotification('Processing', `Converting HEIC files in ${filename}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const zipBase64 = arrayBufferToBase64(buffer);

    await ensureOffscreenDocument();

    const result = await sendToOffscreenWithTimeout(
      { type: 'CONVERT_BULK_ZIP', zipBase64, filename, outputFormat },
      CONVERSION_TIMEOUT_MS * 10 // 5 minutes for bulk
    );

    if (result.type === 'ZIP_RESULT') {
      const formatLabel = outputFormat === 'image/jpeg' ? 'jpg' : 'png';
      const outputZipFilename = filename.replace(/\.zip$/i, `-${formatLabel}.zip`);
      pendingOurFilenames.push(outputZipFilename);
      await downloadZip(result.zipBase64, outputZipFilename);

      const { converted, skipped, passthrough } = result.stats;
      await incrementConvertedCount(converted);
      showNotification(
        'Bulk conversion complete',
        `${converted} converted, ${passthrough} kept, ${skipped} failed`
      );
    } else if (result.type === 'CONVERT_ERROR') {
      throw new Error(result.error);
    }
  } catch (err) {
    // Fall back: re-download original ZIP
    try {
      const downloadId = await redownloadOriginal(url, filename);
      ourDownloads.add(downloadId);
    } catch {
      // Complete failure
    }
    showNotification(
      'Bulk conversion failed',
      `${err instanceof Error ? err.message : 'Unknown error'} — original ZIP downloaded`
    );
  }
}

function redownloadOriginal(url: string, filename: string): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename, saveAs: false }, (id) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(id);
    });
  });
}

function sendToOffscreenWithTimeout(
  message: ExtensionMessage,
  timeoutMs: number
): Promise<ExtensionMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Conversion timed out')), timeoutMs);
    chrome.runtime.sendMessage(message, (response: ExtensionMessage) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

async function incrementConvertedCount(count: number): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.CONVERTED_COUNT);
  const current = (data[STORAGE_KEYS.CONVERTED_COUNT] as number) ?? 0;
  await chrome.storage.local.set({ [STORAGE_KEYS.CONVERTED_COUNT]: current + count });
}

function showNotification(title: string, message: string): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: `PixShift: ${title}`,
    message,
  });
}
