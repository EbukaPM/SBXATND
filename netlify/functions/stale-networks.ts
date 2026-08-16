import type { Config } from "@netlify/functions";

/** Netlify Scheduled Function wrapping GET /api/cron/stale-networks — see sweep-qr.ts for why this exists. */
const handler = async () => {
  const baseUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    console.error("stale-networks: missing URL or CRON_SECRET env var");
    return new Response("misconfigured", { status: 500 });
  }

  const res = await fetch(`${baseUrl}/api/cron/stale-networks`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`stale-networks: ${res.status} ${body}`);
  return new Response(body, { status: res.status });
};

export const config: Config = {
  schedule: "*/10 * * * *",
};

export default handler;
