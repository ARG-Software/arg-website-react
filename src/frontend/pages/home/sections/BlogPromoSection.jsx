import AppLink from '../../../components/navigation/AppLink';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { Pill } from '@ui/pills/Pill.jsx';
import { trackBlogPostClick } from '@services/analytics';
import { getCoverSrcSet } from '@utils/blog/coverSrcSet';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import HOMEPAGE from '../../../data/homePage.json';

// One featured post plus four in the list beside it
const BLOG_PROMO_LIST_COUNT = 4;

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

/**
 * Title with the eyebrow pill on the right, the latest post as a large featured card and
 * the next four as a list with square thumbnails beside it, then the blog link.
 */
export function BlogPromoSection({ blogPosts, className = '', content = HOMEPAGE.blogPromo }) {
  const featured = blogPosts[0];
  const listPosts = blogPosts.slice(1, 1 + BLOG_PROMO_LIST_COUNT);

  return (
    <section
      id="blog-promo"
      className={`section_blog-promo padding-section-medium ${className}`.trim()}
      style={{ backgroundColor: '#0c002e' }}
      data-animate-scope
      data-animate-default-preset="fade-up"
    >
      <div className="padding-global">
        <div className="container-large">
          <div className="blog-promo_inner">
            <div className="home-section-header">
              <div>
                <h2 className="home-section-title home-section-title--light" data-animate-order="0">
                  {content.title}
                </h2>
              </div>
              <div
                className="subtitle_tag-wrapper is--white hide-mobile-landscape"
                data-animate-order="1"
              >
                <div>{content.eyebrow}</div>
              </div>
            </div>

            <div className="blog-promo_layout">
              <AppLink
                to={`/blog/${featured.slug}/`}
                className="blog-promo_featured"
                data-animate="fade-up"
                data-animate-order="3"
                onClick={() =>
                  trackBlogPostClick(featured.slug, featured.title, 'homepage_promo_featured')
                }
              >
                <div className="blog-promo_featured-media">
                  {featured.image ? (
                    <img
                      className="blog-promo_featured-image"
                      src={featured.image}
                      srcSet={getCoverSrcSet(featured.image)}
                      sizes="(max-width: 61.9375rem) 100vw, 40rem"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <span className="blog-promo_featured-pill">{featured.tag}</span>
                  {featured.readTime ? (
                    <span className="blog-promo_featured-pill blog-promo_featured-pill--end">
                      {featured.readTime}
                    </span>
                  ) : null}
                </div>
                <h3 className="blog-promo_featured-title">{featured.title}</h3>
                <p className="blog-promo_featured-excerpt">{featured.subtitle}</p>
              </AppLink>

              <ul className="blog-promo_list">
                {listPosts.map((post, index) => (
                  <li key={post.slug} className="blog-promo_item">
                    <AppLink
                      to={`/blog/${post.slug}/`}
                      className="blog-promo_post"
                      data-animate="fade-up"
                      data-animate-order={4 + index}
                      onClick={() =>
                        trackBlogPostClick(post.slug, post.title, 'homepage_promo_list')
                      }
                    >
                      <div className="blog-promo_post-thumb">
                        {post.image ? (
                          <img
                            src={post.image}
                            srcSet={getCoverSrcSet(post.image)}
                            sizes="5rem"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </div>
                      <div className="blog-promo_post-body">
                        <div className="blog-promo_post-meta">
                          <Pill variant="custom" size="xs" style={getTagColorStyle(post.tag)}>
                            {post.tag}
                          </Pill>
                          <span className="blog-promo_post-date">{post.date}</span>
                        </div>
                        <h3 className="blog-promo_post-title">{post.title}</h3>
                      </div>
                    </AppLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="blog-promo_footer" data-animate-order="10">
              <AppLink to="/blog/" className="text-button text-button--align-end">
                <div className="text-button_list">
                  <div className="text-button_text text-no-wrap">{content.cta.label}</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated">
                  <div className="text-button_text text-no-wrap">{content.cta.hoverLabel}</div>
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
