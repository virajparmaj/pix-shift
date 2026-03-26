import { base64ToBlob, blobToBase64 } from '../shared/utils';

export async function convertHeicToPng(heicBase64: string): Promise<string> {
  const heicBlob = base64ToBlob(heicBase64, 'image/heic');

  // Dynamic import to avoid loading WASM until needed
  const { heicTo } = await import('heic-to/csp');

  const pngBlob = await heicTo({
    blob: heicBlob,
    type: 'image/png' as const,
  });

  return blobToBase64(pngBlob);
}
