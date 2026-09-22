import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeRichHtml,
  sanitizeStandardHtml,
  fallbackToStandardHtml,
  stripHtmlToPlain,
  isRichHtml,
  sendTelegramRichMessage,
  editTelegramRichMessage,
  escapeLoose,
  htmlEscape,
  sanitizeAttributes,
} from '../../../src/bot/sender/rich-html.js';
import { sendMessage, editMessage } from '../../../src/bot/sender/telegram.js';
import { segmentReply } from '../../../src/pipeline/reply/segmenter.js';
import * as envModule from '../../../src/env.js';
import * as botModule from '../../../src/bot/bot.js';

describe('rich-html — escaping and attribute sanitization', () => {
  it('htmlEscape escapes all 5 standard HTML special chars', () => {
    expect(htmlEscape(`<div> "hello" & 'world' <script>`)).toBe(
      '&lt;div&gt; &quot;hello&quot; &amp; &#x27;world&#x27; &lt;script&gt;',
    );
  });

  it('escapeLoose preserves valid Telegram entities and escapes loose chars', () => {
    expect(escapeLoose('A & B < C > D')).toBe('A &amp; B &lt; C &gt; D');
    expect(escapeLoose('&lt;valid&gt; &amp; &quot;test&quot; &#1234; #x1F600;')).toBe(
      '&lt;valid&gt; &amp; &quot;test&quot; &#1234; #x1F600;',
    );
    expect(escapeLoose('&copy; &invalid;')).toBe('&amp;copy; &amp;invalid;');
  });

  it('sanitizeAttributes validates and sanitizes tag attributes', () => {
    expect(sanitizeAttributes('a', 'href="https://example.com" target="_blank" onclick="alert(1)"')).toBe(
      ' href="https://example.com"',
    );
    expect(sanitizeAttributes('code', 'class="language-typescript" id="foo"')).toBe(
      ' class="language-typescript"',
    );
    expect(sanitizeAttributes('table', 'bordered striped compact style="color:red"')).toBe(
      ' bordered striped compact',
    );
    expect(sanitizeAttributes('td', 'colspan="2" rowspan="3" align="center" valign="top" style="bad"')).toBe(
      ' colspan="2" rowspan="3" align="center" valign="top"',
    );
    expect(sanitizeAttributes('tg-time', 'unix="1700000000" format="wDT" bad="attr"')).toBe(
      ' unix="1700000000" format="wDT"',
    );
    expect(sanitizeAttributes('blockquote', 'expandable style="display:none"')).toBe(' expandable');
    expect(sanitizeAttributes('details', 'open class="fancy"')).toBe(' open');
    expect(sanitizeAttributes('input', 'type="checkbox" checked onclick="bad()"')).toBe(
      ' type="checkbox" checked',
    );
    expect(sanitizeAttributes('p', 'style="color:red" id="main"')).toBe('');
  });
});

describe('rich-html — sanitizeRichHtml', () => {
  it('preserves allowed rich HTML tags and structure', () => {
    const input = '<h1>Title</h1><p>Paragraph with <b>bold</b> and <code>code</code>.</p>';
    expect(sanitizeRichHtml(input)).toBe(input);
  });

  it('escapes unallowed tags safely', () => {
    const input = '<script>alert(1)</script><div class="box">hello</div>';
    const output = sanitizeRichHtml(input);
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('<div');
    expect(output).toContain('&lt;script&gt;');
    expect(output).toContain('&lt;div class=&quot;box&quot;&gt;');
    expect(output).toContain('hello');
  });

  it('automatically closes unclosed tags in LIFO order', () => {
    const input = '<details open><summary>Summary</summary><p>Content with <b>bold';
    const output = sanitizeRichHtml(input);
    expect(output).toBe('<details open><summary>Summary</summary><p>Content with <b>bold</b></p></details>');
  });

  it('discards orphaned closing tags', () => {
    const input = 'Hello</b></i></p> World';
    expect(sanitizeRichHtml(input)).toBe('Hello World');
  });

  it('handles table structure and sanitization', () => {
    const input = '<table bordered striped><tr><th>Header</th></tr><tr><td>Data</td></tr></table>';
    expect(sanitizeRichHtml(input)).toBe(input);
  });

  it('handles self-closing tags like hr, br, img', () => {
    const input = 'Line 1<br/>Line 2<hr/><img src="https://example.com/pic.jpg"/>';
    expect(sanitizeRichHtml(input)).toBe(input);
  });
});

