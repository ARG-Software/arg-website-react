import AppLink from '../../../components/links/AppLink';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackBlogPostClick } from '../../../hooks/useAnalytics';
import { SectionDivider } from '../../../components/layout/SectionDivider';

function displayBlogGridRow(blogRows = [], marginTop = '0') {
  return (
    <div className="blog-promo_cards-grid" style={{ marginTop }}>
      {blogRows.map(blogPost => (
        <AppLink
          key={blogPost.slug}
          to={`/blog/${blogPost.slug}/`}
          className="blog-promo_card-small"
          onClick={() => trackBlogPostClick(blogPost.slug, blogPost.title, 'homepage_promo_card')}
        >
          <h4 className="blog-promo_card-title-small">{blogPost.title}</h4>
          <div className="subtitle_tag-wrapper is--white" style={{ width: 'fit-content' }}>
            <div>{blogPost.tag}</div>
          </div>

          <div className="blog-promo_card-meta-bottom">
            <span className="blog-promo_card-date-small">{blogPost.date}</span>
            <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
          </div>
        </AppLink>
      ))}
    </div>
  );
}

export function BlogPromoSection({ blogPosts, className = '' }) {
  // Separate first post as hero, next 6 as cards (3 + 3)
  const heroPost = blogPosts[0];
  const firstRowPosts = blogPosts.slice(1, 4);
  const secondRowPosts = blogPosts.slice(4, 7);

  return (
    <section
      id="blog-promo"
      className={`section_blog-promo padding-section-medium ${className}`.trim()}
      style={{ backgroundColor: '#0c002e' }}
    >
      <div className="padding-global">
        <div className="container-large">
          <div className="blog-promo_inner">
            <div className="social-section_header">
              <div>
                <h2 className="heading-style-h2" style={{ color: '#fff' }}>
                  We write about what we build
                </h2>
              </div>
              <div className="subtitle_tag-wrapper is--white hide-mobile-landscape">
                <div>Blog</div>
              </div>
            </div>
            {/* Hero Post - Full width */}
            <AppLink
              to={`/blog/${heroPost.slug}/`}
              className="blog-promo_hero"
              onClick={() =>
                trackBlogPostClick(heroPost.slug, heroPost.title, 'homepage_promo_hero')
              }
            >
              <div className="blog-promo_hero-content">
                {/* Left: Title (60% on desktop) */}
                <h3 className="blog-promo_hero-title">{heroPost.title}</h3>

                {/* Right: Metadata (40% on desktop) */}
                <div className="blog-promo_hero-meta">
                  {/* Tag pill */}
                  <div className="subtitle_tag-wrapper is--white">
                    <div>{heroPost.tag}</div>
                  </div>

                  {/* Date + Arrow (vertically stacked) */}
                  <div className="blog-promo_hero-meta-bottom">
                    <span className="blog-promo_hero-date">{heroPost.date}</span>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                </div>
              </div>
            </AppLink>
            {displayBlogGridRow(firstRowPosts)}
            {displayBlogGridRow(secondRowPosts, '1.5rem')}

            <div className="blog-promo_footer">
              <AppLink to="/blog" className="text-button w-inline-block">
                <div className="text-button_list">
                  <div className="text-button_text text-no-wrap">Read all blog posts</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated">
                  <div className="text-button_text text-no-wrap">Browse the blog</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
              </AppLink>
            </div>
          </div>
        </div>
      </div>
      <SectionDivider variant="light" hideOnMobile={true} />
    </section>
  );
}
