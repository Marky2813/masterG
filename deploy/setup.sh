#!/usr/bin/env bash
# One-time setup of the Master G server (Ubuntu 24.04, run as root):
#   sudo DOMAIN=masterg.akashparashar.dev bash setup.sh
# Then put the secrets in /srv/masterg/shared/.env.local (GEMINI_API_KEY=..., INVITE_CODE=...),
# chmod 600, and run: sudo -u masterg /srv/masterg/update.sh --force
set -euo pipefail
DOMAIN="${DOMAIN:?set DOMAIN, e.g. masterg.akashparashar.dev}"
REPO="${REPO:-https://github.com/Marky2813/masterG.git}"

# 2 GB swap: next build needs more than the 2 GB of RAM on a t3.small
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update -y
apt-get install -y git curl ca-certificates debian-keyring debian-archive-keyring apt-transport-https gnupg
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
# Caddy (automatic HTTPS)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y && apt-get install -y caddy

id masterg >/dev/null 2>&1 || useradd --system --create-home --home-dir /srv/masterg --shell /bin/bash masterg
install -d -o masterg -g masterg /srv/masterg/releases /srv/masterg/shared /srv/masterg/shared/data /srv/masterg/shared/logs
[ -d /srv/masterg/repo ] || sudo -u masterg git clone --quiet "$REPO" /srv/masterg/repo
install -o masterg -g masterg -m 755 /srv/masterg/repo/deploy/update.sh /srv/masterg/update.sh

cat > /etc/systemd/system/masterg.service <<UNIT
[Unit]
Description=Master G (next start)
After=network.target

[Service]
User=masterg
WorkingDirectory=/srv/masterg/current
ExecStart=/usr/bin/npx next start -p 3000
Environment=NODE_ENV=production
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/masterg-update.service <<UNIT
[Unit]
Description=Master G: deploy the latest main if it changed

[Service]
Type=oneshot
User=masterg
ExecStart=/srv/masterg/update.sh
UNIT

cat > /etc/systemd/system/masterg-update.timer <<UNIT
[Unit]
Description=Master G: check main every minute

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min

[Install]
WantedBy=timers.target
UNIT

# masterg may restart only its own service
echo 'masterg ALL=(root) NOPASSWD: /usr/bin/systemctl restart masterg, /usr/bin/systemctl start masterg' > /etc/sudoers.d/masterg
chmod 440 /etc/sudoers.d/masterg

cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode gzip
	reverse_proxy localhost:3000
}
CADDY
systemctl daemon-reload
systemctl enable masterg masterg-update.timer
systemctl reload caddy || systemctl restart caddy
echo "Setup done. Next: secrets in /srv/masterg/shared/.env.local, then: sudo -u masterg /srv/masterg/update.sh --force && sudo systemctl start masterg-update.timer"
