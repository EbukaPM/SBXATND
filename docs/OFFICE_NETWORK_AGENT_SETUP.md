# Office Network Agent Setup

The Network Agent is a small Python script (`network-agent/agent.py`) that runs on a machine
physically inside the office — it's what lets the attendance system keep tracking Starlink's
changing public IP without anyone touching the app's code or config, automatically, every few
minutes, with no admin action needed.

It is **not** deployed to Netlify. Run it on an office PC, a small Linux box, or a Raspberry
Pi that's on and connected to the office network essentially all the time.

**Don't have a spare machine for this?** You don't need one. Admin → Offices & Network has an
**Authorize This Network Now** button on every network — click it while your own phone/laptop
is on the office Wi-Fi you want to authorize, and the server captures your device's own
current IP (the same trusted mechanism every other network check uses) and sets it as the
office's authorized network, no agent required. The tradeoff: it's a manual click instead of
an automatic heartbeat, so re-click it whenever Starlink's IP actually changes (or before it
goes stale — see `networkStaleThresholdMinutes` in Settings; raise that if you're doing this
once a day rather than running an agent that heartbeats every few minutes). The rest of this
document covers the automated agent option; skip to
[docs/ADMIN_GUIDE.md](ADMIN_GUIDE.md) if the manual button is all you need.

Note: there is no way for a website to read a device's Wi-Fi network *name* (SSID) —
browsers deliberately block that for privacy, for any site, including this one. Both
verification methods above work off the office's public IP address instead, never the SSID.

## 1. Register the network in the admin dashboard first

Admin → Offices & Network → pick the office → **Register Network**. This creates the
`OfficeNetwork` row and shows you, **once**:

```
AGENT_ID=...
REGISTRATION_TOKEN=...
```

Copy both immediately — the token is never shown again (if lost, click **Regenerate Agent
Token** to get a new one; the old one stops working).

## 2. Install on the office machine

### Windows

1. Install Python 3.10+ from python.org (check "Add python.exe to PATH" during install).
2. Copy the `network-agent/` folder to the machine, e.g. `C:\attendance-agent`.
3. Open a terminal in that folder:
   ```powershell
   py -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   notepad .env   # fill in SERVER_URL, OFFICE_ID, AGENT_ID, REGISTRATION_TOKEN
   ```
4. Test it:
   ```powershell
   python agent.py test
   ```
   You should see the detected public IP, `Authentication: Valid`, and `Heartbeat: Successful`.
5. Run it continuously:
   ```powershell
   python agent.py run
   ```
6. **Run at startup**: create a Task Scheduler task — Trigger: "At startup" (and optionally
   "At log on"), Action: `venv\Scripts\python.exe C:\attendance-agent\agent.py run`, and check
   "Run whether user is logged on or not" so it survives reboots without anyone signing in.

### Linux (Debian/Ubuntu-family)

```bash
sudo apt update && sudo apt install -y python3 python3-venv
sudo mkdir -p /opt/attendance-network-agent
sudo cp -r network-agent/* /opt/attendance-network-agent/
cd /opt/attendance-network-agent
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.example .env
$EDITOR .env   # fill in SERVER_URL, OFFICE_ID, AGENT_ID, REGISTRATION_TOKEN

venv/bin/python agent.py test
```

Run as a systemd service so it survives reboots and restarts on crash:

```bash
sudo useradd --system --no-create-home attendance-agent || true
sudo chown -R attendance-agent:attendance-agent /opt/attendance-network-agent
sudo cp systemd/attendance-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now attendance-agent
sudo systemctl status attendance-agent
journalctl -u attendance-agent -f   # live logs
```

### macOS

```bash
mkdir -p /opt/attendance-network-agent   # sudo if /opt isn't writable
cp -r network-agent/* /opt/attendance-network-agent/
cd /opt/attendance-network-agent
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.example .env
$EDITOR .env

venv/bin/python agent.py test
```

Run at login/boot via `launchd`: edit the paths in
`network-agent/com.attendance.networkagent.plist` to match your install location, then:

```bash
cp com.attendance.networkagent.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.attendance.networkagent.plist
```

## 3. Confirm it's working

Admin → Offices & Network → the office should show:

```
Network Status: VERIFIED
Last heartbeat: a few seconds/minutes ago
```

## How it stays correct when Starlink's IP changes

Every `HEARTBEAT_INTERVAL` minutes (default 10), the agent detects its current public IP and
sends a signed heartbeat to `/api/network/heartbeat`. The **server** independently observes
the request's actual source IP — the value the agent reports is logged for diagnostics, but
what actually gets stored as the office's authorized IP is what the server itself saw, so a
compromised or misconfigured agent can't claim an IP it isn't actually heartbeating from. See
`lib/network/heartbeat.ts` and `docs/SECURITY.md`.

If the agent goes offline, the office's network status ages past
`AttendanceSettings.networkStaleThresholdMinutes` (default 30) and — because the default
`failMode` is `FAIL_CLOSED` — attendance at that office is denied until the agent comes back,
rather than silently trusting a stale IP.

## Troubleshooting

See [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md).
