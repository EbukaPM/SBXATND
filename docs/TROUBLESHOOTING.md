# Troubleshooting

## "Attendance unavailable... authorized office network" for everyone at the office

1. Admin → Offices & Network → check the office's network status.
   - **STALE/UNVERIFIED**: the Network Agent hasn't sent a heartbeat recently. See "Network
     Agent offline" below.
   - **VERIFIED but still denied**: the office's `currentPublicIp` may not match what
     employees' devices are actually egressing through (e.g. a second router/failover ISP not
     covered by the agent's machine). Confirm the agent runs on a machine that shares the
     same internet egress as employee devices.
2. Check `AttendanceSettings.attendanceMode` — if it's not what you expect, Settings →
   Attendance rules.

## Network Agent offline / STALE

- **Starlink IP changed and the agent hasn't caught up**: heartbeats run every
  `HEARTBEAT_INTERVAL` minutes (default 10); a brief STALE window right after an IP change is
  expected. If it stays stale past `networkStaleThresholdMinutes` (default 30), something's
  actually wrong — see below.
- **Agent process not running**:
  - Linux: `sudo systemctl status attendance-agent` / `journalctl -u attendance-agent -f`
  - Windows: check Task Scheduler → your task's history/last run result
  - macOS: `launchctl list | grep attendance` and check `launchd.err.log` in the install dir
- **Token invalid**: if you regenerated the registration token in the admin dashboard after
  the agent already registered, that's fine — registration is one-time and the agent already
  has its signing secret in `agent_state.json`. If instead the agent's `agent_state.json` was
  deleted/moved and `REGISTRATION_TOKEN` in `.env` is now stale (already consumed), regenerate
  the token in Admin → Offices & Network → **Regenerate Agent Token**, put the new value in
  `.env`, and re-run `python agent.py register`.
- **Vercel endpoint unreachable from the office**: run `python agent.py test` — if IP
  detection succeeds but the heartbeat step fails with a connection error, check:
  - Firewall rules blocking outbound HTTPS (443) from the agent's machine.
  - DNS resolution for your `SERVER_URL` domain from that machine (`nslookup <domain>`).
  - Whether the whole office internet connection is down (if so, attendance is expected to
    fail anyway — the office isn't reachable from the internet either).
- **Vercel endpoint down**: check the Vercel dashboard / status page.

## Employee says their Attendance ID doesn't work but they're sure it's right

- Confirm their employment status is **ACTIVE** (Employees page) — inactive/suspended/exited
  employees are rejected with the same generic message as a wrong ID, by design (see
  `docs/SECURITY.md`).
- Confirm it wasn't regenerated since they last used it (check Employees → their profile —
  regeneration is logged in the Audit Log with a timestamp).
- IDs are case-insensitive and whitespace-tolerant, so typos in casing/spacing aren't the
  issue — a genuinely wrong ID is.

## QR code doesn't work

- **"This QR code is invalid or has expired"**: almost always a printout from a previous day,
  or the code was regenerated (posting a new QR invalidates the old one immediately). Print
  the current one from Admin → QR Codes.
- **QR scans fine but attendance still gets denied**: in `QR_AND_NETWORK` mode the office
  network check still applies after a successful scan — see the network troubleshooting steps
  above.

## Build/deploy issues

- **`prisma generate` fails locally**: make sure `DATABASE_URL` is set in `.env` (generation
  itself doesn't need connectivity, but the Prisma config loader expects the var to exist).
- **Migrations fail against a pooled connection**: make sure `DIRECT_URL` is set to a
  non-pooled connection string — `prisma migrate` needs it for DDL.
- **Logo/QR PDF upload fails in production**: confirm `BLOB_READ_WRITE_TOKEN` is set for that
  environment (Preview and Production have separate tokens if you created separate Blob
  stores).
- **Cron jobs return 401**: `CRON_SECRET` must be set as a Vercel project env var — Vercel
  then sends it automatically as `Authorization: Bearer <value>` on cron-triggered requests.
  If you're curling a cron endpoint manually to test, add that header yourself.

## "It worked in Preview but not Production" (or vice versa)

Check that `AUTH_SECRET`/`QR_SECRET` are actually set (and different) per environment —
Attendance IDs and QR tokens are hashed with these secrets, so an ID/QR generated against one
environment's secret will never validate against another's. This is expected, not a bug.
