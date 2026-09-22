// ────────────────────────────────────────
// Telegram Rich HTML Utility & Sender
// Supports Telegram Bot API Rich Messages, tag sanitization,
// unclosed tag auto-closing, and graceful multi-tier downgrade.
// Docs: https://core.telegram.org/bots/api#rich-html-style
// ────────────────────────────────────────

import { getBot } from '../bot.js';
import { env } from '../../env.js';
import { logger } from '../../shared/logger.js';

/** Telegram Bot API 官方 Rich HTML 允许的全部标签 */
export const RICH_ALLOWED_TAGS = new Set([
  'a',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ins',
  's',
  'strike',
  'del',
  'code',
  'pre',
  'mark',
  'sub',
  'sup',
  'tg-spoiler',
  'tg-reference',
  'tg-emoji',
  'tg-time',
  'tg-math',
  'tg-math-block',
  'tg-thinking',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'footer',
  'hr',
  'br',
  'ul',
  'ol',
  'li',
  'input',
  'blockquote',
  'aside',
  'cite',
  'img',
  'video',
  'audio',
  'figure',
  'figcaption',
  'tg-document',
  'tg-map',
  'tg-collage',
  'tg-slideshow',
  'table',
  'tr',
  'th',
  'td',
  'caption',
  'details',
  'summary',
  'tg-button',
  'tg-button-row',
]);

/** Telegram 传统标准 HTML 允许的标签 */
export const STANDARD_ALLOWED_TAGS = new Set([
  'a',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ins',
  's',
  'strike',
  'del',
  'code',
  'pre',
  'blockquote',
  'tg-spoiler',
  'tg-emoji',
]);

/**
 * 官方允许的命名 HTML 实体：
 * &lt;, &gt;, &amp;, &quot;, &apos;, &nbsp;, &hellip;, &mdash;, &ndash;, &lsquo;, &rsquo;, &ldquo;, &rdquo;
 * 其他未列出的实体或者裸 & 符号需要转义为 &amp;
 */
const TELEGRAM_NAMED_ENTITIES =
  '(?:lt|gt|amp|quot|apos|nbsp|hellip|mdash|ndash|lsquo|rsquo|ldquo|rdquo|#\\d+|#x[0-9a-fA-F]+)';
const ENTITY_REGEX = new RegExp(`&(?!(?:${TELEGRAM_NAMED_ENTITIES});)`, 'g');

