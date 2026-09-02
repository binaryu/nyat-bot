# NyatBot 环境变量完整参考手册 (Environment Variables Reference)

本项目所有环境变量均由 `src/env.ts` 集中以 Zod Schema 校验与管理。
根据项目设计规范，**除基础必填项外，所有高级特性开关默认均为关闭 (`false` / 空)**。

---

## 目录

1. [核心必填配置 (Core & Infrastructure)](#1-核心必填配置)
2. [AI 模型与 Usage 路由 (AI Providers & Routing)](#2-ai-模型与-usage-路由)
3. [天气、作息与主动关怀 (Weather, Sleep & Proactive)](#3-天气作息与主动关怀)
4. [认知流水线、Heart 与 Turn Actor (Cognition & Pipeline)](#4-认知流水线-heart-与-turn-actor)
5. [记忆与向量检索 (Memory & Qdrant)](#5-记忆与向量检索)
6. [人物画像与关系 (Person Identity & Relationships)](#6-人物画像与关系)
7. [Meta + Subagent + CodeAct (多智能体与工具)](#7-meta--subagent--codeact)
8. [自我演化与目标系统 (Self-Evolution & Goals)](#8-自我演化与目标系统)
9. [群管、白名单与防滥用 (Group Admin & Moderation)](#9-群管白名单与防滥用)
10. [底层存储与引擎 (NyatDB & Context)](#10-底层存储与引擎)
11. [其他功能模块 (Other Modules)](#11-其他功能模块)

---

## 1. 核心必填配置

### `BOT_TOKEN`
Telegram

- **默认值**: `无`
- **类型定义**: `z.string().min(1, 'BOT_TOKEN is required')`

### `BOT_USERNAME`
- **默认值**: `'xxb_bot'`
- **类型定义**: `z.string().min(1).default('xxb_bot')`

### `REDIS_URL`
Redis

- **默认值**: `'redis://127.0.0.1:6379/0'`
- **类型定义**: `z.string().url().default('redis://127.0.0.1:6379/0')`

### `SQLITE_PATH`
SQLite

- **默认值**: `'./data/xxb.db'`
- **类型定义**: `z.string().default('./data/xxb.db')`

### `PORT`
Server

- **默认值**: `3000`
- **类型定义**: `z.coerce.number().int().positive().default(3000)`

### `HOST`
- **默认值**: `'0.0.0.0'`
- **类型定义**: `z.string().default('0.0.0.0')`

### `NODE_ENV`
- **默认值**: `'development'`
- **类型定义**: `z.enum(['development', 'production', 'test']).default('development')`

### `LOG_LEVEL`
- **默认值**: `'info'`
- **类型定义**: `z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')`

### `QUEUE_CONCURRENCY`
Queue

- **默认值**: `8`
- **类型定义**: `z.coerce.number().int().positive().default(8)`

### `RATE_LIMIT_PER_MIN`
Rate limiting

- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `MASTER_UID`
Business

- **默认值**: `0`
- **类型定义**: `z.coerce.number().int().default(0)`

### `BOT_NICKNAMES`
- **默认值**: `'xxb,啾咪囝,啾咪'`
- **类型定义**: `z .string() .default('xxb,啾咪囝,啾咪') .transform((s) => s.split(','))`


---

## 2. AI 模型与 Usage 路由

### `MODEL_CHECK_ENABLED`
- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MODEL_CHECK_CRON`
- **默认值**: `'*/5 * * * *'`
- **类型定义**: `z.string().default('*/5 * * * *')`


---

## 3. 天气、作息与主动关怀

### `PROACTIVE_PRESSURE_ENABLED`
（原 PROACTIVE_SCAN_* 灰度已移除——独立 scan cron 被 unified-tick 取代）
Attention pressure(借鉴 CGM):主动扫群按 pressure 排序挑 Top-N,而非随机。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DM_AUTO_PRIVATE`
DM 是否自动判为私密会话(CGM dmAutoPrivate)。默认 true。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `SLEEP_WAKE_ON_DM_ENABLED`
DM↔群联动:睡着时收到私聊 → 全局临时唤醒(群里也醒、正常处理消息),窗口内每条 DM 续期,
静默后到点自动继续睡。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SLEEP_WAKE_WINDOW_MIN`
- **默认值**: `20`
- **类型定义**: `z.coerce.number().int().positive().default(20)`

### `UNIFIED_TICK_INTERVAL_MIN`
── AGI Level 5 P5-A: 统一唤醒循环（常驻）───────────────────────────
决策合并：一次 tick 一次 LLM 决定干什么（关心主人/群冒泡/自玩/查goal/安静），
执行保留旧 cron 的执行器。已取代 idle/proactive-scan/thinker/self-play/goal-check。

- **默认值**: `5`
- **类型定义**: `z.coerce.number().int().positive().default(5)`

### `UNIFIED_TICK_USAGE`
- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `UNIFIED_TICK_HOUR_START`
- **默认值**: `8`
- **类型定义**: `z.coerce.number().int().min(0).max(23).default(8)`

### `UNIFIED_TICK_HOUR_END`
- **默认值**: `23`
- **类型定义**: `z.coerce.number().int().min(0).max(23).default(23)`

### `UNIFIED_TICK_ABSENT_USERS_ENABLED`
unified-tick 熟面孔缺席检测(Opus 评审: 主动消息要有理由——
"想起某人三天没出现")。开启后世界状态会带 absentUsers,
决策模型可选 remember_user 动作。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PROACTIVE_MEMORY_ENABLED`
── P2-A: 主动搭话记忆驱动 ──
主动发言时搜索 Qdrant 群聊记忆，注入"上次聊过的相关话题"

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PROACTIVE_COORDINATOR_ENABLED`
── P2-A: 主动搭话统一调度 ──
防止 idle + proactive-scan 同时对同一群发消息；全局每群每小时上限

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PROACTIVE_HOURLY_MAX_PER_CHAT`
- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().positive().default(3)`

### `WEATHER_ENABLED`
── 天气环境感知（真人感）──
wttr.in 免费源，30min 缓存；注入 self-state / tick WorldState，全 fail-soft。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `WEATHER_CITY`
- **默认值**: `'Beijing'`
- **类型定义**: `z.string().default('Beijing')`

### `SLEEP_SCHEDULE_ENABLED`
── Sleep schedule(硬作息门):到点真睡觉,睡觉不闲聊,指令照常 ──
直接交互(@/回 bot/私聊)走升级式吵醒,主人必醒;作息表沿用
life-state 的 date-seeded daySchedule(起床 07:00-08:30 / 入睡 23:30-01:00)

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SLEEP_ANNOUNCE_ENABLED`
到点睡觉/起床时向最近活跃的群发晚安/早安(固定短句池,无 LLM)

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SLEEP_BEDTIME_GUARD_ENABLED`
晚安时机守卫:就寝边沿若 bot 5 分钟内在活跃群说过话(对话中),推迟
入睡相位 10 分钟,每晚最多 3 次 —— 治"自己刚回完话 50 秒就道晚安蒸发"。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SLEEP_DM_ENABLED`
── DM 好感主动私聊 (功能 B) ──
B1:睡前/起床给「已私聊过 bot 的高好感用户」发悄悄话(带跨群外号)。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DM_GREET_AFFINITY_MIN`
- **默认值**: `40`
- **类型定义**: `z.coerce.number().default(40)`

### `DM_GREET_MAX_USERS`
- **默认值**: `2`
- **类型定义**: `z.coerce.number().int().default(2),       // 每个边沿最多几人`

### `DM_PROACTIVE_COOLDOWN_HOURS`
- **默认值**: `20`
- **类型定义**: `z.coerce.number().default(20),    // 同人两次主动 DM 最小间隔`


---

## 4. 认知流水线、Heart 与 Turn Actor

### `HEDGE_DELAY_MS`
AI tuning

- **默认值**: `2000`
- **类型定义**: `z.coerce.number().int().nonnegative().default(2000)`

### `STREAMING_MIN_INTERVAL`
Streaming

- **默认值**: `500`
- **类型定义**: `z.coerce.number().int().nonnegative().default(500)`

### `STREAMING_MIN_CHARS`
- **默认值**: `50`
- **类型定义**: `z.coerce.number().int().nonnegative().default(50)`

### `JUDGE_WINDOW_SIZE`
- **默认值**: `10`
- **类型定义**: `z.coerce.number().int().positive().default(10)`

### `JUDGE_KNOWLEDGE_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `JUDGE_KNOWLEDGE_PERMANENT`
- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `JUDGE_KNOWLEDGE_GROUP`
- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `JUDGE_PROACTIVE_ENABLED`
── Proactive Engagement (Stage B) ──

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `JUDGE_PROACTIVE_RATE`
- **默认值**: `0.25`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0.25)`

### `JUDGE_PROACTIVE_MIN_INTERVAL_SEC`
- **默认值**: `120`
- **类型定义**: `z.coerce.number().int().positive().default(120)`

### `JUDGE_PROACTIVE_MIN_RECENT_MSGS`
- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().positive().default(3)`

### `TIMING_GATE_ENABLED`
── Timing Gate (MaiBot-style: debounce + state machine + LLM gate) ──
全局开关。关闭时所有 timing 模块退化为透传，行为等价于改造前。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TIMING_DEBOUNCE_MS`
阶段 1：消息去抖窗口（毫秒）。0 = 关闭去抖。
同一 chat 内，新消息会重置定时器；超过 MAX_BUFFER_MS 强制 flush 防止饥饿。

- **默认值**: `2000`
- **类型定义**: `z.coerce.number().int().nonnegative().default(2000)`

### `TIMING_DEBOUNCE_MAX_BUFFER_MS`
- **默认值**: `8000`
- **类型定义**: `z.coerce.number().int().nonnegative().default(8000)`

### `TIMING_STATE_TTL_SEC`
阶段 2：ChatRuntime 状态过期时间（秒）。超过则视作 STOP 默认状态。

- **默认值**: `86400`
- **类型定义**: `z.coerce.number().int().positive().default(86400)`

### `TIMING_GATE_USAGE`
阶段 3：Timing Gate LLM usage label。默认走 judge usage（小模型）。

- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `TIMING_GATE_TIMEOUT_MS`
- **默认值**: `8000`
- **类型定义**: `z.coerce.number().int().positive().default(8000)`

### `TIMING_WAIT_MAX_SEC`
阶段 4：wait 工具最大允许秒数；超过会被裁剪。

- **默认值**: `120`
- **类型定义**: `z.coerce.number().int().positive().default(120)`

### `TIMING_WAIT_MIN_SEC`
- **默认值**: `5`
- **类型定义**: `z.coerce.number().int().positive().default(5)`

### `TIMING_GATE_COOLDOWN_SEC`
阶段 4：gate 选 wait/no_action 后，下次再调 gate 的冷却时间（秒）。
对应 MaiBot 的 timing_gate_non_continue_cooldown_seconds。

- **默认值**: `15`
- **类型定义**: `z.coerce.number().int().nonnegative().default(15)`

### `TURN_GATE_CONTINUATION`
P0-A 连续对话免检:gate continue / bot 回复后 N 秒内的后续消息跳过 gate LLM
(对齐 MaiBot 连续 Planner 状态)。更新的 wait/no_action 负向决策自动终止免检。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TIMING_CONTINUATION_WINDOW_SEC`
- **默认值**: `180`
- **类型定义**: `z.coerce.number().int().positive().default(180)`

### `TURN_GATE_DEFER_MAX_REPLAYS`
P0-B defer=延迟重评:同一条消息最多被 defer 重排几次(超限按旧语义静默丢弃)。

- **默认值**: `1`
- **类型定义**: `z.coerce.number().int().nonnegative().default(1)`

### `TIMING_TALK_VALUE`
P1-C talk_value 频率阈值(0..1]:1.0 = 该层关闭(no-op)。<1 时非直接消息需攒
ceil(1/有效值) 条才评一次 gate,未达阈值 → defer 延迟重评;有空闲补偿兜底。
per-chat Redis 覆盖:xxb:timing:talkvalue:{chatId}。

- **默认值**: `1.0`
- **类型定义**: `z.coerce.number().min(0.01).max(1).default(1.0)`

### `TIMING_GATE_HISTORY_ENABLED`
P1-D gate 有状态化:把最近 5 次真实 LLM 决策注入 gate prompt(对齐 MaiBot
gate 与 planner 共享历史、看得到自己过往节奏判断)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TIMING_GATE_FAIL_CLOSED`
P2-E 解析失败方向:true = fail-closed 按 no_action 处理(MaiBot 语义:宁可
沉默不插嘴;direct 已在上游 bypass;强债务转保护性 wait)。llm_call_failed
(网络)仍 fail-open。与仓库约定一致:行为变化默认关,.env 显式开。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TIMING_WAIT_HINT_ENABLED`
P2-F wait 到点回访时注入 [等待结束] 提示(仅 TURN_WAIT_RESUME_ENABLED 路径)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_ACTOR_ENABLED`
── Turn Actor (MaiBot MaiSaka 式 per-chat 认知回合; docs/turn-actor/) ──
全部默认关闭。关闭时 ingress/pipeline 行为与改造前完全一致。
G1: per-chat 回合 actor。开启后消息进 xxb:pending:{chatId}，由 turn job 统一消化。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_ACTOR_CHAT_IDS`
灰度群列表（逗号分隔 chatId）。空 = TURN_ACTOR_ENABLED 时对所有 chat 生效。

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n !== 0); })`

### `TURN_ABORT_ENABLED`
G3: 新消息打断在飞生成并带新上下文重规划。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_INTERRUPT_MAX_CONSECUTIVE`
连续打断上限（MaiBot planner_interrupt_max_consecutive_count，默认 0=不打断；
我们默认 2 —— 高速群里第二条新消息也应能掐死陈旧生成,review #6）。

- **默认值**: `2`
- **类型定义**: `z.coerce.number().int().nonnegative().default(2)`

### `TURN_INTERRUPT_QUIET_MS`
打断后静默期（毫秒），等这波消息发完再重规划（MaiBot 硬编码 1s）。

- **默认值**: `1000`
- **类型定义**: `z.coerce.number().int().nonnegative().default(1000)`

### `TURN_MAX_INTERNAL_ROUNDS`
回合内内部轮次预算（reply + 自我接话 + 余量；MaiBot 是 10，保守起步）。

- **默认值**: `4`
- **类型定义**: `z.coerce.number().int().positive().default(4)`

### `TURN_EXEC_LOCK_ENABLED`
G12 执行期互斥:runChatTurn 入口 per-chat Redis 锁,堵死"多生产者并发
scheduleTurn 造出双回合 → registerGeneration supersede 互杀 → replan
预算白烧"的竞态(2026-07-04 诊断:毫秒级成对 replanning 实锤)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_EXEC_LOCK_TTL_MS`
- **默认值**: `120_000`
- **类型定义**: `z.coerce.number().int().positive().default(120_000)`

### `TURN_BURST_JUDGE_ENABLED`
G4: judge/gate/reply 以整个 burst 为决策单元（而非只看最后一条）。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_WAIT_RESUME_ENABLED`
G5: wait 到期后带锚点重入回复路径（而非只解除屏蔽）。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_UNANSWERED_REVISIT_ENABLED`
G7: 回访最近未回应的消息（注入 ≤2 条候选目标）。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_ACTION_PLANNER_ENABLED`
G2: 统一动作空间 planner（reply/react/sticker/silent/wait）。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_SELF_FOLLOWUP_ENABLED`
G6: 发完后自我接话（"对了…"/补贴纸），新用户消息立即终止。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_SELF_FOLLOWUP_MAX`
- **默认值**: `2`
- **类型定义**: `z.coerce.number().int().nonnegative().default(2)`

### `TURN_FOCUS_ENABLED`
G9: per-chat focus/能量标量（调制判断门槛、防抖、打字节奏）。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_PROACTIVE_ENABLED`
G11: idle/proactive cron 经 turn actor 走完整人格管线。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `HEART_ENABLED`
G8/S13 心流:L0 未命中的被动群消息,judge L1/L2 + gate 合并为一次
带人格+自我状态的"心流判断"(reply/wait/pass)。1 次调用替代 1-3 次。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `HEART_REFLECT_ENABLED`
心流反思:仅在决定 reply 时,用**同一个** heart 模型把「念头」再磨一遍(更抓重点),
不改决策(act/path)、不换模型;失败/超时保底用原念头。只在 reply 轮加一次调用。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_UNIFIED_DECISION_ENABLED`
(旧名,弃用,留着防 .env 报错)

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_GATE_DEFER_COOLDOWN`
gate no_action 冷却语义改向：冷却期内延后调度（MaiBot 拖时间），而非放行。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TURN_MULTI_ANCHOR_ENABLED`
多锚点:burst 按"发送者"分组,每组各自 judge→reply(flat 群里"线程"≈"人")。
治"只回最后一条→像回错人":每人各自回,reply_to 自然指向那个人。单人
burst(groups.size===1)走原单锚点逻辑,零回归。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `TURN_MULTI_ANCHOR_MAX`
每回合最多回几个人(多锚点预算上限,direct 也算在内)。注意:多锚点会让
单回合最多跑 N 次心流调用 + 发 N 条回复(L7 成本/速率),靠此值约束。

- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().positive().default(3)`

### `TURN_WAIT_PER_PERSON`
per-person WAIT 抑制:wait 只抑制触发者集合(waitTriggerUids)的后续,别人
照常进多锚点 judge。心流 wait 本意就是"等TA说完",抑制整群是过度抑制。
同回合多人触发 wait → 都进集合,都被抑制(L1)。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`


---

## 5. 记忆与向量检索

### `QDRANT_HOST`
Qdrant (vector memory) — zod-coerced; a non-numeric QDRANT_PORT now fails
validation at startup instead of producing `port: NaN` at connect time.

- **默认值**: `'127.0.0.1'`
- **类型定义**: `z.string().min(1).default('127.0.0.1')`

### `QDRANT_PORT`
- **默认值**: `6333`
- **类型定义**: `z.coerce.number().int().positive().max(65535).default(6333)`

### `MEMORY_VISIBILITY_ENABLED`
── DM↔群记忆连结(借鉴 CyberGroupmate 以人为中心统一记忆;docs/dm-group-memory-*.md)──
机制1 隐私 visibility 兜底:记忆/画像跨上下文返回前按 private/contextual/public
逐条 scrub(DM 默认 private,群默认 contextual)。是机制3/4 跨上下文共享的前置门,
关闭时跨上下文入口一律 fail-closed 拒绝返回。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MEMORY_SENSITIVE_CHAT_IDS`
始终视作私密的会话(逗号分隔 chatId;群为负数)。DM 由 DM_AUTO_PRIVATE 自动判定。

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n !== 0); })`

### `MEMORY_CROSS_CONTEXT_ENABLED`
机制4 跨上下文记忆召回:per-uid 旁路检索(不锁 chatId),返回强制过 visibility
scrub(默认带 public + 非私密来源 contextual,private 一律剔除)。
**必须** MEMORY_VISIBILITY_ENABLED 也开才生效(fail-closed)。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MEMORY_EMBED_MODEL`
── 长期记忆嵌入模型 / collection / 相关性下限 ──────────────
默认的 all-MiniLM-L6-v2 是**英文单语**模型,而本 bot 是中文群聊。生产机实测中文
同义 0.7543 / 无关 0.6097 → 区分度仅 0.1446(「打篮球」vs「查比特币价格」相似度
0.7210,比英文同义句对的 0.7025 还高),即语义检索接近随机。
paraphrase-multilingual-MiniLM-L12-v2 同为 384 维、区分度 0.5592(3.9x)。
换模型后新旧向量空间不兼容,**必须整库重嵌入**:scripts/reembed-memory.ts 灌进
新 collection → 改 MEMORY_COLLECTION 切换 → 旧库保留一周作回滚。

- **默认值**: `'Xenova/all-MiniLM-L6-v2'`
- **类型定义**: `z.string().default('Xenova/all-MiniLM-L6-v2')`

### `MEMORY_COLLECTION`
- **默认值**: `'xxb_group_history'`
- **类型定义**: `z.string().default('xxb_group_history')`

### `MEMORY_MIN_SCORE`
检索相关性下限(0..1)。0 = 不过滤,保持历史行为(纯 topK)。
换模型与调阈值刻意分成两次改动;标定必须用真实语料,别沿用旧模型下的经验值。

- **默认值**: `0`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0)`

### `MEMORY_HYBRID_ENABLED`
混合检索:向量召回 + FTS5 BM25 词法召回,按 RRF(名次融合)合并。
384 维小模型对专有名词/群内黑话/型号天然弱(jargon-miner 挖的正是这类词),
BM25 补的就是这一块。关闭时完全走旧的纯向量路径。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MEMORY_DEDUP_ENABLED`
写入侧近重复合并:命中已有近邻时不新增点,改为顶高它的 ref_count
(「这件事又被说了一次」语义上是强化,不是复制)。压制「哈哈哈」「+1」这类刷屏。
**阈值必须在换完嵌入模型之后标定** —— 旧的英文单语模型下中文相似度普遍虚高
(无关句对都有 0.72),0.93 在旧向量空间里会命中几乎一切,等于把记忆写没了。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MEMORY_DEDUP_THRESHOLD`
- **默认值**: `0.93`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0.93)`

### `MEMORY_FRESHNESS_ENABLED`
── AGI Level 5 Phase 12: 记忆陈旧检测 ───────────────────────────────
超期未确认 → stale 降权;变化词(换工作/分手) → 相关旧属性 stale。
只检测不自动删;检索到 stale 时注明可能过时。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MEMORY_STALE_AFTER_DAYS`
- **默认值**: `90`
- **类型定义**: `z.coerce.number().int().min(7).default(90)`


---

## 6. 人物画像与关系

### `PERSONA_DIR`
Persona override directory (per-user {uid}.md / .txt)

- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `PERSON_IDENTITY_ENABLED`
跨群人物身份(借鉴 CGM 两层人物模型):在别的群也认得的人,带上跨群整体印象。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PROFILE_MERGE_ENABLED`
机制5 LLM 全局画像合并 cron:低频把某人各上下文(群+DM)画像喂便宜模型提炼成
全局 traits/interests/relation,写回 person_identity 全局列。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PROFILE_MERGE_CHAT_IDS`
合并灰度群列表(逗号分隔 chatId,群为负数),空 = 对所有上下文生效。

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n !== 0); })`

### `PROFILE_MERGE_USAGE`
全局画像合并走哪个便宜模型 usage 路由。

- **默认值**: `'summarize'`
- **类型定义**: `z.string().default('summarize')`

### `PROFILE_MERGE_STALE_HOURS`
（SCRATCHPAD_ENABLED 已移除——工作记忆常驻）
C:profile-merge 加频 —— 合并水位线间隔(小时)+ 每 tick 处理人数,调小/调大
直接影响全局画像刷新频率与 token 消耗。

- **默认值**: `72`
- **类型定义**: `z.coerce.number().int().positive().default(72)`

### `PROFILE_MERGE_MAX_UIDS`
- **默认值**: `8`
- **类型定义**: `z.coerce.number().int().positive().default(8)`

### `PROFILE_SYNC_BATCH_SIZE`
每 tick 处理多少个"有 pending 消息"的用户画像。默认 20;调大可更快榨干
积压的 pending backlog(有意义的真实工作),也提高 StepFun 消耗。

- **默认值**: `20`
- **类型定义**: `z.coerce.number().int().positive().default(20)`

### `MOOD_TUNE_ENABLED`
心情/精力 → humanizer 参数调制 (Opus 评审: 随机性不该是 IID;
累/被怼时回复更短更敷衍, 心情好时更活泼)。合并序: 群风格 < mood-tune <
运营 override < ASI self-tune。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `RELATIONSHIP_ASYMMETRY_ENABLED`
好感非对称动力学 (Opus 评审: 信任慢升快降 —— 伤害一次掉很多,
修复要几十次正交互)。开启后正 delta × UP(慢), 负 delta × DOWN(快)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `RELATIONSHIP_ASYMMETRY_UP`
- **默认值**: `0.5`
- **类型定义**: `z.coerce.number().nonnegative().default(0.5)`

### `RELATIONSHIP_ASYMMETRY_DOWN`
- **默认值**: `1.5`
- **类型定义**: `z.coerce.number().nonnegative().default(1.5)`

### `RELATIONSHIP_QUANT_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false), /** * tier 驱动画像精度：按关系 tier 裁剪 user_profiles（Tier1 traits≤10 留 14 天 * episodes，Tier4 traits≤1 留 1 天）——不熟的人主动遗忘。默认关。 */`

### `RELATIONSHIP_PROFILE_TRIM_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MOOD_ENABLED`
── Mood drift (Stage E) ──
Bot 每个群独立 valence ∈ [-100, 100]，随事件起伏，按时间向 0 衰减。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MOOD_DECAY_RATE_PER_HOUR`
每小时衰减比例 (0..1)。0.3 = 1 小时后保留 70% 强度

- **默认值**: `0.3`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0.3)`

### `MOOD_INJECT_ENABLED`
是否把 mood hint 注入 reply prompt

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MOOD_INJECT_THRESHOLD`
|valence| < 该阈值时不注入 prompt（默认 calm 不打扰）

- **默认值**: `20`
- **类型定义**: `z.coerce.number().int().nonnegative().default(20)`

### `SELF_HISTORY_ENABLED`
── Self-narrative (Stage F): bot 记得自己对每个用户说过什么 ──

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SELF_HISTORY_INJECT_LIMIT`
- **默认值**: `5`
- **类型定义**: `z.coerce.number().int().positive().default(5)`

### `SELF_HISTORY_WINDOW_DAYS`
- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `RELATIONSHIP_ENABLED`
── Relationship narrative (Stage F): 每对 (chat,user) 累计 affinity ──

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `RELATIONSHIP_INJECT_THRESHOLD`
|affinity| < 该值时不注入 prompt（默认 一般 关系不打扰）

- **默认值**: `20`
- **类型定义**: `z.coerce.number().int().nonnegative().default(20)`


---

## 7. Meta + Subagent + CodeAct

### `SEARXNG_URL`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `FETCH_GATEWAY_URL`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `FETCH_WORKER_URL`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `TIMER_API_URL`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `TIMER_CALLBACK_URL`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `SUBAGENT_MEMORY_ENABLED`
── CodeAct 自动注入长期记忆 ──────────────────────────────
接在 subagent/executor.ts(真正生成话语的那层),**不是** Meta 编排器 ——
Meta 的引擎跨所有会话,其输出经 digest/梦境日记扩散到每个群的 prompt,
私聊记忆进 Meta 就有一条通往别的群的洗白路径(与那次"私聊原文被念到群里"同源)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SUBAGENT_MEMORY_CHAT_IDS`
灰度名单。**空 = 关闭**,与本仓其他 flag 的「空 = 全量」刻意相反:
这是隐私相关特性,配错的代价不对称 —— 漏开只是没效果,误开是内容外泄。

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n !== 0); })`

### `SUBAGENT_MEMORY_TOPK`
- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().min(1).max(10).default(3)`

### `SUBAGENT_MEMORY_TIMEOUT_MS`
上下界都要:下界防 `TIMEOUT-50` 变成 0 导致「记忆永远为空且与无命中不可区分」,
上界防有人调大后阻塞 CodeAct(那是生产热路径)。

- **默认值**: `400`
- **类型定义**: `z.coerce.number().int().min(100).max(1000).default(400)`

### `SUBAGENT_MEMORY_MAX_CHARS`
- **默认值**: `600`
- **类型定义**: `z.coerce.number().int().min(100).max(2000).default(600)`

### `META_SUBAGENT_ENABLED`
── Meta + Subagent (CyberGroupmate-shaped orchestration inside nyatbot) ──
默认关。开启后灰名单群走 Attention→Meta→dispatch→CodeAct Subagent→callback,
不再走 BullMQ message/turn-actor 直通(避免双回复)。详见 docs/meta-subagent/。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `META_SUBAGENT_CHAT_IDS`
灰度 chatId 列表(逗号分隔)。空 = META_SUBAGENT_ENABLED 时对所有 chat 生效。

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n !== 0); })`

### `META_TICK_MS`
Meta tick 间隔(ms)。对齐 CGM Attention flush 窗口量级。

- **默认值**: `5000`
- **类型定义**: `z.coerce.number().int().positive().default(5000), /** * L0/L1 Attention 合并静默窗：群聊在最后一条进队后还要再等这么久才让 Meta flush。 * 这是 Meta 路径的「连发→一回」节奏（不是 TIMING_TALK_VALUE / gate wait）。 * L0 含昵称点名仍立刻 ingest；@ / 回 bot 可走 timing hard-bypass。 * hold 到期会 kick 一次 metaTick，不完全依赖 META_TICK_MS。 * 0 = 关闭。默认 2800ms。 */`

### `META_L0_COALESCE_MS`
- **默认值**: `2800`
- **类型定义**: `z.coerce.number().int().nonnegative().default(2800), /** * Heart 插话不应期(ms)：bot 刚回过 / CodeAct 占用时，被动消息不再 elevate、也不再 auto-dispatch heart:。 * 防群里同一话题连珠炮（三连赖账）。L0/@/回 bot 不受影响。0 = 关闭。默认 45s。 */`

### `META_HEART_REFRACTORY_MS`
- **默认值**: `45_000`
- **类型定义**: `z.coerce.number().int().nonnegative().default(45_000), /** * Meta 路径 defer 延迟重评：canDefer=true 传给 runTimingGate，让冷却/talk-value * 短路层产出 deferOnly 决策，再由 scheduleMetaDeferReeval 排 Redis ZSET 延迟重评， * 而非永久丢弃。需 TIMING_GATE_ENABLED + META_SUBAGENT_ENABLED 同开。默认关。 */`

### `META_DEFER_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false), /** * Dispatch 期 timing gate：把 runTimingGate 挂到 CodeAct dispatch 前—— * Heart/Meta 决定「说不说」，gate 决定「什么时候说」（老 pipeline 里 * judge=REPLY 之后、reply 之前那道节奏闸的 meta 等价物）。 * L0 direct / L1_CALLBACK bypass；其余（heart 插话、Meta LLM gap-fill * 闲聊）过完整短路层（continuation 免检 / 冷却 defer / talk-value）+ LLM。 * 需 TIMING_GATE_ENABLED 同开；建议配合 META_DEFER_ENABLED。默认关。 */`

### `META_DISPATCH_GATE_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false), /** * 承诺闭环（promise loop）：说出口的承诺必须落地—— * ① telegram.sendToChat 跨群送达（仅主人 DM 任务，限 2 次/任务）； * ② goals.add 把「等下/回头要做的事」立成关注目标（unified-tick 到点执行）； * ③ endTask 兜底：bot 自己发的文本含承诺措辞但既没 goals.add 也没 sendToChat *    → 自动补立 goal（origin promise-backstop）。默认关。 */`

### `META_ATTENTION_TOP_N`
单次 Meta flush 最多处理几个 attention 条目。

- **默认值**: `8`
- **类型定义**: `z.coerce.number().int().positive().default(8)`

### `META_USAGE`
Meta / CodeAct 用的 AI usage 名(走现有 AI_USAGE_* 路由)。

- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `CODEACT_USAGE`
- **默认值**: `'reply'`
- **类型定义**: `z.string().default('reply')`

### `CODEACT_MAX_TURNS`
- **默认值**: `8`
- **类型定义**: `z.coerce.number().int().positive().default(8)`

### `CODEACT_TIMEOUT_MS`
- **默认值**: `30_000`
- **类型定义**: `z.coerce.number().int().positive().default(30_000)`

### `CODEACT_CONCURRENCY`
CodeAct BullMQ / local pump 全局并发；同 chat 仍串行（Redis active lock）。

- **默认值**: `4`
- **类型定义**: `z.coerce.number().int().positive().default(4)`

### `CODEACT_WEB_SEARCH_ENABLED`
Subagent host web.search（复用 pipeline executeSearch）。默认开；可关。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `CODEACT_BANNED_WORDS`
CodeAct 禁词(逗号分隔),出站文本命中则拒发并要求重写。

- **默认值**: `'是吧,对吧,作为一个AI,作为人工智能'`
- **类型定义**: `z .string() .default('是吧,对吧,作为一个AI,作为人工智能') .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))`


---

## 8. 自我演化与目标系统

### `KNOWLEDGE_BASE_DIR`
Knowledge base (file-backed, PHP parity)

- **默认值**: `'./data/knowledge'`
- **类型定义**: `z.string().default('./data/knowledge')`

### `KNOWLEDGE_CRON_CHAT_IDS`
Knowledge cron (cron_long_term.php parity)

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; try { const j = JSON.parse(t) as unknown; if (Array.isArray(j)) { return j.map((x) => Number(x)).filter((n) => !Number.isNaN(n) && n !== 0); } } catch { /* fall through */ } return t .split(',') .map((x) => Number(x.trim())) .filter((n) => !Number.isNaN(n) && n !== 0); })`

### `KNOWLEDGE_CRON_SCHEDULE`
- **默认值**: `'30 * * * *'`
- **类型定义**: `z.string().default('30 * * * *')`

### `KNOWLEDGE_CRON_HASH_PATH`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `DREAM_CONSOLIDATE_ENABLED`
── AGI Level 5 Phase 2: Dreaming 整合 ───────────────────────────────
每周一次语义合并冗余/冲突经验(MindMemOS dreaming)。走 judge 链。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DREAM_CONSOLIDATE_USAGE`
- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `GOAL_LONG_TERM_ENABLED`
── AGI Level 5 Phase 3: 长期任务语义 ────────────────────────────────
goal 升级为跨周持续关注:check_goal 主动探查世界悄悄的变化(VibeLifeBench)。
long_term goal 的 stale 窗口放宽到 30 天。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `GOAL_MAX_ACTIVE`
── AGI Level 4 P4-B: 好奇心目标追踪（常驻）───────────────────────────
把「值得持续关注的事」固化为 goal，unified-tick 周期性 CodeAct 查进展并汇报。

- **默认值**: `20`
- **类型定义**: `z.coerce.number().int().positive().default(20)`

### `DREAM_JOURNAL_ENABLED`
日记 dream-journal(独立 flag,可不启 Meta 单独开)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DREAM_JOURNAL_DIR`
- **默认值**: `'./data/dream-journal'`
- **类型定义**: `z.string().default('./data/dream-journal')`

### `DREAM_JOURNAL_CRON`
一个或多个 cron(UTC,逗号分隔)。默认:23:00 UTC=北京07:00(早)、15:00 UTC=北京23:00(睡前)。
模型可 WRITE/SKIP；一天多段追加，无次数上限。也可用 sleep 边沿触发。

- **默认值**: `'0 23 * * *,0 15 * * *'`
- **类型定义**: `z.string().default('0 23 * * *,0 15 * * *')`

### `DREAM_JOURNAL_HOOK_SLEEP`
是否在硬作息起床/入睡边沿各试写一次(模型仍可 SKIP)。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `DREAM_JOURNAL_DM`
写完是否私聊推送给主人(MASTER_UID)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DREAM_JOURNAL_CHAT_ID`
日记发布频道/群 chatId。正数会规范成 -100{id}(超群/频道)；0=不发频道。

- **默认值**: `0`
- **类型定义**: `z.coerce.number().int().default(0)`

### `DREAM_JOURNAL_USAGE`
- **默认值**: `'reply'`
- **类型定义**: `z.string().default('reply')`

### `LEARNER_ENABLED`
── Learner (Expression + Jargon, Stage D) ──

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `LEARNER_SCAN_INTERVAL_MIN`
- **默认值**: `60`
- **类型定义**: `z.coerce.number().int().positive().default(60)`

### `LEARNER_SCAN_USAGE`
- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `LEARNER_BATCH_SIZE`
- **默认值**: `80`
- **类型定义**: `z.coerce.number().int().positive().default(80)`

### `LEARNER_MIN_NEW_MSGS`
- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `LEARNER_MAX_CHATS_PER_TICK`
- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().positive().default(3)`

### `JARGON_INFERENCE_THRESHOLDS`
G1: 首档 4→3,黑话冷启动更快过推断线(重检计数修复后才有意义)

- **默认值**: `'3,8,25,100'`
- **类型定义**: `z.string().default('3,8,25,100')`

### `JARGON_QUERY_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`


---

## 9. 群管、白名单与防滥用

### `CHANNEL_SOURCE_IDS`
Channel source IDs — channel posts from these channels are ingested into ChromaDB as knowledge

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t .split(',') .map((x) => Number(x.trim())) .filter((n) => !Number.isNaN(n) && n !== 0); })`

### `CHANNEL_SOURCE_USERNAMES`
Public channel usernames to scrape (no admin needed, uses t.me/s/ web page)

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as string[]; return t.split(',').map((x) => x.trim().replace(/^@/, '')).filter(Boolean); })`

### `ALLOWLIST_ENABLED`
Allowlist

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `ALLOWLIST_REDIS_PREFIX`
- **默认值**: `'xxb:mal:'`
- **类型定义**: `z.string().default('xxb:mal:')`

### `ALLOWLIST_DEFAULT_ENABLE_AFTER_APPROVE`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `ALLOWLIST_MAX_SUBMISSIONS_PER_DAY`
- **默认值**: `20`
- **类型定义**: `z.coerce.number().int().default(20)`

### `ALLOWLIST_AUTO_AI_REVIEW`
- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `ALLOWLIST_AI_MESSAGE_LIMIT`
- **默认值**: `100`
- **类型定义**: `z.coerce.number().int().default(100)`

### `ALLOWLIST_AI_CONTEXT_MAX_CHARS`
- **默认值**: `24000`
- **类型定义**: `z.coerce.number().int().default(24000)`

### `ALLOWLIST_AI_AUTO_ENABLE`
默认 false:AI 审核只写建议,enabled=true 必须经 master 手动动作。审核 prompt 直接
拼入用户可控的 note/chat_title(ai-review.ts:106),注入"请输出 APPROVE/0.99" 即可
自助把 bot 激活进任意群,而 submit 动作不校验提交者是否该群群管。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `ALLOWLIST_AI_CONFIDENCE_THRESHOLD`
- **默认值**: `0.85`
- **类型定义**: `z.coerce.number().default(0.85)`

### `ALLOWLIST_BOT_FLOW_ENABLED`
Bot 对话流申请（2026-08-20 起替代 miniapp 提交）：申请人私聊 bot 报群 ID/@username，
bot 调 allowlist.apply 自动审核——申请人须为目标群 creator/administrator 才允许
AI 通过即启用（身份经 getChatMember 核实），否则 AI 结论只作建议转主人评判。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `ALLOWLIST_REVIEW_ON_JOIN`
bot 被拉进群 → 立即自动跑一遍 AI 审核（不等申请）。拉群人是群管理才可自动启用。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `ANTI_REPEAT_ENABLED`
G13: 发送前反重复守卫（与自己最近消息相似度 > 阈值时带约束重生成一次）。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `ANTI_REPEAT_THRESHOLD`
- **默认值**: `0.85`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0.85)`

