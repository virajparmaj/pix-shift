import { OFFSCREEN_DOCUMENT_PATH } from '../shared/constants';

interface OffscreenApi {
  closeDocument(): Promise<void>;
  createDocument(options: chrome.offscreen.CreateParameters): Promise<void>;
  getContexts(filter: chrome.runtime.ContextFilter): Promise<chrome.runtime.ExtensionContext[]>;
}

export function createOffscreenManager(api: OffscreenApi, documentUrl: string) {
  let creating: Promise<void> | null = null;

  async function findExistingContexts(): Promise<chrome.runtime.ExtensionContext[]> {
    return api.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [documentUrl],
    });
  }

  async function ensure(): Promise<void> {
    const existingContexts = await findExistingContexts();
    if (existingContexts.length > 0) {
      return;
    }

    if (creating) {
      await creating;
      return;
    }

    creating = api.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.BLOBS, chrome.offscreen.Reason.WORKERS],
      justification: 'HEIC image conversion using packaged libheif worker',
    });

    try {
      await creating;
    } finally {
      creating = null;
    }
  }

  async function close(): Promise<void> {
    const existingContexts = await findExistingContexts();
    if (existingContexts.length > 0) {
      await api.closeDocument();
    }
  }

  return { ensure, close };
}

const offscreenManager = createOffscreenManager(
  {
    closeDocument: () => chrome.offscreen.closeDocument(),
    createDocument: (options) => chrome.offscreen.createDocument(options),
    getContexts: (filter) => chrome.runtime.getContexts(filter),
  },
  chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)
);

export async function ensureOffscreenDocument(): Promise<void> {
  await offscreenManager.ensure();
}

export async function closeOffscreenDocument(): Promise<void> {
  await offscreenManager.close();
}
