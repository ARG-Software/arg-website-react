import { useState, useEffect } from 'react';
import AppLink from '../../components/navigation/AppLink';
import {
  Navbar,
  Footer,
  CTASection,
  SectionDivider,
  arrowSvg,
  SEO,
  PageHeader,
  Pagination,
  TagFilterPills,
} from '../../components';
import { useScrollAnimations, useBlogSearch, useTimeOnPage } from '../../hooks';
import { trackBlogPostClick, trackCTA, trackEvent } from '../../utils/analytics';

import { getBlogTags, loadBlogPostsMetadata } from '../../utils/blog';
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function BlogPage() {
  const [blogPosts] = useState(() => loadBlogPostsMetadata());
  const [selectedTags, setSelectedTags] = useState([]);
  const { searchQuery, setSearchQuery, filteredPosts, debouncedQuery, resultCount } = useBlogSearch(
    blogPosts,
    { selectedTags }
  );
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(filteredPosts.length / BLOG_POSTS_PER_PAGE);
  const startIdx = (page - 1) * BLOG_POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIdx, startIdx + BLOG_POSTS_PER_PAGE);
  const blogTags = getBlogTags(blogPosts);

  const tagCounts = blogPosts.reduce((acc, post) => {
    if (post.tag) acc[post.tag] = (acc[post.tag] || 0) + 1;
    return acc;
  }, {});

  function toggleTag(tag) {
    const isSelected = selectedTags.includes(tag);

    setSelectedTags(currentTags =>
      currentTags.includes(tag)
        ? currentTags.filter(currentTag => currentTag !== tag)
        : [...currentTags, tag]
    );
    trackEvent(isSelected ? 'blog_tag_filter_remove' : 'blog_tag_filter_add', { tag });
  }

  function clearTags() {
    if (selectedTags.length === 0) return;
    setSelectedTags([]);
    trackEvent('blog_tag_filter_clear', { previous: selectedTags });
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    if (debouncedQuery) {
      trackEvent('blog_search', { query: debouncedQuery, result_count: resultCount });
    }
  }, [debouncedQuery, resultCount, selectedTags]);

  function goToPage(p) {
    setPage(p);
    trackEvent('blog_pagination', { page: p, total_pages: totalPages });
    const blogList = document.getElementById('blog-list');
    if (blogList) {
      blogList.scrollIntoView({ behavior: 'smooth' });
    }
  }

  useTimeOnPage('/blog/');
  useScrollAnimations(); // Scroll animations including footer

  return (
    <>
      <SEO
        title="Blog & Insights"
        description="Technical articles from the Arg Software team on architecture, TypeScript, .NET, DevOps, AI tooling, and the engineering decisions behind reliable software."
        path="/blog/"
        rss
        atom
      />

      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main className="main-wrapper">
          <PageHeader
            title={['The thinking', 'behind the doing.']}
            subtitle="Technical essays, engineering deep dives, and field notes from the systems we build and the tradeoffs we make."
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Blog' }]}
            sideLabel="What we write about"
            sideText="Pragmatic architecture, TypeScript, .NET, DevOps, AI tooling, team practices, and the engineering decisions behind reliable software."
            size="small"
          />

          <div
            data-animate-scope
            data-animate-default-preset="fade-up"
            data-animate-default-stagger="150"
          >
            <section
              id="blog-list"
              className="blp-section background-color-white padding-section-large border-radius-all"
            >
              <div className="blp-inner container padding-global">
                <div className="blp-filter-bar">
                  <div className="blp-search" data-animate-order="0">
                    <span className="blp-search-icon">{searchSvg}</span>
                    <input
                      type="text"
                      className="blp-search-input"
                      placeholder="Search by title or topic"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      aria-label="Search blog posts"
                    />
                  </div>

                  <TagFilterPills
                    className="blp-topic-filter"
                    label="Filter by topic"
                    tags={blogTags}
                    tagCounts={tagCounts}
                    totalCount={blogPosts.length}
                    selectedTags={selectedTags}
                    onToggle={toggleTag}
                    onClear={clearTags}
                    animate={true}
                    animationOrder={1}
                  />
                </div>

                {filteredPosts.length === 0 ? (
                  <p className="blp-empty">
                    {blogPosts.length === 0
                      ? 'No blog posts yet — check back soon.'
                      : 'No articles found for those filters.'}
                  </p>
                ) : (
                  <>
                    {paginatedPosts.map((article, i) => (
                      <AppLink
                        key={article.slug}
                        to={`/blog/${article.slug}/`}
                        className="blp-article-row"
                        data-animate-order={i + 3}
                        style={{ transitionDelay: `${i * 0.07}s` }}
                        onClick={() => trackBlogPostClick(article.slug, article.title, 'blog_list')}
                      >
                        <div className="blp-row-meta">
                          {article.image && (
                            <img
                              src={article.image}
                              alt=""
                              className="blp-row-image"
                              loading={i === 0 ? 'eager' : 'lazy'}
                            />
                          )}
                          <span className="blp-row-tag">{article.tag}</span>
                          <span className="blp-row-date">{article.date}</span>
                        </div>
                        <div className="blp-row-body">
                          <h2 className="blp-row-title">{article.title}</h2>
                          <p className="blp-row-excerpt">{article.subtitle}</p>
                        </div>
                        <div className="blp-row-action">
                          <span className="blp-row-readtime">{article.readTime}</span>
                          <div className="arrow_icon-embed">{arrowSvg}</div>
                        </div>
                      </AppLink>
                    ))}

                    {totalPages > 1 && (
                      <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                        arrowIcon={arrowSvg}
                        ariaLabel="Blog pagination"
                        animateOrder={paginatedPosts.length + 3}
                      />
                    )}
                  </>
                )}
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
              animationClass="blp-animate"
              animate={true}
              onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
            />
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
