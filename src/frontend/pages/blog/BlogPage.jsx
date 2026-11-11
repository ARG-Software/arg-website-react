import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import AppLink from '@components/navigation/AppLink';
import { Navbar } from '@components/navigation/Navbar';
import { Footer } from '@components/layout/Footer';
import { ContactSection } from '@components/layout/ContactSection';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { SEO } from '@components/seo/SEO';
import { PageHeader } from '@components/headers/PageHeader';
import { BlogSidebar } from '@components/navigation/BlogSidebar';
import { Pagination } from '@ui/navigation/Pagination.jsx';
import { Pill } from '@ui/pills/Pill.jsx';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { useScrollAnimations } from '@hooks/useScrollAnimations';
import { useBlogSearch } from '@hooks/useBlogSearch';
import { useTimeOnPage } from '@hooks/useTimeOnPage';
import { trackBlogPostClick, trackCTA, trackEvent } from '@services/analytics';

import {
  getBlogCollections,
  getBlogTags,
  getBlogTagColor,
  loadBlogPostsMetadata,
  sortByCollectionPart,
} from '@utils/blog';
import { getCoverSrcSet } from '@utils/blog/coverSrcSet';
import { toShortContentDate } from '@utils/contentDate';
import { BLOG_POSTS_PER_PAGE } from '@constants/config';
import { LenisContext } from '@providers/LenisProvider';
import HOMEPAGE from '../../data/homePage.json';
import '../../styles/blog.css';

const HERO_TOPIC_COUNT = 6;
// Author avatars come from the team photos on the homepage
const AUTHOR_AVATARS = Object.fromEntries(
  HOMEPAGE.team.members.map(member => [member.name, member.imgSrc.replace('-1024.', '-360.')])
);
// Space left above the list when a filter brings it back into view, in rem so it follows the root font size
const LIST_TOP_GAP_REM = 1.5;

