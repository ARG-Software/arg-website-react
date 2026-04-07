import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import hljs from 'highlight.js';
hljs.registerAliases(['promql'], { languageName: 'sql' });
import { Navbar, Footer, CTASection, SectionDivider, arrowSvg, SEO } from '../../components';
import { SubpageHero } from '../../components/hero/SubpageHero';
import { useScrollAnimations, usePageTransition } from '../../hooks';
import { trackShare } from '../../hooks/useAnalytics';
import { loadArticlesWithContent } from '../../utils/articles';
import '../../styles/article.css';

// ─── Load all articles with full content ─────────────────────────────────────

const ARTICLES = loadArticlesWithContent();

// ─── Block renderer ───────────────────────────────────────────────────────────

const slugify = text =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const renderBlock = (block, i) => {
  const delay = `${(i % 5) * 0.05}s`;
  switch (block.type) {
    case 'lead':
      return (
        <p key={i} className="ap-lead ap-animate" style={{ transitionDelay: delay }}>
          {block.text}
        </p>
      );
    case 'paragraph':
      return (
        <p key={i} className="ap-p ap-animate" style={{ transitionDelay: delay }}>
          {block.text}
        </p>
      );
    case 'heading':
      return (
        <h2
          key={i}
          id={slugify(block.text)}
          className="ap-h2 ap-animate"
          style={{ transitionDelay: delay }}
        >
          {block.text}
        </h2>
      );
    case 'subheading':
      return (
        <h3
          key={i}
          id={slugify(block.text)}
          className="ap-h3 ap-animate"
          style={{ transitionDelay: delay }}
        >
          {block.text}
        </h3>
      );
    case 'callout':
      return (
        <blockquote key={i} className="ap-callout ap-animate" style={{ transitionDelay: delay }}>
          {block.text}
        </blockquote>
      );
    case 'code':
      return (
        <div key={i} className="ap-code-wrap ap-animate" style={{ transitionDelay: delay }}>
          <div className="ap-code-bar">
            <span className="ap-code-lang">{block.lang}</span>
          </div>
          <pre>
            <code className={`language-${block.lang}`}>{block.text}</code>
          </pre>
        </div>
      );
    case 'list':
      return (
        <ul key={i} className="ap-list">
          {block.items.map((item, j) => (
            <li
              key={j}
              className="ap-list-item ap-animate"
              style={{ transitionDelay: `${j * 0.07}s` }}
            >
              {item.label ? <span className="ap-list-label">{item.label}</span> : null} {item.text}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArticlePage() {
  const { slug } = useParams();
  const { scrollToHash } = usePageTransition();
  const ARTICLE = ARTICLES.find(article => article.slug === slug) || ARTICLES[0];
  const [activeSection, setActiveSection] = useState('');
  const [isClicking, setIsClicking] = useState(false);

  const sectionLinks = ARTICLE.content.filter(b => b.type === 'heading');

  useEffect(() => {
    const handleScroll = () => {
      if (isClicking) return;
      const headings = sectionLinks
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
  }, [slug, sectionLinks, isClicking]);

  useScrollAnimations(); // Scroll animations including footer

  // Handle hash fragments on page load (e.g., /articles/slug#section)
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

  if (!ARTICLE) {
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

  const titleWords = ARTICLE.title.split(' ');
  const titleBreak = Math.floor(titleWords.length * 0.55);
  const titleLine1 = titleWords.slice(0, titleBreak).join(' ');
  const titleLine2 = titleWords.slice(titleBreak).join(' ');

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
        title={ARTICLE.seoTitle}
        description={ARTICLE.excerpt || ARTICLE.subtitle}
        path={`/articles/${ARTICLE.slug}`}
        type="article"
        publishedTime={parseDate(ARTICLE.date)}
        author="Arg Software"
        section={ARTICLE.tag}
        image={ARTICLE.image}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: ARTICLE.title,
          description: ARTICLE.excerpt || ARTICLE.subtitle,
          datePublished: parseDate(ARTICLE.date),
          image: ARTICLE.image ? `https://arg.software${ARTICLE.image}` : undefined,
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
            '@id': `https://arg.software/articles/${ARTICLE.slug}`,
          },
        }}
      />

      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          {/* HERO */}
          <SubpageHero
            title={[titleLine1, titleLine2]}
            subtitle={ARTICLE.subtitle}
            breadcrumbs={[
              { label: 'Home', path: '/' },
              { label: 'Articles', path: '/articles' },
              { label: ARTICLE.tag, isTag: true },
            ]}
            size="large"
          />

          {/* ARTICLE BODY */}
          <section className="ap-body background-color-white">
            <div className="ap-body-inner">
              <aside className="ap-sidebar-left">
                {sectionLinks.length > 0 && (
                  <>
                    <div className="ap-sidebar-left-label">In this article</div>
                    {sectionLinks.map((block, i) => (
                      <a
                        key={i}
                        href={`#${slugify(block.text)}`}
                        className={`ap-section-link ${activeSection === slugify(block.text) ? 'is-active' : ''}`}
                        onClick={event => {
                          event.preventDefault();
                          setIsClicking(true);
                          scrollToHash(slugify(block.text), { mobileMenuDelay: 0 });
                          setActiveSection(slugify(block.text));
                          setTimeout(() => setIsClicking(false), 1000);
                        }}
                      >
                        {block.text}
                      </a>
                    ))}
                  </>
                )}
              </aside>

              <article className="ap-content">
                {ARTICLE.content.map((block, i) => renderBlock(block, i))}
              </article>

              <aside className="ap-sidebar-right">
                <span className="ap-sidebar-share-label">Share</span>
                <div className="ap-share-links">
                  <a
                    href={`https://bsky.app/intent/compose?text=${encodeURIComponent(ARTICLE.title + ' ' + ARTICLE.mediumUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button w-inline-block"
                    onClick={() => trackShare('bluesky', slug)}
                  >
                    <div className="text-button_list is-dark">
                      <div className="text-button_text">Share on Bluesky</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text">Post it</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ARTICLE.mediumUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button w-inline-block"
                    onClick={() => trackShare('linkedin', slug)}
                  >
                    <div className="text-button_list is-dark">
                      <div className="text-button_text">Share on LinkedIn</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text">Post it</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(ARTICLE.title)}&url=${encodeURIComponent(ARTICLE.mediumUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button w-inline-block"
                    onClick={() => trackShare('twitter', slug)}
                  >
                    <div className="text-button_list is-dark">
                      <div className="text-button_text">Share on X</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                    <div className="text-button_list is-animated is-dark">
                      <div className="text-button_text">Post it</div>
                      <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                    </div>
                  </a>
                </div>
              </aside>
            </div>
          </section>

          <div className="page-cta-wrapper">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Ready to elevate"
              titleHighlight="your digital experience?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="ap-animate"
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
