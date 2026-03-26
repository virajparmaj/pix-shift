const PAYLOAD_CACHE_NAME = 'pixshift-payloads-v1';

type PayloadKind = 'input' | 'output';

function payloadUrl(kind: PayloadKind, id: string): string {
  return `https://pixshift-payload.invalid/${kind}/${id}`;
}

async function openPayloadCache(): Promise<Cache> {
  return caches.open(PAYLOAD_CACHE_NAME);
}

export async function writePayload(kind: PayloadKind, id: string, buffer: ArrayBuffer): Promise<void> {
  const cache = await openPayloadCache();
  await cache.put(payloadUrl(kind, id), new Response(buffer));
}

export async function readPayload(kind: PayloadKind, id: string): Promise<ArrayBuffer> {
  const cache = await openPayloadCache();
  const response = await cache.match(payloadUrl(kind, id));
  if (!response) {
    throw new Error(`Missing ${kind} payload for ${id}`);
  }

  return response.arrayBuffer();
}

export async function deletePayload(kind: PayloadKind, id: string): Promise<void> {
  const cache = await openPayloadCache();
  await cache.delete(payloadUrl(kind, id));
}

export async function deletePayloadPair(id: string): Promise<void> {
  await Promise.all([deletePayload('input', id), deletePayload('output', id)]);
}
