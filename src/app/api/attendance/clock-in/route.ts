import type { NextRequest } from "next/server";
import { handleClockRequest } from "@/lib/attendance/clockHandler";

export const runtime = "nodejs";

// Auto-detects clock-in vs clock-out server-side (see clockHandler) so the
// kiosk never needs the employee to choose — this route and /clock-out are
// equivalent entry points into the same state machine.
export async function POST(request: NextRequest) {
  return handleClockRequest(request);
}
