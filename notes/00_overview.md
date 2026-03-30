# PixShift — Overview

**Confirmed from code**

PixShift is a Chrome Manifest V3 extension (v1.1.0, minimum Chrome 116) that automatically converts HEIC/HEIF image downloads from Google Photos to PNG or JPEG — entirely locally, with no data leaving the browser.

## What it does

- Intercepts HEIC file downloads from Google Photos via `chrome.downloads.onDeterminingFilename`
- Intercepts bulk ZIP downloads from Google Photos and converts embedded HEIC files
- Decodes HEIC using a packaged `libheif` Web Worker (no external codec fetch)
- Re-encodes to PNG (lossless, default) or JPEG (85% quality)
- Triggers the converted file download with a correct filename in place of the original
- Falls back to re-downloading the original if conversion fails

## Scope and data handling

- All processing is local (Service Worker + Offscreen Document + Web Worker)
- No network requests to third-party services
- Download fetches are restricted to `*.googleusercontent.com` and `*.usercontent.google.com` by both manifest host permissions and a runtime URL guard
- Payloads are stored transiently in the Cache API (`pixshift-payloads-v1`) and deleted after each conversion

## Key boundaries

- Only activates on Google Photos downloads (URL or referrer check)
- Extension-owned downloads (re-downloads of original or converted files) bypass interception
- Disabled state passes all downloads through unchanged

## Tech stack

- TypeScript + Vite (multi-target build: `background`, `offscreen`, `popup`, `heic-worker`)
- Runtime: Chrome Extension APIs (MV3), Cache API, OffscreenCanvas, Web Workers
- Libraries: `heic-to` (libheif WASM), `jszip`
- Tests: Node built-in test runner (`tsx --test`)
