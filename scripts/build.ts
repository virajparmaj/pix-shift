import { execSync } from 'child_process';
import { cpSync, rmSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');

// Clean dist
if (existsSync(dist)) {
  rmSync(dist, { recursive: true });
}
mkdirSync(dist, { recursive: true });

// Copy public files to dist
cpSync(resolve(root, 'public'), dist, { recursive: true });

// Build each target
const targets = ['background', 'offscreen', 'popup'];

for (const target of targets) {
  console.log(`\n--- Building ${target} ---`);
  execSync(`BUILD_TARGET=${target} npx vite build`, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: target },
  });
}

console.log('\n✅ Build complete. Output in dist/');