/** 实体转义（不破坏已经合规转义好的实体） */
export function escapeLoose(text: string): string {
  return String(text || '')
    .replace(ENTITY_REGEX, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function htmlEscape(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** 属性校验过滤 — 仅放行官方允许的标签属性并做安全转义 */
export function sanitizeAttributes(name: string, rawAttrs: string): string {
  const attrs = rawAttrs.trim();
  if (!attrs) return '';

  if (name === 'a') {
    const href = attrs.match(/href\s*=\s*["']?([^"'\s>]+)/i);
    const targetName = attrs.match(/name\s*=\s*["']?([^"'\s>]+)/i);
    let res = '';
    if (href?.[1]) res += ` href="${htmlEscape(href[1])}"`;
    if (targetName?.[1]) res += ` name="${htmlEscape(targetName[1])}"`;
    return res;
  }

  if (name === 'code') {
    const cls = attrs.match(/class\s*=\s*["']?(language-[\w+.#-]+)/i);
    return cls?.[1] ? ` class="${htmlEscape(cls[1])}"` : '';
  }

  if (name === 'blockquote') {
    return /\bexpandable\b/i.test(attrs) ? ' expandable' : '';
  }

  if (name === 'details') {
    return /\bopen\b/i.test(attrs) ? ' open' : '';
  }

  if (name === 'table') {
    const flags = ['bordered', 'striped', 'compact'].filter((f) => new RegExp(`\\b${f}\\b`, 'i').test(attrs));
    return flags.length ? ` ${flags.join(' ')}` : '';
  }

  if (name === 'td' || name === 'th') {
    let res = '';
    const colspan = attrs.match(/colspan\s*=\s*["']?(\d+)["']?/i);
    const rowspan = attrs.match(/rowspan\s*=\s*["']?(\d+)["']?/i);
    const align = attrs.match(/align\s*=\s*["']?(left|center|right)["']?/i);
    const valign = attrs.match(/valign\s*=\s*["']?(top|middle|bottom)["']?/i);
    if (colspan?.[1]) res += ` colspan="${colspan[1]}"`;
    if (rowspan?.[1]) res += ` rowspan="${rowspan[1]}"`;
    if (align?.[1]) res += ` align="${align[1].toLowerCase()}"`;
    if (valign?.[1]) res += ` valign="${valign[1].toLowerCase()}"`;
    return res;
  }

  if (name === 'tg-time') {
    const unix = attrs.match(/unix\s*=\s*["']?(\d+)/i);
    const format = attrs.match(/format\s*=\s*["']?([\w]+)/i);
    if (!unix?.[1]) return '';
    return ` unix="${unix[1]}"${format?.[1] ? ` format="${format[1]}"` : ''}`;
  }

  if (name === 'input') {
    return /\bchecked\b/i.test(attrs) ? ' type="checkbox" checked' : ' type="checkbox"';
  }

  if (name === 'tg-emoji') {
    const id = attrs.match(/emoji-id\s*=\s*["']?(\d+)["']?/i);
    return id?.[1] ? ` emoji-id="${id[1]}"` : '';
  }

  if (name === 'tg-reference') {
    const targetName = attrs.match(/name\s*=\s*["']?([^"'\s>]+)/i);
    return targetName?.[1] ? ` name="${htmlEscape(targetName[1])}"` : '';
  }

  if (name === 'img' || name === 'video' || name === 'audio' || name === 'tg-document') {
    let res = '';
    const src = attrs.match(/src\s*=\s*["']?([^"'\s>]+)/i);
    if (src?.[1]) res += ` src="${htmlEscape(src[1])}"`;
    if (name === 'img') {
      const alt = attrs.match(/alt\s*=\s*["']?([^"'>]*)/i);
      if (alt?.[1]) res += ` alt="${htmlEscape(alt[1])}"`;
    }
    if (/\btg-spoiler\b/i.test(attrs)) res += ' tg-spoiler';
    return res;
  }

  if (name === 'tg-map') {
    const lat = attrs.match(/lat\s*=\s*["']?([0-9.-]+)/i);
    const long = attrs.match(/long\s*=\s*["']?([0-9.-]+)/i);
    const zoom = attrs.match(/zoom\s*=\s*["']?(\d+)/i);
    let res = '';
    if (lat?.[1]) res += ` lat="${lat[1]}"`;
    if (long?.[1]) res += ` long="${long[1]}"`;
    if (zoom?.[1]) res += ` zoom="${zoom[1]}"`;
    return res;
  }

  if (name === 'ol') {
    let res = '';
    const start = attrs.match(/start\s*=\s*["']?(\d+)["']?/i);
    const type = attrs.match(/type\s*=\s*["']?([1aAiI])["']?/i);
    if (start?.[1]) res += ` start="${start[1]}"`;
    if (type?.[1]) res += ` type="${type[1]}"`;
    if (/\breversed\b/i.test(attrs)) res += ' reversed';
    return res;
  }

  if (name === 'li') {
    let res = '';
    const val = attrs.match(/value\s*=\s*["']?(\d+)["']?/i);
    const type = attrs.match(/type\s*=\s*["']?([1aAiI])["']?/i);
    if (val?.[1]) res += ` value="${val[1]}"`;
    if (type?.[1]) res += ` type="${type[1]}"`;
    return res;
  }

  if (name === 'tg-button-row') {
    const align = attrs.match(/align\s*=\s*["']?(left|center|right)["']?/i);
    return align?.[1] ? ` align="${align[1].toLowerCase()}"` : '';
  }

  if (name === 'tg-button') {
    let res = '';
    const type = attrs.match(/type\s*=\s*["']?([\w_]+)["']?/i);
    const style = attrs.match(/style\s*=\s*["']?([\w_]+)["']?/i);
    const url = attrs.match(/url\s*=\s*["']?([^"'\s>]+)/i);
    const data = attrs.match(/data\s*=\s*["']?([^"'>]*)/i);
    const query = attrs.match(/query\s*=\s*["']?([^"'>]*)/i);
    const text = attrs.match(/text\s*=\s*["']?([^"'>]*)/i);
    if (type?.[1]) res += ` type="${htmlEscape(type[1])}"`;
    if (style?.[1]) res += ` style="${htmlEscape(style[1])}"`;
    if (url?.[1]) res += ` url="${htmlEscape(url[1])}"`;
    if (data?.[1]) res += ` data="${htmlEscape(data[1])}"`;
    if (query?.[1]) res += ` query="${htmlEscape(query[1])}"`;
    if (text?.[1]) res += ` text="${htmlEscape(text[1])}"`;
    return res;
  }

  return '';
}

/**
 * 清洗 Rich HTML：
 * 1. 过滤不在白名单内的非法标签；
 * 2. 自动补全未闭合的标签（LLM 输出被截断或漏闭合时极其常见）；
 * 3. 剥离孤立闭合标签。
 */
export function sanitizeRichHtml(input: string, allowedTags: Set<string> = RICH_ALLOWED_TAGS): string {
  const text = String(input || '');
  const pattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^<>]*)?)\/?>/g;
  const stack: string[] = [];
  let out = '';
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    out += escapeLoose(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const name = match[1]!.toLowerCase();
    const isClosing = match[0].startsWith('</');
    const isSelfClosing = match[0].endsWith('/>') || ['br', 'hr', 'img', 'input', 'tg-map'].includes(name);

    if (!allowedTags.has(name)) {
      out += htmlEscape(match[0]);
      continue;
    }

    if (isClosing) {
      if (!stack.includes(name)) continue;
      while (stack.length && stack[stack.length - 1] !== name) {
        out += `</${stack.pop()}>`;
      }
      stack.pop();
      out += `</${name}>`;
      continue;
    }

    const attrs = sanitizeAttributes(name, match[2] || '');
    if (isSelfClosing) {
      out += `<${name}${attrs}/>`;
    } else {
      out += `<${name}${attrs}>`;
      stack.push(name);
    }
  }

  out += escapeLoose(text.slice(cursor));
  // 补全所有未闭合标签
  while (stack.length) {
    out += `</${stack.pop()}>`;
  }
  return out;
}

/** 清洗标准 Telegram HTML */
export function sanitizeStandardHtml(input: string): string {
  return sanitizeRichHtml(input, STANDARD_ALLOWED_TAGS);
}

/**
 * 降级转换器：
 * 当 Bot API 不支持 sendRichMessage 或配置关闭时，把 <details>、<table>、<h1> 等
 * 转换为普通 Telegram 能接受的标准 HTML 标签（如 <b>, <blockquote expandable>）。
 */
export function fallbackToStandardHtml(richHtml: string): string {
  let text = String(richHtml || '');

  // 1. 标题转粗体
  text = text.replace(/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/gis, '<b>$1</b>\n\n');

  // 2. details 折叠块转为可展开引用块
  text = text.replace(
    /<details\b[^>]*>\s*<summary>(.*?)<\/summary>(.*?)<\/details>/gis,
    '\n<b>$1</b>\n<blockquote expandable>$2</blockquote>\n',
  );

  // 3. 表格转换为易读的紧凑文本表格
  text = text.replace(/<table\b[^>]*>(.*?)<\/table>/gis, (_m, content: string) => {
    const rows: string[] = [];
    const rowMatches = content.matchAll(/<tr\b[^>]*>(.*?)<\/tr>/gis);
    for (const r of rowMatches) {
      const cells: string[] = [];
      const cellMatches = (r[1] ?? '').matchAll(/<t[hd]\b[^>]*>(.*?)<\/t[hd]>/gis);
      for (const c of cellMatches) {
        cells.push((c[1] ?? '').replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    }
    if (rows.length === 0) return '';
    if (rows.length === 1) return `\n${rows[0]}\n`;
    const [header, ...rest] = rows;
    return `\n<b>${header}</b>\n${rest.join('\n')}\n`;
  });

  // 4. 列表转为标准符号列表
  text = text.replace(/<ul\b[^>]*>(.*?)<\/ul>/gis, (_m, list) => {
    const items: string[] = [];
    for (const li of list.matchAll(/<li\b[^>]*>(.*?)<\/li>/gis)) {
      items.push(`• ${(li[1] ?? '').trim()}`);
    }
    return `\n${items.join('\n')}\n`;
  });

  text = text.replace(/<ol\b[^>]*>(.*?)<\/ol>/gis, (_m, list) => {
    const items: string[] = [];
    let idx = 1;
    for (const li of list.matchAll(/<li\b[^>]*>(.*?)<\/li>/gis)) {
      items.push(`${idx++}. ${(li[1] ?? '').trim()}`);
    }
    return `\n${items.join('\n')}\n`;
  });

  // 5. 段落、分割线、高亮、时间
  text = text.replace(/<p\b[^>]*>(.*?)<\/p>/gis, '$1\n\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n----------------\n');
  text = text.replace(/<mark\b[^>]*>(.*?)<\/mark>/gis, '<b>$1</b>');
  text = text.replace(/<tg-time\b[^>]*>(.*?)<\/tg-time>/gis, '$1');

  // 6. 剥离不受标准 Telegram HTML 支持的标签
  text = text.replace(
    /<\/?(?:aside|cite|footer|sub|sup|tg-math|tg-math-block|tg-button-row|tg-button|figure|figcaption|tg-collage|tg-slideshow|tg-map|caption)\b[^>]*>/gi,
    '',
  );
  text = text.replace(/<input\b[^>]*>/gi, '');

  // 7. 规范化空白行
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // 8. 标准 HTML 校验与自动补全
  return sanitizeStandardHtml(text);
}

/** 剥离所有 HTML 标签并解码实体，作为最底层的纯文本兜底 */
export function stripHtmlToPlain(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .trim();
}

/**
 * 判断文本是否包含 Rich HTML 标签。
 * 排除非 HTML 的常见模式（如 C++ 代码 std::vector<int> 或数学运算 x < 3）。
 */
export function isRichHtml(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // 1. 特征明显的 Rich HTML / 结构化标签
  if (
    /<(?:table|details|summary|h[1-6]|ul|ol|tg-spoiler|tg-time|tg-math|tg-reference|tg-emoji|figure|figcaption|tg-collage|tg-slideshow|tg-map)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  // 2. 带有 expandable 属性的 blockquote
  if (/<blockquote\s+[^>]*\bexpandable\b/i.test(text)) {
    return true;
  }
  // 3. 常见成对的标准 HTML 排版标签 (如 <p>...</p>, <b>...</b>, <pre><code...>)
  if (/<(p|mark|sub|sup)\b[^>]*>.*?<\/\1>/is.test(text)) {
    return true;
  }
  if (/<pre\b[^>]*>\s*<code\b[^>]*>.*?<\/code>\s*<\/pre>/is.test(text)) {
    return true;
  }
  return false;
}

// ─────────────────────── Telegram 发送与编辑封装 ───────────────────────

export interface SendRichOptions {
  chatId: number | string;
  html?: string;
  markdown?: string;
  replyToId?: number;
  messageThreadId?: number;
  disableNotification?: boolean;
  /** 强制降级到标准 HTML，不尝试 sendRichMessage */
  forceStandardHtml?: boolean;
}

/**
 * 底层调用 Telegram Bot API 方法：优先通过 grammY bot 实例的 raw 调用，
 * 若在独立测试/未初始化环境则回退到原生 fetch。
 */
async function callTelegramApi(method: string, payload: Record<string, unknown>): Promise<unknown> {
  try {
    const bot = getBot();
    const rawApi = bot.api.raw as unknown as Record<string, (args: Record<string, unknown>) => Promise<unknown>>;
    if (typeof rawApi[method] === 'function') {
      return await rawApi[method]!(payload);
    }
  } catch (err) {
    logger.debug({ err, method }, 'getBot().api.raw unavailable, falling back to direct fetch');
  }

  // Fallback to direct HTTP fetch
  const token = env().BOT_TOKEN;
  if (!token) {
    throw new Error(`Telegram API call failed: no BOT_TOKEN configured`);
  }
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string; error_code?: number };
  if (!data.ok) {
    throw new Error(`Telegram API error (${data.error_code ?? res.status}): ${data.description || 'Unknown error'}`);
  }
  return data.result;
}

/**
 * 发送富文本（优先使用 sendRichMessage，失败自动降级到普通 HTML sendMessage，再失败降级到纯文本）
 */
export async function sendTelegramRichMessage(opts: SendRichOptions): Promise<{ message_id: number }> {
  const formattedHtml = opts.html ? sanitizeRichHtml(opts.html) : undefined;

  const anchor =
    typeof opts.replyToId === 'number' && Number.isFinite(opts.replyToId) && opts.replyToId > 0
      ? Math.floor(opts.replyToId)
      : undefined;
  const replyParams = anchor
    ? { message_id: anchor, allow_sending_without_reply: true as const }
    : undefined;
  const threadId =
    typeof opts.messageThreadId === 'number' && Number.isFinite(opts.messageThreadId) && opts.messageThreadId > 1
      ? Math.floor(opts.messageThreadId)
      : undefined;

  // 1. 尝试官方 Bot API sendRichMessage（未指定 forceStandardHtml 时）
  if (!opts.forceStandardHtml) {
    const richPayload: Record<string, unknown> = {
      chat_id: opts.chatId,
      rich_message: formattedHtml ? { html: formattedHtml } : { markdown: opts.markdown },
    };
    if (replyParams) richPayload.reply_parameters = replyParams;
    if (threadId) richPayload.message_thread_id = threadId;
    if (opts.disableNotification) richPayload.disable_notification = true;

    try {
      const res = await callTelegramApi('sendRichMessage', richPayload);
      return { message_id: (res as { message_id?: number } | undefined)?.message_id ?? 0 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (anchor && (msg.includes('replied message not found') || msg.includes('message to be replied not found'))) {
        delete richPayload.reply_parameters;
        try {
          const res = await callTelegramApi('sendRichMessage', richPayload);
          return { message_id: (res as { message_id?: number } | undefined)?.message_id ?? 0 };
        } catch {
          // Continue to downgrade fallback
        }
      }
      logger.warn({ err: msg, chatId: opts.chatId }, 'sendRichMessage failed, downgrading to standard HTML');
    }
  }

  // 2. 降级方案：普通 sendMessage (必须做标签降级剥离，保证 Telegram 传统 parse_mode: 'HTML' 能解析)
  const downgradedHtml = fallbackToStandardHtml(formattedHtml || opts.markdown || '');
  const standardText = downgradedHtml.length > 4000 ? downgradedHtml.slice(0, 4000) : downgradedHtml;
  const standardPayload: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: standardText,
    parse_mode: 'HTML',
  };
  if (replyParams) standardPayload.reply_parameters = replyParams;
  if (threadId) standardPayload.message_thread_id = threadId;
  if (opts.disableNotification) standardPayload.disable_notification = true;

  try {
    const res = await callTelegramApi('sendMessage', standardPayload);
    return { message_id: (res as { message_id?: number } | undefined)?.message_id ?? 0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (anchor && (msg.includes('replied message not found') || msg.includes('message to be replied not found'))) {
      delete standardPayload.reply_parameters;
      try {
        const res = await callTelegramApi('sendMessage', standardPayload);
        return { message_id: (res as { message_id?: number } | undefined)?.message_id ?? 0 };
      } catch {
        // Fall through to plain text
      }
    }
    logger.warn({ err: msg, chatId: opts.chatId }, 'Standard HTML sendMessage failed, falling back to plain text');
  }

  // 3. 终极兜底：剥离全部 HTML 标签，以纯文本方式发出
  const plainText = stripHtmlToPlain(standardText).slice(0, 4000);
  const plainPayload: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: plainText,
  };
  if (threadId) plainPayload.message_thread_id = threadId;
  if (opts.disableNotification) plainPayload.disable_notification = true;

  const res = await callTelegramApi('sendMessage', plainPayload);
  return { message_id: (res as { message_id?: number } | undefined)?.message_id ?? 0 };
}

/**
 * 编辑富文本消息（优先使用 editMessageText 的 rich_message 参数）
 */
export async function editTelegramRichMessage(
  chatId: number | string,
  messageId: number,
  htmlContent: string,
): Promise<void> {
  const cleanHtml = sanitizeRichHtml(htmlContent);

  try {
    await callTelegramApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      rich_message: { html: cleanHtml },
    });
    return;
  } catch (err: unknown) {
    const errDetail = err instanceof Error ? err.message : String(err);
    logger.warn({ err: errDetail, chatId, messageId }, 'editMessageText (rich_message) failed, falling back to standard HTML');
  }

  const fallbackText = fallbackToStandardHtml(cleanHtml).slice(0, 4000);
  try {
    await callTelegramApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: fallbackText,
      parse_mode: 'HTML',
    });
    return;
  } catch (err: unknown) {
    const errDetail = err instanceof Error ? err.message : String(err);
    logger.warn({ err: errDetail, chatId, messageId }, 'editMessageText (HTML) failed, falling back to plain text');
    await callTelegramApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: stripHtmlToPlain(fallbackText).slice(0, 4000),
    });
  }
}
