import { useCallback, useEffect, useState } from 'react';
import { SimpleCarousel } from '@components/navigation/SimpleCarousel';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { getCompanySocialLink } from '@services/linksService';
import { trackOutbound } from '@services/analytics';
import { fetchSocialPosts } from '@services/socialPostsService';
import HOMEPAGE from '../../../data/homePage.json';
import '../../../styles/social.css';

const SOCIAL_PAGE_SIZE = 3;

export function SocialSection({ className = '', content = HOMEPAGE.social }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSocialPosts({ page: 1, pageSize: SOCIAL_PAGE_SIZE })
      .then(result => {
        if (cancelled) return;
        setPosts(result.records || []);
        setPage(result.pagination?.page || 1);
        setHasMore(hasNextPage(result.pagination));
      })
      .catch(() => {
        if (cancelled) return;
        setPosts([]);
        setHasMore(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    const result = await fetchSocialPosts({ page: page + 1, pageSize: SOCIAL_PAGE_SIZE });
    const records = result.records || [];
    setPosts(current => mergePosts(current, records));
    setPage(result.pagination?.page || page + 1);
    setHasMore(records.length > 0 && hasNextPage(result.pagination));
    return records.length > 0;
  }, [page]);

  return (
    <section id="social" className={`section_blog padding-section-medium ${className}`.trim()}>
      <div className="padding-global">
        <div
          className="container-large"
          data-animate-scope
          data-animate-default-preset="fade-up"
          data-animate-default-stagger="120"
        >
          <div className="blog-component">
            <div className="home-section-header" data-animate-order="0">
              <div>
                <h2 className="home-section-title home-section-title--light">{content.title}</h2>
              </div>
              <div className="subtitle_tag-wrapper is--white hide-mobile-landscape">
                <div>{content.eyebrow}</div>
              </div>
            </div>
            <div className="swiper_blog-component" data-animate-order="1">
              {posts.length > 0 ? (
                <SimpleCarousel
                  className="social-feed"
                  items={posts}
                  itemsPerPage={3}
                  tabletItemsPerPage={2}
                  mobileItemsPerPage={1}
                  getItemKey={post => post.id}
                  ariaLabel="Social posts"
                  prevAriaLabel="Show previous social posts"
                  nextAriaLabel="Show next social posts"
                  showIndicator={false}
                  hasMore={hasMore}
                  onNeedMore={loadMore}
                  renderItem={post => <SocialPostCard post={post} />}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialPostCard({ post }) {
  const href = post.externalUrl || getCompanySocialLink('linkedin');

  return (
    <a
      href={href}
      className="social-feed-card"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOutbound(href, post.excerpt, 'homepage_social')}
    >
      <div className="social-feed-card__media">
        {post.coverImageUrl ? (
          <img src={post.coverImageUrl} alt="" />
        ) : (
          <div className="social-feed-card__placeholder">
            <ArgMarkIcon />
          </div>
        )}
      </div>
      <p className="social-feed-card__excerpt">{post.excerpt}</p>
    </a>
  );
}

function hasNextPage(pagination) {
  if (!pagination) return false;
  return pagination.page < pagination.totalPages;
}

function mergePosts(current, records) {
  const seen = new Set(current.map(post => post.id));
  const next = [...current];

  for (const post of records) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    next.push(post);
  }

  return next;
}
