import type { Config } from "@netlify/functions";

/** Netlify Scheduled Function wrapping GET /api/cron/daily-housekeeping — see sweep-qr.ts for why this exists. */
const handler = async () => {
  const baseUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    console.error("daily-housekeeping: missing URL or CRON_SECRET env var");
    return new Response("misconfigured", { status: 500 });
  }

  const res = await fetch(`${baseUrl}/api/cron/daily-housekeeping`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`daily-housekeeping: ${res.status} ${body}`);
  return new Response(body, { status: res.status });
};

export const config: Config = {
  // Netlify scheduled functions run in UTC. 00:05 UTC = 01:05 Africa/Lagos (UTC+1).
  schedule: "5 0 * * *",
};

export default handler;
