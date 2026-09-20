const INLINE_MARKDOWN_PATTERN = /\[([^\][]+)\]\(([^()\s]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;
const SAFE_HREF_PATTERN = /^(?:https?:\/\/|mailto:|tel:|\/|#)/i;

export function parseInlineMarkdown(text) {
  if (typeof text !== 'string' || !text) return [];

  const parts = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_MARKDOWN_PATTERN)) {
    if (match.index > cursor) {
      parts.push({ type: 'text', text: text.slice(cursor, match.index) });
    }

    const [raw, label, href, strong, code] = match;
    if (label) {
      parts.push(
        SAFE_HREF_PATTERN.test(href)
          ? { type: 'link', parts: parseInlineMarkdown(label), href }
          : { type: 'text', text: raw }
      );
    } else if (strong) {
      parts.push({ type: 'strong', parts: parseInlineMarkdown(strong) });
    } else {
      parts.push({ type: 'code', text: code });
    }

    cursor = match.index + raw.length;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', text: text.slice(cursor) });
  }

  return parts;
}
