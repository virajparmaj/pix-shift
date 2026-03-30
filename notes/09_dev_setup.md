# PixShift — Dev Setup

**Confirmed from code**

## Prerequisites

- Node.js (any recent LTS)
- npm
- Chrome 116+ (for manual testing)

## Install

```sh
npm install
```

## Build

```sh
npm run build        # full build: all 4 targets + public/ copy → dist/
npm run dev          # watch mode (rebuilds on file changes)
npm run clean        # wipe dist/
```

Build sequence (orchestrated by `scripts/build.ts`):
1. `dist/` wiped and recreated
2. `public/` copied into `dist/` (manifest, HTML, CSS, icons)
3. Hidden files pruned from `dist/`
4. Four Vite builds run in sequence: `background`, `offscreen`, `popup`, `heic-worker`
5. Hidden files pruned again

## Type check

```sh
npm run typecheck    # tsc --noEmit
```

## Tests

```sh
npm test             # tsx --test test/*.test.ts
```

Test files mirror source modules 1:1 (e.g., `test/zip-handler.test.ts` → `src/offscreen/zip-handler.ts`). Uses Node's built-in test runner; no external test framework.

## Release validation

```sh
npm run release:check   # build + scripts/release-check.ts
```

Validates:
- Manifest version and permissions structure
- Host permissions restricted to Googleusercontent domains
- All expected `dist/` artifacts present (`background.js`, `offscreen.js`, `popup.js`, `heic-worker.js`, `manifest.json`, `offscreen.html`)
- Worker bundling confirmed

## Load in Chrome for manual testing

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Click "Load unpacked" → select the `dist/` directory
5. Download any HEIC from Google Photos to verify interception

## Source layout

```
src/
  background/   service worker — interception, state, download management
  offscreen/    offscreen document — HEIC conversion, ZIP handling, Blob URL registry
  popup/        popup UI — view model + DOM wiring
  shared/       constants, status, payload-store, utils (shared by all contexts)
  types/        ExtensionMessage union type
```
