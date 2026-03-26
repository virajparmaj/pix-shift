import type { ExtensionMessage } from '../types/messages';
import type { OutputFormat } from '../shared/constants';
import { convertHeic } from './converter';
import { convertZip } from './zip-handler';

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'CONVERT_HEIC') {
      handleConvertHeic(message.heicBase64, message.filename, message.outputFormat, sendResponse);
      return true; // async response
    }

    if (message.type === 'CONVERT_BULK_ZIP') {
      handleConvertZip(message.zipBase64, message.filename, message.outputFormat, sendResponse);
      return true;
    }
  }
);

async function handleConvertHeic(
  heicBase64: string,
  filename: string,
  outputFormat: OutputFormat,
  sendResponse: (response: ExtensionMessage) => void
) {
  try {
    const convertedBase64 = await convertHeic(heicBase64, outputFormat);
    sendResponse({ type: 'CONVERT_RESULT', convertedBase64, filename });
  } catch (err) {
    sendResponse({
      type: 'CONVERT_ERROR',
      error: err instanceof Error ? err.message : 'Conversion failed',
      filename,
    });
  }
}

async function handleConvertZip(
  zipBase64: string,
  filename: string,
  outputFormat: OutputFormat,
  sendResponse: (response: ExtensionMessage) => void
) {
  try {
    const { zipBase64: convertedZipBase64, stats } = await convertZip(zipBase64, outputFormat);
    sendResponse({ type: 'ZIP_RESULT', zipBase64: convertedZipBase64, filename, stats });
  } catch (err) {
    sendResponse({
      type: 'CONVERT_ERROR',
      error: err instanceof Error ? err.message : 'ZIP conversion failed',
      filename,
    });
  }
}
