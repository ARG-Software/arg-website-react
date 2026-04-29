import AppLink from '../../../components/navigation/AppLink';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackBlogPostClick } from '../../../hooks/useAnalytics';
import { SectionDivider } from '../../../components/layout/SectionDivider';

function getTagColorClass(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal'];
  return colors[Math.abs(hash) % colors.length];
}

function BlogCard({ blogPost }) {
  const tagColor = getTagColorClass(blogPost.tag);
  return (
    <AppLink
      to={`/blog/${blogPost.slug}/`}
      className="blog-promo_card-new"
      onClick={() => trackBlogPostClick(blogPost.slug, blogPost.title, 'homepage_promo_card')}
    >
      <div className="blog-promo_card-new-header">
        <h4 className="blog-promo_card-new-title">{blogPost.title}</h4>
        <p className="blog-promo_card-new-excerpt">{blogPost.excerpt}</p>
      </div>
      <div className="blog-promo_card-new-footer">
        <div className={`blog-promo_card-new-tag tag-${tagColor}`}>
          <span>{blogPost.tag}</span>
        </div>
        <div className="blog-promo_card-new-meta">
          <span className="blog-promo_card-new-date">{blogPost.date}</span>
          <div className="blog-promo_card-new-arrow w-embed">{arrowSvg}</div>
        </div>
      </div>
    </AppLink>
  );
}

function displayBlogGridRow(blogPosts = []) {
  return (
    <div className="blog-promo_cards-new" data-animate="fade-up">
      {blogPosts.map(blogPost => (
        <BlogCard key={blogPost.slug} blogPost={blogPost} />
      ))}
    </div>
  );
}

export function BlogPromoSection({ blogPosts, className = '' }) {
  const heroPost = blogPosts[0];
  const gridPosts = blogPosts.slice(1, 7);

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
                <h2 className="heading-style-h2" style={{ color: '#fff' }} data-animate="fade">
                  We write about what we build
                </h2>
              </div>
              <div
                className="subtitle_tag-wrapper is--white hide-mobile-landscape"
                data-animate="fade"
              >
                <div>Blog</div>
              </div>
            </div>
            <AppLink
              to={`/blog/${heroPost.slug}/`}
              className="blog-promo_hero"
              onClick={() =>
                trackBlogPostClick(heroPost.slug, heroPost.title, 'homepage_promo_hero')
              }
            >
              <div className="blog-promo_hero-content" data-animate="fade-up">
                <h3 className="blog-promo_hero-title">{heroPost.title}</h3>
                <div className="blog-promo_hero-meta">
                  <div className="subtitle_tag-wrapper is--white">
                    <div>{heroPost.tag}</div>
                  </div>
                  <div className="blog-promo_hero-meta-bottom">
                    <span className="blog-promo_hero-date">{heroPost.date}</span>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                </div>
              </div>
            </AppLink>
            {displayBlogGridRow(gridPosts)}

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
