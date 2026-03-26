type TimeoutHandle = number;

interface DownloadUrlRegistryDependencies {
  clearTimeout: (handle: TimeoutHandle) => void;
  createObjectURL: (blob: Blob) => string;
  readOutputPayload: (requestId: string) => Promise<ArrayBuffer>;
  revokeObjectURL: (url: string) => void;
  setTimeout: (callback: () => void, delayMs: number) => TimeoutHandle;
  ttlMs: number;
}

export interface DownloadUrlRegistry {
  create(requestId: string, mimeType: string): Promise<string>;
  revoke(url: string): void;
}

export function createDownloadUrlRegistry(
  dependencies: DownloadUrlRegistryDependencies
): DownloadUrlRegistry {
  const activeUrls = new Map<string, TimeoutHandle>();

  function revoke(url: string): void {
    const timeoutHandle = activeUrls.get(url);
    if (timeoutHandle === undefined) {
      return;
    }

    dependencies.clearTimeout(timeoutHandle);
    activeUrls.delete(url);
    dependencies.revokeObjectURL(url);
  }

  async function create(requestId: string, mimeType: string): Promise<string> {
    const buffer = await dependencies.readOutputPayload(requestId);
    const blob = new Blob([buffer], { type: mimeType });
    const url = dependencies.createObjectURL(blob);
    const timeoutHandle = dependencies.setTimeout(() => revoke(url), dependencies.ttlMs);

    activeUrls.set(url, timeoutHandle);
    return url;
  }

  return { create, revoke };
}