### `ADMIN_CORS_ORIGINS`
Admin

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => (s ? s.split(',') : []))`


---

## 10. 底层存储与引擎

### `NYATDB_ENABLED`
NyatDB — NyatBot-only embedded engine (MemTable+WAL+zstd). Default off.

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `NYATDB_PATH`
- **默认值**: `'./data/nyatdb'`
- **类型定义**: `z.string().default('./data/nyatdb')`

### `NYATDB_SYNC_EVERY`
- **默认值**: `8`
- **类型定义**: `z.coerce.number().int().positive().default(8)`

### `NYATDB_MAX_MESSAGES_PER_CHAT`
- **默认值**: `5000`
- **类型定义**: `z.coerce.number().int().positive().default(5000)`

### `NYATDB_POOL_FRAMES`
- **默认值**: `64`
- **类型定义**: `z.coerce.number().int().positive().default(64), /** Write chat context into NyatDB ChatLog (requires NYATDB_ENABLED). * Name is historical ("dual-write" era); with NYATDB_REDIS_MIRROR=false this is * the sole chat-log writer. Prefer thinking of it as NYATDB_WRITE. */`

### `NYATDB_DUAL_WRITE`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false), /** * Prefer NyatDB ChatLog for getRecent/getAll; fall back to Redis if empty/error. * Pair with NYATDB_DUAL_WRITE. Default off. */`

