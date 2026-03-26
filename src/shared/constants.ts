export type OutputFormat = 'image/png' | 'image/jpeg';

export const GOOGLEUSERCONTENT_PATTERN = '.googleusercontent.com';
export const USERCONTENT_PATTERN = '.usercontent.google.com';

export const HEIC_EXTENSIONS = ['.heic', '.heif'] as const;

export const JPEG_QUALITY = 0.85;
export const CONVERSION_TIMEOUT_MS = 30_000;
export const DOWNLOAD_URL_TTL_MS = 60_000;
export const DOWNLOAD_PREPARE_TIMEOUT_MS = 10_000;
export const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
export const HEIC_WORKER_PATH = 'heic-worker.js';

export const STORAGE_KEYS = {
  ENABLED: 'enabled',
  CONVERTED_COUNT: 'convertedCount',
  OUTPUT_FORMAT: 'outputFormat',
  LAST_STATUS: 'lastConversionStatus',
} as const;

export const DEFAULT_STATE = {
  enabled: true,
  convertedCount: 0,
  outputFormat: 'image/png' as OutputFormat,
} as const;
