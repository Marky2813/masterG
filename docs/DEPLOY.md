# Deploy (hosted link)

One small AWS instance (EC2 t3.small, Ubuntu 24.04, ap-south-1) runs the production build behind Caddy
(automatic HTTPS) at a subdomain of akashparashar.dev. Decided 1 Nov 2026 (Akash): a stable link for the
submission, gated by one invite code, auto-updated from `main`.

| Piece | Where |
|---|---|
| Invite gate | `src/proxy.ts`, `/invite`, `/api/invite`. On only when the server has `INVITE_CODE`. Open: `/`, `/report` (share links), static files. Everything else, every API included, needs the cookie (30 days). 10 code tries per minute per address. |
| Secrets | `/srv/masterg/shared/.env.local` on the server (`GEMINI_API_KEY`, `INVITE_CODE`), mode 600. Never in git. |
| App | systemd `masterg` → `next start -p 3000` in `/srv/masterg/current` (a symlink to a release). |
| Data | `/srv/masterg/shared/{data,logs}`, symlinked into every release, so deploys never touch class data or logs. |
| Auto-deploy | `masterg-update.timer` runs `deploy/update.sh` every minute: if `origin/main` moved, build a fresh release, switch, restart, check `/` answers, roll back if not. Waits while anyone used the app in the last 2 minutes. Keeps 3 releases. |
| HTTPS | Caddy, Let's Encrypt. DNS: an A record for the subdomain → the instance's Elastic IP, **DNS only** (grey cloud) in Cloudflare. |

## Setup (once)
1. Launch the instance with ports 22/80/443 open and an Elastic IP; add the A record.
2. `scp deploy/setup.sh` and run `sudo DOMAIN=<subdomain> bash setup.sh`.
3. Copy the secrets file to `/srv/masterg/shared/.env.local` (scp, never paste), `chmod 600`, owner `masterg`.
4. `sudo -u masterg /srv/masterg/update.sh --force`, then `sudo systemctl start masterg-update.timer`.

## Operate
- Deploy log: `journalctl -u masterg-update -n 50`; app log: `journalctl -u masterg -n 100`; build logs: `/srv/masterg/shared/build-*.log`.
- Force a deploy now: `sudo -u masterg /srv/masterg/update.sh --force` (ignores the live-session wait).
- Pause auto-deploy before a demo: `sudo systemctl stop masterg-update.timer`.

Cost: t3.small ≈ US$15/month plus storage, from Akash's US$100 AWS credit.
