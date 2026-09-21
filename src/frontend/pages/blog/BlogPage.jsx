import { useState, useEffect } from 'react';
import AppLink from '@components/navigation/AppLink';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { CTASection } from '@components/layout/CTASection';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { Pagination } from '@ui/navigation/Pagination.jsx';
import { TagFilterPills } from '@ui/filters/TagFilterPills.jsx';
import { Pill } from '@ui/pills/Pill.jsx';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useBlogSearch } from '@hooks/useBlogSearch';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackBlogPostClick, trackCTA, trackEvent } from '@services/analytics';

import { getBlogCollections, getBlogTags, loadBlogPostsMetadata } from '@utils/blog';
import { toShortContentDate } from '@utils/contentDate';
import { BLOG_POSTS_PER_PAGE } from '@constants/config';
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

export default function BlogPage() {
  const [blogPosts] = useState(() => loadBlogPostsMetadata());
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const { searchQuery, setSearchQuery, filteredPosts, debouncedQuery, resultCount } = useBlogSearch(
    blogPosts,
    { selectedTags, selectedCollections }
  );
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(filteredPosts.length / BLOG_POSTS_PER_PAGE);
  const startIdx = (page - 1) * BLOG_POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIdx, startIdx + BLOG_POSTS_PER_PAGE);
  const blogTags = getBlogTags(blogPosts);
  const blogCollections = getBlogCollections(blogPosts);

  const tagCounts = blogPosts.reduce((acc, post) => {
    (post.tags || [post.tag]).filter(Boolean).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const collectionCounts = blogPosts.reduce((acc, post) => {
    if (post.collectionTitle) {
      acc[post.collectionTitle] = (acc[post.collectionTitle] || 0) + 1;
    }
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

  function toggleCollection(collection) {
    const isSelected = selectedCollections.includes(collection);

    setSelectedCollections(currentCollections =>
      currentCollections.includes(collection)
        ? currentCollections.filter(currentCollection => currentCollection !== collection)
        : [...currentCollections, collection]
    );
    trackEvent(isSelected ? 'blog_collection_filter_remove' : 'blog_collection_filter_add', {
      collection,
    });
  }

  function clearCollections() {
    if (selectedCollections.length === 0) return;
    setSelectedCollections([]);
    trackEvent('blog_collection_filter_clear', { previous: selectedCollections });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    if (debouncedQuery) {
      trackEvent('blog_search', { query: debouncedQuery, result_count: resultCount });
    }
  }, [debouncedQuery, resultCount, selectedTags, selectedCollections]);

  function goToPage(p) {
    setPage(p);
    trackEvent('blog_pagination', { page: p, total_pages: totalPages });
    const blogList = document.getElementById('blog-list');
    if (blogList) {
      blogList.scrollIntoView({ behavior: 'smooth' });
    }
  }

  useTimeOnPage('/blog/');
  useScrollAnimations();

  return (
    <>
      <SEO
        title="Blog & Insights"
        description="Technical articles from the ARG Software team on architecture, TypeScript, .NET, DevOps, AI tooling, and the engineering decisions behind reliable software."
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
                <div className="blp-layout">
                  <aside className="blp-sidebar">
                    <div className="blp-search" data-animate-order="0">
                      <span className="blp-search-icon">{searchSvg}</span>
                      <input
                        type="text"
                        className="blp-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        aria-label="Search blog posts"
                      />
                    </div>

                    <TagFilterPills
                      className="blp-topic-filter"
                      layout="list"
                      label="Topics"
                      tags={blogTags}
                      tagCounts={tagCounts}
                      totalCount={blogPosts.length}
                      selectedTags={selectedTags}
                      onToggle={toggleTag}
                      onClear={clearTags}
                      animate={true}
                      animationOrder={1}
                    />

                    <TagFilterPills
                      className="blp-collection-filter"
                      layout="list"
                      label="Collection"
                      tags={blogCollections}
                      tagCounts={collectionCounts}
                      totalCount={blogPosts.length}
                      selectedTags={selectedCollections}
                      onToggle={toggleCollection}
                      onClear={clearCollections}
                      animate={true}
                      animationOrder={2}
                    />
                  </aside>

                  <div className="blp-feed">
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
                            onClick={() =>
                              trackBlogPostClick(article.slug, article.title, 'blog_list')
                            }
                          >
                            {article.image ? (
                              <img
                                src={article.image}
                                alt=""
                                className="blp-row-image"
                                loading={i === 0 ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <span className="blp-row-image" aria-hidden="true" />
                            )}
                            <div className="blp-row-body">
                              <h2 className="blp-row-title">{article.title}</h2>
                              <p className="blp-row-excerpt">{article.subtitle}</p>
                              <div className="blp-row-tags">
                                {(article.tags || [article.tag]).filter(Boolean).map(tag => (
                                  <Pill key={tag} variant="outline" size="xs">
                                    {tag}
                                  </Pill>
                                ))}
                              </div>
                            </div>
                            <div className="blp-row-meta">
                              <span className="blp-row-date">
                                {toShortContentDate(article.date)}
                              </span>
                              <span className="blp-row-author">
                                {article.author || 'ARG Software'}
                              </span>
                              <span className="blp-row-readtime">{article.readTime}</span>
                              {article.collectionTitle ? (
                                <span className="blp-row-collection">
                                  <span className="blp-row-collection-label">Collection</span>
                                  {article.collectionTitle}
                                </span>
                              ) : null}
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
                </div>
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
