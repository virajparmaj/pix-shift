import { DOWNLOAD_URL_TTL_MS, type OutputFormat } from '../shared/constants';
import type { ExtensionMessage } from '../types/messages';
import { readPayload, writePayload } from '../shared/payload-store';
import { convertHeic } from './converter';
import { createDownloadUrlRegistry } from './download-url-registry';
import { convertZip } from './zip-handler';

const downloadUrlRegistry = createDownloadUrlRegistry({
  clearTimeout: (handle) => window.clearTimeout(handle),
  createObjectURL: (blob) => URL.createObjectURL(blob),
  readOutputPayload: (requestId) => readPayload('output', requestId),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
  ttlMs: DOWNLOAD_URL_TTL_MS,
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'CONVERT_HEIC') {
    void handleConvertHeic(message.requestId, message.filename, message.outputFormat, sendResponse);
    return true;
  }

  if (message.type === 'CONVERT_BULK_ZIP') {
    void handleConvertZip(message.requestId, message.filename, message.outputFormat, sendResponse);
    return true;
  }

  if (message.type === 'CREATE_DOWNLOAD_URL') {
    void handleCreateDownloadUrl(message.requestId, message.mimeType, sendResponse);
    return true;
  }

  if (message.type === 'REVOKE_DOWNLOAD_URL') {
    downloadUrlRegistry.revoke(message.url);
    return undefined;
  }

  return undefined;
});

async function handleConvertHeic(
  requestId: string,
  filename: string,
  outputFormat: OutputFormat,
  sendResponse: (response: ExtensionMessage) => void
): Promise<void> {
  try {
    const heicBuffer = await readPayload('input', requestId);
    const convertedBuffer = await convertHeic(heicBuffer, outputFormat);
    await writePayload('output', requestId, convertedBuffer);
    sendResponse({ type: 'CONVERT_RESULT', requestId, filename });
  } catch (error) {
    sendResponse({
      type: 'CONVERT_ERROR',
      requestId,
      error: error instanceof Error ? error.message : 'Conversion failed',
      filename,
    });
  }
}

async function handleConvertZip(
  requestId: string,
  filename: string,
  outputFormat: OutputFormat,
  sendResponse: (response: ExtensionMessage) => void
): Promise<void> {
  try {
    const zipBuffer = await readPayload('input', requestId);
    const { zipBuffer: convertedZipBuffer, stats } = await convertZip(zipBuffer, outputFormat);
    await writePayload('output', requestId, convertedZipBuffer);
    sendResponse({ type: 'ZIP_RESULT', requestId, filename, stats });
  } catch (error) {
    sendResponse({
      type: 'CONVERT_ERROR',
      requestId,
      error: error instanceof Error ? error.message : 'ZIP conversion failed',
      filename,
    });
  }
}

async function handleCreateDownloadUrl(
  requestId: string,
  mimeType: string,
  sendResponse: (response: ExtensionMessage) => void
): Promise<void> {
  try {
    const url = await downloadUrlRegistry.create(requestId, mimeType);
    sendResponse({ type: 'DOWNLOAD_URL_RESULT', requestId, url });
  } catch (error) {
    sendResponse({
      type: 'CONVERT_ERROR',
      requestId,
      error: error instanceof Error ? error.message : 'Unable to prepare converted download',
    });
  }
}
