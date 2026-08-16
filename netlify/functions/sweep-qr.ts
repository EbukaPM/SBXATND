import type { Config } from "@netlify/functions";

/**
 * Netlify Scheduled Function wrapping GET /api/cron/sweep-qr — Netlify can only
 * schedule functions in this directory, not Next.js App Router route handlers
 * directly, so this is a thin trigger that calls the real route handler (which
 * still verifies CRON_SECRET, the same as it would if called directly).
 */
const handler = async () => {
  const baseUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    console.error("sweep-qr: missing URL or CRON_SECRET env var");
    return new Response("misconfigured", { status: 500 });
  }

  const res = await fetch(`${baseUrl}/api/cron/sweep-qr`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  console.log(`sweep-qr: ${res.status} ${body}`);
  return new Response(body, { status: res.status });
};

export const config: Config = {
  schedule: "*/5 * * * *",
};

export default handler;
