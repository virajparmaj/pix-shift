import assert from 'node:assert/strict';
import test from 'node:test';
import { createDownloadUrlRegistry } from '../src/offscreen/download-url-registry';

test('download URL registry creates a blob URL from cached output payload', async () => {
  const payload = new Uint8Array([1, 2, 3, 4]);
  let createdBlob: Blob | undefined;

  const registry = createDownloadUrlRegistry({
    clearTimeout: () => {},
    createObjectURL: (blob) => {
      createdBlob = blob;
      return 'blob:created';
    },
    readOutputPayload: async (requestId) => {
      assert.equal(requestId, 'req-1');
      return payload.buffer.slice(0);
    },
    revokeObjectURL: () => {},
    setTimeout: () => 1,
    ttlMs: 60_000,
  });

  const url = await registry.create('req-1', 'image/png');

  assert.equal(url, 'blob:created');
  assert.ok(createdBlob, 'Blob should be created');
  assert.equal(createdBlob?.type, 'image/png');
  assert.deepEqual(new Uint8Array(await createdBlob!.arrayBuffer()), payload);
});

test('download URL registry revokes known URLs and ignores duplicate or unknown revokes', async () => {
  const clearedHandles: number[] = [];
  const revokedUrls: string[] = [];

  const registry = createDownloadUrlRegistry({
    clearTimeout: (handle) => {
      clearedHandles.push(handle);
    },
    createObjectURL: () => 'blob:known',
    readOutputPayload: async () => new Uint8Array([9]).buffer,
    revokeObjectURL: (url) => {
      revokedUrls.push(url);
    },
    setTimeout: () => 99,
    ttlMs: 60_000,
  });

  await registry.create('req-2', 'application/zip');
  registry.revoke('blob:known');
  registry.revoke('blob:known');
  registry.revoke('blob:missing');

  assert.deepEqual(clearedHandles, [99]);
  assert.deepEqual(revokedUrls, ['blob:known']);
});

test('download URL registry TTL cleanup revokes leaked URLs', async () => {
  let timeoutCallback: (() => void) | undefined;
  const revokedUrls: string[] = [];

  const registry = createDownloadUrlRegistry({
    clearTimeout: () => {},
    createObjectURL: () => 'blob:ttl',
    readOutputPayload: async () => new Uint8Array([7, 8]).buffer,
    revokeObjectURL: (url) => {
      revokedUrls.push(url);
    },
    setTimeout: (callback) => {
      timeoutCallback = callback;
      return 123;
    },
    ttlMs: 5_000,
  });

  const url = await registry.create('req-3', 'image/jpeg');
  assert.equal(url, 'blob:ttl');
  assert.ok(timeoutCallback, 'TTL cleanup callback should be scheduled');

  timeoutCallback!();

  assert.deepEqual(revokedUrls, ['blob:ttl']);
});
