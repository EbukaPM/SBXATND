"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import { toastError } from "@/hooks/use-toast";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await markAllNotificationsReadAction();
          } catch (err) {
            toastError(err);
          }
        })
      }
    >
      Mark all read
    </Button>
  );
}

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await markNotificationReadAction(notificationId);
          } catch (err) {
            toastError(err);
          }
        })
      }
    >
      Mark read
    </Button>
  );
}
