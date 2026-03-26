import { GOOGLEUSERCONTENT_PATTERN, USERCONTENT_PATTERN } from '../shared/constants';
import { isHeicFile } from '../shared/utils';

export type InterceptKind = 'heic' | 'zip';

export interface DownloadLike {
  byExtensionId?: string;
  filename: string;
  mime: string;
  referrer?: string;
  url: string;
}

export function isExtensionOwnedDownload(item: DownloadLike, extensionId: string): boolean {
  return item.byExtensionId === extensionId;
}

export function isGooglePhotosDownload(item: DownloadLike): boolean {
  return (
    item.url.includes(GOOGLEUSERCONTENT_PATTERN) ||
    item.url.includes(USERCONTENT_PATTERN) ||
    item.referrer?.includes('photos.google.com') === true
  );
}

export function isPermittedDownloadFetchUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:') {
      return false;
    }

    return (
      hostname.endsWith(GOOGLEUSERCONTENT_PATTERN) ||
      hostname.endsWith(USERCONTENT_PATTERN)
    );
  } catch {
    return false;
  }
}

export function getInterceptKind(item: DownloadLike): InterceptKind | null {
  if (isHeicFile(item.filename)) {
    return 'heic';
  }

  if (item.filename.toLowerCase().endsWith('.zip') || item.mime === 'application/zip') {
    return 'zip';
  }

  return null;
}
