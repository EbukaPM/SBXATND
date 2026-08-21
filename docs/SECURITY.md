# Security

## Core principle

> An employee can only successfully record attendance when the system can establish that
> the employee is authorized, the attendance date/time is valid, the required daily QR is
> valid when QR mode is enabled, and the request originates from the authorized office
> network when network verification is enabled.

Every value that decision depends on — identity, time, source IP, QR validity, network
status — is derived **server-side**. The client supplies exactly two things: an Attendance
ID and (implicitly, via cookie) a QR session token. Nothing else the client sends is ever
trusted for a security decision. See `lib/attendance/engine.ts#recordAttendance`.

## Attendance ID

- Generated with `crypto.randomInt` from a 32-character alphabet that excludes visually
  ambiguous characters (`0/O`, `1/I/L`) — human-typeable, not sequential
  (`lib/security/attendanceId.ts#generateAttendanceId`).
- Stored **only** as `attendanceIdLookup`: `HMAC-SHA256(AUTH_SECRET, normalizedId)`, hex.
  The plaintext ID is shown to the admin exactly once (at creation or regeneration) and is
  never persisted, logged, or retrievable afterward — losing it means regenerating, not
  "looking it up."
- Lookup at clock-in is an exact-match query against that HMAC — no partial/fuzzy matching,
  so there's nothing to enumerate.
- Regenerating an ID (`lib/actions/employees.ts#regenerateAttendanceIdAction`) immediately
  invalidates the old one (new `attendanceIdLookup` overwrites the old, unique constraint
  prevents reuse) and is recorded in `AttendanceIdHistory` + the audit log.
- Invalid IDs return the same generic message regardless of whether the ID never existed or
  belongs to an inactive employee — `lib/attendance/messages.ts`.

## Source IP determination

`lib/network/getClientIp.ts` is the single function every security-sensitive check calls.
On Netlify it reads the `x-nf-client-connection-ip` header, which Netlify's own edge sets
from the actual TCP connection to the request — a client sending its own copy of that header
does not override it, since Netlify's edge is the one writing it before the request reaches
the app. A raw `x-forwarded-for` read directly from `request.headers` would be spoofable by
the client; this is why the app never does that in production. The local-dev fallback
(reading `x-forwarded-for` directly) only activates when `NODE_ENV !== "production"`, so it
can never be hit by real Netlify traffic.

## Office network verification

`lib/network/verifyOfficeNetwork.ts`:

1. Loads every non-`DISABLED` `OfficeNetwork` row for the employee's office.
2. For each, checks staleness against `AttendanceSettings.networkStaleThresholdMinutes`.
   If stale **and** `failMode === FAIL_CLOSED` (the default), that network is skipped
   entirely — it can never authorize attendance while stale.
3. Compares the request's real source IP against `currentPublicIp` and/or `cidr`
   (`lib/network/matchIp.ts`) — never against a client-supplied value.
4. An office with **no** configured network denies all network-gated attendance
   (`NO_NETWORK_CONFIGURED`) — there's no default-allow state.

`currentPublicIp` can only be updated by an authenticated Network Agent heartbeat
(`lib/network/heartbeat.ts`), and even then, it's set to the **server-observed** source IP of
the heartbeat request — not the `reportedIp` field the agent claims in its payload. A
compromised or buggy agent claiming a different IP than it's actually connecting from cannot
poison the authorized IP; see the `networkAgent.test.ts` integration test
"trusts the server-observed source IP over the agent's self-reported IP."

### Network Agent authentication

- **Registration** (`lib/network/register.ts`): one-time bootstrap token, bcrypt-hashed at
  rest (`registrationTokenHash`), consumed (`registrationTokenUsedAt`) on first successful
  use so it can't be replayed even if intercepted later. Issues an `agentSigningSecret`
  (32 random bytes) — the admin never sees this value; it goes straight from the server to
  the agent's local `agent_state.json` over the same authenticated HTTPS response.
- **Heartbeats** (`lib/network/heartbeat.ts`): HMAC-SHA256 over
  `{timestamp}.{officeId,agentId,reportedIp}` keyed by the agent's signing secret, verified
  with `crypto.timingSafeEqual`. The timestamp is checked against a 5-minute skew window
  (`lib/network/agentAuth.ts#verifyAgentSignature`), so a captured heartbeat can't be replayed
  indefinitely.

## QR tokens

See [docs/QR_ATTENDANCE.md](QR_ATTENDANCE.md) for the full lifecycle. Security-relevant
points: tokens are `crypto.randomBytes(32)` (not derived from date/office/employee IDs),
stored only as an HMAC hash, and validity is re-checked live against the office timezone's
calendar date on every scan/session use — a stale or forwarded QR link is rejected the moment
the calendar day rolls over, independent of any cron job.

## Device flagging (buddy-punching detection)

Every device on office Wi-Fi shares one public IP via NAT, so IP address cannot distinguish
one employee's phone from another's — that's not a bug, it's what makes the office-network
check in the previous section work at all. Catching "one device clocking in as different
employees" therefore needs a device-level signal instead of a network one:
`lib/security/deviceId.ts` assigns a random, persistent, httpOnly cookie
(`attendance_device_id`) to each browser on its first visit to `/register` (set in
`proxy.ts`, 2-year expiry). This is a plain random ID, not a fingerprint — no canvas/font
probing — and like any client-side identifier it's inherently defeatable by clearing cookies
or switching browsers; it is a practical deterrent and review signal, not a hard guarantee.

