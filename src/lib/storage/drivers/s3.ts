import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageDriver } from "./types";

let cachedClient: S3Client | null = null;

/** Works with real AWS S3 and any S3-compatible self-hosted store (MinIO, etc.) —
 * set S3_ENDPOINT + S3_FORCE_PATH_STYLE=true for MinIO, leave both unset for AWS. */
function getClient(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
  }
  return cachedClient;
}

function bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("S3_BUCKET must be set when STORAGE_DRIVER=s3");
  return b;
}

async function streamToArrayBuffer(stream: AsyncIterable<Uint8Array>): Promise<ArrayBuffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buf = Buffer.concat(chunks);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export const s3Driver: StorageDriver = {
  async set(pathname, data, contentType) {
    await getClient().send(
      new PutObjectCommand({ Bucket: bucket(), Key: pathname, Body: data, ContentType: contentType })
    );
  },
  async get(pathname) {
    try {
      const result = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: pathname }));
      if (!result.Body) return null;
      const data = await streamToArrayBuffer(result.Body as AsyncIterable<Uint8Array>);
      return { data, contentType: result.ContentType ?? "application/octet-stream" };
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (name === "NoSuchKey" || status === 404) return null;
      throw err;
    }
  },
  async delete(pathname) {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: pathname }));
  },
};
