import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { BUILD_TARGETS } from './build-targets';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');

function pruneHiddenFiles(directory: string): void {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (entry.startsWith('.')) {
      if (stats.isDirectory()) {
        rmSync(fullPath, { force: true, recursive: true });
      } else {
        unlinkSync(fullPath);
      }
      continue;
    }

    if (stats.isDirectory()) {
      pruneHiddenFiles(fullPath);
    }
  }
}

if (existsSync(dist)) {
  rmSync(dist, { force: true, recursive: true });
}
mkdirSync(dist, { recursive: true });

cpSync(resolve(root, 'public'), dist, { recursive: true });
pruneHiddenFiles(dist);

for (const target of BUILD_TARGETS) {
  console.log(`\n--- Building ${target} ---`);
  execSync(`BUILD_TARGET=${target} npx vite build`, {
    cwd: root,
    env: { ...process.env, BUILD_TARGET: target },
    stdio: 'inherit',
  });
}

pruneHiddenFiles(dist);
console.log('\n✅ Build complete. Output in dist/');
