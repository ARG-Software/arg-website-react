import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import hljs from 'highlight.js';
hljs.registerAliases(['promql'], { languageName: 'sql' });
import { Navbar, Footer, CTASection, SectionDivider, arrowSvg, SEO } from '../../components';
import { SubpageHero } from '../../components/hero/SubpageHero';
import { useScrollAnimations, usePageTransition } from '../../hooks';
import { trackBlogPostShare } from '../../hooks/useAnalytics';
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

const renderBlock = (block, i) => {
  const delay = `${(i % 5) * 0.05}s`;
  switch (block.type) {
    case 'lead':
      return (
        <p key={i} className="bp-lead bp-animate" style={{ transitionDelay: delay }}>
          {block.text}
        </p>
      );
    case 'paragraph':
      return (
        <p key={i} className="bp-p bp-animate" style={{ transitionDelay: delay }}>
          {block.text}
        </p>
      );
    case 'heading':
      return (
        <h2
          key={i}
          id={slugify(block.text)}
          className="bp-h2 bp-animate"
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
          className="bp-h3 bp-animate"
          style={{ transitionDelay: delay }}
        >
          {block.text}
        </h3>
      );
    case 'callout':
      return (
        <blockquote key={i} className="bp-callout bp-animate" style={{ transitionDelay: delay }}>
          {block.text}
        </blockquote>
      );
    case 'code':
      return (
        <div key={i} className="bp-code-wrap bp-animate" style={{ transitionDelay: delay }}>
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
            <li
              key={j}
              className="bp-list-item bp-animate"
              style={{ transitionDelay: `${j * 0.07}s` }}
            >
              {item.label ? <span className="bp-list-label">{item.label}</span> : null} {item.text}
            </li>
          ))}
        </ul>
      );
    case 'image':
      // return (
      //   <figure key={i} className="bp-figure bp-animate" style={{ transitionDelay: delay }}>
      //     <img src={block.src} alt={block.alt} className="bp-image" loading="lazy" />
      //   </figure>
      // );
      break;
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

  const sectionLinks = BLOG_POST.content.filter(b => b.type === 'heading');

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

  const titleWords = BLOG_POST.title.split(' ');
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
        title={BLOG_POST.seoTitle}
        description={BLOG_POST.excerpt || BLOG_POST.subtitle}
        path={`/blog/${BLOG_POST.slug}/`}
        type="article"
        publishedTime={parseDate(BLOG_POST.date)}
        author="Arg Software"
        section={BLOG_POST.tag}
        image={BLOG_POST.image}
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
          <SubpageHero
            title={[titleLine1, titleLine2]}
            subtitle={BLOG_POST.subtitle}
            breadcrumbs={[
              { label: 'Home', path: '/' },
              { label: 'Blog', path: '/blog/' },
              { label: BLOG_POST.tag, isTag: true },
            ]}
            size="large"
          />

          {/* BLOG_POST BODY */}
          <section className="bp-body background-color-white">
            <div className="bp-body-inner">
              <aside className="bp-sidebar-left">
                {sectionLinks.length > 0 && (
                  <>
                    <div className="bp-sidebar-left-label">In this article</div>
                    {sectionLinks.map((block, i) => (
                      <a
                        key={i}
                        href={`#${slugify(block.text)}`}
                        className={`bp-section-link ${activeSection === slugify(block.text) ? 'is-active' : ''}`}
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

              <article className="bp-content">
                {BLOG_POST.content.map((block, i) => renderBlock(block, i))}
              </article>

              <aside className="bp-sidebar-right">
                <span className="bp-sidebar-share-label">Share</span>
                <div className="bp-share-links">
                  <a
                    href={`https://bsky.app/intent/compose?text=${encodeURIComponent(BLOG_POST.title + ' ' + BLOG_POST.mediumUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button w-inline-block"
                    onClick={() => trackBlogPostShare('bluesky', slug)}
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
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(BLOG_POST.mediumUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button w-inline-block"
                    onClick={() => trackBlogPostShare('linkedin', slug)}
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
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(BLOG_POST.title)}&url=${encodeURIComponent(BLOG_POST.mediumUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button w-inline-block"
                    onClick={() => trackBlogPostShare('twitter', slug)}
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
              animationClass="bp-animate"
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
