import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUILD_TARGETS } from '../scripts/build-targets';

test('manifest permissions and minimum version match release policy', () => {
  const manifestPath = resolve(process.cwd(), 'public/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    host_permissions?: string[];
    minimum_chrome_version?: string;
    permissions?: string[];
  };
  const expectedHostPermissions = [
    'https://*.googleusercontent.com/*',
    'https://*.usercontent.google.com/*',
  ];

  assert.equal(manifest.minimum_chrome_version, '116');
  assert.equal(manifest.permissions?.includes('notifications'), false);
  assert.deepEqual(manifest.host_permissions, expectedHostPermissions);
});

test('build targets include the packaged HEIC worker', () => {
  assert.deepEqual(BUILD_TARGETS, ['background', 'offscreen', 'popup', 'heic-worker']);
});