At clock-in, `lib/attendance/deviceFlags.ts#flagDeviceReuseIfNeeded` checks whether this
device's most recent clock-in belongs to a *different* employee than the one now clocking
in. If so, it records an `AttendanceDeviceFlag` — it never blocks the clock-in itself, since
a legitimate shared device (a reception tablet kept as a fallback) would otherwise
false-positive on every single use. Flags surface on the dashboard and at
Admin → Device Flags for a human to confirm as expected or investigate.

## Rate limiting

`lib/security/rateLimit.ts` is backed by a Postgres table (`RateLimitBucket`), not an
in-memory counter — a counter in a serverless function's memory resets on every cold start
and isn't shared across concurrent instances, so it would not actually limit anything on
Netlify's serverless functions. Configured limits (`RATE_LIMITS` in the same file): Attendance ID attempts, admin
login, QR lookups, network heartbeats, network agent registration all have independent
limit/window/lockout settings.

## Sessions & admin auth

- Passwords: bcrypt, 12 rounds (`lib/auth/password.ts`).
- Sessions: a random 32-byte token is set as an httpOnly, secure (in production), `SameSite=Lax`
  cookie; only its SHA-256 hash is stored server-side (`lib/auth/session.ts`) — stealing the
  database doesn't hand out live session tokens, and revoking a session is a single row delete.
- RBAC: `lib/auth/rbac.ts` — `SUPER_ADMIN > ADMIN > HR > VIEWER`, with network security
  configuration restricted to `SUPER_ADMIN`/`ADMIN` specifically, per the requirement that it
  "require elevated permission." Every server action and API route that mutates state calls
  `requirePermission()` (`lib/auth/guard.ts`) — the UI hiding a button is not the enforcement
  boundary.
- `src/proxy.ts` does a cheap, Edge-safe cookie-presence check as a first line of defense,
  but is explicitly documented as **not** the source of truth (Prisma can't run on the Edge
  runtime) — every page/action still calls `requireUser()`/`requirePermission()` server-side.

## File uploads

`lib/storage/blob.ts` validates declared MIME type, file size (5MB cap), and sniffs the
actual file header bytes against the declared type (PNG magic bytes, JPEG SOI marker) so a
renamed executable can't pass as an image. SVGs are scanned for `<script>`/`on*=`/`javascript:`
before being accepted, since they render inline as `<img>` across the app.

Storage is Netlify Blobs, which — unlike Vercel Blob — has no public CDN URL of its own,
so uploaded/generated files are served back through `app/api/blob/[...key]/route.ts`. That
route is intentionally unauthenticated: everything it can serve (company logo, QR PDFs/PNGs)
is meant to be publicly viewable at that same level of exposure a printed QR poster or a
logo on the login page already has, it only ever reads a key already generated by the app's
own upload/QR-generation code (never an arbitrary client-supplied path beyond that), and it
never lists or enumerates stored keys.

## Audit log

`AuditLog` (append-only) records: admin login/logout/failed login, employee create/update/
status change/Attendance ID regeneration, attendance corrections (with old/new value + reason),
QR generate/regenerate/deactivate, attendance mode changes, office/network create/enable/
disable/token regeneration, network agent registration, branding updates, admin account
create/enable/disable. See `lib/audit/log.ts` and every `lib/actions/*.ts` file for call sites.

## What this does and doesn't prove

Public-IP verification identifies the network egress point — the Starlink connection's public
IP — not a cryptographic proof of an individual's physical location. A sufficiently motivated
person could attempt to route traffic through the office network via VPN/relay. Combining
Attendance ID + daily QR + office network + full audit trail is a strong **practical**
control appropriate for a single/multi-office SME, not a formal presence-proof system. If a
future requirement needs stronger guarantees, the natural next step is the previously-listed
future-extensibility items (RFID/NFC/biometrics) — deliberately out of scope for this version
per the brief's privacy requirements.

## Test coverage

- `tests/unit/rules.test.ts` — EARLY/ON_TIME/LATE boundaries (8:45/9:00/9:15/9:16/9:27/10:00),
  grace-period inclusivity, weekend/holiday attendance type, minutes-worked calculation,
  timezone-correct calendar-date derivation.
- `tests/unit/matchIp.test.ts` — exact IP match, CIDR matching, deny-when-unconfigured.
- `tests/unit/attendanceId.test.ts` — ID shape/entropy/uniqueness, normalization, hash
  determinism, no-plaintext-leakage.
- `tests/unit/qrToken.test.ts` — token entropy/uniqueness, hash determinism, URL building.
- `tests/integration/attendance.test.ts` (needs `DATABASE_URL`) — network-denied-when-
  unconfigured, invalid-ID generic rejection, authorized-vs-unauthorized IP (the
  "employee at home with a screenshot" scenario), full clock-in→clock-out state machine,
  duplicate clock-in prevention including a genuine concurrent-request race test, device-flag
  creation on cross-employee device reuse, no flag for an employee's own repeated device use,
  no flag when no device ID is supplied.
- `tests/integration/qr.test.ts` — today's QR valid, yesterday's QR rejected, deactivated QR
  rejected, regeneration invalidates the previous code, unknown token rejected.
- `tests/integration/networkAgent.test.ts` — wrong registration token rejected, token reuse
  rejected, valid signed heartbeat updates `currentPublicIp`, tampered signature rejected,
  **server-observed IP wins over agent-claimed IP**.
- `tests/integration/rateLimit.test.ts` — lockout after the configured limit, independent
  keys tracked separately.
