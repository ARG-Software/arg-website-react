import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackCTA } from '@services/analytics';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { Pill } from '@ui/pills/Pill.jsx';
import AppLink from '@components/navigation/AppLink';
import { renderArticleBlock } from '@components/content/ArticleBlock';
import { loadBlogPostsMetadata } from '@utils/blog/articleLoader.js';
import { loadPatterns } from '@utils/patternLoader';
import PATTERNS_PAGE from '../data/patternsPage.json';
import { getProjectBookingLink } from '../services/linksService';
import '../styles/blog.css';
import '../styles/patterns.css';

const PATTERNS = loadPatterns();
const BLOG_POSTS = loadBlogPostsMetadata();
const DETAIL = PATTERNS_PAGE.detail;

export default function PatternDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const pattern = PATTERNS.find(item => item.slug === slug);

  useScrollAnimations();
  useTimeOnPage(pattern ? `/patterns/${pattern.slug}/` : '/patterns/');

  useEffect(() => {
    if (!pattern) navigate('/patterns/', { replace: true });
  }, [pattern, navigate]);

  if (!pattern) return null;

  const breadcrumbs = [
    ...PATTERNS_PAGE.hero.breadcrumbs,
    { label: pattern.title, path: `/patterns/${pattern.slug}/` },
  ];
  const relatedPosts = BLOG_POSTS.filter(post => pattern.relatedPosts.includes(post.slug));
  const relatedPatterns = PATTERNS.filter(item => pattern.relatedPatterns.includes(item.slug));

  return (
    <>
      <SEO
        title={pattern.seoTitle || pattern.title}
        description={pattern.subtitle}
        path={`/patterns/${pattern.slug}/`}
        type="article"
        breadcrumbs={breadcrumbs}
      />
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <PageHeader
            title={[pattern.title, pattern.category]}
            subtitle={pattern.subtitle}
            breadcrumbs={breadcrumbs}
            size="small"
            variant="article bp-article-page-header"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="80"
          >
            <section className="bp-body background-color-white padding-section-large border-radius-all">
              <div className="bp-body-inner container container--section padding-global">
                <article className="bp-content">
                  <div className="pa-tags">
                    {pattern.tags.map(tag => (
                      <Pill key={tag} variant="outline" size="sm">
                        {tag}
                      </Pill>
                    ))}
                  </div>
                  {pattern.content.map((block, i) => renderArticleBlock(block, i))}
                </article>

                <aside className="pa-aside" aria-label="Related reading">
                  {relatedPosts.length > 0 && (
                    <RelatedLinks
                      label={DETAIL.relatedPostsLabel}
                      items={relatedPosts.map(post => ({
                        key: post.slug,
                        to: `/blog/${post.slug}/`,
                        title: post.title,
                        trackEvent: 'blog_post_click',
                        trackData: {
                          blog_post_slug: post.slug,
                          blog_post_title: post.title,
                          link_location: 'pattern_detail',
                        },
                      }))}
                    />
                  )}
                  {relatedPatterns.length > 0 && (
                    <RelatedLinks
                      label={DETAIL.relatedPatternsLabel}
                      items={relatedPatterns.map(item => ({
                        key: item.slug,
                        to: `/patterns/${item.slug}/`,
                        title: item.title,
                        trackEvent: 'pattern_click',
                        trackData: { pattern: item.slug, location: 'pattern_detail' },
                      }))}
                    />
                  )}
                  <RelatedLinks
                    label={DETAIL.allPatternsLabel}
                    items={[{ key: 'all', to: '/patterns/', title: DETAIL.allPatternsLink }]}
                  />
                </aside>
              </div>
            </section>
          </div>

          <section className="page-cta-wrapper" id="page-cta">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title={PATTERNS_PAGE.cta.title}
              titleHighlight={PATTERNS_PAGE.cta.titleHighlight}
              mobileTitleHighlight={PATTERNS_PAGE.cta.mobileTitleHighlight}
              buttonTextNotHover={PATTERNS_PAGE.cta.buttonTextNotHover}
              buttonTextHover={PATTERNS_PAGE.cta.buttonTextHover}
              animationClass="pa-animate"
              animate={true}
              buttonLink={getProjectBookingLink()}
              onPrimaryClick={() => trackCTA('book_meeting', 'patterns_detail_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}

// Same markup and classes as the blog's ArticleSidebar, so both read as one site.
function RelatedLinks({ label, items }) {
  return (
    <div className="pa-aside-group">
      <span className="article-sidebar__label">{label}</span>
      <nav className="article-sidebar__links" aria-label={label}>
        {items.map((item, index) => (
          <AppLink
            key={item.key}
            to={item.to}
            className="article-sidebar__link"
            trackEvent={item.trackEvent}
            trackData={item.trackData}
          >
            <span className="article-sidebar__link-number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="article-sidebar__link-text">{item.title}</span>
          </AppLink>
        ))}
      </nav>
    </div>
  );
}
