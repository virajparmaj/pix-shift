# PixShift Release Checklist

## Chrome Web Store metadata

- Add a hosted privacy policy URL based on `PRIVACY.md`.
- Complete the Chrome Web Store privacy tab.
- Document permission justifications for `downloads`, `offscreen`, `storage`, and the Googleusercontent host permissions.
- Confirm the listing describes local-only conversion and no external transmission.

## Packaging

- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run release:check`.
- Confirm `dist/` contains `background.js`, `offscreen.js`, `popup.js`, `heic-worker.js`, `manifest.json`, and `offscreen.html`.
- Confirm `dist/` contains no `.DS_Store` or other hidden metadata files.

## Manual verification in Chrome 116+

- Single HEIC download converts successfully.
- ZIP download converts embedded HEIC files and preserves non-HEIC entries.
- Small, fast downloads do not produce duplicate originals.
- Failed conversions re-download the original file once.
- Concurrent downloads keep the correct output filenames.
- Disabled mode passes downloads through unchanged.
- Non-Google downloads pass through unchanged.
- Popup status updates without desktop notifications.
