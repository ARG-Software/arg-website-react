import { Fragment } from 'react';
import { parseInlineMarkdown } from '@utils/inlineMarkdown';

const EXTERNAL_HREF_PATTERN = /^https?:\/\//i;

/**
 * Renders the small inline Markdown subset used by website copy. Escaping
 * stays with React, so no raw HTML is ever injected.
 */
export function InlineLinkText({ text, linkClassName = '' }) {
  return renderParts(parseInlineMarkdown(text), linkClassName);
}

function renderParts(parts, linkClassName, keyPrefix = '') {
  return parts.map((part, index) => {
    const key = `${keyPrefix}${index}`;
    if (part.type === 'link') {
      const isExternal = EXTERNAL_HREF_PATTERN.test(part.href);
      return (
        <a
          key={key}
          href={part.href}
          className={linkClassName}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
        >
          {renderParts(part.parts, linkClassName, `${key}-`)}
        </a>
      );
    }
    if (part.type === 'strong') {
      return <strong key={key}>{renderParts(part.parts, linkClassName, `${key}-`)}</strong>;
    }
    if (part.type === 'code') {
      return (
        <code key={key} className="inline-markdown-code">
          {part.text}
        </code>
      );
    }
    return <Fragment key={key}>{part.text}</Fragment>;
  });
}
