import AppLink from '../navigation/AppLink';
import { SocialShareButtons } from './SocialShareButtons';

export function BlogArticleSidebar({
  sectionLinks,
  activeSection,
  getSectionId,
  onSectionClick,
  shareItems,
  feedItems,
  relatedPosts,
  sourceSlug,
  cta,
}) {
  return (
    <aside className="bp-sidebar-right" aria-label="Article navigation">
      <SidebarBlock label="Share">
        <SocialShareButtons items={shareItems} />
      </SidebarBlock>

      <SidebarBlock label="Subscribe">
        <SocialShareButtons items={feedItems} />
      </SidebarBlock>

      {sectionLinks.length > 0 && (
        <SidebarBlock className="bp-sidebar-section--toc" label="In this article">
          <nav className="bp-section-links" aria-label="Article sections">
            {sectionLinks.map((block, index) => {
              const sectionId = getSectionId(block.text);

              return (
                <a
                  key={index}
                  href={`#${sectionId}`}
                  className={`bp-section-link ${activeSection === sectionId ? 'is-active' : ''}`}
                  onClick={event => onSectionClick(event, block.text, sectionId)}
                >
                  {block.text}
                </a>
              );
            })}
          </nav>
        </SidebarBlock>
      )}

      <SidebarBlock label="Related">
        {relatedPosts.length > 0 ? (
          <div className="bp-sidebar-articles">
            {relatedPosts.map(post => (
              <AppLink
                key={post.slug}
                to={`/blog/${post.slug}/`}
                className="bp-sidebar-article"
                trackEvent="blog_related_click"
                trackData={{ blog_post_slug: post.slug, source_slug: sourceSlug }}
              >
                <span className="bp-sidebar-article-title">{post.title}</span>
                <span className="bp-sidebar-article-meta">
                  {[post.tag, post.readTime].filter(Boolean).join(' - ')}
                </span>
              </AppLink>
            ))}
          </div>
        ) : (
          <p className="bp-sidebar-empty">No related articles found.</p>
        )}
      </SidebarBlock>

      {cta && (
        <SidebarBlock className="bp-sidebar-section--cta">
          <div className="bp-sidebar-cta-card">
            <p className="bp-sidebar-cta-eyebrow">{cta.eyebrow}</p>
            <h3>{cta.title}</h3>
            <a href={cta.href} target="_blank" rel="noopener noreferrer" onClick={cta.onClick}>
              {cta.label}
            </a>
          </div>
        </SidebarBlock>
      )}
    </aside>
  );
}

function SidebarBlock({ label, className = '', children }) {
  return (
    <div className={`bp-sidebar-section ${className}`.trim()}>
      {label && <span className="bp-sidebar-section-label">{label}</span>}
      {children}
    </div>
  );
}
