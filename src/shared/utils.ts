import { HEIC_EXTENSIONS, type OutputFormat } from './constants';

export function isHeicFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return HEIC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function heicToOutputFilename(filename: string, format: OutputFormat): string {
  const ext = format === 'image/jpeg' ? '.jpg' : '.png';
  const lower = filename.toLowerCase();
  for (const heicExt of HEIC_EXTENSIONS) {
    if (lower.endsWith(heicExt)) {
      return filename.slice(0, -heicExt.length) + ext;
    }
  }
  return filename + ext;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  return new Blob([base64ToArrayBuffer(base64)], { type: mimeType });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return arrayBufferToBase64(buffer);
}
