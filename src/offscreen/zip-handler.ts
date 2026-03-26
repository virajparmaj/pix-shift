import JSZip from 'jszip';
import { isHeicFile, heicToOutputFilename } from '../shared/utils';
import { convertHeic } from './converter';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../shared/utils';
import type { OutputFormat } from '../shared/constants';

interface ZipConversionStats {
  converted: number;
  skipped: number;
  passthrough: number;
}

export async function convertZip(
  zipBase64: string,
  outputFormat: OutputFormat
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
        const convertedBase64 = await convertHeic(heicBase64, outputFormat);
        const convertedBuffer = base64ToArrayBuffer(convertedBase64);
        const newPath = heicToOutputFilename(path, outputFormat);
        output.file(newPath, convertedBuffer);
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
