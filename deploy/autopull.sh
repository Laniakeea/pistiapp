#!/usr/bin/env bash
set -euo pipefail
cd /home/deniz/pistiapp
git fetch origin claude/pistiapp-points-keeper-z5uw6l --quiet
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/claude/pistiapp-points-keeper-z5uw6l)" ] && exit 0
git merge --ff-only origin/claude/pistiapp-points-keeper-z5uw6l --quiet
sudo -n /usr/bin/systemctl restart pisti
echo "deployed $(git rev-parse --short HEAD)"
