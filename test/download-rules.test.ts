import assert from 'node:assert/strict';
import test from 'node:test';
import { getInterceptKind, isExtensionOwnedDownload, isGooglePhotosDownload } from '../src/background/download-rules';

test('skips extension-owned downloads', () => {
  assert.equal(
    isExtensionOwnedDownload(
      {
        byExtensionId: 'abc123',
        filename: 'photo.png',
        mime: 'image/png',
        url: 'https://example.com/photo.png',
      },
      'abc123'
    ),
    true
  );
});

test('detects Google Photos downloads by URL and referrer', () => {
  assert.equal(
    isGooglePhotosDownload({
      filename: 'photo.heic',
      mime: 'image/heic',
      url: 'https://lh3.googleusercontent.com/pw/abc',
    }),
    true
  );

  assert.equal(
    isGooglePhotosDownload({
      filename: 'archive.zip',
      mime: 'application/zip',
      referrer: 'https://photos.google.com/share/123',
      url: 'https://example.com/archive.zip',
    }),
    true
  );

  assert.equal(
    isGooglePhotosDownload({
      filename: 'archive.zip',
      mime: 'application/zip',
      url: 'https://example.com/archive.zip',
    }),
    false
  );
});

test('classifies HEIC and ZIP downloads', () => {
  assert.equal(
    getInterceptKind({
      filename: 'IMG_0001.HEIC',
      mime: 'image/heic',
      url: 'https://lh3.googleusercontent.com/pw/abc',
    }),
    'heic'
  );

  assert.equal(
    getInterceptKind({
      filename: 'Takeout.zip',
      mime: 'application/octet-stream',
      url: 'https://lh3.googleusercontent.com/pw/abc',
    }),
    'zip'
  );

  assert.equal(
    getInterceptKind({
      filename: 'notes.txt',
      mime: 'text/plain',
      url: 'https://lh3.googleusercontent.com/pw/abc',
    }),
    null
  );
});