describe('rich-html — fallbackToStandardHtml', () => {
  it('converts h1-h6 headings to bold text', () => {
    const input = '<h1>Heading 1</h1><h2>Heading 2</h2>';
    const output = fallbackToStandardHtml(input);
    expect(output).toContain('<b>Heading 1</b>');
    expect(output).toContain('<b>Heading 2</b>');
    expect(output).not.toContain('<h1>');
  });

  it('converts details/summary to bold title and expandable blockquote', () => {
    const input = '<details open><summary>Click to view</summary>Hidden details content</details>';
    const output = fallbackToStandardHtml(input);
    expect(output).toContain('<b>Click to view</b>');
    expect(output).toContain('<blockquote expandable>Hidden details content</blockquote>');
    expect(output).not.toContain('<details');
    expect(output).not.toContain('<summary');
  });

  it('converts tables to formatted plain text table', () => {
    const input = '<table><tr><th>Item</th><th>Value</th></tr><tr><td>CPU</td><td>100%</td></tr></table>';
    const output = fallbackToStandardHtml(input);
    expect(output).toContain('<b>Item | Value</b>');
    expect(output).toContain('CPU | 100%');
    expect(output).not.toContain('<table>');
    expect(output).not.toContain('<tr>');
  });

  it('converts ul and ol lists to bullet points', () => {
    const input = '<ul><li>Alpha</li><li>Beta</li></ul><ol><li>One</li><li>Two</li></ol>';
    const output = fallbackToStandardHtml(input);
    expect(output).toContain('• Alpha');
    expect(output).toContain('• Beta');
    expect(output).toContain('1. One');
    expect(output).toContain('2. Two');
  });

  it('strips unsupported tags like aside, cite, mark, tg-math', () => {
    const input = '<aside>Side note<cite>— Author</cite></aside><mark>Highlight</mark><tg-math>x^2</tg-math>';
    const output = fallbackToStandardHtml(input);
    expect(output).not.toContain('<aside');
    expect(output).not.toContain('<cite');
    expect(output).not.toContain('<tg-math');
    expect(output).toContain('<b>Highlight</b>');
    expect(output).toContain('Side note— Author');
  });

  it('ensures output tags are valid and properly balanced', () => {
    const input = '<h1>Heading</h1><p><b>Unclosed bold in paragraph';
    const output = fallbackToStandardHtml(input);
    expect(output).toContain('<b>Heading</b>');
    expect(output).toContain('<b>Unclosed bold in paragraph</b>');
  });
});

describe('rich-html — stripHtmlToPlain', () => {
  it('strips all HTML tags and unescapes standard entities', () => {
    const input = '<h1>Title</h1><p>This is &lt;b&gt;bold&lt;/b&gt; &amp; &quot;fun&quot;!</p>';
    expect(stripHtmlToPlain(input)).toBe('TitleThis is <b>bold</b> & "fun"!');
  });
});

describe('rich-html — isRichHtml', () => {
  it('identifies structural Rich HTML tags', () => {
    expect(isRichHtml('<h1>Title</h1>')).toBe(true);
    expect(isRichHtml('<table><tr><td>1</td></tr></table>')).toBe(true);
    expect(isRichHtml('<details><summary>s</summary>content</details>')).toBe(true);
    expect(isRichHtml('<ul><li>Item</li></ul>')).toBe(true);
    expect(isRichHtml('<ol><li>Item</li></ol>')).toBe(true);
    expect(isRichHtml('<tg-spoiler>secret</tg-spoiler>')).toBe(true);
    expect(isRichHtml('<tg-time unix="12345">time</tg-time>')).toBe(true);
    expect(isRichHtml('<blockquote expandable>long quote</blockquote>')).toBe(true);
    expect(isRichHtml('<p>paragraph</p>')).toBe(true);
    expect(isRichHtml('<mark>marked</mark>')).toBe(true);
    expect(isRichHtml('<pre><code class="language-js">console.log(1)</code></pre>')).toBe(true);
  });

  it('returns false for plain text and Markdown', () => {
    expect(isRichHtml('Hello world')).toBe(false);
    expect(isRichHtml('**bold** and `code` and [link](https://example.com)')).toBe(false);
    expect(isRichHtml('a < b and c > d')).toBe(false);
    expect(isRichHtml('#include <iostream>')).toBe(false);
    expect(isRichHtml('std::vector<int>')).toBe(false);
    expect(isRichHtml('')).toBe(false);
  });
});

