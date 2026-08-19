export function ArticleSidebar({
  sectionLinks,
  activeSection,
  getSectionId,
  onSectionClick,
  className = '',
  animate = false,
  animationPreset = 'fade-up',
  animationStagger = 80,
  animationOrder = 0,
}) {
  if (!sectionLinks.length) return null;

  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        'data-animate-order': String(animationOrder),
        'data-animate-stagger': String(animationStagger),
      }
    : {};

  return (
    <aside
      className={`article-sidebar ${className}`.trim()}
      aria-label="Article navigation"
      {...animationAttrs}
    >
      <div className="article-sidebar__section article-sidebar__section--toc">
        <span className="article-sidebar__label">In this article</span>
        <nav className="article-sidebar__links" aria-label="Article sections">
          {sectionLinks.map((block, index) => {
            const sectionId = getSectionId(block.text);

            return (
              <a
                key={sectionId}
                href={`#${sectionId}`}
                className={`article-sidebar__link ${activeSection === sectionId ? 'is-active' : ''}`}
                onClick={event => onSectionClick(event, block.text, sectionId)}
              >
                <span className="article-sidebar__link-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="article-sidebar__link-text">{block.text}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
