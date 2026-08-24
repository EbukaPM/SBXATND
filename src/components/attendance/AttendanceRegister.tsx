"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { countWords, MAX_EARLY_CLOCKOUT_REASON_WORDS } from "@/lib/attendance/rules";

interface AttendanceRegisterProps {
  companyName: string;
  logoUrl: string | null;
  resetSeconds: number;
  initialError?: string | null;
  hasQrSession: boolean;
}

type ClockResult =
  | {
      ok: true;
      action: "CLOCK_IN" | "CLOCK_OUT";
      firstName: string;
      time: string;
      status?: string;
      clockInTime?: string;
      totalMinutesWorked?: number;
      clockOutStatus?: "EARLY" | "ON_TIME";
    }
  | { ok: false; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  qr_not_found: "This QR code is invalid or has expired.\nPlease scan today's attendance QR code.",
  qr_deactivated: "This QR code is invalid or has expired.\nPlease scan today's attendance QR code.",
  qr_expired: "This QR code has expired.\nPlease scan today's attendance QR code.",
  qr_wrong_date: "This QR code is not valid for today.\nPlease scan today's attendance QR code.",
  qr_not_yet_active: "This QR code is not active yet.",
};

export function AttendanceRegister({
  companyName,
  logoUrl,
  resetSeconds,
  initialError,
  hasQrSession,
}: AttendanceRegisterProps) {
  const [attendanceId, setAttendanceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsEarlyReason, setNeedsEarlyReason] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");
  const [result, setResult] = useState<ClockResult | null>(
    initialError ? { ok: false, message: ERROR_MESSAGES[initialError] ?? "Something went wrong." } : null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (needsEarlyReason) {
      reasonRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [result, needsEarlyReason]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => {
      setResult(null);
      setAttendanceId("");
    }, resetSeconds * 1000);
    return () => clearTimeout(t);
  }, [result, resetSeconds]);

  async function submitClock(reason?: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reason ? { attendanceId, earlyClockOutReason: reason } : { attendanceId }),
      });
      const data = await res.json();
      if (data.ok) {
        setNeedsEarlyReason(false);
        setEarlyReason("");
        setResult(data as ClockResult);
        setAttendanceId("");
      } else if (data.reason === "EARLY_CLOCKOUT_REASON_REQUIRED") {
        setNeedsEarlyReason(true);
      } else {
        setNeedsEarlyReason(false);
        setEarlyReason("");
        setResult({ ok: false, message: data.message ?? "Attendance could not be recorded." });
        setAttendanceId("");
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
      setAttendanceId("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!attendanceId.trim() || submitting) return;
    submitClock();
  }

  function handleConfirmEarlyClockOut(e: FormEvent) {
    e.preventDefault();
    const wordCount = countWords(earlyReason);
    if (wordCount === 0 || wordCount > MAX_EARLY_CLOCKOUT_REASON_WORDS || submitting) return;
    submitClock(earlyReason.trim());
  }

  function cancelEarlyClockOut() {
    setNeedsEarlyReason(false);
    setEarlyReason("");
    setAttendanceId("");
  }

  if (result) {
    return <ResultScreen result={result} />;
  }

  if (needsEarlyReason) {
    const wordCount = countWords(earlyReason);
    const overLimit = wordCount > MAX_EARLY_CLOCKOUT_REASON_WORDS;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-700">
            !
          </div>
          <h2 className="text-center text-xl font-bold">Clocking out early</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            You&apos;re clocking out before the end of your scheduled work day. Please briefly state why (max{" "}
            {MAX_EARLY_CLOCKOUT_REASON_WORDS} words) — your manager will be able to see this.
          </p>
          <form onSubmit={handleConfirmEarlyClockOut} className="mt-6 flex flex-col gap-2">
            <textarea
              ref={reasonRef}
              value={earlyReason}
              onChange={(e) => setEarlyReason(e.target.value)}
              rows={4}
              placeholder="e.g. Feeling unwell, left with manager's approval"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className={`text-right text-xs ${overLimit ? "text-red-600" : "text-muted-foreground"}`}>
              {wordCount}/{MAX_EARLY_CLOCKOUT_REASON_WORDS} words
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="submit"
                size="xl"
                disabled={submitting || wordCount === 0 || overLimit}
                className="flex-1"
              >
                {submitting ? "Please wait…" : "Confirm Clock Out Early"}
              </Button>
              <Button type="button" variant="outline" size="xl" onClick={cancelEarlyClockOut} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="mx-auto mb-4 h-16 w-16 object-contain sm:h-20 sm:w-20" />
        ) : null}
        <h1 className="text-xl font-bold sm:text-2xl">{companyName}</h1>
        <p className="mt-1 text-sm font-medium tracking-wide text-muted-foreground">OFFICE ATTENDANCE</p>
        {hasQrSession ? (
          <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            QR verified — enter your Attendance ID to continue.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Input
            ref={inputRef}
            autoFocus
            inputMode="text"
            autoComplete="off"
            placeholder="Enter your Attendance ID"
            value={attendanceId}
            onChange={(e) => setAttendanceId(e.target.value)}
            className="h-14 text-center text-base tracking-wide uppercase sm:h-16 sm:text-xl sm:tracking-widest"
            maxLength={40}
          />
          <Button type="submit" size="xl" disabled={submitting || !attendanceId.trim()}>
            {submitting ? "Please wait…" : "CLOCK IN / OUT"}
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Leaving before end of day? Just enter your ID above — you&apos;ll be asked for a quick reason.
        </p>
      </div>
    </div>
  );
}

function ResultScreen({ result }: { result: ClockResult }) {
  if (!result.ok) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-8 text-center sm:px-6 sm:py-12">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
            ✕
          </div>
          <h2 className="text-xl font-bold text-red-600">ATTENDANCE DENIED</h2>
          <p className="mt-3 whitespace-pre-line text-muted-foreground">{result.message}</p>
        </div>
      </div>
    );
  }

  const greeting = result.action === "CLOCK_IN" ? "Good day" : "Goodbye";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-8 text-center sm:px-6 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
          ✓
        </div>
        <h2 className="text-xl font-bold text-green-700">SUCCESS</h2>
        <p className="mt-2 text-lg">
          {greeting}, {result.firstName}.
        </p>

        {result.action === "CLOCK_IN" ? (
          <div className="mt-4 space-y-1">
            <p className="text-sm text-muted-foreground">Clock-in</p>
            <p className="text-2xl font-semibold">{result.time}</p>
            {result.status ? (
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-primary">
                Status: {result.status.replace("_", " ")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-1">
            <p className="text-sm text-muted-foreground">Clock-out</p>
            <p className="text-2xl font-semibold">{result.time}</p>
            {typeof result.totalMinutesWorked === "number" ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Hours worked: {(result.totalMinutesWorked / 60).toFixed(1)}h
              </p>
            ) : null}
            {result.clockOutStatus === "EARLY" ? (
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-amber-700">
                Clocked out early — reason recorded
              </p>
            ) : null}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">Return to attendance screen…</p>
      </div>
    </div>
  );
}
