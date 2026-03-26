# PixShift Privacy Policy

PixShift converts supported Google Photos downloads locally inside your browser.

## What PixShift does

- Detects HEIC image downloads and ZIP archives downloaded from Google Photos.
- Cancels the original browser download when possible.
- Converts HEIC images to PNG or JPEG inside the extension.
- Saves the converted file back to your Downloads folder.

## Data handling

- Conversion happens locally on your device.
- PixShift does not send your files to any third-party server.
- PixShift does not sell, share, or transfer your images or archives.
- PixShift does not use analytics, tracking pixels, or remote code.

## Permissions used

- `downloads`: detect eligible downloads, cancel originals, and save converted output.
- `offscreen`: run the bundled conversion pipeline in an offscreen document.
- `storage`: persist your enabled state, preferred output format, conversion count, and last status.
- `https://*.googleusercontent.com/*` and `https://*.usercontent.google.com/*`: fetch the original Google Photos download bytes for local conversion or fallback redownload.

## Data retention

- PixShift stores only local extension preferences and lightweight status metadata.
- Temporary conversion payloads are kept in extension-managed cache storage only long enough to complete a conversion and are then deleted.

## Contact

Provide the support email or support URL used for your Chrome Web Store listing here before submission.
