// @ts-expect-error Internal dependency path bundled into a dedicated worker asset.
import buildLibheif from '../../node_modules/heic-to/src/lib/libheif-without-unsafe-eval.js';

interface DecodeRequestMessage {
  id: string;
  buffer: ArrayBuffer;
}

interface DecodeResponseMessage {
  id: string;
  data?: Uint8ClampedArray;
  error?: string;
  height?: number;
  width?: number;
}

interface WorkerScopeLike {
  onmessage: ((event: MessageEvent<DecodeRequestMessage>) => void | Promise<void>) | null;
  postMessage(message: DecodeResponseMessage, transfer?: Transferable[]): void;
}

const workerScope = self as unknown as WorkerScopeLike;
const libheif = buildLibheif() as any;

async function decodeHeicBuffer(buffer: ArrayBuffer): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  let decoder: any;
  let images: any[] | undefined;

  try {
    decoder = new libheif.HeifDecoder();
    images = decoder.decode(buffer);

    if (!images?.length) {
      throw new Error('HEIF image not found');
    }

    const image = images[0];
    const width = image.get_width();
    const height = image.get_height();
    const data = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < width * height; index++) {
      data[index * 4 + 3] = 255;
    }

    const surface = { data, height, width } as ImageData;

    await new Promise<void>((resolve, reject) => {
      image.display(surface, (displayData: ImageData | null) => {
        if (!displayData) {
          reject(new Error('HEIF processing error'));
          return;
        }

        resolve();
      });
    });

    return { width, height, data };
  } finally {
    if (images?.length) {
      for (const image of images) {
        image.free();
      }
    }

    if (decoder?.decoder) {
      libheif.heif_context_free(decoder.decoder);
    }
  }
}

workerScope.onmessage = async (event: MessageEvent<DecodeRequestMessage>) => {
  const { id, buffer } = event.data;

  try {
    const decoded = await decodeHeicBuffer(buffer);
    const response: DecodeResponseMessage = {
      id,
      data: decoded.data,
      height: decoded.height,
      width: decoded.width,
    };

    workerScope.postMessage(response, [decoded.data.buffer as ArrayBuffer]);
  } catch (error) {
    const response: DecodeResponseMessage = {
      id,
      error: error instanceof Error ? error.message : 'HEIF decoding failed',
    };

    workerScope.postMessage(response);
  }
};

export {};
