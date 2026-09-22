---
name: nyatbot-manage
description: Manage, restart, build, check logs, and configure Telegram bot commands for NyatBot (xxb-ts). Use when asked to restart the bot, deploy updates, check bot service status/logs, or update Telegram bot commands.
---

# NyatBot Operations & Management Skill

This skill provides standardized routines for managing the NyatBot Telegram Bot (`xxb-ts` systemd service).

## Environment Requirements
- Working directory: `/opt/nyatbot`
- Node runtime: **Node v22** located at `/root/.hermes/node/bin/node`
- Always prepend PATH: `export PATH=/root/.hermes/node/bin:$PATH`

## 1. Restart & Deploy Bot
Production runs `dist/index.js`, so **always build before restarting**:
```bash
./scripts/restart.sh
```
Or manually:
```bash
export PATH=/root/.hermes/node/bin:$PATH
cd /opt/nyatbot
npm run build
systemctl restart xxb-ts
sleep 2
systemctl status xxb-ts --no-pager
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
export PATH=/root/.hermes/node/bin:$PATH
cd /opt/nyatbot
npx tsx .pi/skills/nyatbot-manage/scripts/set-commands.ts
```

Direct script execution:
```bash
export PATH=/root/.hermes/node/bin:$PATH
node --import tsx -e '
async function main() {
  const { createBot } = await import("./src/bot/bot.js");
  const bot = await createBot();
  await bot.api.setMyCommands([
    { command: "checkin", description: "每日签到" },
    { command: "stats", description: "群聊统计" },
    { command: "watch", description: "盯一个话题的进展（仅私聊）" },
    { command: "game", description: "小游戏 /game guess" },
    { command: "muteme", description: "让bot不回复我" },
    { command: "unmuteme", description: "恢复bot回复" },
    { command: "cards", description: "我的猫娘图鉴（签到/活跃免费解锁）" },
    { command: "wish", description: "心愿单 /wish add 卡名" },
    { command: "help", description: "帮助与功能说明" }
  ]);
  console.log("Commands updated.");
}
main();
'
```
