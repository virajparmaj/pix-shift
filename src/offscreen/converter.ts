import { HEIC_WORKER_PATH, JPEG_QUALITY, type OutputFormat } from '../shared/constants';

interface DecodeResponseMessage {
  id: string;
  data?: Uint8ClampedArray;
  error?: string;
  height?: number;
  width?: number;
}

interface PendingDecode {
  reject: (error: Error) => void;
  resolve: (imageData: ImageData) => void;
}

const pendingDecodes = new Map<string, PendingDecode>();
let decodeWorker: Worker | null = null;

function rejectAllPending(error: Error): void {
  for (const pending of pendingDecodes.values()) {
    pending.reject(error);
  }
  pendingDecodes.clear();
}

function handleWorkerMessage(event: MessageEvent<DecodeResponseMessage>): void {
  const pending = pendingDecodes.get(event.data.id);
  if (!pending) {
    return;
  }

  pendingDecodes.delete(event.data.id);

  if (event.data.error) {
    pending.reject(new Error(event.data.error));
    return;
  }

  if (
    event.data.width === undefined ||
    event.data.height === undefined ||
    event.data.data === undefined
  ) {
    pending.reject(new Error('Incomplete HEIF decode response'));
    return;
  }

  const pixelData = new Uint8ClampedArray(event.data.data);
  pending.resolve(new ImageData(pixelData, event.data.width, event.data.height));
}

function handleWorkerError(event: ErrorEvent): void {
  const message = event.message || 'HEIF worker crashed';
  rejectAllPending(new Error(message));
  decodeWorker?.terminate();
  decodeWorker = null;
}

function getDecodeWorker(): Worker {
  if (!decodeWorker) {
    decodeWorker = new Worker(chrome.runtime.getURL(HEIC_WORKER_PATH), { type: 'module' });
    decodeWorker.addEventListener('message', handleWorkerMessage);
    decodeWorker.addEventListener('error', handleWorkerError);
  }

  return decodeWorker;
}

async function decodeHeic(heicBuffer: ArrayBuffer): Promise<ImageData> {
  const worker = getDecodeWorker();
  const requestId = crypto.randomUUID();

  return new Promise<ImageData>((resolve, reject) => {
    pendingDecodes.set(requestId, { resolve, reject });
    worker.postMessage({ id: requestId, buffer: heicBuffer }, [heicBuffer]);
  });
}

export async function convertHeic(
  heicBuffer: ArrayBuffer,
  outputFormat: OutputFormat,
  quality?: number
): Promise<ArrayBuffer> {
  const imageData = await decodeHeic(heicBuffer);
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create conversion canvas');
  }

  context.putImageData(imageData, 0, 0);

  try {
    const outputBlob = await canvas.convertToBlob({
      type: outputFormat,
      quality: outputFormat === 'image/jpeg' ? (quality ?? JPEG_QUALITY) : undefined,
    });

    return outputBlob.arrayBuffer();
  } finally {
    canvas.width = 1;
    canvas.height = 1;
    context.clearRect(0, 0, 1, 1);
  }
}
