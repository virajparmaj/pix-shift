import { defineConfig } from 'vite';
import { resolve } from 'path';

const target = process.env.BUILD_TARGET ?? 'background';

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
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
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
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
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
};

export default configs[target];
