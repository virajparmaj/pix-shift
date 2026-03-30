# PixShift — Known Issues and Limitations

**Confirmed from code / release checklist**

## Duplicate originals on fast downloads

Small or fast downloads may complete before the cancellation can take effect, resulting in the original HEIC being downloaded alongside the converted file. This is an inherent timing limitation of the `chrome.downloads.cancel` approach.

Referenced in `docs/release-checklist.md` under manual verification.

## Conversion timeouts

- Single HEIC: 30 seconds (`CONVERSION_TIMEOUT_MS`)
- Bulk ZIP: 300 seconds (10× single timeout)

Very large HEIC files or slow devices may hit these limits. On timeout, the original is re-downloaded.

## Blob URL TTL

Download URLs created in the offscreen document auto-revoke after 60 seconds (`DOWNLOAD_URL_TTL_MS`). If Chrome does not start the download within that window, the download will fail. Recovery attempts a full offscreen document recreation.

## Filename heuristics for random Google Photos URLs

Google Photos download URLs often have no meaningful filename. The extension:
1. Tries `Content-Disposition` header filename
2. Falls back to the intercepted `item.filename`
3. If both look like random hex (≥16 hex chars with optional dashes), uses `IMG_XXXX` sequence

Sequence resets when the service worker restarts (browser restart, extension reload).

## Offscreen document lifetime

The offscreen document is kept alive across conversions (singleton) but is closed and recreated on `ConvertedDownloadStartError`. If the document is unexpectedly killed by Chrome between conversions, the next conversion transparently recreates it.

## No support for non-Google Photos HEIC downloads

PixShift only activates for downloads from `*.googleusercontent.com`, `*.usercontent.google.com`, or with a `photos.google.com` referrer. HEIC files downloaded from other sources are not converted.

## Concurrent download race on counter

The converted-count update is serialized via a queued promise chain to prevent races, but `chrome.storage.local` is not transactional. Under extreme concurrency the counter could theoretically drift, though this has not been observed in practice.

## Strongly inferred

ZIP entries that fail individually are kept as original HEIC in the output ZIP (`skipped` stat). If **all** HEIC entries fail, the entire ZIP conversion fails and the original ZIP is re-downloaded.
