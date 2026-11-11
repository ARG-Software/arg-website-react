import AppLink from '../../../components/navigation/AppLink';
import { TextArrowButton } from '@ui/buttons/TextArrowButton.jsx';
import { Pill } from '@ui/pills/Pill.jsx';
import { trackBlogPostClick } from '@services/analytics';
import { getCoverSrcSet } from '@utils/blog/coverSrcSet';
import { getBlogTagColor } from '@utils/blog/articleHelpers.js';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import HOMEPAGE from '../../../data/homePage.json';
import IMAGE_SIZES from '@data/blogImageSizes.json';

// One featured post plus four in the list beside it
const BLOG_PROMO_LIST_COUNT = 4;

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
                      width={IMAGE_SIZES[featured.image]?.[0]}
                      height={IMAGE_SIZES[featured.image]?.[1]}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                </div>
                {/* Same tag and date line as the posts in the list */}
                <div className="blog-promo_post-meta">
                  <Pill variant="custom" size="xs" style={getBlogTagColor(featured.tag)}>
                    {featured.tag}
                  </Pill>
                  <span className="blog-promo_post-date">{featured.date}</span>
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
                            width={IMAGE_SIZES[post.image]?.[0]}
                            height={IMAGE_SIZES[post.image]?.[1]}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </div>
                      <div className="blog-promo_post-body">
                        <div className="blog-promo_post-meta">
                          <Pill variant="custom" size="xs" style={getBlogTagColor(post.tag)}>
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
              <TextArrowButton
                as={AppLink}
                to="/blog/"
                label={content.cta.label}
                hoverLabel={content.cta.hoverLabel}
                align="end"
                noWrap
              />
            </div>
          </div>
        </div>
      </div>
      <SectionDivider variant="light" hideOnMobile={true} />
    </section>
  );
}