describe('rich-html — sendTelegramRichMessage', () => {
  let mockRawSendRichMessage: any;
  let mockSendMessage: any;

  beforeEach(() => {
    mockRawSendRichMessage = vi.fn().mockResolvedValue({ message_id: 101 });
    mockSendMessage = vi.fn().mockResolvedValue({ message_id: 202 });

    const mockBot = {
      api: {
        raw: {
          sendRichMessage: mockRawSendRichMessage,
          sendMessage: mockSendMessage,
        },
        sendMessage: mockSendMessage,
      },
    };
    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot as any);
  });

  it('calls sendRichMessage when rich API succeeds', () => {
    return sendTelegramRichMessage({
      chatId: 123456,
      html: '<h1>Report</h1><p>All good</p>',
      replyToId: 99,
    }).then((res) => {
      expect(mockRawSendRichMessage).toHaveBeenCalledTimes(1);
      const call = mockRawSendRichMessage.mock.calls[0][0];
      expect(call.chat_id).toBe(123456);
      expect(call.rich_message.html).toBe('<h1>Report</h1><p>All good</p>');
      expect(call.reply_parameters).toEqual({ message_id: 99, allow_sending_without_reply: true });
      expect(res.message_id).toBe(101);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  it('downgrades to standard HTML sendMessage when sendRichMessage throws', async () => {
    mockRawSendRichMessage.mockRejectedValueOnce(new Error('Unknown method: sendRichMessage'));

    const res = await sendTelegramRichMessage({
      chatId: 123456,
      html: '<h1>Report</h1><details><summary>Sum</summary>Body</details>',
      replyToId: 99,
    });

    expect(mockRawSendRichMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const standardPayload = mockSendMessage.mock.calls[0][0];
    expect(standardPayload.text).toContain('<b>Report</b>');
    expect(standardPayload.text).toContain('<blockquote expandable>Body</blockquote>');
    expect(standardPayload.parse_mode).toBe('HTML');
    expect(res.message_id).toBe(202);
  });

  it('skips sendRichMessage directly when forceStandardHtml is true', async () => {
    const res = await sendTelegramRichMessage({
      chatId: 123456,
      html: '<h1>Report</h1>',
      forceStandardHtml: true,
    });

    expect(mockRawSendRichMessage).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(res.message_id).toBe(202);
  });

  it('downgrades to plain text if standard HTML sendMessage also fails', async () => {
    mockRawSendRichMessage.mockRejectedValueOnce(new Error('sendRichMessage failed'));
    mockSendMessage.mockRejectedValueOnce(new Error("can't parse entities in HTML"));
    mockSendMessage.mockResolvedValueOnce({ message_id: 303 });

    const res = await sendTelegramRichMessage({
      chatId: 123456,
      html: '<h1>Report</h1>',
    });

    expect(mockRawSendRichMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    // Second call is plain text without parse_mode
    const plainPayload = mockSendMessage.mock.calls[1][0];
    expect(plainPayload.parse_mode).toBeUndefined();
    expect(plainPayload.text).toBe('Report');
    expect(res.message_id).toBe(303);
  });
});

describe('rich-html — editTelegramRichMessage', () => {
  let mockRawEditMessageText: any;
  let mockEditMessageText: any;

  beforeEach(() => {
    mockRawEditMessageText = vi.fn().mockResolvedValue({ message_id: 101 });
    mockEditMessageText = vi.fn().mockResolvedValue({ message_id: 101 });

    const mockBot = {
      api: {
        raw: {
          editMessageText: mockRawEditMessageText,
        },
        editMessageText: mockEditMessageText,
      },
    };
    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot as any);
  });

  it('edits message using rich_message when supported', async () => {
    await editTelegramRichMessage(123456, 101, '<h1>Updated</h1>');
    expect(mockRawEditMessageText).toHaveBeenCalledWith({
      chat_id: 123456,
      message_id: 101,
      rich_message: { html: '<h1>Updated</h1>' },
    });
    expect(mockEditMessageText).not.toHaveBeenCalled();
  });

  it('downgrades to standard HTML editMessageText when raw call fails', async () => {
    mockRawEditMessageText.mockRejectedValueOnce(new Error('rich_message not supported'));
    mockRawEditMessageText.mockResolvedValueOnce({ message_id: 101 });

    await editTelegramRichMessage(123456, 101, '<h1>Updated</h1>');
    expect(mockRawEditMessageText).toHaveBeenCalledTimes(2);
    expect(mockRawEditMessageText.mock.calls[1][0]).toEqual({
      chat_id: 123456,
      message_id: 101,
      text: expect.stringContaining('<b>Updated</b>'),
      parse_mode: 'HTML',
    });
  });
});

describe('rich-html — sender integration (sendMessage & editMessage)', () => {
  let mockRawSendRichMessage: any;
  let mockSendMessage: any;
  let mockRawEditMessageText: any;

  beforeEach(() => {
    mockRawSendRichMessage = vi.fn().mockResolvedValue({ message_id: 501 });
    mockSendMessage = vi.fn().mockResolvedValue({ message_id: 502 });
    mockRawEditMessageText = vi.fn().mockResolvedValue({ message_id: 503 });

    const mockBot = {
      api: {
        raw: {
          sendRichMessage: mockRawSendRichMessage,
          sendMessage: mockSendMessage,
          editMessageText: mockRawEditMessageText,
        },
        sendMessage: mockSendMessage,
      },
    };
    vi.spyOn(botModule, 'getBot').mockReturnValue(mockBot as any);
  });

  it('routes Rich HTML to sendRichMessage when RICH_MESSAGE_ENABLED is true', async () => {
    vi.spyOn(envModule, 'isRichMessageEnabled').mockReturnValue(true);

    const mid = await sendMessage(-100123, '<h1>Complex Title</h1><p>Body</p>', 42);
    expect(mid).toBe(501);
    expect(mockRawSendRichMessage).toHaveBeenCalledTimes(1);
    expect(mockRawSendRichMessage.mock.calls[0][0].chat_id).toBe(-100123);
  });

  it('routes Rich HTML with forceStandardHtml when RICH_MESSAGE_ENABLED is false', async () => {
    vi.spyOn(envModule, 'isRichMessageEnabled').mockReturnValue(false);

    const mid = await sendMessage(-100123, '<h1>Complex Title</h1><p>Body</p>', 42);
    expect(mid).toBe(502);
    expect(mockRawSendRichMessage).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage.mock.calls[0][0].parse_mode).toBe('HTML');
  });

  it('routes standard text through MarkdownV2 path when no Rich HTML', async () => {
    const mid = await sendMessage(-100123, 'Normal short message', 42);
    expect(mid).toBe(502);
    expect(mockRawSendRichMessage).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    // Standard path passes chat_id as 1st arg, md as 2nd arg
    expect(mockSendMessage.mock.calls[0][0]).toBe(-100123);
    expect(mockSendMessage.mock.calls[0][2]?.parse_mode).toBe('MarkdownV2');
  });

  it('routes editMessage with Rich HTML through editTelegramRichMessage', async () => {
    await editMessage(-100123, 999, '<h2>Updated Section</h2>');
    expect(mockRawEditMessageText).toHaveBeenCalledTimes(1);
    expect(mockRawEditMessageText.mock.calls[0][0]).toEqual({
      chat_id: -100123,
      message_id: 999,
      rich_message: { html: '<h2>Updated Section</h2>' },
    });
  });

  it('segmentReply never splits Rich HTML messages', () => {
    const richContent = `<h1>Cloudflare Workers vs Node.js</h1><table bordered striped><tr><th>维度</th><th>Workers</th><th>Node</th></tr><tr><td>底层</td><td>V8</td><td>Libuv</td></tr></table>`;
    const res = segmentReply(richContent, { maxLength: 20 });
    expect(res.segments).toHaveLength(1);
    expect(res.segments[0]).toBe(richContent);
  });
});
