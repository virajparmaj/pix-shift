import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExtensionMessage } from '../src/types/messages';

async function loadDownloadManagerModule() {
  const chromeStub = {
    downloads: {
      download: async () => 1,
    },
    offscreen: {
      Reason: {
        BLOBS: 'BLOBS',
        WORKERS: 'WORKERS',
      },
      closeDocument: async () => {},
      createDocument: async () => {},
    },
    runtime: {
      ContextType: {
        OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT',
      },
      getContexts: async () => [],
      getURL: (path: string) => `chrome-extension://test/${path}`,
      lastError: undefined as chrome.runtime.LastError | undefined,
      sendMessage: () => undefined,
    },
  };

  Object.assign(globalThis, { chrome: chromeStub as unknown as typeof chrome });
  return import('../src/background/download-manager');
}

test('download manager works even when service worker URL.createObjectURL is unavailable', async () => {
  const { createDownloadManager } = await loadDownloadManagerModule();
  const originalUrl = globalThis.URL;

  class UrlWithoutObjectUrl extends originalUrl {}

  Object.defineProperty(UrlWithoutObjectUrl, 'createObjectURL', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(globalThis, 'URL', {
    configurable: true,
    value: UrlWithoutObjectUrl,
  });

  const sentMessages: string[] = [];
  const manager = createDownloadManager({
    closeOffscreenDocument: async () => {},
    download: async (options) => {
      assert.equal(options.url, 'blob:converted');
      assert.equal(options.filename, 'photo.png');
      return 7;
    },
    ensureOffscreenDocument: async () => {
      sentMessages.push('ensure');
    },
    postMessage: (message) => {
      sentMessages.push(message.type);
    },
    sendMessageWithResponse: async <TResponse extends ExtensionMessage>(
      message: ExtensionMessage,
      _timeoutMs: number
    ): Promise<TResponse> => {
      assert.equal(message.type, 'CREATE_DOWNLOAD_URL');
      return { type: 'DOWNLOAD_URL_RESULT', requestId: 'req-1', url: 'blob:converted' } as TResponse;
    },
  });

  try {
    const downloadId = await manager.downloadConvertedPayload('req-1', 'photo.png', 'image/png');
    assert.equal(downloadId, 7);
    assert.deepEqual(sentMessages, ['ensure', 'REVOKE_DOWNLOAD_URL']);
  } finally {
    Object.defineProperty(globalThis, 'URL', {
      configurable: true,
      value: originalUrl,
    });
  }
});

test('download manager retries once and revokes prepared URLs on each attempt', async () => {
  const { createDownloadManager } = await loadDownloadManagerModule();
  const lifecycle: string[] = [];
  let attempt = 0;

  const manager = createDownloadManager({
    closeOffscreenDocument: async () => {
      lifecycle.push('close');
    },
    download: async (options) => {
      lifecycle.push(`download:${String(options.url)}`);
      attempt += 1;
      if (attempt === 1) {
        throw new Error('download API failed');
      }
      return 19;
    },
    ensureOffscreenDocument: async () => {
      lifecycle.push('ensure');
    },
    postMessage: (message) => {
      if (message.type === 'REVOKE_DOWNLOAD_URL') {
        lifecycle.push(`revoke:${message.url}`);
      }
    },
    sendMessageWithResponse: async <TResponse extends ExtensionMessage>(
      _message: ExtensionMessage,
      _timeoutMs: number
    ): Promise<TResponse> =>
      ({
        type: 'DOWNLOAD_URL_RESULT',
        requestId: 'req-2',
        url: attempt === 0 ? 'blob:first' : 'blob:second',
      }) as TResponse,
  });

  const downloadId = await manager.downloadConvertedPayload('req-2', 'photos-png.zip', 'application/zip');

  assert.equal(downloadId, 19);
  assert.deepEqual(lifecycle, [
    'ensure',
    'download:blob:first',
    'revoke:blob:first',
    'close',
    'ensure',
    'download:blob:second',
    'revoke:blob:second',
  ]);
});

test('download manager throws ConvertedDownloadStartError after a second handoff failure', async () => {
  const { ConvertedDownloadStartError, createDownloadManager } = await loadDownloadManagerModule();
  const revokedUrls: string[] = [];
  let attempt = 0;

  const manager = createDownloadManager({
    closeOffscreenDocument: async () => {},
    download: async () => {
      attempt += 1;
      throw new Error(`download failed ${attempt}`);
    },
    ensureOffscreenDocument: async () => {},
    postMessage: (message) => {
      if (message.type === 'REVOKE_DOWNLOAD_URL') {
        revokedUrls.push(message.url);
      }
    },
    sendMessageWithResponse: async <TResponse extends ExtensionMessage>(
      _message: ExtensionMessage,
      _timeoutMs: number
    ): Promise<TResponse> =>
      ({
        type: 'DOWNLOAD_URL_RESULT',
        requestId: 'req-3',
        url: attempt === 0 ? 'blob:one' : 'blob:two',
      }) as TResponse,
  });

  await assert.rejects(
    () => manager.downloadConvertedPayload('req-3', 'photo.jpg', 'image/jpeg'),
    (error: unknown) => {
      assert.ok(error instanceof ConvertedDownloadStartError);
      assert.match((error as Error).message, /Converted download startup failed after retry: download failed 2/);
      return true;
    }
  );

  assert.deepEqual(revokedUrls, ['blob:one', 'blob:two']);
});

test('consumeOutputFilename returns and removes stored filename', async () => {
  const { consumeOutputFilename } = await loadDownloadManagerModule();

  assert.equal(consumeOutputFilename('blob:unknown'), undefined);

  // Simulate what startDownload does internally — the map is module-scoped,
  // so we exercise it through createDownloadManager's startDownload path.
  const { createDownloadManager } = await loadDownloadManagerModule();
  const manager = createDownloadManager({
    closeOffscreenDocument: async () => {},
    download: async () => 42,
    ensureOffscreenDocument: async () => {},
    postMessage: () => {},
    sendMessageWithResponse: async <TResponse extends ExtensionMessage>(
      _message: ExtensionMessage,
      _timeoutMs: number
    ): Promise<TResponse> =>
      ({ type: 'DOWNLOAD_URL_RESULT', requestId: 'r', url: 'blob:test-url' }) as TResponse,
  });

  await manager.downloadConvertedPayload('r', 'output.png', 'image/png');

  // Filename stays in map until onDeterminingFilename consumes it
  assert.equal(consumeOutputFilename('blob:test-url'), 'output.png');
  // Second consume returns undefined (already removed)
  assert.equal(consumeOutputFilename('blob:test-url'), undefined);
});
