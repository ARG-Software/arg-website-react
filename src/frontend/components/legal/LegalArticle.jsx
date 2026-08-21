import { EMAIL_KEYS, getMailtoLink } from '@services/linksService';

export function LegalArticle({ page, contactEmail }) {
  return (
    <article className="legal-content">
      <div data-animate="fade-up" data-animate-order="0">
        <p className="legal-intro">{page.intro}</p>
      </div>

      {page.sections.map((section, index) => (
        <div key={section.heading} data-animate="fade-up" data-animate-order={String(index + 1)}>
          <h2>{section.heading}</h2>
          {section.blocks.map((block, blockIndex) =>
            renderBlock(block, blockIndex, page, contactEmail)
          )}
        </div>
      ))}
    </article>
  );
}

function renderBlock(block, index, page, contactEmail) {
  switch (block.type) {
    case 'paragraph':
      return <p key={index}>{block.text}</p>;
    case 'paragraphWithEmail':
      return (
        <p key={index}>
          {block.before}
          <a href={getMailtoLink(EMAIL_KEYS.INFO)}>{contactEmail}</a>
          {block.after}
        </p>
      );
    case 'list':
      return (
        <ul key={index}>
          {block.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'subsection':
      return (
        <div key={index}>
          <h3>{block.heading}</h3>
          {block.paragraphs.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      );
    case 'contact':
      return (
        <p key={index}>
          Arg Software
          <br />
          Funchal and Porto, Portugal
          <br />
          Email: <a href={getMailtoLink(EMAIL_KEYS.INFO)}>{contactEmail}</a>
        </p>
      );
    case 'lastUpdated':
      return (
        <p key={index}>
          <i>Last updated: {page.lastUpdated}</i>
        </p>
      );
    default:
      return null;
  }
}
