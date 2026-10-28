import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { BaseCard } from '@ui/cards/BaseCard.jsx';
import { CTASection } from '@components/layout/CTASection';
import { SocialShareButtons } from '@components/actions/SocialShareButtons';
import { ArticleSidebar } from '@components/navigation/ArticleSidebar';
import { SimpleCarousel } from '@components/navigation/SimpleCarousel';
import { Pill } from '@ui/pills/Pill.jsx';
import { renderArticleBlock } from '@components/content/ArticleBlock';
import AppLink from '@components/navigation/AppLink';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { TransitionContext } from '../../providers/TransitionProvider';
import { trackBlogPostShare, trackCTA, trackEvent, trackOutbound } from '@services/analytics';
import {
  getHeadingId,
  getRelatedPosts,
  loadBlogPostsMetadata,
  parseDateToIso,
  readBlogPostContent,
  splitArticleTitle,
} from '@utils/blog';
import {
  EXTERNAL_LINK_KEYS,
  getBlueskyShareLink,
  getFeedLink,
  getLinkedInShareLink,
  getNewsletterSubscribeLink,
  getTwitterShareLink,
} from '@services/linksService';
import { getCoverSrcSet } from '@utils/blog/coverSrcSet';
import { buildArticleSchema } from '@utils/structuredData';
import { loadPatterns } from '@utils/patternLoader';
import '../../styles/blog.css';

// ─── Post metadata for every post; the body loads per post ──────────────────

