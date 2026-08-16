# Deploying to Vercel

## 1. Provision the database

Create a Neon (or Supabase / Vercel Postgres) project. Copy the pooled connection string
into `DATABASE_URL` and the direct/non-pooled one into `DIRECT_URL`. See
[docs/DATABASE.md](DATABASE.md).

## 2. Create the Vercel project

```bash
npm i -g vercel   # if you don't already have it
vercel link
```

Or connect the GitHub repo directly from the Vercel dashboard (Import Project). Set the
**production branch** to `main` (or whichever branch you want auto-deploying to production).

## 3. Set environment variables

In Vercel → Project → Settings → Environment Variables, set for **Production** (and
**Preview**, with different values where noted):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | pooled connection string |
| `DIRECT_URL` | direct connection string (for migrations) |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | your production URL, e.g. `https://attendance.yourcompany.com` |
| `AUTH_SECRET` | `openssl rand -base64 48` — also used to derive Attendance ID hashes, so **do not rotate casually**; rotating it invalidates every existing Attendance ID |
| `QR_SECRET` | `openssl rand -base64 48` |
| `NETWORK_AGENT_SECRET` | reserved for future agent-side config signing; generate the same way |
| `BLOB_READ_WRITE_TOKEN` | from Vercel → Storage → Blob → create a store |
| `CRON_SECRET` | Vercel sets and sends this automatically once you add it as an env var — generate a random value and set it; see step 5 |

Use **different** `AUTH_SECRET`/`QR_SECRET` values for Preview vs Production so preview
deployments can't forge production Attendance IDs or QR tokens.

## 4. Run migrations against production

Migrations are not run automatically on deploy (deliberately — see
[docs/DATABASE.md](DATABASE.md) on never auto-dropping production data). From your machine,
with production `DATABASE_URL`/`DIRECT_URL` in your shell:

```bash
npm run db:deploy
SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD='a-strong-password' npm run db:seed
```

Re-run `db:deploy` after every future schema change, before or right after the app deploy.

## 5. Vercel Cron

`vercel.json` already declares three cron jobs (QR status sweep, stale-network detection,
daily housekeeping). They call their routes with an `Authorization: Bearer $CRON_SECRET`
header automatically once `CRON_SECRET` is set as a project env var — no extra setup needed
beyond step 3. **Note**: the Hobby plan limits cron jobs to once/day; the QR sweep and
stale-network checks (every 5–10 minutes) need a Pro plan or above to run at their configured
frequency. On Hobby, either upgrade or accept that QR activation/expiry and stale-network
flagging happen lazily instead (QR validity is still enforced correctly at clock-in time
regardless — the cron jobs only keep the *displayed* status fresh, see
`lib/qr/manage.ts#sweepQrStatuses` and `lib/network/staleSweep.ts`).

## 6. Object storage (logo, employee photos, QR PDFs/PNGs)

Vercel → Storage → Create Database → Blob. Copy the read/write token into
`BLOB_READ_WRITE_TOKEN`. No further setup — `lib/storage/blob.ts` uses it directly.

## 7. Deploy

```bash
git push origin main
```

Vercel builds and deploys automatically on push, per the standard GitHub → Vercel flow.
Preview deployments are created for every PR/branch automatically; give the preview
environment its own database (a Neon branch is ideal) so preview testing never touches
production attendance data.

## 8. First-run checklist

After the first successful deploy:

1. Log into `/admin/login` with the seeded SUPER_ADMIN.
2. Settings → upload the company logo, set brand colors, confirm timezone (`Africa/Lagos`)
   and work hours.
3. Offices & Network → create the office, register a network, copy the `AGENT_ID` +
   `REGISTRATION_TOKEN` shown once.
4. Set up the Network Agent on an always-on office machine —
   [docs/OFFICE_NETWORK_AGENT_SETUP.md](OFFICE_NETWORK_AGENT_SETUP.md).
5. Confirm the office shows `VERIFIED` with a recent heartbeat.
6. Add employees, note each generated Attendance ID (shown once).
7. QR Codes → generate today's QR, download the PDF, print it.
8. Test the full flow from a phone on the office Wi-Fi.

## Environments

- **Development**: local Postgres or a dev Neon branch, `npm run dev`.
- **Preview**: one per PR, ideally its own Neon branch/database so test data never mixes
  with production.
- **Production**: the `main` branch, protected env vars, migrations run manually via
  `db:deploy` (see step 4) rather than automatically on build.
