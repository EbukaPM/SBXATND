import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { flagMissedClockOuts } from "@/lib/attendance/housekeeping";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const flagged = await flagMissedClockOuts();
  return NextResponse.json({ ok: true, flagged });
}