const BLOG_POSTS = loadBlogPostsMetadata();
const PATTERNS = loadPatterns();

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogPostPage() {
  const { slug } = useParams();
  const { scrollToHash } = useContext(TransitionContext);
  const postMetadata = BLOG_POSTS.find(blogPost => blogPost.slug === slug);
  const content = postMetadata ? readBlogPostContent(slug) : null;
  const BLOG_POST = useMemo(
    () => (postMetadata ? { ...postMetadata, content } : undefined),
    [postMetadata, content]
  );
  const [activeSection, setActiveSection] = useState('');
  const [isClicking, setIsClicking] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy link');

  const sectionLinks = BLOG_POST?.content.filter(b => b.type === 'heading') || [];

  useEffect(() => {
    if (!BLOG_POST) return undefined;

    const handleScroll = () => {
      if (isClicking) return;
      const headings = BLOG_POST.content
        .filter(b => b.type === 'heading')
        .map(b => document.getElementById(getHeadingId(b.text)))
        .filter(Boolean);
      const scrollPos = window.scrollY + 200;

      for (let i = headings.length - 1; i >= 0; i--) {
        if (headings[i].offsetTop <= scrollPos) {
          setActiveSection(headings[i].id);
          return;
        }
      }
      setActiveSection('');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [slug, BLOG_POST, isClicking]);

  useScrollAnimations(); // Scroll animations including footer

  // Handle hash fragments on page load (e.g., /blog/slug#section)
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        scrollToHash(hash, { mobileMenuDelay: 0, offset: -120, updateUrl: false });
      }
    }
  }, [scrollToHash, slug]); // Re-run when article changes

  useTimeOnPage(`/blog/${slug}/`);

  if (!BLOG_POST) {
    return (
      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />
        <main
          className="main-wrapper"
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#fff', fontFamily: 'Neuemontreal, sans-serif' }}>
            Article not found.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const relatedPosts = getRelatedPosts(BLOG_POSTS, BLOG_POST, 9);
  const heroImageIndex = BLOG_POST.content.findIndex(block => block.type === 'image');
  const heroImage = heroImageIndex >= 0 ? BLOG_POST.content[heroImageIndex] : null;
  const contentBlocks = BLOG_POST.content.filter((block, index) => index !== heroImageIndex);
  // Patterns own the link: a post shows the patterns that list it in relatedPosts.
  const postPatterns = PATTERNS.filter(pattern => pattern.relatedPosts.includes(BLOG_POST.slug));
  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: '/blog/' },
    { label: BLOG_POST.tag, isTag: true },
  ];
  const articleUrl = `https://arg.software/blog/${BLOG_POST.slug}/`;
  const shareUrl = articleUrl;
  const titleLines = splitArticleTitle(BLOG_POST.title);

  const handleTocClick = (event, section, sectionId) => {
    event.preventDefault();
    setIsClicking(true);
    trackEvent('blog_toc_click', { section });
    scrollToHash(sectionId, { mobileMenuDelay: 0, offset: -120 });
    setActiveSection(sectionId);
    setTimeout(() => setIsClicking(false), 1000);
  };

  const handleCopyLink = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyLabel('Copy unavailable');
      setTimeout(() => setCopyLabel('Copy link'), 1800);
      return;
    }

    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopyLabel('Copied');
      trackBlogPostShare('copy', slug);
      setTimeout(() => setCopyLabel('Copy link'), 1800);
    } catch {
      setCopyLabel('Copy unavailable');
      setTimeout(() => setCopyLabel('Copy link'), 1800);
    }
  };

  const shareItems = [
    {
      id: 'bluesky',
      icon: 'bluesky',
      label: 'Bluesky',
      ariaLabel: 'Share on Bluesky',
      href: getBlueskyShareLink(BLOG_POST.title, shareUrl),
      onClick: () => trackBlogPostShare('bluesky', slug),
    },
    {
      id: 'linkedin',
      icon: 'linkedin',
      label: 'LinkedIn',
      ariaLabel: 'Share on LinkedIn',
      href: getLinkedInShareLink(shareUrl),
      onClick: () => trackBlogPostShare('linkedin', slug),
    },
    {
      id: 'twitter',
      icon: 'twitter',
      label: 'X',
      ariaLabel: 'Share on X',
      href: getTwitterShareLink(BLOG_POST.title, shareUrl),
      onClick: () => trackBlogPostShare('twitter', slug),
    },
    {
      id: 'copy',
      icon: 'copy',
      label: copyLabel,
      ariaLabel: copyLabel,
      onClick: handleCopyLink,
    },
  ];

  const feedItems = [
    {
      id: 'rss',
      icon: 'rss',
      label: 'RSS',
      ariaLabel: 'Subscribe with RSS',
      href: getFeedLink(EXTERNAL_LINK_KEYS.RSS_FEED),
      onClick: () => trackEvent('blog_subscribe_click', { feed_type: 'rss' }),
    },
    {
      id: 'atom',
      icon: 'atom',
      label: 'Atom',
      ariaLabel: 'Subscribe with Atom',
      href: getFeedLink(EXTERNAL_LINK_KEYS.ATOM_FEED),
      onClick: () => trackEvent('blog_subscribe_click', { feed_type: 'atom' }),
    },
  ];

  return (
    <>
      <SEO
        title={BLOG_POST.seoTitle}
        description={BLOG_POST.subtitle}
        path={`/blog/${BLOG_POST.slug}/`}
        type="article"
        publishedTime={parseDateToIso(BLOG_POST.date)}
        modifiedTime={parseDateToIso(BLOG_POST.dateModified || BLOG_POST.updated || BLOG_POST.date)}
        author={BLOG_POST.author}
        authorUrl={BLOG_POST.authorUrl}
        section={BLOG_POST.tag}
        image={BLOG_POST.image}
        imageAlt={heroImage?.alt || BLOG_POST.title}
        imageWidth="2560"
        imageHeight="1440"
        rss
        atom
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Blog', path: '/blog/' },
          { label: BLOG_POST.title, path: `/blog/${BLOG_POST.slug}/` },
        ]}
        jsonLd={buildArticleSchema(BLOG_POST)}
      />

      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <PageHeader
            title={titleLines}
            subtitle={BLOG_POST.subtitle}
            breadcrumbs={breadcrumbs}
            size="small"
            variant="article bp-article-page-header"
          >
            <div
              className="bp-header-meta"
              data-animate="fade-up"
              data-animate-trigger="load"
              data-animate-order="3"
            >
              <span>{BLOG_POST.date}</span>
              {BLOG_POST.reviewedOn ? (
                <>
                  <span className="bp-header-meta__sep" aria-hidden="true" />
                  <span>Reviewed on {BLOG_POST.reviewedOn}</span>
                </>
              ) : null}
              <span className="bp-header-meta__sep" aria-hidden="true" />
              <span>{BLOG_POST.readTime}</span>
              <span className="bp-header-meta__sep" aria-hidden="true" />
              {BLOG_POST.authorUrl ? (
                <a
                  className="bp-header-meta__author"
                  href={BLOG_POST.authorUrl}
                  target="_blank"
                  rel="author noopener noreferrer"
                  onClick={() =>
                    trackOutbound(BLOG_POST.authorUrl, BLOG_POST.author, 'blog_post_author')
                  }
                >
                  {BLOG_POST.author}
                </a>
              ) : (
                <span>{BLOG_POST.author || 'ARG Software'}</span>
              )}
            </div>
          </PageHeader>

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="80"
          >
            <section className="bp-body background-color-white padding-section-large border-radius-all">
              <div className="bp-body-inner container container--section padding-global">
                <article className="bp-content">
                  {heroImage && (
                    <figure className="bp-hero-figure" data-animate="fade-up">
                      <img
                        src={heroImage.src}
                        srcSet={getCoverSrcSet(heroImage.src)}
                        sizes="(max-width: 991px) 92vw, 56rem"
                        alt={heroImage.alt || BLOG_POST.title}
                        loading="eager"
                      />
                      {heroImage.caption ? <figcaption>{heroImage.caption}</figcaption> : null}
                    </figure>
                  )}

                  {contentBlocks.map((block, i) => renderArticleBlock(block, i))}

                  {postPatterns.length > 0 && (
                    <p className="bp-p">
                      Pattern reference:{' '}
                      {postPatterns.map((pattern, index) => (
                        <span key={pattern.slug}>
                          {index > 0 && ' · '}
                          <AppLink
                            to={`/patterns/${pattern.slug}/`}
                            trackEvent="pattern_click"
                            trackData={{ pattern: pattern.slug, location: 'blog_post' }}
                          >
                            {pattern.title}
                          </AppLink>
                        </span>
                      ))}
                    </p>
                  )}

                  <SocialShareButtons
                    items={shareItems}
                    className="bp-share-row bp-share-row--bottom"
                    animate={true}
                    animationOrder={1}
                  />
                  <SocialShareButtons
                    items={feedItems}
                    className="bp-share-row bp-feed-row bp-feed-row--bottom"
                    label="Subscribe"
                    animate={true}
                    animationOrder={2}
                  />
                </article>

                <ArticleSidebar
                  sectionLinks={sectionLinks}
                  activeSection={activeSection}
                  getSectionId={getHeadingId}
                  onSectionClick={handleTocClick}
                  className="bp-sidebar-right"
                  animate={true}
                  animationOrder={0}
                />
              </div>
            </section>
          </div>

          <section className="bp-related-section padding-section-large">
            <div className="container container--section padding-global">
              {relatedPosts.length > 0 && (
                <div
                  className="related-articles-carousel"
                  data-animate-scope
                  data-animate-default-preset="fade-up"
                  data-animate-default-stagger="120"
                >
                  <div className="related-articles-carousel__head" data-animate-order="0">
                    <div className="related-articles-carousel__heading">
                      <span className="related-articles-carousel__kicker">Continue reading</span>
                      <h2 id="related-articles-carousel-title">
                        More from <span>ARG</span>
                      </h2>
                    </div>
                  </div>

                  <div className="related-articles-carousel__viewport" data-animate-order="1">
                    <SimpleCarousel
                      key={slug}
                      className="related-articles-carousel__carousel"
                      items={relatedPosts}
                      itemsPerPage={3}
                      tabletItemsPerPage={2}
                      mobileItemsPerPage={1}
                      getItemKey={post => post.slug}
                      ariaLabel="Related articles"
                      prevAriaLabel="Show previous related article"
                      nextAriaLabel="Show next related article"
                      showIndicator={false}
                      renderItem={post => (
                        <BaseCard
                          as={AppLink}
                          to={`/blog/${post.slug}/`}
                          className="related-article-card"
                          variant="glass"
                          padding="sm"
                          radius="lg"
                          hover="none"
                          trackEvent="blog_related_click"
                          trackData={{
                            blog_post_slug: post.slug,
                            source_slug: slug,
                            location: 'blog_related_carousel',
                          }}
                        >
                          <Pill className="related-article-card__tag" variant="muted" size="xs">
                            {post.tag}
                          </Pill>
                          <h3>{post.title}</h3>
                          <p>{post.subtitle}</p>
                          <span className="related-article-card__meta">
                            {[post.date, post.readTime].filter(Boolean).join(' · ')}
                          </span>
                        </BaseCard>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="page-cta-wrapper">
            <CTASection
              title="Like what you read?"
              titleHighlight="Subscribe to our newsletter"
              mobileTitleHighlight="Join our newsletter"
              subtitle="Get our latest engineering essays, field notes, and product thinking in your inbox."
              mobileSubtitle="Engineering essays and field notes, straight to your inbox."
              buttonTextNotHover="Subscribe"
              buttonTextHover="Join the list"
              buttonLink={getNewsletterSubscribeLink()}
              animationClass="bp-animate"
              animate={true}
              onPrimaryClick={() => trackCTA('newsletter_subscribe', 'blog_post_cta')}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
