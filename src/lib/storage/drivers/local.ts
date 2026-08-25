import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./types";

/** Single-server self-hosting: writes to a directory on disk. Mount this as a
 * persistent volume in Docker (STORAGE_LOCAL_DIR) — it is NOT safe across multiple
 * app replicas/servers, since each would see a different local filesystem. Use the
 * S3 driver instead for anything beyond a single server. */
const ROOT = process.env.STORAGE_LOCAL_DIR || "./storage";

function resolvePath(pathname: string): string {
  // pathname is always app-generated (e.g. "logos/<uuid>-name.png"), never raw user
  // input, but normalize defensively so it can never escape ROOT via "..".
  const safe = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  // ROOT is only known at runtime (STORAGE_LOCAL_DIR), which makes Next's build-time
  // file tracer bundle the *entire* project into the standalone output "just in
  // case" — this driver does plain fs I/O at request time, never an import(), so
  // there's nothing for the tracer to usefully find here. Suppressed per Next's own
  // documented fix for this warning.
  return path.join(/* turbopackIgnore: true */ ROOT, safe);
}

function metaPath(filePath: string): string {
  return `${filePath}.meta.json`;
}

export const localDriver: StorageDriver = {
  async set(pathname, data, contentType) {
    const filePath = resolvePath(pathname);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    await writeFile(metaPath(filePath), JSON.stringify({ contentType }));
  },
  async get(pathname) {
    const filePath = resolvePath(pathname);
    try {
      const data = await readFile(filePath);
      const metaRaw = await readFile(metaPath(filePath), "utf8").catch(() => null);
      const contentType = metaRaw ? (JSON.parse(metaRaw).contentType ?? "application/octet-stream") : "application/octet-stream";
      return { data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer, contentType };
    } catch {
      return null;
    }
  },
  async delete(pathname) {
    const filePath = resolvePath(pathname);
    await rm(filePath, { force: true });
    await rm(metaPath(filePath), { force: true });
  },
};