### `NYATDB_READ`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false), /** * Also mirror chat context into Redis `xxb:ctx:*`. * When NyatDB write is on and this is false, Redis ctx is no longer updated * (members / active_groups / BullMQ still use Redis). Default off. */`

### `NYATDB_REDIS_MIRROR`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `NYATDB_CHAT_RING_MAX`
- **默认值**: `200`
- **类型定义**: `z.coerce.number().int().positive().default(200)`

### `NYATDB_VERIFY_ON_OPEN`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false), /** Use Rust napi engine when the native addon is built (`npm run build:nyatdb`). Default off. */`

### `NYATDB_NATIVE`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `CONTEXT_MAX_LENGTH`
- **默认值**: `600`
- **类型定义**: `z.coerce.number().int().positive().default(600)`

### `CONTEXT_ENGINE_ENABLED`
Context Engine:组装 Meta/Subagent prompt 时打 Manifest(可观测+稳定前缀)。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`


---

## 11. 其他功能模块

### `CRON_ENABLED`
Cron master switch — read via env() like every other flag (kilo review).

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `WEBHOOK_URL`
Webhook (optional — use polling if not set)

- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `WEBHOOK_SECRET`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `SKILLS_DIR`
Tool System

- **默认值**: `'./data/skills'`
- **类型定义**: `z.string().default('./data/skills')`

### `XAI_API_KEY`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `XAI_SEARCH_BASE_URL`
- **默认值**: `'https://new-api-zhcm.onrender.com/v1'`
- **类型定义**: `z.string().url().default('https://new-api-zhcm.onrender.com/v1')`

### `XAI_SEARCH_MODEL`
- **默认值**: `'grok-4.3-fast'`
- **类型定义**: `z.string().default('grok-4.3-fast')`

### `GEMINI_API_KEY`
Gemini 联网搜索(Google Search grounding,AI Studio key)。配 KEY 即为主搜索路由。
注:3.1-flash-lite 的 grounding 在免费 key 上 quota=0(需计费);2.5-flash-lite 免费可用。

- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `GEMINI_SEARCH_MODEL`
- **默认值**: `'gemini-2.5-flash-lite'`
- **类型定义**: `z.string().default('gemini-2.5-flash-lite')`

### `GEMINI_SEARCH_PROXY`
本机真实出口地区不支持 grounding(400 User location not supported);设代理只让
Gemini 搜索这一路走代理(其余流量直连,免得 Redis/Qdrant/Firecrawl 等本地连接被绕)。

- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `FIRECRAWL_API_KEY`
Firecrawl 兜底:JS 重页面 / Cloudflare 验证页,免费路由(直连/Jina/本地绕过)
全失败后才落到这条付费路由。未配 KEY → 默认关,不发任何 Firecrawl 调用。

- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `FIRECRAWL_API_URL`
- **默认值**: `'https://api.firecrawl.dev'`
- **类型定义**: `z.string().url().default('https://api.firecrawl.dev')`

### `WEB_FETCH_USER_AGENT`
- **默认值**: `'XXB-WebFetch/1.0'`
- **类型定义**: `z.string().default('XXB-WebFetch/1.0')`

### `IP_QUALITY_API_URL`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `COMMON_API_KEY`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `OUTCOME_TRACKING_ENABLED`
Tracking

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MASTER_UID_EXTRA`
- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n > 0); })`

### `AUDIO_TRANSCRIBE_ENABLED`
语音/音频转写:默认关。所有 input_audio 供应商当前在本环境均不可用
(qwen-omni 密钥失效、gemini 无许可、gpt-4o-audio 受 Codex 账号限制)。
关 → describeAudio 直接返回中性占位,不发那通注定失败的调用。
接上可用 audio 模型后:置 true + AI_USAGE_AUDIO_LABEL=<模型> 即生效。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PDF_VISION_ENABLED`
PDF 识别:同理默认关。当前 vision 路由实际落到 GPT(sub2gpt54mini),
读不了 PDF base64,这通调用必败。gemini/PDF-capable vision 恢复后置 true。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `VERIFY_ENABLED`
Join verification

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `VERIFY_DEFAULT_TIMEOUT`
- **默认值**: `300`
- **类型定义**: `z.coerce.number().int().default(300)`

