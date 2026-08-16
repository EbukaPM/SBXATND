# QR Attendance

## Attendance modes

Set in Admin → Settings → Attendance rules (`AttendanceSettings.attendanceMode`):

| Mode | Requires |
|---|---|
| `NETWORK_ONLY` | Attendance ID + authorized office network |
| `QR_AND_NETWORK` (default) | Attendance ID + valid daily QR + authorized office network |
| `QR_ONLY` | Attendance ID + valid daily QR — **weaker** physical-presence proof; the admin UI shows a warning when this is selected |

## Generating a QR code

Admin → QR Codes → pick office + date → **Generate / Regenerate**. This:

1. Deactivates any existing `SCHEDULED`/`ACTIVE` QR for that office+day (old QR → `DEACTIVATED`,
   any of its open scan sessions → `EXPIRED`) — see `lib/qr/manage.ts#generateDailyQr`.
2. Generates a new cryptographically random token (`crypto.randomBytes(32)`, base64url) —
   **not** derived from the date, office ID, or any employee data.
3. Stores only `tokenHash` (an HMAC-SHA256 keyed by `QR_SECRET`) in the database — the raw
   token is never persisted as a database column.
4. Renders the PDF and PNG immediately (embedding the raw token in the QR image itself) and
   uploads them to Blob storage, so "Download PDF/PNG" keeps working on demand without ever
   storing the plaintext token as queryable text. See the schema comment on
   `AttendanceQrCode.pdfUrl`/`pngUrl` for the reasoning.

## Validity window

A QR's `validFrom`/`validUntil` span the office's local calendar day (00:00–23:59 in the
office's timezone), computed at generation time. At scan time
(`lib/qr/session.ts#validateQrToken`):

- token not found → `NOT_FOUND`
- `status === DEACTIVATED` → `DEACTIVATED`
- the QR's attendance date (in the office timezone) ≠ today (in the office timezone) →
  `WRONG_DATE` — this is what rejects yesterday's QR even though nothing about the token
  itself changed
- `now < validFrom` → `NOT_YET_ACTIVE`
- `now > validUntil` → `EXPIRED`

`lib/qr/manage.ts#sweepQrStatuses` (run every 5 minutes via a Netlify Scheduled Function,
`/api/cron/sweep-qr`) flips the stored `status` between `SCHEDULED`/`ACTIVE`/`EXPIRED` so the
admin UI reflects reality, but the actual accept/reject decision at scan time is always
recomputed live against `validFrom`/`validUntil` — attendance security never depends on the
cron job having run recently.

## Scan flow

```
Employee scans QR
  → GET /attendance/qr/[token]     (lib/qr/session.ts#validateQrToken)
  → creates a QrAttendanceSession (10 min default, configurable), bound to an httpOnly cookie
  → redirect to /attendance
Employee enters their Attendance ID
  → POST /api/attendance/clock-in  (reads the QR session from the cookie, not from client JS)
  → lib/attendance/engine.ts#recordAttendance re-validates the session, checks office match,
    checks the office network if the mode requires it, then applies time rules
```

The QR session cookie is httpOnly specifically so the session token never has to be handled
by (or be readable by) client-side JavaScript — the browser just carries the cookie
automatically on the follow-up POST.

## Why QR alone isn't enough in `QR_AND_NETWORK` mode

A photo of the QR code (or a forwarded link) can leave the building; the office Wi-Fi can't.
`QR_AND_NETWORK` requires both a valid session from a *real* scan of *today's* code **and**
the request's real source IP matching the office's currently-verified network — see the
acceptance scenarios in `docs/SECURITY.md` (employee-at-home-with-a-QR-screenshot is denied).

## Cross-office QR

By default a QR scanned/session opened for Office A cannot be used to clock attendance for
an employee assigned to Office B (`QR_WRONG_OFFICE`). `AttendanceSettings.crossOfficeAttendance`
can be enabled to relax this for organizations where staff legitimately move between offices.
