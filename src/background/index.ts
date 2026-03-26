import type { ExtensionMessage } from '../types/messages';
import { DEFAULT_STATE, STORAGE_KEYS, type OutputFormat } from '../shared/constants';
import { createStatus, getDefaultStatus } from '../shared/status';
import { registerDownloadInterceptor } from './download-interceptor';
import { getStateResponse, setLastStatus } from './state';

let enabled: boolean = DEFAULT_STATE.enabled;
let outputFormat: OutputFormat = DEFAULT_STATE.outputFormat;

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_ENABLED') {
    void (async () => {
      enabled = message.enabled;
      await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: message.enabled });
      if (!message.enabled) {
        await setLastStatus(getDefaultStatus(false));
      } else {
        await setLastStatus(createStatus('idle', 'Active', 'Auto-convert downloaded HEIC files instantly.'));
      }
      sendResponse(await getStateResponse());
    })();
    return true;
  }

  if (message.type === 'SET_FORMAT') {
    void (async () => {
      outputFormat = message.outputFormat;
      await chrome.storage.local.set({ [STORAGE_KEYS.OUTPUT_FORMAT]: message.outputFormat });
      sendResponse(await getStateResponse());
    })();
    return true;
  }

  if (message.type === 'GET_STATE') {
    void (async () => {
      sendResponse(await getStateResponse());
    })();
    return true;
  }

  return undefined;
});

registerDownloadInterceptor(() => enabled, () => outputFormat);

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.ENABLED,
      STORAGE_KEYS.CONVERTED_COUNT,
      STORAGE_KEYS.OUTPUT_FORMAT,
      STORAGE_KEYS.LAST_STATUS,
    ]);

    const currentEnabled = (data[STORAGE_KEYS.ENABLED] as boolean) ?? DEFAULT_STATE.enabled;
    const defaults: Record<string, unknown> = {};

    if (data[STORAGE_KEYS.ENABLED] === undefined) {
      defaults[STORAGE_KEYS.ENABLED] = DEFAULT_STATE.enabled;
    }
    if (data[STORAGE_KEYS.CONVERTED_COUNT] === undefined) {
      defaults[STORAGE_KEYS.CONVERTED_COUNT] = DEFAULT_STATE.convertedCount;
    }
    if (data[STORAGE_KEYS.OUTPUT_FORMAT] === undefined) {
      defaults[STORAGE_KEYS.OUTPUT_FORMAT] = DEFAULT_STATE.outputFormat;
    }
    if (data[STORAGE_KEYS.LAST_STATUS] === undefined) {
      defaults[STORAGE_KEYS.LAST_STATUS] = getDefaultStatus(currentEnabled);
    }

    if (Object.keys(defaults).length > 0) {
      await chrome.storage.local.set(defaults);
    }
  })();
});

void (async () => {
  const data = await chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.OUTPUT_FORMAT]);
  enabled = (data[STORAGE_KEYS.ENABLED] as boolean) ?? DEFAULT_STATE.enabled;
  outputFormat = (data[STORAGE_KEYS.OUTPUT_FORMAT] as OutputFormat) ?? DEFAULT_STATE.outputFormat;
})();

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.ENABLED]) {
    enabled = changes[STORAGE_KEYS.ENABLED].newValue as boolean;
  }
  if (changes[STORAGE_KEYS.OUTPUT_FORMAT]) {
    outputFormat = changes[STORAGE_KEYS.OUTPUT_FORMAT].newValue as OutputFormat;
  }
});

console.log('[PixShift] Service worker loaded');
