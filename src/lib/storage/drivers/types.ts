/** Every storage backend (Netlify Blobs, S3-compatible, local disk) implements this. */
export interface StorageDriver {
  set(pathname: string, data: Buffer, contentType: string): Promise<void>;
  get(pathname: string): Promise<{ data: ArrayBuffer; contentType: string } | null>;
  delete(pathname: string): Promise<void>;
}
