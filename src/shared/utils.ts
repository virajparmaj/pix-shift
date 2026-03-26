import { HEIC_EXTENSIONS, type OutputFormat } from './constants';

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;

export function isHeicFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return HEIC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function heicToOutputFilename(filename: string, format: OutputFormat): string {
  const ext = format === 'image/jpeg' ? '.jpg' : '.png';
  const lower = filename.toLowerCase();
  for (const heicExt of HEIC_EXTENSIONS) {
    if (lower.endsWith(heicExt)) {
      return filename.slice(0, -heicExt.length) + ext;
    }
  }
  return filename + ext;
}

export function zipToOutputFilename(): string {
  return 'PixShift.zip';
}

export function extractFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const filenameStarMatch = header.match(/(?:^|;)\s*filename\*\s*=\s*([^;]+)/i);
  if (filenameStarMatch) {
    const decoded = decodeContentDispositionValue(filenameStarMatch[1] ?? '');
    if (decoded) {
      return decoded;
    }
  }

  const filenameMatch = header.match(/(?:^|;)\s*filename\s*=\s*(".*?"|[^;]+)/i);
  if (!filenameMatch) {
    return null;
  }

  return normalizeDispositionFilename(filenameMatch[1] ?? '');
}

export function sanitizeDownloadFilename(filename: string | null): string | null {
  if (!filename) {
    return null;
  }

  const basename = filename.replace(/\\/g, '/').split('/').pop()?.trim();
  if (!basename) {
    return null;
  }

  const sanitized = basename.replace(INVALID_FILENAME_CHARS, '_').trim();
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return null;
  }

  return sanitized;
}

export function createImgFallbackBaseName(sequence: number): string {
  return `IMG_${String(sequence).padStart(4, '0')}`;
}

export function deriveSinglePhotoOutputFilename(
  contentDisposition: string | null,
  originalFilename: string,
  outputFormat: OutputFormat,
  fallbackSequence: number
): string {
  const contentDispositionFilename = sanitizeDownloadFilename(
    extractFilenameFromContentDisposition(contentDisposition)
  );
  if (contentDispositionFilename && !isRandomLikeFilename(contentDispositionFilename)) {
    return heicToOutputFilename(contentDispositionFilename, outputFormat);
  }

  const sanitizedOriginalFilename = sanitizeDownloadFilename(originalFilename);
  const sourceFilename =
    sanitizedOriginalFilename && !isRandomLikeFilename(sanitizedOriginalFilename)
      ? sanitizedOriginalFilename
      : createImgFallbackBaseName(fallbackSequence);

  return heicToOutputFilename(sourceFilename, outputFormat);
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

function decodeContentDispositionValue(value: string): string | null {
  const normalized = normalizeDispositionFilename(value);
  const encodedMatch = normalized.match(/^[^']*'[^']*'(.*)$/);
  const candidate = encodedMatch ? encodedMatch[1] ?? '' : normalized;

  if (!candidate) {
    return null;
  }

  try {
    return decodeURIComponent(candidate);
  } catch {
    return normalized || null;
  }
}

function normalizeDispositionFilename(value: string): string {
  return value.trim().replace(/^"(.*)"$/, '$1');
}

function isRandomLikeFilename(filename: string): boolean {
  const basenameWithoutExtension = filename.replace(/\.[^.]+$/, '');
  const hexOnly = basenameWithoutExtension.replace(/-/g, '');
  return /^[0-9a-f]{16,}$/i.test(hexOnly);
}

