import AppLink from '../../../components/navigation/AppLink';
import { arrowSvg } from '../../../components/icons/SocialIcons';
import { Pill } from '../../../components/pills/Pill';
import { trackBlogPostClick } from '../../../utils/analytics';
import { SectionDivider } from '../../../components/layout/SectionDivider';

function getTagColorStyle(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsla(${hue}, 50%, 55%, 0.12)`,
    color: `hsl(${hue}, 55%, 72%)`,
    border: `1px solid hsla(${hue}, 50%, 55%, 0.25)`,
  };
}

function BlogCard({ blogPost, animationOrder }) {
  const tagStyle = getTagColorStyle(blogPost.tag);
  return (
    <AppLink
      to={`/blog/${blogPost.slug}/`}
      className="blog-promo_card-new"
      data-animate="fade-up"
      data-animate-order={animationOrder}
      onClick={() => trackBlogPostClick(blogPost.slug, blogPost.title, 'homepage_promo_card')}
    >
      <div className="blog-promo_card-new-header">
        <h4 className="blog-promo_card-new-title">{blogPost.title}</h4>
        <p className="blog-promo_card-new-excerpt">{blogPost.subtitle}</p>
      </div>
      <div className="blog-promo_card-new-footer">
        <Pill className="blog-promo_card-new-tag" variant="custom" size="xs" style={tagStyle}>
          {blogPost.tag}
        </Pill>
        <div className="blog-promo_card-new-meta">
          <span className="blog-promo_card-new-date">{blogPost.date}</span>
          <div className="arrow_icon-embed">{arrowSvg}</div>
        </div>
      </div>
    </AppLink>
  );
}

function displayBlogGridRow(blogPosts = [], startOrder = 0) {
  return (
    <div className="blog-promo_cards-new">
      {blogPosts.map((blogPost, index) => (
        <BlogCard key={blogPost.slug} blogPost={blogPost} animationOrder={startOrder + index} />
      ))}
    </div>
  );
}

export function BlogPromoSection({ blogPosts, className = '' }) {
  const heroPost = blogPosts[0];
  const gridPosts = blogPosts.slice(1, 7);
  const heroTagStyle = getTagColorStyle(heroPost.tag);

  return (
    <section
      id="blog-promo"
      className={`section_blog-promo padding-section-medium ${className}`.trim()}
      style={{ backgroundColor: '#0c002e' }}
      data-animate-scope
      data-animate-default-preset="fade-up"
      data-animate-default-stagger="120"
    >
      <div className="padding-global">
        <div className="container-large">
          <div className="blog-promo_inner">
            <div className="home-section-header">
              <div>
                <h2 className="home-section-title home-section-title--light" data-animate-order="0">
                  Engineering Field Notes
                </h2>
              </div>
              <div
                className="subtitle_tag-wrapper is--white hide-mobile-landscape"
                data-animate-order="1"
              >
                <div>Blog</div>
              </div>
            </div>
            <AppLink
              to={`/blog/${heroPost.slug}/`}
              className="blog-promo_hero blog-promo_card-new"
              data-animate="fade-up"
              data-animate-order="2"
              onClick={() =>
                trackBlogPostClick(heroPost.slug, heroPost.title, 'homepage_promo_hero')
              }
            >
              <div className="blog-promo_hero-content">
                <div className="blog-promo_card-new-header">
                  <h3 className="blog-promo_card-new-title blog-promo_hero-title">
                    {heroPost.title}
                  </h3>
                  <p className="blog-promo_card-new-excerpt">{heroPost.subtitle}</p>
                </div>
                <div className="blog-promo_card-new-footer blog-promo_hero-footer">
                  <Pill
                    className="blog-promo_card-new-tag"
                    variant="custom"
                    size="xs"
                    style={heroTagStyle}
                  >
                    {heroPost.tag}
                  </Pill>
                  <div className="blog-promo_card-new-meta">
                    <span className="blog-promo_card-new-date">{heroPost.date}</span>
                    <div className="arrow_icon-embed">{arrowSvg}</div>
                  </div>
                </div>
              </div>
            </AppLink>
            {displayBlogGridRow(gridPosts, 3)}

            <div className="blog-promo_footer" data-animate-order="10">
              <AppLink to="/blog" className="text-button text-button--align-end">
                <div className="text-button_list">
                  <div className="text-button_text text-no-wrap">Read blog</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated">
                  <div className="text-button_text text-no-wrap">Browse posts</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
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
