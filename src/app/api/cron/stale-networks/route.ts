import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { sweepStaleNetworks } from "@/lib/network/staleSweep";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const marked = await sweepStaleNetworks();
  return NextResponse.json({ ok: true, marked });
}
