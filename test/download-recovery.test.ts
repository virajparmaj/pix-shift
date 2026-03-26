import assert from 'node:assert/strict';
import test from 'node:test';

async function loadRecoveryModule() {
  const storageState: Record<string, unknown> = {};
  const downloadCalls: chrome.downloads.DownloadOptions[] = [];

  const chromeStub = {
    downloads: {
      download: async (options: chrome.downloads.DownloadOptions) => {
        downloadCalls.push(options);
        return 55;
      },
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
      id: 'test-extension',
      lastError: undefined as chrome.runtime.LastError | undefined,
      sendMessage: () => undefined,
    },
    storage: {
      local: {
        get: async (keys: string | string[]) => {
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.map((key) => [key, storageState[key]]));
          }
          return { [keys]: storageState[keys] };
        },
        set: async (values: Record<string, unknown>) => {
          Object.assign(storageState, values);
        },
      },
    },
  };

  Object.assign(globalThis, { chrome: chromeStub as unknown as typeof chrome });
  const interceptorModule = await import('../src/background/download-interceptor');
  const downloadManagerModule = await import('../src/background/download-manager');
  return { ...interceptorModule, ...downloadManagerModule, downloadCalls, storageState };
}

test('recovery path downloads the original file with a converted-download-failed status', async () => {
  const { ConvertedDownloadStartError, getRecoveryTitle, recoverOriginalDownload, downloadCalls, storageState } =
    await loadRecoveryModule();

  const error = new ConvertedDownloadStartError('Converted download startup failed after retry: boom');
  const title = getRecoveryTitle('heic', error);

  await recoverOriginalDownload(
    {
      filename: 'IMG_001.HEIC',
      kind: 'heic',
      outputFormat: 'image/png',
      url: 'https://photos.google.com/download/test',
    },
    error,
    title
  );

  assert.equal(title, 'Converted download failed');
  assert.deepEqual(downloadCalls, [
    {
      filename: 'IMG_001.HEIC',
      saveAs: false,
      url: 'https://photos.google.com/download/test',
    },
  ]);
  assert.equal((storageState.lastConversionStatus as { title: string }).title, 'Converted download failed');
  assert.match(
    (storageState.lastConversionStatus as { detail: string }).detail,
    /Converted download startup failed after retry: boom - original file downloaded/
  );
});
