import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { sweepQrStatuses } from "@/lib/qr/manage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const updated = await sweepQrStatuses();
  return NextResponse.json({ ok: true, updated });
}
