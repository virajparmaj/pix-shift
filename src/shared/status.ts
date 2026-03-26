export type ConversionStatusKind = 'idle' | 'processing' | 'success' | 'error';

export interface ConversionStatus {
  kind: ConversionStatusKind;
  title: string;
  detail: string;
  updatedAt: number;
}

const ACTIVE_DETAIL = 'Auto-convert downloaded HEIC files instantly.';
const DISABLED_DETAIL = 'PixShift will pass downloads through unchanged.';

export function createStatus(
  kind: ConversionStatusKind,
  title: string,
  detail: string,
  updatedAt: number = Date.now()
): ConversionStatus {
  return { kind, title, detail, updatedAt };
}

export function getDefaultStatus(enabled: boolean): ConversionStatus {
  if (!enabled) {
    return createStatus('idle', 'Disabled', DISABLED_DETAIL, 0);
  }

  return createStatus('idle', 'Active', ACTIVE_DETAIL, 0);
}

export function normalizeStatus(value: unknown, enabled: boolean): ConversionStatus {
  if (!value || typeof value !== 'object') {
    return getDefaultStatus(enabled);
  }

  const candidate = value as Partial<ConversionStatus>;
  if (
    (candidate.kind === 'idle' ||
      candidate.kind === 'processing' ||
      candidate.kind === 'success' ||
      candidate.kind === 'error') &&
    typeof candidate.title === 'string' &&
    typeof candidate.detail === 'string' &&
    typeof candidate.updatedAt === 'number'
  ) {
    return candidate as ConversionStatus;
  }

  return getDefaultStatus(enabled);
}
