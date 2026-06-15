import { useEffect, useState } from 'react';
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
  CTASection,
  SectionDivider,
  SEO,
  PageHeader,
  BlogArticleSidebar,
} from '../../components';
import { useScrollAnimations, usePageTransition, useTimeOnPage } from '../../hooks';
import { trackBlogPostShare, trackCTA, trackEvent } from '../../hooks/useAnalytics';
import { loadBlogPostsWithContent } from '../../utils/blog';
import '../../styles/blog.css';

// ─── Load all blog posts with full content ──────────────────────────────────

const BLOG_POSTS = loadBlogPostsWithContent();

// ─── Block renderer ───────────────────────────────────────────────────────────

const slugify = text =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const splitArticleTitle = title => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return [''];

  const minIndex = normalizedTitle.length * 0.35;
  const maxIndex = normalizedTitle.length * 0.7;
  const targetIndex = normalizedTitle.length * 0.5;
  const candidates = [];

  for (let index = 0; index < normalizedTitle.length; index += 1) {
    const character = normalizedTitle[index];
    const nextCharacter = normalizedTitle[index + 1];

    if ('.:?!'.includes(character) && nextCharacter === ' ') {
      candidates.push(index + 1);
    }
  }

  [' - ', ' — ', ' – '].forEach(separator => {
    const index = normalizedTitle.indexOf(separator);
    if (index !== -1) candidates.push(index);
  });

  const bestPunctuationSplit = candidates
    .filter(index => index >= minIndex && index <= maxIndex)
    .sort((indexA, indexB) => Math.abs(indexA - targetIndex) - Math.abs(indexB - targetIndex))[0];

  const splitIndex = bestPunctuationSplit ?? findNearestWordBoundary(normalizedTitle, targetIndex);
  const firstLine = normalizedTitle.slice(0, splitIndex).trim();
  const secondLine = normalizedTitle
    .slice(splitIndex)
    .replace(/^[-—–]\s*/, '')
    .trim();

  return secondLine ? [firstLine, secondLine] : [normalizedTitle];
};

const findNearestWordBoundary = (text, targetIndex) => {
  const beforeTarget = text.lastIndexOf(' ', targetIndex);
  const afterTarget = text.indexOf(' ', targetIndex);

  if (beforeTarget === -1) return afterTarget === -1 ? text.length : afterTarget;
  if (afterTarget === -1) return beforeTarget;

  return targetIndex - beforeTarget <= afterTarget - targetIndex ? beforeTarget : afterTarget;
};

