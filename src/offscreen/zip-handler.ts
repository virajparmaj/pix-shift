import JSZip from 'jszip';
import { isHeicFile, heicToPngFilename } from '../shared/utils';
import { convertHeicToPng } from './converter';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../shared/utils';

interface ZipConversionStats {
  converted: number;
  skipped: number;
  passthrough: number;
}

export async function convertZip(
  zipBase64: string
): Promise<{ zipBase64: string; stats: ZipConversionStats }> {
  const zipBuffer = base64ToArrayBuffer(zipBase64);
  const zip = await JSZip.loadAsync(zipBuffer);
  const output = new JSZip();
  const stats: ZipConversionStats = { converted: 0, skipped: 0, passthrough: 0 };

  const entries = Object.entries(zip.files).filter(([, file]) => !file.dir);

  for (const [path, file] of entries) {
    const data = await file.async('arraybuffer');

    if (isHeicFile(path)) {
      try {
        const heicBase64 = arrayBufferToBase64(data);
        const pngBase64 = await convertHeicToPng(heicBase64);
        const pngBuffer = base64ToArrayBuffer(pngBase64);
        const newPath = heicToPngFilename(path);
        output.file(newPath, pngBuffer);
        stats.converted++;
      } catch {
        // If conversion fails for this file, keep the original
        output.file(path, data);
        stats.skipped++;
      }
    } else {
      output.file(path, data);
      stats.passthrough++;
    }
  }

  const outputBuffer = await output.generateAsync({ type: 'arraybuffer' });
  return {
    zipBase64: arrayBufferToBase64(outputBuffer),
    stats,
  };
}
