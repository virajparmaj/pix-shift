import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createImgFallbackBaseName,
  deriveSinglePhotoOutputFilename,
  extractFilenameFromContentDisposition,
  heicToOutputFilename,
  isHeicFile,
  sanitizeDownloadFilename,
  zipToOutputFilename,
} from '../src/shared/utils';

test('isHeicFile detects .heic and .heif extensions', () => {
  assert.equal(isHeicFile('photo.heic'), true);
  assert.equal(isHeicFile('photo.HEIC'), true);
  assert.equal(isHeicFile('photo.heif'), true);
  assert.equal(isHeicFile('photo.HEIF'), true);
  assert.equal(isHeicFile('subfolder/IMG_1234.HEIC'), true);
});

test('isHeicFile rejects non-HEIC files', () => {
  assert.equal(isHeicFile('photo.jpg'), false);
  assert.equal(isHeicFile('photo.png'), false);
  assert.equal(isHeicFile('archive.zip'), false);
  assert.equal(isHeicFile('document.pdf'), false);
  assert.equal(isHeicFile('photo.heicx'), false);
});

test('heicToOutputFilename converts to PNG', () => {
  assert.equal(heicToOutputFilename('photo.heic', 'image/png'), 'photo.png');
  assert.equal(heicToOutputFilename('photo.HEIC', 'image/png'), 'photo.png');
  assert.equal(heicToOutputFilename('photo.heif', 'image/png'), 'photo.png');
  assert.equal(heicToOutputFilename('sub/IMG_001.HEIC', 'image/png'), 'sub/IMG_001.png');
});

test('heicToOutputFilename converts to JPEG', () => {
  assert.equal(heicToOutputFilename('photo.heic', 'image/jpeg'), 'photo.jpg');
  assert.equal(heicToOutputFilename('photo.HEIF', 'image/jpeg'), 'photo.jpg');
  assert.equal(heicToOutputFilename('sub/IMG_001.HEIC', 'image/jpeg'), 'sub/IMG_001.jpg');
});

test('zipToOutputFilename always returns PixShift.zip', () => {
  assert.equal(zipToOutputFilename(), 'PixShift.zip');
});

test('extractFilenameFromContentDisposition parses quoted filename', () => {
  assert.equal(
    extractFilenameFromContentDisposition('attachment; filename="IMG_2772.HEIC"'),
    'IMG_2772.HEIC'
  );
});

test('extractFilenameFromContentDisposition prefers and decodes filename*', () => {
  assert.equal(
    extractFilenameFromContentDisposition(
      "attachment; filename=\"ignored.heic\"; filename*=UTF-8''IMG_2773%20Live.HEIC"
    ),
    'IMG_2773 Live.HEIC'
  );
});

test('sanitizeDownloadFilename keeps only a safe basename', () => {
  assert.equal(sanitizeDownloadFilename('nested/path/IMG_2774.HEIC'), 'IMG_2774.HEIC');
  assert.equal(sanitizeDownloadFilename('nested\\\\path\\\\IMG_2774.HEIC'), 'IMG_2774.HEIC');
  assert.equal(sanitizeDownloadFilename('../IMG_2774:Live?.HEIC'), 'IMG_2774_Live_.HEIC');
});

test('createImgFallbackBaseName creates camera-style fallback names', () => {
  assert.equal(createImgFallbackBaseName(1), 'IMG_0001');
  assert.equal(createImgFallbackBaseName(2), 'IMG_0002');
});

test('deriveSinglePhotoOutputFilename uses recovered Google Photos name', () => {
  assert.equal(
    deriveSinglePhotoOutputFilename('attachment; filename="IMG_2772.HEIC"', 'photo.heic', 'image/png', 1),
    'IMG_2772.png'
  );
  assert.equal(
    deriveSinglePhotoOutputFilename('attachment; filename="IMG_2772.HEIC"', 'photo.heic', 'image/jpeg', 1),
    'IMG_2772.jpg'
  );
});

test('deriveSinglePhotoOutputFilename uses original filename when header is missing', () => {
  assert.equal(deriveSinglePhotoOutputFilename(null, 'Vacation.HEIC', 'image/png', 1), 'Vacation.png');
  assert.equal(deriveSinglePhotoOutputFilename(null, 'Vacation.HEIC', 'image/jpeg', 1), 'Vacation.jpg');
});

test('deriveSinglePhotoOutputFilename ignores random-like header names and uses readable original name', () => {
  assert.equal(
    deriveSinglePhotoOutputFilename(
      'attachment; filename="d27df9f6-073b-4b3f-a62c-b529bc1c5c54.HEIC"',
      'IMG_5321.HEIC',
      'image/png',
      1
    ),
    'IMG_5321.png'
  );
});

test('deriveSinglePhotoOutputFilename falls back to sequential IMG names when both candidates are random-like', () => {
  assert.equal(
    deriveSinglePhotoOutputFilename(
      'attachment; filename="d27df9f6-073b-4b3f-a62c-b529bc1c5c54.HEIC"',
      'c3b85f81e99142829dddfec7e3e2fb60.HEIC',
      'image/png',
      1
    ),
    'IMG_0001.png'
  );
  assert.equal(
    deriveSinglePhotoOutputFilename(null, 'd27df9f6-073b-4b3f-a62c-b529bc1c5c54.HEIC', 'image/png', 2),
    'IMG_0002.png'
  );
});

test('deriveSinglePhotoOutputFilename catches non-standard hex IDs from Google Photos', () => {
  assert.equal(
    deriveSinglePhotoOutputFilename(null, 'cfc4505e-e9c1045446abcdef.HEIC', 'image/png', 1),
    'IMG_0001.png'
  );
  assert.equal(
    deriveSinglePhotoOutputFilename(null, '25362085ec4a3db7a146db7a1fb374.HEIC', 'image/png', 2),
    'IMG_0002.png'
  );
  assert.equal(
    deriveSinglePhotoOutputFilename(null, 'abcdef1234567890.HEIC', 'image/png', 3),
    'IMG_0003.png'
  );
});

test('deriveSinglePhotoOutputFilename preserves short or non-hex filenames', () => {
  assert.equal(
    deriveSinglePhotoOutputFilename(null, 'cafe-babe.HEIC', 'image/png', 1),
    'cafe-babe.png'
  );
  assert.equal(
    deriveSinglePhotoOutputFilename(null, 'IMG_2772.HEIC', 'image/png', 1),
    'IMG_2772.png'
  );
});
