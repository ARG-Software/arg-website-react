import { useState } from 'react';
import { InlineLinkText } from '@components/widgets/InlineLinkText';
import { getHeadingId } from '@utils/blog/articleHelpers.js';
import {
  getCodeLanguageLabel,
  getCodeLineNumbers,
  highlightCode,
} from '@utils/blog/highlightHelper.js';

// ─── Code block with line numbers + copy button + scoped highlighting ─────────

const CodeBlock = ({ code, lang }) => {
  const [copyState, setCopyState] = useState('idle');
  const lineNumbers = getCodeLineNumbers(code);
  const { html, detectedLang } = highlightCode(code, lang);
  const displayLang = lang || detectedLang;
  const codeClassName = displayLang === 'plaintext' ? 'nohighlight' : `language-${displayLang}`;

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyState('unavailable');
      setTimeout(() => setCopyState('idle'), 1800);
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('unavailable');
      setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  const copyLabel =
    copyState === 'copied' ? 'Copied' : copyState === 'unavailable' ? 'Copy unavailable' : 'Copy';

  return (
    <div className="bp-code-wrap">
      <div className="bp-code-bar">
        <span className="bp-code-lang">{getCodeLanguageLabel(displayLang)}</span>
        <button type="button" className="bp-code-copy" onClick={handleCopy} aria-label={copyLabel}>
          {copyLabel}
        </button>
      </div>
      <div className="bp-code-scroll" data-lenis-prevent>
        <pre className="bp-code-gutter" aria-hidden="true">
          {lineNumbers.map(number => (
            <span key={number} className="bp-code-line-num">
              {number}
            </span>
          ))}
        </pre>
        <pre className="bp-code-pre">
          <code
            className={`bp-code-code ${codeClassName}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
  );
};

// ─── Block renderer ───────────────────────────────────────────────────────────

export const renderArticleBlock = (block, i) => {
  switch (block.type) {
    case 'lead':
      return (
        <p key={i} className="bp-lead">
          <InlineLinkText text={block.text} />
        </p>
      );
    case 'paragraph':
      return (
        <p key={i} className="bp-p">
          <InlineLinkText text={block.text} />
        </p>
      );
    case 'heading':
      return (
        <h2 key={i} id={getHeadingId(block.text)} className="bp-h2">
          {block.text}
        </h2>
      );
    case 'subheading':
      return (
        <h3 key={i} id={getHeadingId(block.text)} className="bp-h3">
          {block.text}
        </h3>
      );
    case 'ordered-list':
      return (
        <ol key={i} className="bp-list bp-list--ordered">
          {block.items.map((item, j) => (
            <li key={j} className="bp-list-item">
              {item.label ? (
                <span className="bp-list-label">
                  <InlineLinkText text={item.label} />
                </span>
              ) : null}{' '}
              <InlineLinkText text={item.text} />
            </li>
          ))}
        </ol>
      );
    case 'callout':
      return (
        <blockquote key={i} className="bp-callout">
          <InlineLinkText text={block.text} />
        </blockquote>
      );
    case 'code':
      return <CodeBlock key={i} code={block.text} lang={block.lang} />;
    case 'list':
      return (
        <ul key={i} className="bp-list">
          {block.items.map((item, j) => (
            <li key={j} className="bp-list-item">
              {item.label ? (
                <span className="bp-list-label">
                  <InlineLinkText text={item.label} />
                </span>
              ) : null}{' '}
              <InlineLinkText text={item.text} />
            </li>
          ))}
        </ul>
      );
    case 'image':
      return (
        <figure key={i} className="bp-figure">
          <img src={block.src} alt={block.alt} className="bp-image" loading="lazy" />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    default:
      return null;
  }
};
