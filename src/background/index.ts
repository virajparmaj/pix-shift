import type { ExtensionMessage } from '../types/messages';
import { DEFAULT_STATE, STORAGE_KEYS, type OutputFormat } from '../shared/constants';
import { registerDownloadInterceptor } from './download-interceptor';

// In-memory state (synced from storage)
let enabled: boolean = DEFAULT_STATE.enabled;
let outputFormat: OutputFormat = DEFAULT_STATE.outputFormat;

// --- ALL LISTENERS REGISTERED AT TOP LEVEL (critical for MV3) ---

// Handle messages from popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_ENABLED') {
      enabled = message.enabled;
      chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: message.enabled });
      sendResponse({ type: 'STATE_RESPONSE', enabled, convertedCount: 0, outputFormat, status: 'OK' });
      return;
    }

    if (message.type === 'SET_FORMAT') {
      outputFormat = message.outputFormat;
      chrome.storage.local.set({ [STORAGE_KEYS.OUTPUT_FORMAT]: message.outputFormat });
      sendResponse({ type: 'STATE_RESPONSE', enabled, convertedCount: 0, outputFormat, status: 'OK' });
      return;
    }

    if (message.type === 'GET_STATE') {
      chrome.storage.local.get(
        [STORAGE_KEYS.ENABLED, STORAGE_KEYS.CONVERTED_COUNT, STORAGE_KEYS.OUTPUT_FORMAT],
        (data) => {
          sendResponse({
            type: 'STATE_RESPONSE',
            enabled: (data[STORAGE_KEYS.ENABLED] as boolean) ?? DEFAULT_STATE.enabled,
            convertedCount: (data[STORAGE_KEYS.CONVERTED_COUNT] as number) ?? 0,
            outputFormat: (data[STORAGE_KEYS.OUTPUT_FORMAT] as OutputFormat) ?? DEFAULT_STATE.outputFormat,
            status: 'Ready',
          });
        }
      );
      return true; // async response
    }
  }
);

// Register download interceptor (handles both single HEIC and bulk ZIP)
registerDownloadInterceptor(() => enabled, () => outputFormat);

// Initialize default state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(
    [STORAGE_KEYS.ENABLED, STORAGE_KEYS.OUTPUT_FORMAT],
    (data) => {
      const defaults: Record<string, unknown> = {};
      if (data[STORAGE_KEYS.ENABLED] === undefined) {
        defaults[STORAGE_KEYS.ENABLED] = DEFAULT_STATE.enabled;
        defaults[STORAGE_KEYS.CONVERTED_COUNT] = DEFAULT_STATE.convertedCount;
      }
      if (data[STORAGE_KEYS.OUTPUT_FORMAT] === undefined) {
        defaults[STORAGE_KEYS.OUTPUT_FORMAT] = DEFAULT_STATE.outputFormat;
      }
      if (Object.keys(defaults).length > 0) {
        chrome.storage.local.set(defaults);
      }
    }
  );
});

// Sync state from storage on startup
chrome.storage.local.get(
  [STORAGE_KEYS.ENABLED, STORAGE_KEYS.OUTPUT_FORMAT],
  (data) => {
    enabled = (data[STORAGE_KEYS.ENABLED] as boolean) ?? DEFAULT_STATE.enabled;
    outputFormat = (data[STORAGE_KEYS.OUTPUT_FORMAT] as OutputFormat) ?? DEFAULT_STATE.outputFormat;
  }
);

// Keep in-memory state synced
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.ENABLED]) {
    enabled = changes[STORAGE_KEYS.ENABLED].newValue as boolean;
  }
  if (changes[STORAGE_KEYS.OUTPUT_FORMAT]) {
    outputFormat = changes[STORAGE_KEYS.OUTPUT_FORMAT].newValue as OutputFormat;
  }
});

console.log('[PixShift] Service worker loaded');
