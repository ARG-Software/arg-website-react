import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import csharp from 'highlight.js/lib/languages/csharp';
import graphql from 'highlight.js/lib/languages/graphql';
import http from 'highlight.js/lib/languages/http';
import ini from 'highlight.js/lib/languages/ini';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import powershell from 'highlight.js/lib/languages/powershell';
import protobuf from 'highlight.js/lib/languages/protobuf';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('graphql', graphql);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('http', http);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('protobuf', protobuf);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);
hljs.registerAliases(['promql'], { languageName: 'sql' });
import {
  Navbar,
  Footer,
  SEO,
  PageHeader,
  CTASection,
  SocialShareButtons,
  ArticleSidebar,
  RelatedArticlesCarousel,
} from '../../components';
import { useScrollAnimations, useTimeOnPage } from '../../hooks';
import { TransitionContext } from '../../providers/TransitionProvider';
import { trackBlogPostShare, trackCTA, trackEvent } from '../../hooks/useAnalytics';
import {
  getHeadingId,
  getRelatedPosts,
  loadBlogPostsWithContent,
  parseDateToIso,
  splitArticleTitle,
} from '../../utils/blog';
import {
  EXTERNAL_LINK_KEYS,
  getBlueskyShareLink,
  getFeedLink,
  getLinkedInShareLink,
  getNewsletterSubscribeLink,
  getTwitterShareLink,
} from '../../services/externalLinks';
import '../../styles/blog.css';

// ─── Load all blog posts with full content ──────────────────────────────────

const BLOG_POSTS = loadBlogPostsWithContent();

// ─── Block renderer ───────────────────────────────────────────────────────────

const renderBlock = (block, i) => {
  switch (block.type) {
    case 'lead':
      return (
        <p key={i} className="bp-lead">
          {block.text}
        </p>
      );
    case 'paragraph':
      return (
        <p key={i} className="bp-p">
          {block.text}
        </p>
      );
    case 'heading':
      return (
        <h2 key={i} id={getHeadingId(block.text)} className="bp-h2">
          {block.text}
        </h2>
      );
    case 'subheading':
      return (
        <h3 key={i} id={getHeadingId(block.text)} className="bp-h3">
          {block.text}
        </h3>
      );
    case 'ordered-list':
      return (
        <ol key={i} className="bp-list bp-list--ordered">
          {block.items.map((item, j) => (
            <li key={j} className="bp-list-item">
              {item.label ? <span className="bp-list-label">{item.label}</span> : null} {item.text}
            </li>
          ))}
        </ol>
      );
    case 'callout':
      return (
        <blockquote key={i} className="bp-callout">
          {block.text}
        </blockquote>
      );
    case 'code': {
      const codeClassName = block.lang === 'plaintext' ? 'nohighlight' : `language-${block.lang}`;
      return (
        <div key={i} className="bp-code-wrap">
          <div className="bp-code-bar">
            <span className="bp-code-lang">{block.lang === 'plaintext' ? 'text' : block.lang}</span>
          </div>
          <pre>
            <code className={codeClassName}>{block.text}</code>
          </pre>
        </div>
      );
    }
    case 'list':
      return (
        <ul key={i} className="bp-list">
          {block.items.map((item, j) => (
            <li key={j} className="bp-list-item">
              {item.label ? <span className="bp-list-label">{item.label}</span> : null} {item.text}
            </li>
          ))}
        </ul>
      );
    case 'image':
      return (
        <figure key={i} className="bp-figure">
          <img src={block.src} alt={block.alt} className="bp-image" loading="lazy" />
          {block.alt ? <figcaption>{block.alt}</figcaption> : null}
        </figure>
      );
    default:
      return null;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlogPostPage() {
  const { slug } = useParams();
  const { scrollToHash } = useContext(TransitionContext);
  const BLOG_POST = BLOG_POSTS.find(blogPost => blogPost.slug === slug);
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

  useEffect(() => {
    hljs.highlightAll();
  }, [slug]);

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
        description={BLOG_POST.excerpt || BLOG_POST.subtitle}
        path={`/blog/${BLOG_POST.slug}/`}
        type="article"
        publishedTime={parseDateToIso(BLOG_POST.date)}
        author="Arg Software"
        section={BLOG_POST.tag}
        image={BLOG_POST.image}
        rss
        atom
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: BLOG_POST.title,
          description: BLOG_POST.excerpt || BLOG_POST.subtitle,
          datePublished: parseDateToIso(BLOG_POST.date),
          image: BLOG_POST.image ? `https://arg.software${BLOG_POST.image}` : undefined,
          author: {
            '@type': 'Organization',
            name: 'Arg Software',
            url: 'https://arg.software',
          },
          publisher: {
            '@type': 'Organization',
            name: 'Arg Software',
            logo: {
              '@type': 'ImageObject',
              url: 'https://arg.software/images/og.jpg',
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://arg.software/blog/${BLOG_POST.slug}/`,
          },
        }}
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
              <span className="bp-header-meta__sep" aria-hidden="true" />
              <span>{BLOG_POST.readTime}</span>
              <span className="bp-header-meta__sep" aria-hidden="true" />
              <span>Arg Software</span>
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
                        alt={heroImage.alt || BLOG_POST.title}
                        loading="eager"
                      />
                      {heroImage.alt ? <figcaption>{heroImage.alt}</figcaption> : null}
                    </figure>
                  )}

                  {contentBlocks.map((block, i) => renderBlock(block, i))}

                  <SocialShareButtons
                    items={shareItems}
                    className="bp-share-row bp-share-row--bottom"
                    animate={true}
                    animationOrder={contentBlocks.length + 1}
                  />
                  <SocialShareButtons
                    items={feedItems}
                    className="bp-share-row bp-feed-row bp-feed-row--bottom"
                    label="Subscribe"
                    animate={true}
                    animationOrder={contentBlocks.length + 2}
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
              <RelatedArticlesCarousel
                key={slug}
                posts={relatedPosts}
                sourceSlug={slug}
                animate={true}
              />
            </div>
          </section>

          <section className="page-cta-wrapper">
            <CTASection
              title="Like what you read?"
              titleHighlight="Subscribe to our newsletter"
              subtitle="Get our latest engineering essays, field notes, and product thinking in your inbox."
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
