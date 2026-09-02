# NyatBot fork + 本地改动：本地编译说明

本源码包基于：

- Fork：`https://github.com/binaryu/nyat-bot`
- Fork 基线提交：`473ec79 feat: ping schedule`
- Node.js：`22+`（服务器验证版本为 `v22.23.2`）
- 包管理器：npm

本包已经把服务器原有的本地源码改动恢复到 fork 基线上，适合在本地重新安装依赖、编译和测试。

## 1. 解压

```bash
tar -xzf nyatbot-fork-local-changes.tar.gz
cd nyatbot-fork-local-changes
```

如果压缩包文件名不同，以实际文件名为准。

## 2. 安装依赖

要求 Node.js 22 或更高版本：

```bash
node -v
npm -v
npm install
```

如果只想严格按照 lockfile 安装，可使用：

```bash
npm ci
```

如果项目中包含 native NyatDB 组件并且需要编译 native 版本，还需要 Rust 工具链；默认可以先使用 TypeScript 引擎，不必编译 native 组件。

## 3. 配置环境变量

压缩包不包含服务器上的 `.env`、Bot Token、AI Key 等敏感信息。

复制示例配置：

```bash
cp .env.example .env
```

然后编辑 `.env`，至少填写项目要求的 Bot Token 和 AI 服务配置：

```bash
vi .env
```

请根据 `.env.example` 中的说明填写，不要把真实密钥提交到 Git 或发到聊天中。

Fork 新增的定时任务配置包括：

```dotenv
MODEL_CHECK_ENABLED=true
MODEL_CHECK_CRON=*/5 * * * *
```

不填写时使用默认值：启用模型检查，每 5 分钟执行一次。

## 4. 编译

```bash
npm run build
```

编译产物会生成到 `dist/`，启动命令为：

```bash
npm start
```

开发模式：

```bash
npm run dev
```

## 5. 测试和检查

运行类型检查：

```bash
npm run typecheck
```

运行 lint：

```bash
npm run lint
```

运行单元测试：

```bash
npm test
```

服务器合并后的验证情况：

- `npm run build`：通过
- 测试曾运行到 246/261 个测试文件
- 中断前：2271 个测试通过、1 个跳过
- 测试进程随后被手动中断，剩余测试未完成
- 测试输出包含若干 `ES2024` 工具链 warning，不是断言失败

因此建议你在本地完整运行一次 `npm test`，以获得最终结果。

## 6. 与服务器版本的关系

服务器上的运行目录为 `/opt/nyatbot`，systemd 服务为 `xxb-ts.service`。服务器上的 `.env`、SQLite 数据库、日志没有放入本源码包。

服务器回滚资料位于服务器：

```text
/opt/nyatbot-pre-fork-backup.tar
/opt/nyatbot-pre-fork-local.patch
```

本地编译包只包含源码和测试改动，不包含：

- `.env` 和任何密钥
- `data/` 数据库
- `logs/` 日志
- `node_modules/`
- `.git/`
- 已生成的 `dist/`
- 服务器备份文件

## 7. 推送到 GitHub fork（可选）

如果要把这些改动提交到自己的 fork：

```bash
git init
git remote add origin https://github.com/binaryu/nyat-bot.git
git add .
git commit -m "chore: merge local changes into fork"
git push -u origin main
```

如果本地目录已经是 Git 仓库，先检查：

```bash
git remote -v
git status
```

不要将 `.env`、数据库或日志加入提交。建议在提交前确认：

```bash
git status --short
```

如果 GitHub 仓库的 `main` 已经有其他更新，先执行：

```bash
git fetch origin
git rebase origin/main
```

出现冲突时手工解决后再提交和 push，不要直接使用强制 push。

## 8. 依赖安全提示

安装依赖时 npm 可能报告依赖审计问题。不要未经检查直接执行：

```bash
npm audit fix --force
```

该命令可能升级破坏性版本。应先查看：

```bash
npm audit
```

