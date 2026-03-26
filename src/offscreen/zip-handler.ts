import JSZip from 'jszip';
import { heicToOutputFilename, isHeicFile } from '../shared/utils';
import type { OutputFormat } from '../shared/constants';
import { convertHeic } from './converter';

export interface ZipConversionStats {
  converted: number;
  skipped: number;
  passthrough: number;
}

export type HeicConverter = (buffer: ArrayBuffer, format: OutputFormat) => Promise<ArrayBuffer>;

export async function convertZip(
  zipBuffer: ArrayBuffer,
  outputFormat: OutputFormat,
  converter: HeicConverter = convertHeic
): Promise<{ zipBuffer: ArrayBuffer; stats: ZipConversionStats }> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const output = new JSZip();
  const stats: ZipConversionStats = { converted: 0, skipped: 0, passthrough: 0 };

  const entries = Object.entries(zip.files).filter(([, file]) => !file.dir);

  for (const [path, file] of entries) {
    const data = await file.async('arraybuffer');

    if (isHeicFile(path)) {
      try {
        const convertedBuffer = await converter(data.slice(0), outputFormat);
        const newPath = heicToOutputFilename(path, outputFormat);
        output.file(newPath, convertedBuffer);
        stats.converted++;
      } catch {
        output.file(path, data);
        stats.skipped++;
      }
    } else {
      output.file(path, data);
      stats.passthrough++;
    }
  }

  if (stats.converted === 0 && stats.skipped > 0) {
    throw new Error(`All ${stats.skipped} HEIC files failed to convert`);
  }

  return {
    zipBuffer: await output.generateAsync({ type: 'arraybuffer' }),
    stats,
  };
}