export default function BlogPage() {
  const [blogPosts] = useState(() => loadBlogPostsMetadata());
  // One selection across topics and collections; "All" by default
  const [active, setActive] = useState({ type: 'all' });
  const selectedTags = useMemo(() => (active.type === 'topic' ? [active.value] : []), [active]);
  const selectedCollections = useMemo(
    () => (active.type === 'collection' ? [active.value] : []),
    [active]
  );
  const { searchQuery, setSearchQuery, filteredPosts, debouncedQuery, resultCount } = useBlogSearch(
    blogPosts,
    { selectedTags, selectedCollections }
  );
  const [page, setPage] = useState(1);
  const lenis = useContext(LenisContext);
  const layoutRef = useRef(null);
  const returnToListTop = useRef(false);

  // A collection reads in its own order, part 1 first
  const listedPosts =
    active.type === 'collection' ? [...filteredPosts].sort(sortByCollectionPart) : filteredPosts;
  // The latest article is featured above the grid while nothing is filtered, and the grid
  // pages through the rest. A filtered list is all grid
  const featuredPost = active.type === 'all' && !debouncedQuery ? listedPosts[0] : null;
  const gridPosts = featuredPost ? listedPosts.slice(1) : listedPosts;
  const totalPages = Math.ceil(gridPosts.length / BLOG_POSTS_PER_PAGE);
  const startIdx = (page - 1) * BLOG_POSTS_PER_PAGE;
  const paginatedPosts = gridPosts.slice(startIdx, startIdx + BLOG_POSTS_PER_PAGE);
  const shownPosts =
    featuredPost && page === 1 ? [featuredPost, ...paginatedPosts] : paginatedPosts;

  const tagCounts = blogPosts.reduce((acc, post) => {
    (post.tags || [post.tag]).filter(Boolean).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});
  const topics = getBlogTags(blogPosts).map(name => ({ name, count: tagCounts[name] }));

  const heroTopics = Object.keys(tagCounts)
    .sort((a, b) => tagCounts[b] - tagCounts[a])
    .slice(0, HERO_TOPIC_COUNT);

  const collections = getBlogCollections(blogPosts).map(title => {
    const posts = blogPosts.filter(post => post.collectionTitle === title);
    const minutes = posts.reduce((sum, post) => sum + (Number.parseInt(post.readTime, 10) || 0), 0);
    return { title, count: posts.length, minutes };
  });
  const activeCollection = collections.find(
    collection => active.type === 'collection' && collection.title === active.value
  );

  // A filter changes how long the list is, and a shorter page clamps the scroll somewhere
  // arbitrary. If the reader is already inside the list, put them back at its top instead.
  function keepListTop() {
    returnToListTop.current = layoutRef.current?.getBoundingClientRect().top < 0;
  }

  useLayoutEffect(() => {
    if (!returnToListTop.current) return;
    returnToListTop.current = false;
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const top =
      window.scrollY +
      layoutRef.current.getBoundingClientRect().top -
      LIST_TOP_GAP_REM * rootFontSize;
    // Lenis caches the page height; re-measure so a longer list is not clamped to the old one
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(top, { immediate: true, force: true });
    } else {
      window.scrollTo(0, top);
    }
  }, [active, debouncedQuery, lenis]);

  function search(query) {
    keepListTop();
    setSearchQuery(query);
  }

  function select(next) {
    keepListTop();
    setActive(next);
    if (next.type === 'topic') trackEvent('blog_topic_select', { tag: next.value });
    if (next.type === 'collection')
      trackEvent('blog_collection_select', { collection: next.value });
    if (next.type === 'all') trackEvent('blog_filter_clear', { previous: active.value || 'all' });
  }

  // Hero topic links show only that topic; the link's #blog-list href scrolls to the list.
  function showTopic(tag) {
    setActive({ type: 'topic', value: tag });
    trackEvent('blog_hero_topic_click', { tag });
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
        pageType="CollectionPage"
        breadcrumbs={[
          { label: 'Home', path: '/' },
          { label: 'Blog', path: '/blog/' },
        ]}
        rss
        atom
      />

      <div className="page-wrapper">
        <Navbar position="absolute" isHomePage={true} />

        <main id="main" className="main-wrapper">
          <PageHeader
            title={['The thinking', 'behind the doing.']}
            subtitle="Technical essays, engineering deep dives, and field notes from the systems we build and the tradeoffs we make."
            breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Blog' }]}
            sideLabel="Topics"
            sideItems={heroTopics.map(tag => ({
              label: tag,
              href: '#blog-list',
              onClick: () => showTopic(tag),
            }))}
            size="small"
          />

          <div data-animate-scope data-animate-default-preset="fade-up">
            <section
              id="blog-list"
              className="blp-section background-color-white padding-section-large border-radius-all"
            >
              <div className="blp-inner container padding-global">
                <div className="blp-layout" ref={layoutRef}>
                  <aside className="blp-sidebar" data-animate-order="0">
                    <BlogSidebar
                      searchQuery={searchQuery}
                      onSearchChange={search}
                      topics={topics}
                      totalCount={blogPosts.length}
                      collections={collections}
                      active={active}
                      onSelect={select}
                    />
                  </aside>

                  <div className="blp-feed">
                    {activeCollection && (
                      <header className="blp-collection-head">
                        <span className="blp-collection-head-label">Collection</span>
                        <h2 className="blp-collection-head-title">{activeCollection.title}</h2>
                        <span className="blp-collection-head-meta">
                          {activeCollection.count} articles · {activeCollection.minutes} min · in
                          reading order
                        </span>
                      </header>
                    )}
                    {listedPosts.length === 0 ? (
                      <p className="blp-empty">
                        {blogPosts.length === 0
                          ? 'No blog posts yet — check back soon.'
                          : 'No articles found for those filters.'}
                      </p>
                    ) : (
                      <div className="blp-grid">
                        {shownPosts.map((article, i) => {
                          const featured = article === featuredPost;
                          const tags = (article.tags || [article.tag]).filter(Boolean);
                          const author = article.author || 'ARG Software';
                          const avatar = AUTHOR_AVATARS[author];

                          return (
                            <AppLink
                              key={article.slug}
                              to={`/blog/${article.slug}/`}
                              className={`blp-card${featured ? ' blp-card--featured' : ''}`}
                              data-animate-order={i + 3}
                              onClick={() =>
                                trackBlogPostClick(article.slug, article.title, 'blog_list')
                              }
                            >
                              {article.image ? (
                                <img
                                  src={article.image}
                                  srcSet={getCoverSrcSet(article.image)}
                                  sizes={
                                    featured
                                      ? '(max-width: 48rem) 100vw, 30rem'
                                      : '(max-width: 48rem) 100vw, 25rem'
                                  }
                                  alt=""
                                  className="blp-card-image"
                                  loading={i === 0 ? 'eager' : 'lazy'}
                                />
                              ) : (
                                <span className="blp-card-image" aria-hidden="true" />
                              )}
                              <div className="blp-card-body">
                                <div className="blp-card-badges">
                                  {featured ? (
                                    <span className="blp-badge blp-badge--featured">Featured</span>
                                  ) : null}
                                  {tags[0] ? (
                                    <Pill
                                      variant="custom"
                                      size="xs"
                                      style={getBlogTagColor(tags[0], 'light')}
                                    >
                                      {tags[0]}
                                    </Pill>
                                  ) : null}
                                  {article.collectionTitle ? (
                                    <span className="blp-badge blp-badge--collection">
                                      {article.collectionTitle}
                                    </span>
                                  ) : null}
                                </div>
                                <h2 className="blp-card-title">{article.title}</h2>
                                <p className="blp-card-excerpt">{article.subtitle}</p>
                                <div className="blp-card-footer">
                                  <span className="blp-card-author">
                                    {avatar ? (
                                      <img
                                        src={avatar}
                                        alt=""
                                        className="blp-card-avatar"
                                        // The -360 team photos are square
                                        width={360}
                                        height={360}
                                        loading="lazy"
                                      />
                                    ) : (
                                      <span className="blp-card-avatar" aria-hidden="true">
                                        <ArgMarkIcon />
                                      </span>
                                    )}
                                    <span className="blp-card-who">
                                      <span className="blp-card-name">{author}</span>
                                      <span className="blp-card-meta">
                                        {toShortContentDate(article.date)} · {article.readTime}
                                      </span>
                                    </span>
                                  </span>
                                  <span className="blp-card-arrow" aria-hidden="true">
                                    {arrowSvg}
                                  </span>
                                </div>
                              </div>
                            </AppLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Below the layout so the sticky sidebar stops at the last article */}
                {listedPosts.length > 0 && totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    arrowIcon={arrowSvg}
                    ariaLabel="Blog pagination"
                    animateOrder={shownPosts.length + 3}
                  />
                )}
              </div>
            </section>
          </div>

          <ContactSection
            title="Stop searching."
            titleHighlight="Start building."
            buttonTextNotHover="Book a Meeting"
            buttonTextHover="Let's meet"
            onPrimaryClick={() => trackCTA('book_meeting', 'cta_section')}
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
