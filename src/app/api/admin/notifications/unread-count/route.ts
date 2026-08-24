import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { getUnreadNotificationCount } from "@/lib/notifications/query";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const count = await getUnreadNotificationCount(user.role);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ ok: false }, { status });
  }
}
