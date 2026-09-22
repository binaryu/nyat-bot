#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/nyatbot"
cd "$REPO_DIR"

echo "=== 1. Building NyatBot (npm run build) ==="
npm run build

echo "=== 2. Restarting systemd service (xxb-ts) ==="
systemctl restart xxb-ts
sleep 2

echo "=== 3. Checking Service Status ==="
systemctl status xxb-ts --no-pager

echo "=== 4. Latest Application Logs ==="
tail -n 20 "$REPO_DIR/logs/app.log"
