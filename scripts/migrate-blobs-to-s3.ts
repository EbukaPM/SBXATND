/**
 * One-time migration: copies every file out of Netlify Blobs (company logo,
 * employee photos, generated QR PDFs/PNGs) into the S3-compatible backend
 * (S3_* env vars — works with real AWS S3 or MinIO) selected via
 * src/lib/storage/drivers/s3.ts. See docs/SELF_HOSTING.md §2.
 *
 * Read-only against Netlify Blobs — nothing is deleted from the source, so
 * this is safe to re-run (each key is simply overwritten at the destination)
 * and safe to run well before actually cutting the app over to
 * STORAGE_DRIVER=s3.
 *
 * Usage:
 *   NETLIFY_SITE_ID=... NETLIFY_BLOBS_TOKEN=... \
 *   S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... [S3_ENDPOINT=...] \
 *   npx tsx scripts/migrate-blobs-to-s3.ts [--dry-run]
 *
 * Required env vars:
 *   NETLIFY_SITE_ID, NETLIFY_BLOBS_TOKEN  — source (see .env.example)
 *   S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY — destination
 * Optional: S3_ENDPOINT, S3_REGION, S3_FORCE_PATH_STYLE (see .env.example)
 */
import { getStore } from "@netlify/blobs";
import { s3Driver } from "../src/lib/storage/drivers/s3";

const STORE_NAME = "attendance-media";
const dryRun = process.argv.includes("--dry-run");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const siteID = requireEnv("NETLIFY_SITE_ID");
  const token = requireEnv("NETLIFY_BLOBS_TOKEN");
  if (!dryRun) {
    requireEnv("S3_BUCKET");
    requireEnv("S3_ACCESS_KEY_ID");
    requireEnv("S3_SECRET_ACCESS_KEY");
  }

  const store = getStore(STORE_NAME, { siteID, token });

  console.log(dryRun ? "Dry run — listing blobs only, nothing will be written.\n" : "Migrating Netlify Blobs → S3...\n");

  let migrated = 0;
  let failed = 0;
  const failedKeys: string[] = [];

  for await (const { blobs } of store.list({ paginate: true })) {
    for (const { key } of blobs) {
      try {
        const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
        if (!result) {
          console.warn(`  ⚠ ${key} — disappeared mid-migration, skipping`);
          continue;
        }

        const contentType =
          typeof result.metadata?.contentType === "string" ? result.metadata.contentType : "application/octet-stream";
        const buffer = Buffer.from(result.data);

        if (dryRun) {
          console.log(`  would copy: ${key} (${contentType}, ${buffer.byteLength} bytes)`);
        } else {
          await s3Driver.set(key, buffer, contentType);
          console.log(`  ✓ ${key} (${contentType}, ${buffer.byteLength} bytes)`);
        }
        migrated++;
      } catch (err) {
        failed++;
        failedKeys.push(key);
        console.error(`  ✗ ${key} —`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(`\n${dryRun ? "Would migrate" : "Migrated"} ${migrated} file(s).`);
  if (failed > 0) {
    console.log(`${failed} failed: ${failedKeys.join(", ")}`);
    console.log("Re-run this script to retry — it's safe, already-migrated files are just overwritten again.");
    process.exit(1);
  }

  if (!dryRun) {
    console.log(
      "\nDone. Once you've spot-checked a few files (e.g. the company logo) load correctly from the new " +
        "backend, set STORAGE_DRIVER=s3 in your environment to actually switch the app over."
    );
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
