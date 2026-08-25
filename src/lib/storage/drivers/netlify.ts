import { getStore } from "@netlify/blobs";
import type { StorageDriver } from "./types";

const STORE_NAME = "attendance-media";

// Inside Netlify's own runtime (Functions / Next.js Route Handlers via the Next
// Runtime), siteID + token are injected automatically. Outside it (local `next dev`
// without the Netlify CLI), fall back to explicit credentials if provided.
function mediaStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  return siteID && token ? getStore(STORE_NAME, { siteID, token }) : getStore(STORE_NAME);
}

export const netlifyDriver: StorageDriver = {
  async set(pathname, data, contentType) {
    await mediaStore().set(pathname, new Blob([new Uint8Array(data)]), { metadata: { contentType } });
  },
  async get(pathname) {
    const result = await mediaStore().getWithMetadata(pathname, { type: "arrayBuffer" });
    if (!result) return null;
    const contentType = typeof result.metadata?.contentType === "string" ? result.metadata.contentType : "application/octet-stream";
    return { data: result.data, contentType };
  },
  async delete(pathname) {
    await mediaStore().delete(pathname);
  },
};
