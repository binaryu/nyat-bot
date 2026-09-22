---
name: nyatbot-manage
description: Manage, restart, build, check logs, and configure Telegram bot commands for NyatBot (xxb-ts). Use when asked to restart the bot, deploy updates, check bot service status/logs, or update Telegram bot commands.
---

# NyatBot Operations & Management Skill

This skill provides standardized routines for managing the NyatBot Telegram Bot (`xxb-ts` systemd service).

## Environment Requirements
- Working directory: `/opt/nyatbot`
- Node runtime: **Node v22** (`/usr/bin/node`)

## 1. Restart & Deploy Bot
Production runs `dist/index.js`, so **always build before restarting**:
```bash
npm run build
systemctl restart xxb-ts
sleep 2
systemctl status xxb-ts --no-pager
```

Or run the script:
```bash
.pi/skills/nyatbot-manage/scripts/restart.sh
```

## 2. Check Service & Logs
- **Systemd service status**:
  ```bash
  systemctl status xxb-ts --no-pager
  ```
- **Real-time application logs**:
  (Logs are JSON lines written to `logs/app.log`, NOT in journalctl)
  ```bash
  tail -n 50 -f /opt/nyatbot/logs/app.log
  ```

## 3. Configure Telegram Bot Commands (快捷命令菜单)
To inspect and update Telegram Bot menu commands via Telegram API:
```bash
npx tsx .pi/skills/nyatbot-manage/scripts/set-commands.ts
```
