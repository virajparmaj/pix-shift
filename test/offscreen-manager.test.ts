import assert from 'node:assert/strict';
import test from 'node:test';

test('offscreen manager retries after a failed create attempt', async () => {
  const createCalls: chrome.offscreen.CreateParameters[] = [];
  let createAttempt = 0;
  let hasDocument = false;

  const getContexts = async (filter: chrome.runtime.ContextFilter): Promise<chrome.runtime.ExtensionContext[]> => {
    assert.deepEqual(filter.documentUrls, ['chrome-extension://test/offscreen.html']);

    if (!hasDocument) {
      return [];
    }

    return [
      {
        contextId: 'ctx-1',
        contextType: chrome.runtime.ContextType.OFFSCREEN_DOCUMENT,
        documentId: 'doc-1',
        documentOrigin: 'chrome-extension://test',
        documentUrl: 'chrome-extension://test/offscreen.html',
        frameId: 0,
        incognito: false,
        tabId: -1,
        windowId: -1,
      },
    ];
  };

  const chromeStub = {
    offscreen: {
      Reason: {
        BLOBS: 'BLOBS',
        WORKERS: 'WORKERS',
      },
      closeDocument: async () => {
        hasDocument = false;
      },
      createDocument: async (options: chrome.offscreen.CreateParameters) => {
        createCalls.push(options);
        createAttempt += 1;
        if (createAttempt === 1) {
          throw new Error('boom');
        }
        hasDocument = true;
      },
    },
    runtime: {
      ContextType: {
        OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT',
      },
      getContexts,
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
  };

  Object.assign(globalThis, { chrome: chromeStub as unknown as typeof chrome });
  const { createOffscreenManager } = await import('../src/background/offscreen-manager');

  const manager = createOffscreenManager(
    {
      closeDocument: chromeStub.offscreen.closeDocument,
      createDocument: chromeStub.offscreen.createDocument,
      getContexts,
    },
    'chrome-extension://test/offscreen.html'
  );

  await assert.rejects(() => manager.ensure(), /boom/);
  await manager.ensure();
  await manager.close();

  assert.equal(createCalls.length, 2);
  assert.deepEqual(createCalls[1]?.reasons, ['BLOBS', 'WORKERS']);
});
