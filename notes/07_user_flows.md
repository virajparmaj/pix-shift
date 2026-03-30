# PixShift — User Flows

**Confirmed from code**

## Normal single photo download

1. User opens Google Photos, clicks download on one photo
2. Chrome triggers a download from `*.googleusercontent.com` or `*.usercontent.google.com`
3. PixShift intercepts; original download is silently cancelled
4. Conversion begins; popup status shows "Converting <filename>..."
5. Converted PNG or JPEG is downloaded with a sensible filename
6. Popup status shows "Converted: <original> -> <output>"; counter increments

## Bulk ZIP download

1. User selects multiple photos in Google Photos and downloads
2. Google Photos delivers a ZIP file
3. PixShift intercepts the ZIP, processes each HEIC entry
4. Non-HEIC files pass through to the output ZIP unchanged
5. Output ZIP named `PixShift.zip` is downloaded
6. Popup shows "Bulk conversion complete: N converted, M kept" (or "Partial conversion" if some HEIC files failed)

## Failed conversion (recovery path)

1. Conversion fails (decode error, timeout, or download start failure)
2. Extension attempts to re-download the original file using the intercepted URL
3. Popup shows error status with detail:
   - `"<error> - original file downloaded"` if recovery succeeded
   - `"<error> - original redownload failed"` if recovery also failed

## Changing output format

1. User opens popup, selects PNG or JPEG radio button
2. `SET_FORMAT` message sent to background; format persisted immediately
3. All subsequent conversions use the new format (in-memory update is synchronous)

## Disabling / re-enabling

1. User toggles the switch in popup to off
2. `TOGGLE_ENABLED` message sent; `enabled = false` persisted
3. All subsequent Google Photos downloads pass through unchanged
4. Popup shows "Disabled" status
5. Re-enabling sets status back to "Active"

## Non-Google Photos download

- `isGooglePhotosDownload` returns false (neither URL pattern nor `photos.google.com` referrer)
- PixShift does nothing; download proceeds normally

## Extension-owned download (re-download or converted file)

- `isExtensionOwnedDownload` detects `byExtensionId === chrome.runtime.id`
- Interception supplies the pre-registered output filename and returns immediately
- No double-intercept loop
