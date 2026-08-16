import type { NextRequest } from "next/server";
import { handleClockRequest } from "@/lib/attendance/clockHandler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleClockRequest(request);
}
