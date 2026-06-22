export function BlogArticleSidebar({ sectionLinks, activeSection, getSectionId, onSectionClick }) {
  if (!sectionLinks.length) return null;

  return (
    <aside className="bp-sidebar-right" aria-label="Article navigation">
      <div className="bp-sidebar-section bp-sidebar-section--toc">
        <span className="bp-sidebar-section-label">In this article</span>
        <nav className="bp-section-links" aria-label="Article sections">
          {sectionLinks.map((block, index) => {
            const sectionId = getSectionId(block.text);

            return (
              <a
                key={sectionId}
                href={`#${sectionId}`}
                className={`bp-section-link ${activeSection === sectionId ? 'is-active' : ''}`}
                onClick={event => onSectionClick(event, block.text, sectionId)}
              >
                <span className="bp-section-link__number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="bp-section-link__text">{block.text}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
