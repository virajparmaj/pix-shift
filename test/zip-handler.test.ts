import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSZip from 'jszip';
import { convertZip, type HeicConverter } from '../src/offscreen/zip-handler';

async function createTestZip(files: Record<string, Uint8Array>): Promise<ArrayBuffer> {
  const zip = new JSZip();
  for (const [name, data] of Object.entries(files)) {
    zip.file(name, data);
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

async function readZipEntries(buffer: ArrayBuffer): Promise<Record<string, ArrayBuffer>> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: Record<string, ArrayBuffer> = {};
  for (const [path, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      entries[path] = await file.async('arraybuffer');
    }
  }
  return entries;
}

const FAKE_HEIC = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
const FAKE_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const FAKE_JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

const succeedConverter: HeicConverter = async () => FAKE_PNG.buffer as ArrayBuffer;
const failConverter: HeicConverter = async () => { throw new Error('decode failed'); };

describe('convertZip', () => {
  it('converts HEIC entries and renames to PNG', async () => {
    const input = await createTestZip({
      'IMG_001.HEIC': FAKE_HEIC,
      'IMG_002.heic': FAKE_HEIC,
    });

    const { zipBuffer, stats } = await convertZip(input, 'image/png', succeedConverter);

    assert.equal(stats.converted, 2);
    assert.equal(stats.skipped, 0);
    assert.equal(stats.passthrough, 0);

    const entries = await readZipEntries(zipBuffer);
    assert.ok('IMG_001.png' in entries, 'IMG_001.png should exist');
    assert.ok('IMG_002.png' in entries, 'IMG_002.png should exist');
    assert.ok(!('IMG_001.HEIC' in entries), 'original HEIC should be removed');
  });

  it('converts HEIC entries and renames to JPEG', async () => {
    const jpgConverter: HeicConverter = async () => FAKE_JPG.buffer as ArrayBuffer;
    const input = await createTestZip({ 'photo.heic': FAKE_HEIC });

    const { zipBuffer, stats } = await convertZip(input, 'image/jpeg', jpgConverter);

    assert.equal(stats.converted, 1);
    const entries = await readZipEntries(zipBuffer);
    assert.ok('photo.jpg' in entries);
  });

  it('passes through non-HEIC files unchanged', async () => {
    const input = await createTestZip({
      'photo.heic': FAKE_HEIC,
      'readme.txt': new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]),
      'existing.jpg': FAKE_JPG,
    });

    const { zipBuffer, stats } = await convertZip(input, 'image/png', succeedConverter);

    assert.equal(stats.converted, 1);
    assert.equal(stats.passthrough, 2);
    assert.equal(stats.skipped, 0);

    const entries = await readZipEntries(zipBuffer);
    assert.ok('photo.png' in entries);
    assert.ok('readme.txt' in entries);
    assert.ok('existing.jpg' in entries);
  });

  it('handles partial failure: some conversions fail, keeps originals', async () => {
    let callCount = 0;
    const partialConverter: HeicConverter = async () => {
      callCount++;
      if (callCount === 2) throw new Error('decode failed');
      return FAKE_PNG.buffer as ArrayBuffer;
    };

    const input = await createTestZip({
      'IMG_001.heic': FAKE_HEIC,
      'IMG_002.heic': FAKE_HEIC,
      'IMG_003.heic': FAKE_HEIC,
    });

    const { zipBuffer, stats } = await convertZip(input, 'image/png', partialConverter);

    assert.equal(stats.converted, 2);
    assert.equal(stats.skipped, 1);
    assert.equal(stats.passthrough, 0);

    const entries = await readZipEntries(zipBuffer);
    assert.equal(Object.keys(entries).length, 3);
  });

  it('throws when ALL HEIC conversions fail', async () => {
    const input = await createTestZip({
      'IMG_001.heic': FAKE_HEIC,
      'IMG_002.heic': FAKE_HEIC,
    });

    await assert.rejects(() => convertZip(input, 'image/png', failConverter), {
      message: 'All 2 HEIC files failed to convert',
    });
  });

  it('handles ZIP with no HEIC files (passthrough only)', async () => {
    let converterCalled = false;
    const noopConverter: HeicConverter = async () => {
      converterCalled = true;
      return new ArrayBuffer(0);
    };

    const input = await createTestZip({
      'photo.jpg': FAKE_JPG,
      'photo.png': FAKE_PNG,
    });

    const { stats } = await convertZip(input, 'image/png', noopConverter);

    assert.equal(stats.converted, 0);
    assert.equal(stats.skipped, 0);
    assert.equal(stats.passthrough, 2);
    assert.equal(converterCalled, false);
  });

  it('preserves original HEIC data in fallback path (not detached)', async () => {
    let callCount = 0;
    const oneFailConverter: HeicConverter = async () => {
      callCount++;
      if (callCount === 1) throw new Error('decode failed');
      return FAKE_PNG.buffer as ArrayBuffer;
    };

    const heicData = new Uint8Array([1, 2, 3, 4, 5]);
    const input = await createTestZip({
      'fail.heic': heicData,
      'ok.heic': FAKE_HEIC,
    });

    const { zipBuffer, stats } = await convertZip(input, 'image/png', oneFailConverter);
    assert.equal(stats.skipped, 1);
    assert.equal(stats.converted, 1);

    const entries = await readZipEntries(zipBuffer);
    const failedEntry = entries['fail.heic'];
    assert.ok(failedEntry, 'failed HEIC should remain in output');
    assert.ok(failedEntry.byteLength > 0, 'fallback data must not be empty (detached buffer)');
  });
});
