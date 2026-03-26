import assert from 'node:assert/strict';
import test from 'node:test';

async function loadDownloadInterceptorModule() {
  const chromeStub = {
    downloads: {
      cancel: async () => undefined,
      erase: async () => undefined,
      onDeterminingFilename: {
        addListener: () => undefined,
      },
      search: async () => [],
    },
    offscreen: {
      Reason: {
        BLOBS: 'BLOBS',
        WORKERS: 'WORKERS',
      },
      closeDocument: async () => undefined,
      createDocument: async () => undefined,
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
        get: async () => ({}),
        set: async () => undefined,
      },
    },
  };

  Object.assign(globalThis, { chrome: chromeStub as unknown as typeof chrome });
  return import('../src/background/download-interceptor');
}

test('fetch guard rejects unsupported download hosts before calling fetch', async () => {
  const { fetchInterceptSource } = await loadDownloadInterceptorModule();
  let fetchCalled = false;

  await assert.rejects(
    () =>
      fetchInterceptSource('https://photos.google.com/download/test', (async () => {
        fetchCalled = true;
        throw new Error('fetch should not have been called');
      }) as typeof fetch),
    /outside the extension host permissions/
  );

  assert.equal(fetchCalled, false);
});

test('fetch guard allows permitted Googleusercontent download hosts', async () => {
  const { fetchInterceptSource } = await loadDownloadInterceptorModule();
  let requestedUrl: string | null = null;
  const response = {
    ok: true,
  } as Response;

  const result = await fetchInterceptSource(
    'https://lh3.googleusercontent.com/pw/abc',
    (async (input: string | URL | Request) => {
      requestedUrl = typeof input === 'string' ? input : input.toString();
      return response;
    }) as typeof fetch
  );

  assert.equal(result, response);
  assert.equal(requestedUrl, 'https://lh3.googleusercontent.com/pw/abc');
});
