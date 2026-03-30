# PixShift — Deployment

**Confirmed from code**

## Release channel

Chrome Web Store (manual submission). No CI/CD pipeline detected in repository.

## Pre-release checklist

Defined in `docs/release-checklist.md`. Key gates:

1. `npm run typecheck` — must pass
2. `npm test` — must pass
3. `npm run release:check` — validates build output and manifest
4. Manual verification in Chrome 116+ (single HEIC, bulk ZIP, failure recovery, disabled mode)

## dist/ artifact inventory

After `npm run build`, `dist/` must contain:

| File | Source |
|------|--------|
| `manifest.json` | `public/manifest.json` |
| `offscreen.html` | `public/offscreen.html` |
| `popup.html` | `public/popup.html` |
| `popup.css` | `public/popup.css` |
| `icons/` | `public/icons/` |
| `background.js` | built from `src/background/index.ts` |
| `offscreen.js` | built from `src/offscreen/index.ts` |
| `popup.js` | built from `src/popup/index.ts` |
| `heic-worker.js` | built from `src/offscreen/heic-worker.ts` |

## Manifest permissions

```json
"permissions": ["downloads", "offscreen", "storage"],
"host_permissions": [
  "https://photos.google.com/*",
  "https://*.googleusercontent.com/*",
  "https://*.usercontent.google.com/*"
]
```

CSP: `script-src 'self' 'wasm-unsafe-eval'` (required for libheif WASM).

## Chrome Web Store requirements

- Hosted privacy policy URL (based on `PRIVACY.md`)
- Permission justifications for `downloads`, `offscreen`, `storage`, and host permissions
- Listing must describe local-only conversion and no external data transmission

## Packaging for submission

Zip the contents of `dist/` (not the `dist/` folder itself). Confirm no `.DS_Store` or hidden files (build script prunes them automatically).

## Version

Current: `1.1.0` — in both `package.json` and `public/manifest.json` (keep in sync).
