import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/network/getClientIp";
import { processHeartbeat } from "@/lib/network/heartbeat";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  officeId: z.string().min(1),
  agentId: z.string().min(1),
  reportedIp: z.string().min(3).max(64),
  timestamp: z.string().min(1),
  signature: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const sourceIp = getClientIp(request) ?? "unknown";

  const rate = await checkRateLimit(sourceIp, RATE_LIMITS.networkHeartbeat);
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, message: "Too many heartbeats." }, { status: 429 });
  }

  let body;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const result = await processHeartbeat({ ...body, sourceIp });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
