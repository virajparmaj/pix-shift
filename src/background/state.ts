import { DEFAULT_STATE, STORAGE_KEYS, type OutputFormat } from '../shared/constants';
import { getDefaultStatus, normalizeStatus, type ConversionStatus } from '../shared/status';
import type { StateResponseMessage } from '../types/messages';

const STATE_KEYS = [
  STORAGE_KEYS.ENABLED,
  STORAGE_KEYS.CONVERTED_COUNT,
  STORAGE_KEYS.OUTPUT_FORMAT,
  STORAGE_KEYS.LAST_STATUS,
] as const;

type StorageAreaLike = Pick<chrome.storage.StorageArea, 'get' | 'set'>;

export async function getStateResponse(storage: StorageAreaLike = chrome.storage.local): Promise<StateResponseMessage> {
  const data = await storage.get(STATE_KEYS);
  return buildStateResponse(data);
}

export function buildStateResponse(data: Record<string, unknown>): StateResponseMessage {
  const enabled = (data[STORAGE_KEYS.ENABLED] as boolean) ?? DEFAULT_STATE.enabled;
  const convertedCount = (data[STORAGE_KEYS.CONVERTED_COUNT] as number) ?? DEFAULT_STATE.convertedCount;
  const outputFormat = (data[STORAGE_KEYS.OUTPUT_FORMAT] as OutputFormat) ?? DEFAULT_STATE.outputFormat;
  const lastStatus = enabled
    ? normalizeStatus(data[STORAGE_KEYS.LAST_STATUS], true)
    : getDefaultStatus(false);

  return {
    type: 'STATE_RESPONSE',
    enabled,
    convertedCount,
    outputFormat,
    lastStatus,
    status: lastStatus.title,
  };
}

export async function setLastStatus(status: ConversionStatus): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_STATUS]: status });
}

export function createSerializedCountUpdater(storage: StorageAreaLike): (count: number) => Promise<number> {
  let queue = Promise.resolve(0);

  return async (count: number): Promise<number> => {
    queue = queue.then(async () => {
      const data = await storage.get(STORAGE_KEYS.CONVERTED_COUNT);
      const current = (data[STORAGE_KEYS.CONVERTED_COUNT] as number) ?? 0;
      const next = current + count;
      await storage.set({ [STORAGE_KEYS.CONVERTED_COUNT]: next });
      return next;
    });

    return queue;
  };
}
