# PixShift — Architecture

**Confirmed from code**

## Three execution contexts

```
┌─────────────────────────────────────────────────────────────────┐
│  Service Worker (background.js)                                 │
│  - chrome.downloads.onDeterminingFilename interception          │
│  - State management (chrome.storage.local)                      │
│  - Message routing to/from offscreen                            │
│  - Download re-trigger (chrome.downloads.download)              │
└─────────────────────┬───────────────────────────────────────────┘
                      │ chrome.runtime.sendMessage
                      │ + Cache API (pixshift-payloads-v1)
┌─────────────────────▼───────────────────────────────────────────┐
│  Offscreen Document (offscreen.js + offscreen.html)             │
│  - Receives CONVERT_HEIC / CONVERT_BULK_ZIP messages            │
│  - Reads input payload from Cache API                           │
│  - Delegates decode to HEIC Worker via postMessage              │
│  - Encodes to PNG/JPEG via OffscreenCanvas                      │
│  - Writes output payload to Cache API                           │
│  - Manages download URL registry (Blob URL + 60s TTL)           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Worker.postMessage (ArrayBuffer transfer)
┌─────────────────────▼───────────────────────────────────────────┐
│  HEIC Worker (heic-worker.js)                                   │
│  - Bundled libheif WASM (heic-to library)                       │
│  - Decodes HEIC buffer to raw RGBA ImageData                    │
│  - Returns pixel data via postMessage with Transferable          │
└─────────────────────────────────────────────────────────────────┘
```

## Conversion pipeline (single HEIC)

1. `chrome.downloads.onDeterminingFilename` fires
2. `isGooglePhotosDownload` and `getInterceptKind` classify the download
3. Original download is cancelled and erased from history
4. Source URL is fetched from background (guarded by `isPermittedDownloadFetchUrl`)
5. Raw bytes written to Cache API as `input/<requestId>`
6. Offscreen document is created/reused
7. `CONVERT_HEIC` message sent to offscreen with `requestId`, `filename`, `outputFormat`
8. Offscreen reads `input/<requestId>` from Cache API
9. HEIC Worker decodes buffer → raw RGBA pixels
10. `OffscreenCanvas` renders pixels and converts to PNG/JPEG blob
11. Output bytes written to Cache API as `output/<requestId>`
12. `CONVERT_RESULT` message returned to background
13. Background sends `CREATE_DOWNLOAD_URL` to offscreen
14. Offscreen creates Blob URL from `output/<requestId>`, registers 60s auto-revoke
15. Background calls `chrome.downloads.download` with Blob URL + output filename
16. `onDeterminingFilename` fires again; extension recognises its own URL and supplies the output filename
17. Background sends `REVOKE_DOWNLOAD_URL`; Cache API entries deleted

## Payload cache

- Cache name: `pixshift-payloads-v1`
- Fake URL scheme: `https://pixshift-payload.invalid/<kind>/<id>`
- Both `input` and `output` entries are deleted after each conversion attempt (success or failure)
- Shared between background and offscreen via the Cache API (both contexts in the same extension origin)

## State storage (chrome.storage.local)

| Key | Type | Default |
|-----|------|---------|
| `enabled` | boolean | `true` |
| `convertedCount` | number | `0` |
| `outputFormat` | `'image/png'` \| `'image/jpeg'` | `'image/png'` |
| `lastConversionStatus` | `ConversionStatus` | idle/Active |

Background worker caches `enabled` and `outputFormat` in memory; `chrome.storage.onChanged` keeps them in sync.

## Message types

Defined in `src/types/messages.ts`. Key flows:

- `CONVERT_HEIC` / `CONVERT_BULK_ZIP`: background → offscreen
- `CONVERT_RESULT` / `ZIP_RESULT` / `CONVERT_ERROR`: offscreen → background
- `CREATE_DOWNLOAD_URL` / `DOWNLOAD_URL_RESULT`: background → offscreen
- `REVOKE_DOWNLOAD_URL`: background → offscreen (fire-and-forget)
- `TOGGLE_ENABLED` / `SET_FORMAT` / `GET_STATE` / `STATE_RESPONSE`: popup ↔ background

## Offscreen document lifecycle

- Created on first conversion request if not already present
- Reused across conversions (singleton pattern with `creating` promise guard)
- Closed and recreated if a converted download fails to start (`ConvertedDownloadStartError` retry path)
- Reasons: `BLOBS` + `WORKERS`

## Build targets

Four Vite builds, each producing a single bundled ES module:

| Target | Entry | Output |
|--------|-------|--------|
| `background` | `src/background/index.ts` | `dist/background.js` |
| `offscreen` | `src/offscreen/index.ts` | `dist/offscreen.js` |
| `popup` | `src/popup/index.ts` | `dist/popup.js` |
| `heic-worker` | `src/offscreen/heic-worker.ts` | `dist/heic-worker.js` |

Build script (`scripts/build.ts`) also copies `public/` into `dist/` and prunes hidden files.
