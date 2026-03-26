export type OutputFormat = 'image/png' | 'image/jpeg';

export const GOOGLE_PHOTOS_ORIGIN = 'https://photos.google.com';
export const GOOGLEUSERCONTENT_PATTERN = '.googleusercontent.com';
export const USERCONTENT_PATTERN = '.usercontent.google.com';
export const LH3_DOMAIN = 'lh3.googleusercontent.com';

export const HEIC_EXTENSIONS = ['.heic', '.heif'] as const;
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'] as const;

export const JPEG_QUALITY = 0.85;
export const CONVERSION_TIMEOUT_MS = 30_000;
export const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

export const STORAGE_KEYS = {
  ENABLED: 'enabled',
  CONVERTED_COUNT: 'convertedCount',
  OUTPUT_FORMAT: 'outputFormat',
} as const;

export const DEFAULT_STATE = {
  enabled: true,
  convertedCount: 0,
  outputFormat: 'image/png' as OutputFormat,
} as const;
