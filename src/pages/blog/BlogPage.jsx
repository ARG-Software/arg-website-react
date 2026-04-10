import { useState, useEffect, useRef, useMemo } from 'react';
import AppLink from '../../components/links/AppLink';
import { Navbar, Footer, CTASection, SectionDivider, arrowSvg, SEO } from '../../components';
import { SubpageHero } from '../../components/hero/SubpageHero';
import { useScrollAnimations } from '../../hooks';
import { trackBlogPostClick } from '../../hooks/useAnalytics';

import { loadBlogPostsMetadata } from '../../utils/blog';
import { BLOG_POSTS_PER_PAGE } from '../../constants';
import '../../styles/blog.css';

const searchSvg = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BlogPage() {
  const [blogPosts] = useState(() => loadBlogPostsMetadata());
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 200);
  const [page, setPage] = useState(1);

  const filteredPosts = useMemo(() => {
    if (!debouncedQuery.trim()) return blogPosts;
    const q = debouncedQuery.toLowerCase();
    return blogPosts.filter(
      post =>
        post.title.toLowerCase().includes(q) ||
        post.tag.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q)
    );
  }, [blogPosts, debouncedQuery]);

  const totalPages = Math.ceil(filteredPosts.length / BLOG_POSTS_PER_PAGE);
  const startIdx = (page - 1) * BLOG_POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIdx, startIdx + BLOG_POSTS_PER_PAGE);

  const listRef = useRef(null);

  // Reset to page 1 when search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedQuery]);

  // Re-observe new article rows whenever the page changes
  useEffect(() => {
    if (!listRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('blp-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    listRef.current.querySelectorAll('.blp-animate:not(.blp-visible)').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [page, filteredPosts.length]);

  function goToPage(p) {
    setPage(p);
    const blogList = document.getElementById('blog-list');
    if (blogList) {
      blogList.scrollIntoView({ behavior: 'smooth' });
    }
  }

  useScrollAnimations(); // Scroll animations including footer

  return (
    <>
      <SEO
        title="Blog & Insights"
        description="Technical blog posts, engineering insights, and best practices from the Arg Software team. Deep dives into architecture, TypeScript, .NET, DevOps, and more."
        path="/blog/"
      />

      <div className="page-wrapper w-clearfix">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <SubpageHero title={['Blog from', 'the ARG team']} size="small" />

          <section id="blog-list" className="blp-section background-color-white">
            <div className="blp-inner" ref={listRef}>
              <div className="blp-header-row">
                <span className="blp-count blp-animate">
                  {filteredPosts.length} blog post{filteredPosts.length !== 1 ? 's' : ''}
                  {debouncedQuery && ` matching "${debouncedQuery}"`}
                </span>
                <div className="blp-search blp-animate">
                  <span className="blp-search-icon">{searchSvg}</span>
                  <input
                    type="text"
                    className="blp-search-input"
                    placeholder="Search by title, tag..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search blog posts"
                  />
                </div>
              </div>

              {filteredPosts.length === 0 ? (
                <p className="blp-empty blp-animate">
                  {blogPosts.length === 0
                    ? 'No blog posts yet — check back soon.'
                    : `No posts found matching "${debouncedQuery}"`}
                </p>
              ) : (
                <>
                  {paginatedPosts.map((article, i) => (
                    <AppLink
                      key={article.slug}
                      to={`/blog/${article.slug}/`}
                      className="blp-article-row blp-animate"
                      style={{ transitionDelay: `${i * 0.07}s` }}
                      onClick={() => trackBlogPostClick(article.slug, article.title, 'blog_list')}
                    >
                      <div className="blp-row-meta">
                        <span className="blp-row-tag">{article.tag}</span>
                        {article.image && (
                          <img
                            src={article.image}
                            alt=""
                            className="blp-row-image"
                            loading={i === 0 ? 'eager' : 'lazy'}
                            fetchPriority={i === 0 ? 'high' : undefined}
                          />
                        )}
                      </div>
                      <div className="blp-row-body">
                        <h2 className="blp-row-title">{article.title}</h2>
                        <p className="blp-row-excerpt">{article.excerpt}</p>
                      </div>
                      <div className="blp-row-action">
                        <span className="blp-row-readtime">{article.readTime}</span>
                        <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                      </div>
                    </AppLink>
                  ))}

                  {totalPages > 1 && (
                    <nav className="blp-pagination" aria-label="Blog pagination">
                      <button
                        className="blp-pagination-arrow"
                        onClick={() => goToPage(page - 1)}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        {arrowSvg}
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          className={`blp-pagination-num${p === page ? ' is-active' : ''}`}
                          onClick={() => goToPage(p)}
                          aria-label={`Page ${p}`}
                          aria-current={p === page ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        className="blp-pagination-arrow blp-pagination-arrow--next"
                        onClick={() => goToPage(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        {arrowSvg}
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </section>

          <div className="page-cta-wrapper">
            <SectionDivider variant="light" hideOnMobile={true} />
            <CTASection
              title="Ready to elevate"
              titleHighlight="your digital experience?"
              buttonTextNotHover="Book a Meeting"
              buttonTextHover="Let's meet"
              animationClass="blp-animate"
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
