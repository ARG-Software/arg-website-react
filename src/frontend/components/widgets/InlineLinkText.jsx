import { Fragment } from 'react';

/** Markdown-style inline link: [label](https://example.com) */
const INLINE_LINK_PATTERN = /\[([^\][]+)\]\(([^()\s]+)\)/g;
const SAFE_HREF_PATTERN = /^(?:https?:\/\/|mailto:|tel:|\/|#)/i;
const EXTERNAL_HREF_PATTERN = /^https?:\/\//i;

/**
 * Renders copy with `[label](url)` turned into real anchors. Unsafe or
 * malformed links are left as literal text, and escaping stays with React
 * so no raw HTML is ever injected.
 */
export function InlineLinkText({ text, linkClassName = '' }) {
  if (typeof text !== 'string' || !text) return null;

  const parts = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_LINK_PATTERN)) {
    const [raw, label, href] = match;

    if (!SAFE_HREF_PATTERN.test(href)) continue;

    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index));
    }

    const isExternal = EXTERNAL_HREF_PATTERN.test(href);

    parts.push(
      <a
        key={`${cursor}-${href}`}
        href={href}
        className={linkClassName}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {label}
      </a>
    );
    cursor = match.index + raw.length;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}
