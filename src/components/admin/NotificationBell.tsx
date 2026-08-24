"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

const POLL_MS = 30_000;

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/notifications/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.count === "number") setCount(data.count);
      } catch {
        // Transient network failure — the badge just keeps its last known count.
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      href="/admin/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border hover:bg-muted"
    >
      <Bell className="h-4 w-4" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
