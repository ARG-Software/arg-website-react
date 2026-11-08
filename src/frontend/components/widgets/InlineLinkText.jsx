import { Fragment } from 'react';
import AppLink from '@components/navigation/AppLink';
import { parseInlineMarkdown } from '@utils/inlineMarkdown';

const EXTERNAL_HREF_PATTERN = /^https?:\/\//i;
// A site page or an anchor: no file extension, so files such as PDFs and images load normally
const PAGE_HREF_PATTERN = /^(#|\/[^.?#]*([?#].*)?$)/;

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
      // Site pages and anchors navigate in the app, with the page transition
      if (PAGE_HREF_PATTERN.test(part.href)) {
        return (
          <AppLink key={key} to={part.href} className={linkClassName}>
            {renderParts(part.parts, linkClassName, `${key}-`)}
          </AppLink>
        );
      }
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
