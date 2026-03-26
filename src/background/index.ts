import type { ExtensionMessage } from '../types/messages';
import { DEFAULT_STATE, STORAGE_KEYS } from '../shared/constants';
import { registerDownloadInterceptor } from './download-interceptor';

// In-memory enabled state (synced from storage)
let enabled: boolean = DEFAULT_STATE.enabled;

// --- ALL LISTENERS REGISTERED AT TOP LEVEL (critical for MV3) ---

// Handle messages from popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_ENABLED') {
      enabled = message.enabled;
      chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: message.enabled });
      sendResponse({ type: 'STATE_RESPONSE', enabled, convertedCount: 0, status: 'OK' });
      return;
    }

    if (message.type === 'GET_STATE') {
      chrome.storage.local.get(
        [STORAGE_KEYS.ENABLED, STORAGE_KEYS.CONVERTED_COUNT],
        (data) => {
          sendResponse({
            type: 'STATE_RESPONSE',
            enabled: (data[STORAGE_KEYS.ENABLED] as boolean) ?? DEFAULT_STATE.enabled,
            convertedCount: (data[STORAGE_KEYS.CONVERTED_COUNT] as number) ?? 0,
            status: 'Ready',
          });
        }
      );
      return true; // async response
    }
  }
);

// Register download interceptor (handles both single HEIC and bulk ZIP)
registerDownloadInterceptor(() => enabled);

// Initialize default state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEYS.ENABLED, (data) => {
    if (data[STORAGE_KEYS.ENABLED] === undefined) {
      chrome.storage.local.set(DEFAULT_STATE);
    }
  });
});

// Sync enabled state from storage on startup
chrome.storage.local.get(STORAGE_KEYS.ENABLED, (data) => {
  enabled = (data[STORAGE_KEYS.ENABLED] as boolean) ?? DEFAULT_STATE.enabled;
});

// Keep in-memory state synced
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.ENABLED]) {
    enabled = changes[STORAGE_KEYS.ENABLED].newValue as boolean;
  }
});

console.log('[i-PNG] Service worker loaded');