### `VERIFY_MAX_ATTEMPTS`
- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().default(3)`

### `SCHEDULE_LLM_WAKE`
到点提醒唤醒 LLM(用群里上下文、自己的语气说),而非念稿「⏰定时提醒:X」。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `METRICS_ENABLED`
Prometheus /metrics(借鉴 CGM:LLM 事件总线 → token/缓存/延迟按用途可见)。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TOPIC_REGISTRY_ENABLED`
话题生命周期注册表(借鉴 CGM Topic Registry):cron 抽取各群当前话题 + 注入「当前话题」。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TOPIC_SCAN_INTERVAL_MIN`
- **默认值**: `8`
- **类型定义**: `z.coerce.number().int().positive().default(8)`

### `REPLY_DIRECT_RECENT_WINDOW`
优化:direct 模式只取最近 N 条(原 50)——砍掉不可缓存的上下文体积,降 token/延迟。

- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `CACHE_WARMUP_ENABLED`
优化:缓存预热——定时拿静态 system 前缀 ping 回复模型,保持 DeepSeek 前缀缓存热(默认关)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `CACHE_WARMUP_INTERVAL_MIN`
- **默认值**: `4`
- **类型定义**: `z.coerce.number().int().positive().default(4)`

### `REPLY_JSON_MODE`
回复写手强制合法 JSON(DeepSeek/OpenAI json_object)——根治单引号/Python-dict 脏输出。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `REPLY_VISION_ENABLED`
P2 多模态直读:回复写手调用直接带原图(默认关 = 只用文本描述)。
开前确保回复链主 label 声明 AI_PROVIDER_<NAME>_VISION=true,
纯文本 label 声明 VISION=false 让 fallback 跳过(不白烧 400)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `NO_ACTION_BACKOFF_START_COUNT`
no_action 指数退避(MaiBot 借鉴):窗口 = base * 2^max(0, n-START),
即第 START_COUNT+1 次 no_action 起开始翻倍,封顶 CAP;continue/真实
回复清零计数。

- **默认值**: `2`
- **类型定义**: `z.coerce.number().int().nonnegative().default(2)`

### `NO_ACTION_BACKOFF_CAP_SEC`
- **默认值**: `300`
- **类型定义**: `z.coerce.number().int().positive().default(300)`

### `REFLECTION_ENABLED`
── 深度反思(A:把 StepFun 配额花在"让 bot 记住群里发生过什么")──
后台 cron 对活跃群喂大窗口历史 → 产出每群"近况摘要"注入回复。吞吐可调:
token/天 ≈ CHATS_PER_TICK × (WINDOW×~15) × (1440/INTERVAL_MIN)。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `REFLECTION_INTERVAL_MIN`
- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `REFLECTION_CHATS_PER_TICK`
- **默认值**: `20`
- **类型定义**: `z.coerce.number().int().positive().default(20)`

### `REFLECTION_WINDOW_MSGS`
- **默认值**: `250`
- **类型定义**: `z.coerce.number().int().positive().default(250)`

### `REFLECTION_USAGE`
- **默认值**: `'summarize'`
- **类型定义**: `z.string().default('summarize')`

### `DISTILL_USAGE`
── AGI Level 4 P4-A: 经验沉淀（常驻）─────────────────────────────────
任务终态复盘蒸馏成 episode + 可复用经验；开工前按 contentDirection
检索相关经验注入 executor prompt。复盘走便宜链，失败静默不重试。

- **默认值**: `'summarize'`
- **类型定义**: `z.string().default('summarize')`

### `EXPERIENCE_VERIFY_ENABLED`
── AGI Level 5 Phase 1: 经验验证器（常驻）────────────────────────────
注入的经验在任务终态打分：done+干净路径 → success_count；failed →
failure_count。成功≥2 次 → verified=1(已证实)，失败≥2 次 → verified=2
(可疑，检索降权)。防「一次侥幸成功被固化」(Practice Makes Unsafe)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `EXPERIENCE_VERIFY_MIN_SUCCESS`
- **默认值**: `2`
- **类型定义**: `z.coerce.number().int().min(1).default(2)`

### `LOOP_POLICY_ENABLED`
── AGI Level 5 Phase 4: Loop 策略资产化 ─────────────────────────────
executor 循环策略(验证/重试/停止)从静态升级为可进化资产:
注入 prompt + 任务终态计数,成功率 <30% 自动 disable。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `LOOP_POLICY_MAX`
- **默认值**: `5`
- **类型定义**: `z.coerce.number().int().min(1).default(5)`

### `EXPERIENCE_SHARE_ENABLED`
── AGI Level 5 Phase 5: 多智能体安全共享 ─────────────────────────────
只有 verified=1(已证实)的经验可跨 bot 共享;未验证/可疑仅本 bot 用。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `WORLD_STATE_ENABLED`
── AGI Level 5 Phase 6: 轻量世界状态 ────────────────────────────────
对象中心实体(person/project/topic)持续维护,goal check 开工前注入上下文。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `RECALL_BUDGET_ENABLED`
── AGI Level 5 Phase 8: Context rot 防护 ─────────────────────────────
少召回+重排+最高信号放前(防「迷失在中间」/干扰项误导)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `RECALL_MAX_EXPERIENCE`
- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().min(1).default(3)`

