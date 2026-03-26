import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { BUILD_TARGETS } from './build-targets';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const distManifestPath = resolve(dist, 'manifest.json');
const distOffscreenPath = resolve(dist, 'offscreen.js');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function collectHiddenFiles(directory: string): string[] {
  const hiddenFiles: string[] = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (entry.startsWith('.')) {
      hiddenFiles.push(fullPath);
      continue;
    }

    if (stats.isDirectory()) {
      hiddenFiles.push(...collectHiddenFiles(fullPath));
    }
  }

  return hiddenFiles;
}

assert(existsSync(dist), 'dist/ does not exist. Run the build before release checks.');

for (const target of BUILD_TARGETS) {
  const fileName = target === 'heic-worker' ? 'heic-worker.js' : `${target}.js`;
  assert(existsSync(resolve(dist, fileName)), `Missing build output: ${fileName}`);
}

const manifest = JSON.parse(readFileSync(distManifestPath, 'utf8')) as {
  host_permissions?: string[];
  minimum_chrome_version?: string;
  permissions?: string[];
};

assert(manifest.minimum_chrome_version === '116', 'manifest minimum_chrome_version must be 116');
assert(!manifest.permissions?.includes('notifications'), 'notifications permission must be removed');
assert(
  !manifest.host_permissions?.includes('https://photos.google.com/*'),
  'photos.google.com host permission must be removed'
);

const hiddenFiles = collectHiddenFiles(dist);
assert(hiddenFiles.length === 0, `Hidden files copied to dist: ${hiddenFiles.join(', ')}`);

const offscreenBundle = readFileSync(distOffscreenPath, 'utf8');
assert(!offscreenBundle.includes('URL.createObjectURL'), 'offscreen bundle still contains blob worker logic');
assert(!offscreenBundle.includes('workerBlob'), 'offscreen bundle still references the old heic-to blob worker path');

console.log('Release checks passed.');
