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
import AppLink from '../../components/navigation/AppLink';
import {
  Navbar,
  Footer,
  CTASection,
  SectionDivider,
  arrowSvg,
  SEO,
  PageHeader,
} from '../../components';
import { useScrollAnimations, usePageTransition, useTimeOnPage } from '../../hooks';
import { trackBlogPostShare, trackCTA, trackEvent } from '../../hooks/useAnalytics';
import { loadBlogPostsWithContent } from '../../utils/blog';
import { truncateText } from '../../utils/helpers';
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
        <p key={i} className="bp-lead" data-animate="fade-up" style={{ transitionDelay: delay }}>
          {block.text}
        </p>
      );
    case 'paragraph':
      return (
        <p key={i} className="bp-p" data-animate="fade-up" style={{ transitionDelay: delay }}>
          {block.text}
        </p>
      );
    case 'heading':
      return (
        <h2
          key={i}
          id={slugify(block.text)}
          className="bp-h2"
          data-animate="fade-up"
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
          className="bp-h3"
          data-animate="fade-up"
          style={{ transitionDelay: delay }}
        >
          {block.text}
        </h3>
      );
    case 'callout':
      return (
        <blockquote
          key={i}
          className="bp-callout"
          data-animate="fade-up"
          style={{ transitionDelay: delay }}
        >
          {block.text}
        </blockquote>
      );
    case 'code':
      return (
        <div
          key={i}
          className="bp-code-wrap"
          data-animate="fade-up"
          style={{ transitionDelay: delay }}
        >
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
              className="bp-list-item"
              data-animate="fade-up"
              style={{ transitionDelay: `${j * 0.07}s` }}
            >
              {item.label ? <span className="bp-list-label">{item.label}</span> : null} {item.text}
            </li>
          ))}
        </ul>
      );
    case 'image':
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

  const recentPosts = BLOG_POSTS.filter(p => p.slug !== slug)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  const titleWords = BLOG_POST.title.split(' ');
  const titleBreak = Math.floor(titleWords.length * 0.55);
  const titleLine1 = titleWords.slice(0, titleBreak).join(' ');
  const titleLine2 = titleWords.slice(titleBreak).join(' ');
  const articleIntro = truncateText(
    BLOG_POST.intro || BLOG_POST.excerpt || BLOG_POST.subtitle,
    200
  );

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
            title={[titleLine1, titleLine2]}
            subtitle={BLOG_POST.subtitle}
            breadcrumbs={[
              { label: 'Home', path: '/' },
              { label: 'Blog', path: '/blog/' },
              { label: BLOG_POST.tag, isTag: true },
            ]}
            sideLabel="Article intro"
            sideText={articleIntro}
            size="small"
          />

          {/* BLOG_POST BODY */}
          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section className="bp-body background-color-white padding-section-xlarge border-radius-all">
              <div className="bp-body-inner container padding-global">
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
                            trackEvent('blog_toc_click', { section: block.text });
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

                  {/* Subscribe */}
                  <div className="bp-sidebar-section">
                    <span className="bp-sidebar-section-label">Subscribe</span>
                    <div className="bp-share-links">
                      <a
                        href="/rss.xml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-button w-inline-block"
                        onClick={() => trackEvent('blog_subscribe_click', { feed_type: 'rss' })}
                      >
                        <div className="text-button_list is-dark">
                          <div className="text-button_text">RSS Feed</div>
                          <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                        </div>
                        <div className="text-button_list is-animated is-dark">
                          <div className="text-button_text">Subscribe</div>
                          <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                        </div>
                      </a>
                      <a
                        href="/atom.xml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-button w-inline-block"
                        onClick={() => trackEvent('blog_subscribe_click', { feed_type: 'atom' })}
                      >
                        <div className="text-button_list is-dark">
                          <div className="text-button_text">Atom Feed</div>
                          <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                        </div>
                        <div className="text-button_list is-animated is-dark">
                          <div className="text-button_text">Subscribe</div>
                          <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                        </div>
                      </a>
                    </div>
                  </div>

                  {/* Related Articles */}
                  <div className="bp-sidebar-section">
                    <span className="bp-sidebar-section-label">Related Articles</span>
                    {relatedPosts.length > 0 ? (
                      <div className="bp-sidebar-articles">
                        {relatedPosts.map(post => (
                          <AppLink
                            key={post.slug}
                            to={`/blog/${post.slug}/`}
                            className="bp-sidebar-article"
                            trackEvent="blog_related_click"
                            trackData={{ blog_post_slug: post.slug, source_slug: slug }}
                          >
                            {post.image && (
                              <img
                                src={post.image}
                                alt=""
                                className="bp-sidebar-article-thumb"
                                loading="lazy"
                              />
                            )}
                            <div className="bp-sidebar-article-body">
                              <span className="bp-sidebar-article-title">{post.title}</span>
                              <span className="bp-sidebar-article-date">{post.date}</span>
                            </div>
                          </AppLink>
                        ))}
                      </div>
                    ) : (
                      <p className="bp-sidebar-empty">No related articles found.</p>
                    )}
                  </div>

                  {/* Recent Updates */}
                  <div className="bp-sidebar-section">
                    <span className="bp-sidebar-section-label">Recent Updates</span>
                    <div className="bp-sidebar-articles">
                      {recentPosts.map(post => (
                        <AppLink
                          key={post.slug}
                          to={`/blog/${post.slug}/`}
                          className="bp-sidebar-article"
                          trackEvent="blog_recent_click"
                          trackData={{ blog_post_slug: post.slug, source_slug: slug }}
                        >
                          {post.image && (
                            <img
                              src={post.image}
                              alt=""
                              className="bp-sidebar-article-thumb"
                              loading="lazy"
                            />
                          )}
                          <div className="bp-sidebar-article-body">
                            <span className="bp-sidebar-article-title">{post.title}</span>
                            <span className="bp-sidebar-article-date">{post.date}</span>
                          </div>
                        </AppLink>
                      ))}
                    </div>
                  </div>
                </aside>
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
