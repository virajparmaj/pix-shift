import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_STATE, STORAGE_KEYS } from '../src/shared/constants';
import { buildStateResponse, createSerializedCountUpdater } from '../src/background/state';
import { createStatus } from '../src/shared/status';

test('buildStateResponse falls back to defaults', () => {
  const response = buildStateResponse({});

  assert.equal(response.enabled, DEFAULT_STATE.enabled);
  assert.equal(response.convertedCount, DEFAULT_STATE.convertedCount);
  assert.equal(response.outputFormat, DEFAULT_STATE.outputFormat);
  assert.equal(response.lastStatus.title, 'Active');
});

test('buildStateResponse preserves stored status when enabled', () => {
  const response = buildStateResponse({
    [STORAGE_KEYS.ENABLED]: true,
    [STORAGE_KEYS.CONVERTED_COUNT]: 4,
    [STORAGE_KEYS.OUTPUT_FORMAT]: 'image/jpeg',
    [STORAGE_KEYS.LAST_STATUS]: createStatus('success', 'Converted', 'Done', 123),
  });

  assert.equal(response.lastStatus.kind, 'success');
  assert.equal(response.status, 'Converted');
  assert.equal(response.convertedCount, 4);
  assert.equal(response.outputFormat, 'image/jpeg');
});

test('serialized count updater increments without losing updates', async () => {
  let current = 0;
  const storage = {
    async get(): Promise<Record<string, number>> {
      return { [STORAGE_KEYS.CONVERTED_COUNT]: current };
    },
    async set(next: Record<string, number>): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 5));
      current = next[STORAGE_KEYS.CONVERTED_COUNT] ?? current;
    },
  };

  const increment = createSerializedCountUpdater(storage);
  const [first, second, third] = await Promise.all([increment(1), increment(2), increment(3)]);

  assert.equal(first, 1);
  assert.equal(second, 3);
  assert.equal(third, 6);
  assert.equal(current, 6);
});