const renderBlock = (block, i) => {
  switch (block.type) {
    case 'lead':
      return (
        <p key={i} className="bp-lead" data-animate="fade-up">
          {block.text}
        </p>
      );
    case 'paragraph':
      return (
        <p key={i} className="bp-p" data-animate="fade-up">
          {block.text}
        </p>
      );
    case 'heading':
      return (
        <h2 key={i} id={slugify(block.text)} className="bp-h2" data-animate="fade-up">
          {block.text}
        </h2>
      );
    case 'subheading':
      return (
        <h3 key={i} id={slugify(block.text)} className="bp-h3" data-animate="fade-up">
          {block.text}
        </h3>
      );
    case 'callout':
      return (
        <blockquote key={i} className="bp-callout" data-animate="fade-up">
          {block.text}
        </blockquote>
      );
    case 'code':
      return (
        <div key={i} className="bp-code-wrap" data-animate="fade-up">
          <div className="bp-code-bar">
            <span className="bp-code-lang">{block.lang}</span>
          </div>
          <pre>
            <code className={`language-${block.lang}`}>{block.text}</code>
          </pre>
        </div>
      );
    case 'list':
      return (
        <ul key={i} className="bp-list">
          {block.items.map((item, j) => (
            <li key={j} className="bp-list-item" data-animate="fade-up">
              {item.label ? <span className="bp-list-label">{item.label}</span> : null} {item.text}
            </li>
          ))}
        </ul>
      );
    case 'image':
      return (
        <figure key={i} className="bp-figure" data-animate="fade-up">
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
  const { scrollToHash } = usePageTransition();
  const BLOG_POST = BLOG_POSTS.find(blogPost => blogPost.slug === slug) || BLOG_POSTS[0];
  const [activeSection, setActiveSection] = useState('');
  const [isClicking, setIsClicking] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy link');

  const sectionLinks = BLOG_POST.content.filter(b => b.type === 'heading');

  useEffect(() => {
    const handleScroll = () => {
      if (isClicking) return;
      const headings = BLOG_POST.content
        .filter(b => b.type === 'heading')
        .map(b => document.getElementById(slugify(b.text)))
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
  }, [slug, BLOG_POST.content, isClicking]);

  useScrollAnimations(); // Scroll animations including footer

  // Handle hash fragments on page load (e.g., /blog/slug#section)
  useEffect(() => {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      if (hash) {
        scrollToHash(hash, { mobileMenuDelay: 0 });
      }
    }
  }, [scrollToHash, slug]); // Re-run when article changes

  useEffect(() => {
    hljs.highlightAll();
  }, [slug]);

  useTimeOnPage(`/blog/${slug}/`);

  if (!BLOG_POST) {
    return (
      <div className="page-wrapper w-clearfix">
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

  // Related & recent articles for sidebar
  const relatedPosts = BLOG_POSTS.filter(p => p.slug !== slug && p.tag === BLOG_POST.tag).slice(
    0,
    3
  );

  const titleLines = splitArticleTitle(BLOG_POST.title);
  const articleUrl = `https://arg.software/blog/${BLOG_POST.slug}/`;
  const shareUrl = BLOG_POST.mediumUrl || articleUrl;

  const handleTocClick = (event, section, sectionId) => {
    event.preventDefault();
    setIsClicking(true);
    trackEvent('blog_toc_click', { section });
    scrollToHash(sectionId, { mobileMenuDelay: 0 });
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
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${BLOG_POST.title} ${shareUrl}`)}`,
      onClick: () => trackBlogPostShare('bluesky', slug),
    },
    {
      id: 'linkedin',
      icon: 'linkedin',
      label: 'LinkedIn',
      ariaLabel: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      onClick: () => trackBlogPostShare('linkedin', slug),
    },
    {
      id: 'twitter',
      icon: 'twitter',
      label: 'X',
      ariaLabel: 'Share on X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(BLOG_POST.title)}&url=${encodeURIComponent(shareUrl)}`,
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
      href: '/rss.xml',
      onClick: () => trackEvent('blog_subscribe_click', { feed_type: 'rss' }),
    },
    {
      id: 'atom',
      icon: 'atom',
      label: 'Atom',
      ariaLabel: 'Subscribe with Atom',
      href: '/atom.xml',
      onClick: () => trackEvent('blog_subscribe_click', { feed_type: 'atom' }),
    },
  ];

  // Parse date string to ISO format for structured data
  const parseDate = dateStr => {
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return '';
    }
  };

  return (
    <>
      <SEO
        title={BLOG_POST.seoTitle}
        description={BLOG_POST.excerpt || BLOG_POST.subtitle}
        path={`/blog/${BLOG_POST.slug}/`}
        type="article"
        publishedTime={parseDate(BLOG_POST.date)}
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
          datePublished: parseDate(BLOG_POST.date),
          image: BLOG_POST.image ? `https://arg.software${BLOG_POST.image}` : undefined,
          author: {
            '@type': 'Organization',
            name: 'ARG Software',
            url: 'https://arg.software',
          },
          publisher: {
            '@type': 'Organization',
            name: 'ARG Software',
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

      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          {/* HERO */}
          <PageHeader
            title={titleLines}
            subtitle={BLOG_POST.subtitle}
            breadcrumbs={[
              { label: 'Home', path: '/' },
              { label: 'Blog', path: '/blog/' },
              { label: BLOG_POST.tag, isTag: true },
            ]}
            size="small"
            variant="article"
          />

          {/* BLOG_POST BODY */}
          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="0"
          >
            <section className="bp-body background-color-white padding-section-xlarge border-radius-all">
              <div className="bp-body-inner container padding-global">
                <article className="bp-content">
                  {BLOG_POST.content.map((block, i) => renderBlock(block, i))}
                </article>

                <BlogArticleSidebar
                  sectionLinks={sectionLinks}
                  activeSection={activeSection}
                  getSectionId={slugify}
                  onSectionClick={handleTocClick}
                  shareItems={shareItems}
                  feedItems={feedItems}
                  relatedPosts={relatedPosts}
                  sourceSlug={slug}
                  cta={{
                    eyebrow: 'Work with ARG',
                    title: 'Need a team that keeps architecture clean?',
                    label: 'Book a Meeting',
                    href: 'https://zcal.co/argsoftware/project',
                    onClick: () => trackCTA('book_meeting', 'blog_sidebar'),
                  }}
                />
              </div>
            </section>
          </div>

          <div className="page-cta-wrapper">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Stop searching."
              titleHighlight="Start building."
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="bp-animate"
              onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
