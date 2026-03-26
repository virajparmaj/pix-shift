import { base64ToBlob, blobToBase64 } from '../shared/utils';
import { JPEG_QUALITY, type OutputFormat } from '../shared/constants';

export async function convertHeic(
  heicBase64: string,
  outputFormat: OutputFormat,
  quality?: number
): Promise<string> {
  const heicBlob = base64ToBlob(heicBase64, 'image/heic');

  // Dynamic import to avoid loading WASM until needed
  const { heicTo } = await import('heic-to/csp');

  const outputBlob = await heicTo({
    blob: heicBlob,
    type: outputFormat,
    quality: outputFormat === 'image/jpeg' ? (quality ?? JPEG_QUALITY) : undefined,
  });

  return blobToBase64(outputBlob);
}
