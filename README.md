# Digital Office Attendance & Clocking System

A production attendance platform for a Nigerian office running on Starlink: employees
clock in/out with a personal Attendance ID, verified against the office's live public
IP (via a small on-site Network Agent) and an optional daily QR code — all evaluated
server-side, on server time, with a full audit trail.

- **App**: Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel
- **Database**: PostgreSQL via Prisma (any standard Postgres connection string)
- **Network verification**: `network-agent/` (Python), runs on a machine physically inside the office
- **Attendance security model**: Attendance ID + Office Network + Daily QR + server time — see [docs/SECURITY.md](docs/SECURITY.md)

## Quick start (local development)

```bash
npm install
cp .env.example .env         # fill in DATABASE_URL at minimum
npm run db:migrate           # creates schema
SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='change-me-now-1234' npm run db:seed
npm run dev
```

Open http://localhost:3000/attendance for the kiosk, http://localhost:3000/admin/login for
the admin dashboard.

You need a real PostgreSQL database for local dev — see [docs/DATABASE.md](docs/DATABASE.md)
for options (Neon/Supabase free tier is the fastest path if you don't want to install
Postgres locally).

## Documentation

| Doc | Covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, request flow, why Vercel-native choices were made |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, providers, migrations |
| [docs/DEPLOYMENT_VERCEL.md](docs/DEPLOYMENT_VERCEL.md) | End-to-end production deployment |
| [docs/OFFICE_NETWORK_AGENT_SETUP.md](docs/OFFICE_NETWORK_AGENT_SETUP.md) | Installing the on-site Network Agent (Windows/Linux/macOS) |
| [docs/QR_ATTENDANCE.md](docs/QR_ATTENDANCE.md) | QR generation, validation, session lifecycle |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, what is/isn't verified, and why |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Day-to-day admin usage (non-technical) |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common failure modes and fixes |

## Project layout

```
src/
  app/
    attendance/            kiosk UI + QR scan landing route
    admin/                 admin dashboard (route-grouped: (dashboard) is auth-protected)
    api/                   route handlers (attendance, network, qr, reports, cron)
  components/               ui/ (design system primitives), attendance/, branding/
  lib/
    attendance/             time rules, settings, the clock-in/out engine, housekeeping
    auth/                   session, password hashing, RBAC, route guards
    network/                getClientIp, CIDR matching, agent auth, heartbeat processing
    qr/                     token generation, session lifecycle, PDF rendering
    security/               Attendance ID hashing, persistent rate limiting
    reports/                CSV/Excel/PDF report generation
    storage/                object storage abstraction (Vercel Blob)
prisma/                     schema.prisma, seed.ts
network-agent/               Python agent that runs inside the office
tests/                       unit/ (pure logic) + integration/ (needs DATABASE_URL)
```

## Testing

```bash
npm test                 # unit tests always run; integration tests auto-skip without DATABASE_URL
```

See [docs/SECURITY.md](docs/SECURITY.md#test-coverage) for what the test suite verifies against
the acceptance criteria (early/on-time/late boundaries, duplicate clock-in prevention, QR
date/office/status enforcement, network IP spoofing resistance, rate limiting).

## Known limitations

Public-IP verification identifies the network egress point, not a person's exact physical
location, and a sufficiently motivated user could attempt to route around it (e.g. a VPN
terminating in the office). Combined with a personal Attendance ID, a rotating daily QR code,
and a full audit log, this is a strong *practical* control for a single-office SME — not a
cryptographic proof of presence. See [docs/SECURITY.md](docs/SECURITY.md) for the full
threat model.
