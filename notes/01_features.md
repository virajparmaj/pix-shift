# PixShift — Features

**Confirmed from code**

## Single HEIC conversion

- Triggered when a `.heic` or `.heif` file is downloaded from Google Photos
- Fetches source from the intercepted URL, writes to Cache API, sends to offscreen for decoding
- Output filename derived from `Content-Disposition` header → original filename → `IMG_XXXX` fallback
- Random-looking hex filenames (≥16 hex chars) are replaced with the `IMG_XXXX` fallback sequence
- Timeout: 30 seconds

## Bulk ZIP conversion

- Triggered when a `.zip` file (MIME `application/zip`) is downloaded from Google Photos
- Each HEIC entry in the ZIP is converted; non-HEIC entries pass through unchanged
- Failed individual entries are kept as-is and counted as `skipped`; all entries failing throws an error
- Output ZIP is always named `PixShift.zip`
- Timeout: 300 seconds (10× single timeout)
- Stats reported: `converted`, `skipped`, `passthrough`

## Output format selection

- PNG (default, lossless)
- JPEG (lossy, 85% quality constant `JPEG_QUALITY = 0.85`)
- Selection persisted in `chrome.storage.local` under key `outputFormat`
- Persists across browser restarts

## Enable / Disable toggle

- Toggled from popup; persisted to `chrome.storage.local` under key `enabled`
- Disabled state: all downloads pass through unchanged; popup shows "Disabled" status
- Re-enabling sets status back to "Active"

## Conversion counter

- Cumulative count of successfully converted files persisted under key `convertedCount`
- Bulk ZIP increments by the number of HEIC files converted in that ZIP
- Counter update is serialized (queued promise chain) to prevent race conditions on concurrent downloads

## Status display

Four status kinds: `idle`, `processing`, `success`, `error`
- Updated in `chrome.storage.local` under key `lastConversionStatus`
- Popup reads state via `GET_STATE` message on open; no polling
- Status tone: `active` when enabled and not in error; `disabled` otherwise

## Error recovery

- On any conversion failure the extension attempts to re-download the original file once
- Status reflects whether the re-download succeeded or also failed
- `ConvertedDownloadStartError` triggers a second attempt after recreating the offscreen document