### `GROUP_NORMS_ENABLED`
── AGI Level 5 Phase 9: 群体风格画像 ────────────────────────────────
LoSoNA: 每个群有自己的隐性规范,观察消息 → 推断 → 注入 reply。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `GROUP_NORMS_INFER_USAGE`
- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `GROUP_NORMS_TTL_HOURS`
- **默认值**: `6`
- **类型定义**: `z.coerce.number().int().min(1).default(6)`

### `TOM_STATE_ENABLED`
── AGI Level 5 Phase 10: ToM 心智状态层 ─────────────────────────────
回复前先想「对方想要什么/什么情绪/期待什么反应」,白捡的策略性收益。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TASK_EXECUTOR_ENABLED`
── AGI Level 6 Phase 13: Task 对象架构 ─────────────────────────────
补 harness 的「执行+状态」:BullMQ 独立队列跑任务,与消息处理隔离。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TASK_MAX_ROUNDS`
- **默认值**: `6`
- **类型定义**: `z.coerce.number().int().min(1).default(6)`

### `CONNECTIVITY_TRACKING_ENABLED`
── AGI Level 6 Phase 14: 反向阀门 L7 ───────────────────────────────
连接率埋点(新核心指标)+ 私聊风险分档。初期只记录不改行为。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SYCOPHANCY_AUDIT_ENABLED`
谄媚审计: 每周抽 200 条回复按五维打分,纯离线。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `BEST_OF_N_BASE`
── AGI Level 6 Phase 15: 小模型增强 ────────────────────────────────
best-of-N 采样基数(按难度翻倍)。verifier 用 judge usage 打分选最优。

- **默认值**: `1`
- **类型定义**: `z.coerce.number().int().min(1).default(1)`

### `SELF_REFLECT_USAGE`
── AGI Level 4 P4-C: 自我模型（常驻）────────────────────────────────
每天凌晨复盘自己 24h 的回复表现 → ≤5 条自我认知注入回复 prompt。

- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `SELF_PLAY_COOLDOWN_SEC`
两次 self-play 的最小间隔（tick 内 self_play 动作的冷却否决）

- **默认值**: `4 * 3600`
- **类型定义**: `z.coerce.number().int().positive().default(4 * 3600)`

### `STEPFUN_CONSUMER_ENABLED`
── StepFun 配额消费引擎(用户选:滚动深反思)──────────────────────────
专用后台引擎:持续对全量群做大窗口深反思 + 跨上下文画像合并,把 8000M/月订阅
用起来(冲 ~100M/天)。默认关。日调用数 ≈ CALLS_PER_TICK × 1440(每分钟一 tick)。
路由不在此配:群反思走 REFLECTION_USAGE、合并走 PROFILE_MERGE_USAGE(引擎复用
reflectChat/mergeGlobalProfile 各自的 usage,不做独立模型路由)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `STEPFUN_CONSUMER_CALLS_PER_TICK`
- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `STEPFUN_CONSUMER_CONCURRENCY`
并发默认 4:StepFun 账号并发上限=8 且与用户可见的 reply/judge 共享,引擎须留余量
(设过高会 429 拖累实时回复)。

- **默认值**: `4`
- **类型定义**: `z.coerce.number().int().positive().default(4)`

### `STEPFUN_CONSUMER_REFLECT_WEIGHT`
群深反思在工作池里的权重(重复入池次数):群内容真实演化、最不浪费,给更高权重。

- **默认值**: `3`
- **类型定义**: `z.coerce.number().int().positive().default(3)`

### `MUNDO_ENABLED`
── Mundo「难题攻坚」部门(可选,默认关)────────────────────────────────
第三方自建端点上的深推理模型(qwen3.6/映射 Mundo AI),擅长硬算法/并发/调试,
但延迟高、极耗 token、可能空转、端点自签证书不稳定 —— 只适合离线非关键任务且
输出必须人工/对拍复核。关时零足迹;开时 `mundo` usage 可被显式路由(设某
AI_USAGE_X_LABEL=mundo,或 Redis 运行时路由覆盖),自带兜底链降级到可靠模型。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DEEP_THINK_ENABLED`
「深想」:群里 @bot / 回复 bot 的**硬技术问题**,正常回复照常,同时后台丢给
mundo 深推理,想好了补发一条「我仔细想了下:…」。只对直接问 + 廉价判定为硬技术
的触发(低频),失败/回退/空则不补发(静默)。默认关;依赖 MUNDO_ENABLED。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `OWN_HISTORY_RETRIEVAL_ENABLED`
机制5: bot 自己的历史发言语义检索(Opus 评审: 翻旧账/自洽能力)。
检索本群与当前话题相关的自发言, 作为独立参考块注入(不进 merged)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PLANNER_AGENTIC_ENABLED`
── Agentic planner（MaiBot 1.0.0 Maisaka 多轮 plan→act 借鉴）──
开了之后 planned 路径用 generateText({tools,maxSteps}) 原生工具循环,
工具结果回写 LLM 历史,可自适应换工具/重查;失败自动回退旧 JSON 计划。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PLANNER_MAX_STEPS`
循环步数上限（MaiBot MAX_INTERNAL_ROUNDS=10,工具场景 4 够用）。

