import { defineConfig } from 'vite';
import { resolve } from 'path';

const target = process.env.BUILD_TARGET ?? 'background';

const singleFileOutput = {
  output: {
    inlineDynamicImports: true,
  },
};

const configs: Record<string, ReturnType<typeof defineConfig>> = {
  background: defineConfig({
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/background/index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: singleFileOutput,
    },
  }),

  offscreen: defineConfig({
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/offscreen/index.ts'),
        formats: ['es'],
        fileName: () => 'offscreen.js',
      },
      rollupOptions: singleFileOutput,
    },
  }),

  popup: defineConfig({
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/popup/index.ts'),
        formats: ['es'],
        fileName: () => 'popup.js',
      },
    },
  }),

  'heic-worker': defineConfig({
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/offscreen/heic-worker.ts'),
        formats: ['es'],
        fileName: () => 'heic-worker.js',
      },
      rollupOptions: singleFileOutput,
    },
  }),
};

export default configs[target];
