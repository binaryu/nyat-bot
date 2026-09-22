#!/usr/bin/env tsx
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.env.NYATBOT_DIR || (process.cwd().includes('nyatbot') ? process.cwd() : '/opt/nyatbot');
const botModuleUrl = pathToFileURL(resolve(repoRoot, 'src/bot/bot.ts')).href;

const DEFAULT_COMMANDS = [
  { command: 'checkin', description: '每日签到' },
  { command: 'stats', description: '群聊统计' },
  { command: 'watch', description: '盯一个话题的进展（仅私聊）' },
  { command: 'game', description: '小游戏 /game guess' },
  { command: 'muteme', description: '让bot不回复我' },
  { command: 'unmuteme', description: '恢复bot回复' },
  { command: 'cards', description: '我的猫娘图鉴（签到/活跃免费解锁）' },
  { command: 'wish', description: '心愿单 /wish add 卡名 · holders 找群友换卡' },
  { command: 'help', description: '帮助与功能说明' },
];

async function main() {
  const { createBot } = await import(botModuleUrl);
  const bot = await createBot();
  console.log('Fetching current bot commands from Telegram...');
  const current = await bot.api.getMyCommands();
  console.log('Current commands:', current);

  console.log('Setting new bot commands...');
  await bot.api.setMyCommands(DEFAULT_COMMANDS);
  console.log('Successfully updated commands to:');
  console.table(DEFAULT_COMMANDS);
}

main().catch((err) => {
  console.error('Failed to set bot commands:', err);
  process.exit(1);
});