- **默认值**: `4`
- **类型定义**: `z.coerce.number().int().positive().default(4)`

### `SEND_IMAGE_TOOL_ENABLED`
SEND_IMAGE 工具(把上下文里的图转发出去,唯一有出站副作用的 agent 工具)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MTM_ENABLED`
── 中期记忆(MaiBot 1.0.0 借鉴):ctx 滚出窗口前压缩成可引用摘要 ──

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MTM_CHUNK`
每轮压缩的最老消息条数

- **默认值**: `150`
- **类型定义**: `z.coerce.number().int().positive().default(150)`

### `MTM_MAX_SUMMARIES`
摘要 FIFO 上限(超出丢最老的)

- **默认值**: `10`
- **类型定义**: `z.coerce.number().int().positive().default(10)`

### `MTM_INPUT_MAX_CHARS`
压缩输入字符上限(防超长撑爆 summarize 模型)

- **默认值**: `16000`
- **类型定义**: `z.coerce.number().int().positive().default(16000)`

### `PROMISE_LOOP_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PROMISE_CHECK_USAGE`
承诺兜底判定用的 AI usage 名（便宜快模型；LLM 判定非规则引擎）。

- **默认值**: `'reflection'`
- **类型定义**: `z.string().default('reflection'), /** * Post-Task Window（CGM 借鉴）：CodeAct 发完消息后开一个短暂发酵窗口， * 窗口内新消息由极轻量 LLM 判定「有没有人接住我刚才的话」，命中则不过 * Meta 直接补一轮 CodeAct 回复。默认关。 */`

### `POST_TASK_WINDOW_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `POST_TASK_WINDOW_MS`
发酵窗口时长(ms)。默认 2 分钟。

- **默认值**: `120_000`
- **类型定义**: `z.coerce.number().int().positive().default(120_000)`

### `POST_TASK_FOLLOWUP_USAGE`
follow-up 判定用的 AI usage 名（便宜快模型）。

- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge'), /** * Session Digest 持久化（CGM 借鉴）：Meta/Subagent 每 session 的 * [SESSION_DIGEST] 落 SQLite session_digests 表（FTS5 可检索）， * 后续 session 按 delta 注入；Subagent 侧没输出 digest 不让 endTask。默认关。 */`

### `DIGEST_PERSIST_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false), /** * Dreaming（CGM background-agent 简化版）：凌晨 cron 触发一个特权长任务， * 带着「上次做梦以来的任务/人/digest」素材自主行动（查资料/关心人/小工具）。 * 默认关。 */`

