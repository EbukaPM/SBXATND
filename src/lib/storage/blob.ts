import { put, del } from "@vercel/blob";

/**
 * Thin abstraction over the object-storage provider. Swapping providers later
 * (S3, Cloudinary, Supabase Storage) means changing only this file.
 */
export interface UploadResult {
  url: string;
  pathname: string;
}

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export class UploadValidationError extends Error {}

export async function uploadImage(
  folder: "logos" | "employee-photos",
  file: File
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadValidationError(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new UploadValidationError("File exceeds the 5MB limit");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Basic content sniffing so a renamed .exe with a .png extension can't slip through.
  if (!looksLikeDeclaredType(buffer, file.type)) {
    throw new UploadValidationError("File content does not match its declared type");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const pathname = `${folder}/${crypto.randomUUID()}-${safeName}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
  });

  return { url: blob.url, pathname: blob.pathname };
}

export async function deleteImage(pathname: string): Promise<void> {
  await del(pathname);
}

/** For server-generated content (rendered PDFs, QR PNGs) — not user-uploaded, so it skips upload validation. */
export async function uploadGeneratedBuffer(
  pathname: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const blob = await put(pathname, buffer, { access: "public", contentType, addRandomSuffix: false });
  return { url: blob.url, pathname: blob.pathname };
}

function looksLikeDeclaredType(buffer: Buffer, declaredType: string): boolean {
  const magic = buffer.subarray(0, 12);
  switch (declaredType) {
    case "image/png":
      return magic.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/jpeg":
    case "image/jpg":
      return magic[0] === 0xff && magic[1] === 0xd8;
    case "image/svg+xml": {
      const text = buffer.subarray(0, 500).toString("utf8").trimStart().toLowerCase();
      // Reject SVGs carrying script/event-handler payloads — they render inline in <img>
      // contexts across the app (kiosk, reports, admin), so treat them as untrusted markup.
      if (/<script|on\w+\s*=|javascript:/i.test(text)) return false;
      return text.startsWith("<?xml") || text.startsWith("<svg");
    }
    default:
      return false;
  }
}