### `DREAMING_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DREAMING_CRON`
dreaming cron（UTC）。默认 19:17 UTC = 北京 03:17。

- **默认值**: `'17 19 * * *'`
- **类型定义**: `z.string().default('17 19 * * *')`

### `DREAMING_USAGE`
dreaming 长任务用的 AI usage 名。

- **默认值**: `'reply'`
- **类型定义**: `z.string().default('reply'), /** * Grounding 并行事实核查（CGM 借鉴）：heart/meta 决策的同时并行跑脱敏搜索， * 结果注入 CodeAct executor 作 grounding 参考；无搜索证据则丢弃。默认关。 */`

### `GROUNDING_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `GROUNDING_USAGE`
grounding 搜索综合用的 AI usage 名（便宜快模型）。

- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge'), /** * 关系评分量化（CGM 借鉴）：affinity 改由量化数据驱动——30 天窗口三维度 * 百分位（互动次数/活跃天数/画像深度）+ LLM quality delta + 14 天衰减 + * Dunbar 容量上限（15/50/150 强制降级）。默认关（保持 LLM 直调旧行为）。 */`

### `ARTIST_USAGE`
画摊子（agent/artist.ts）的 AI usage 名：SVG 是代码活，默认跟 reply 主链。

- **默认值**: `'reply'`
- **类型定义**: `z.string().default('reply')`

### `AGENT_LOOP_ENABLED`
长时间 Agent 循环：分段续跑 + checkpoint + 上下文压缩。默认关，灰度开。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `AGENT_MAX_SEGMENTS`
单个任务最多跑几段（每段 CODEACT_MAX_TURNS 轮）。超限强制诚实收尾。

- **默认值**: `10`
- **类型定义**: `z.coerce.number().int().positive().default(10)`

### `AGENT_COMPACT_AFTER_TURNS`
history 超过多少轮触发 LLM 压缩早期轮次。

- **默认值**: `50`
- **类型定义**: `z.coerce.number().int().positive().default(50)`

### `AGENT_PROGRESS_PING_ENABLED`
长任务进度可见性(P1):跨段续跑且从未发言时,每 10min 发一条"还在做"的
确定性进度 ping(模型里程碑汇报不可靠 —— 能续跑的任务按定义从没 sendText 过)。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `AGENT_COMPACT_USAGE`
上下文压缩用的 AI usage 名（便宜模型即可）。

- **默认值**: `'judge'`
- **类型定义**: `z.string().default('judge')`

### `SILENCE_ALERT_ENABLED`
── Silence Alert —— bot 沉默检测(端到端回复健康)──
监控「最近有人类活跃但 bot 超阈值没回复」的 chat,告警到 owner DM。
默认关;开时需配 SILENCE_ALERT_CHAT_ID(owner DM chatId)才真正发送,否则只打日志。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SILENCE_ALERT_INTERVAL_MIN`
扫描周期(分钟)。

- **默认值**: `5`
- **类型定义**: `z.coerce.number().int().positive().default(5)`

### `SILENCE_ALERT_CHAT_ID`
告警目标(owner DM chatId,正数)。0=只打日志不发送。

- **默认值**: `0`
- **类型定义**: `z.coerce.number().int().default(0)`

### `SILENCE_ALERT_HUMAN_STALE_MIN`
人类最后发言距今超过该分钟数 = 不算活跃(潜水群不告警)。

- **默认值**: `60`
- **类型定义**: `z.coerce.number().int().positive().default(60)`

### `SILENCE_ALERT_THRESHOLD_MIN`
bot 最后回复距今超过该分钟数 = 判定沉默。

- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `SILENCE_ALERT_COOLDOWN_MIN`
同一 chat 两次告警的最小间隔(去重,防刷屏)。

- **默认值**: `120`
- **类型定义**: `z.coerce.number().int().positive().default(120)`

### `SILENCE_ALERT_MAX_PER_RUN`
单轮最多告警几个 chat(防告警风暴)。

- **默认值**: `5`
- **类型定义**: `z.coerce.number().int().positive().default(5)`

### `SANDBOX_ENABLED`
── Computer-use sandbox (Playwright + terminal) ──
⚠️ 安全边界说明(2026-08-22 审查): computer.run 走宿主 /bin/sh -c 执行, 危险命令
模式集(sandbox/terminal.ts)只是纵深防御——**不是**隔离。SANDBOX_ENABLED=true +
SANDBOX_TERMINAL_ENABLED=true 时模型可在宿主机执行任意未被模式命中的命令
(读 .env/网络外带)。真隔离需容器/独立 uid 运行 bot。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SANDBOX_TERMINAL_ENABLED`
- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `SANDBOX_BROWSER_ENABLED`
- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `SANDBOX_ALLOWED_COMMANDS`
- **默认值**: `''`
- **类型定义**: `z.string().default('')`

### `SANDBOX_BLOCKED_COMMANDS`
- **默认值**: `'rm -rf,shutdown,reboot,mkfs,halt,dd if=,chmod 777'`
- **类型定义**: `z.string().default('rm -rf,shutdown,reboot,mkfs,halt,dd if=,chmod 777')`

### `EXPRESSION_INJECT_ENABLED`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `EXPRESSION_INJECT_COUNT`
- **默认值**: `5`
- **类型定义**: `z.coerce.number().int().positive().default(5)`

### `TIC_PENALTY_ENABLED`
口头禅自动惩罚闭环:盯 bot 自己发言,句首/句尾短语复读超阈值 → 自动降权 + 带 TTL
动态拉黑(注入不喂回 + prompt 提示"少说")+ 到期自愈。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TIC_PENALTY_INTERVAL_MIN`
- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `TIC_PENALTY_WINDOW`
- **默认值**: `60`
- **类型定义**: `z.coerce.number().int().positive().default(60),        // 采样最近 N 条自发言`

### `TIC_PENALTY_MIN_MESSAGES`
- **默认值**: `4`
- **类型定义**: `z.coerce.number().int().positive().default(4),   // 至少出现在几条里`

### `TIC_PENALTY_MIN_FRACTION`
- **默认值**: `0.35`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0.35),   // 至少占窗口比例`

### `TIC_PENALTY_TTL_SEC`
- **默认值**: `6 * 3600`
- **类型定义**: `z.coerce.number().int().positive().default(6 * 3600), // 动态拉黑存活时长`

### `RSS_MONITOR_ENABLED`
── P2-B: RSS 信息流监控 ──
周期轮询 RSS feeds，新条目存 Redis 供主动搭话引用

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `RSS_MONITOR_INTERVAL_MIN`
- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `RSS_FEEDS_JSON`
JSON 数组: [{url, chatId, autoPost?, sourceName?}]

- **默认值**: `'[]'`
- **类型定义**: `z.string().default('[]')`

### `RSS_USAGE`
自动发送时使用的 LLM 路由

- **默认值**: `'summarize'`
- **类型定义**: `z.string().default('summarize')`

### `RSS_MAX_ITEM_AGE_HOURS`
新条目新鲜度闸（小时）：pubDate 比阈值老的直接丢（仍计 seen 防回潮）；
没日期/解析不了的放行（误杀比漏放糟）。2026-08-24：Opus 4.6 旧闻标题党被端上桌的教训。

- **默认值**: `72`
- **类型定义**: `z.coerce.number().int().positive().default(72)`

### `BOT_COMMAND_LEARN_ENABLED`
── 借力其他 bot(学其他 bot 的命令,需要时代发)──
P1:观察学习每个 bot 的命令档案(怎么用/场景/needs_reply/needs_admin/output_type)

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `BOT_COMMAND_LEARN_INTERVAL_MIN`
学习扫描间隔(分钟)

- **默认值**: `30`
- **类型定义**: `z.coerce.number().int().positive().default(30)`

### `BOT_COMMAND_LEARN_USAGE`
学习侧(把观察到的命令提炼成用法/场景)的 LLM 路由。离线 cron、不赶时间、是深
推理任务 → 正好交给 mundo(qwen3.6);设 'mundo' 需 MUNDO_ENABLED。默认走 summarize。

- **默认值**: `'summarize'`
- **类型定义**: `z.string().default('summarize')`

### `NETWORK_BURST_ENABLED`
C 网络事件 burst:群里集体喊"挂了/CF炸了/502"时冒一句。reactive,默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `PEER_REACTION_ENABLED`
A 多 bot 共存:对会话型 bot(千雪)/带媒体结果的工具 bot(解析姬)做反应。
reactive、不走 judge,自带 chat-lock + per-peer fatigue + 作息门。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `BOT_DENOISE_ENABLED`
D 选择性降噪:对 ad/verify/echo 类其他 bot 消息,跳过 judge/digest/学习
(保留进 ctx,不删)。依赖 BOT_CLASSIFIER_ENABLED 的 botClass。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `BOT_CLASSIFIER_ENABLED`
入站 bot 消息分类层(A 多bot共存 / D 降噪 / 命令学习 的共用地基)。
先 shadow:打标 + 日志,不改任何行为;精度够了再让 A/D 消费。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `REPLY_MERGED_TOOLS_ENABLED`
合并写手:planned 路径用"一次带工具的写手调用"替代"planner 轮+写手"两段
(默认关,灰度;失败自动回退老两段路径)

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `REPLY_DIRECT_TOOLS_ENABLED`
P3:direct(普通闲聊)路径也挂工具 —— 现状是 judge 判 direct 后写手完全无工具,
群里随口问"这链接是啥/现在油价多少"只能瞎编。开启后 direct 也走合并写手,
但只给只读子集(搜索/抓页/记忆/画像/历史/bot知识/黑话),不给 ADD_TIMER/
CREATE_POLL/USE_BOT_COMMAND 这类有副作用的,防闲聊途中误建投票定时器。
前置依赖 REPLY_MERGED_TOOLS_ENABLED;不调工具时 ≈ 纯文本写手速度。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `REPLY_TOOLS_MAX_STEPS`
- **默认值**: `4`
- **类型定义**: `z.coerce.number().int().min(2).max(6).default(4)`

### `MULTI_AGENT_ENABLED`
── Multi-Agent 协调(Orchestrator + 专家 + Writer)──
把"一个 agent 拿所有工具"拆成"几个专职专家并行 + Writer 收口"。
Router 复用 judge.replyPath(direct→chat 跳过专家,planned→lookup/deep 进专家),
专家并行 fan-out,Writer 永远是唯一出口(persona 不分裂)。默认全开;灰度列表空=全群。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_CHAT_IDS`
灰度群列表(逗号分隔 chatId)。空 = 对所有群生效;非空 = 仅列出的群走多智能体。

- **默认值**: `''`
- **类型定义**: `z .string() .default('') .transform((s) => { const t = s.trim(); if (!t) return [] as number[]; return t.split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n) && n !== 0); })`

### `MULTI_AGENT_RESEARCHER_TIMEOUT_MS`
专家超时预算(与 turn 打断信号合并;超时→该专家 failed→Writer 回退内部 planner)

- **默认值**: `20000`
- **类型定义**: `z.coerce.number().int().positive().default(20000)`

### `MULTI_AGENT_RESEARCHER_MAX_STEPS`
- **默认值**: `6`
- **类型定义**: `z.coerce.number().int().positive().default(6)`

### `MULTI_AGENT_MEMORY_ENABLED`
Phase 2 记忆员:agentic RECALL(语义记忆检索)专家,与研究员并行 fan-out。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_PERSONA_ENABLED`
Phase 5 人设/关系专家:QUERY_PERSON_PROFILE + FETCH_HISTORY,搞清"在跟谁说、
该用什么语气"。chat 路径也跑(默认),lookup/deep 并行 fan-out。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_DIRECTOR_ENABLED`
导演专家(写手前):读上下文+念头,产出"情绪/姿态/切入点"块喂写手。全路由并行。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_DIRECTOR_TIMEOUT_MS`
- **默认值**: `5000`
- **类型定义**: `z.coerce.number().int().positive().default(5000)`

### `MULTI_AGENT_CONTEXT_DIGEST_ENABLED`
上下文理解专家:忙群(最近消息数 ≥ 阈值)先把最近 N 条 digest 成"现在在聊啥"
给写手,降写手 prompt 噪音 + 多吃一次 token。全路由并行。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_CONTEXT_DIGEST_TIMEOUT_MS`
- **默认值**: `8000`
- **类型定义**: `z.coerce.number().int().positive().default(8000)`

### `MULTI_AGENT_CONTEXT_DIGEST_MIN_MSGS`
- **默认值**: `12`
- **类型定义**: `z.coerce.number().int().positive().default(12)`

### `MULTI_AGENT_CHAT_SPECIALISTS`
chat 路径也跑记忆员+人设员+导演(direct 闲聊也带 grounding,多走 agentic、多吃 token;
嫌延迟可关)。研究员/核查/Critic 仍只在 lookup/deep。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_CHECKER_ENABLED`
Phase 3 核查员:核查研究员产出(lookup + deep 路径跑,有研究员素材才跑)。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_CHECKER_TIMEOUT_MS`
- **默认值**: `10000`
- **类型定义**: `z.coerce.number().int().positive().default(10000)`

### `MULTI_AGENT_CRITIC_ENABLED`
Phase 4 Critic:草稿二审,不行回炉(deep 总是跑;lookup 默认关)。回炉轮数上限。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_CRITIC_ON_LOOKUP`
- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `MULTI_AGENT_CRITIC_MAX_ROUNDS`
- **默认值**: `2`
- **类型定义**: `z.coerce.number().int().positive().default(2)`

### `MULTI_AGENT_CRITIC_TIMEOUT_MS`
- **默认值**: `8000`
- **类型定义**: `z.coerce.number().int().positive().default(8000)`

### `MULTI_AGENT_PERSONA_CRITIC_ENABLED`
人设一致性 Critic:每条回复都查"有没有叫错主人/破人设/破关系",有问题回炉 1 次。
跟深度 Critic(查事实/跑题)分工:这个专攻人设/关系,全路由跑。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `MULTI_AGENT_PERSONA_CRITIC_TIMEOUT_MS`
- **默认值**: `6000`
- **类型定义**: `z.coerce.number().int().positive().default(6000)`

### `WRITER_BEST_OF_N`
Best-of-N 写手:生成 N 稿,选择器挑最贴的发。N=1 关闭。写手 token ×N。
默认 1。best-of-N 对 direct 闲聊路由没有降级(orchestrator.ts:281),等于让一个
maxTokens:20 的小选择器在两条猫娘语气短句里挑一条,代价是写手 token ×2 —— 而写手是
全链最贵的一次调用(5 层 system ≈ 19KB ≈ ~5k token + user turn ~3k)。需要多稿时按
按需在具体群/场景提升,而不是全局常开。

- **默认值**: `1`
- **类型定义**: `z.coerce.number().int().positive().default(1)`

### `WRITER_SELECTOR_ENABLED`
- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `WRITER_SELECTOR_TIMEOUT_MS`
- **默认值**: `6000`
- **类型定义**: `z.coerce.number().int().positive().default(6000)`

### `REALTIME_LEARN_ENABLED`
实时学习:每条回复后异步抽"这轮聊了啥/跟此人关系有没有变化"写 episode + 关系。
替代部分批量 cron,记忆更鲜活。fire-and-forget,不阻塞回复。

- **默认值**: `true`
- **类型定义**: `booleanFromEnv.default(true)`

### `REALTIME_LEARN_TIMEOUT_MS`
- **默认值**: `10000`
- **类型定义**: `z.coerce.number().int().positive().default(10000)`

### `ASI_SAMPLE_RATE`
ASI 回复自评抽样率:1.0 = 全量(每条回复都自评),0.5 = 抽一半。
默认 0.2。ASI rubric 与 realtime-learn 的回复自评对**同一对** (trigger, reply) 各打
一次分,维度都是"贴人设/切题/自然度",是非设计意图的重复调用。两个 EMA 本来就是滚动
平均,不需要全量样本。

- **默认值**: `0.2`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0.2)`

### `BOT_DELEGATION_ENABLED`
P2:成熟后真正代发命令(USE_BOT_COMMAND 工具)。默认关 —— 没学够/没开就只"教用户"

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `BOT_DELEGATION_COOLDOWN_SEC`
每群代发限速(秒):两次代发最小间隔

- **默认值**: `60`
- **类型定义**: `z.coerce.number().int().nonnegative().default(60)`

### `BOT_COMMAND_ROUTER_ENABLED`
「调用路由」:@bot/回复bot 且意图明确匹配某条 ready 已学命令 → 专职廉价 LLM 判一次、
命中就代发(脱离主回复模型的选工具)。保守触发、安全闸全在 tryDelegateCommand。默认关;
依赖 BOT_DELEGATION_ENABLED。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `RESIDENT_STICKER_PACKS`
常驻贴纸包(逗号分隔的贴纸包 set_name):作为 bot 主力贴纸,选择时占多数候选槽。

- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().optional()`

### `CONTROL_DIRECTIVE_ENABLED`
控制指令(别理我/别理某人/可以说话了/记住X/忘掉X):typing 前用 LLM 听懂 →
静默执行 + emoji ack,取代旧的 L0 关键词 regex。默认关。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `SCHOOL_SCHEDULE_ENABLED`
── Daily life / school schedule ──
16 岁人设的「每日安排」：school=周课表，summer=暑假日计划，auto=7–8 月暑假否则上学。
SCHOOL_SCHEDULE_ENABLED 关 → 不注入。睡眠硬门仍优先于本模块。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `DAILY_LIFE_PROFILE`
- **默认值**: `'auto'`
- **类型定义**: `z.enum(['auto', 'school', 'summer']).default('auto')`

### `MONITOR_TOKEN`
Monitor

- **默认值**: `''`
- **类型定义**: `z.string().default('')`

### `TS_WEBHOOK_URL`
Cutover (optional — only used by scripts/cutover.sh)

- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `PHP_WEBHOOK_URL`
- **默认值**: `(可选，无默认值)`
- **类型定义**: `z.string().url().optional()`

### `TTS_ENABLED`
── TTS voice messages (edge-tts, free local Python) ──
把短回复概率性转成语音发送(适合短促亲昵/深夜私聊/情绪强烈的回复)。
edge-tts 生成 MP3 → ffmpeg 转 OGG/Opus(Telegram 语音消息要求 OggS+Opus)。
全部默认关;开启需系统装好 `python3 -m edge_tts` 与 `ffmpeg`。

- **默认值**: `false`
- **类型定义**: `booleanFromEnv.default(false)`

### `TTS_VOICE`
edge-tts 语音名(中文默认晓晓;也可换 zh-CN-XiaoyiNeural 等)。

- **默认值**: `'zh-CN-XiaoxiaoNeural'`
- **类型定义**: `z.string().default('zh-CN-XiaoxiaoNeural')`

### `TTS_VOICE_PROBABILITY`
每条满足条件的短回复转语音的概率(0..1)。

- **默认值**: `0.15`
- **类型定义**: `z.coerce.number().min(0).max(1).default(0.15)`

### `TTS_MAX_CHARS`
仅对不超过此字符数的回复转语音(长消息发语音很烦)。

- **默认值**: `100`
- **类型定义**: `z.coerce.number().int().positive().default(100)`


---

