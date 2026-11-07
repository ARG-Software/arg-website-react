import { useCallback, useEffect, useRef, useState } from 'react';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { LinkedInIcon } from '@ui/icons/LinkedInIcon.jsx';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { getCompanySocialLink } from '@services/linksService';
import { trackOutbound } from '@services/analytics';
import { fetchSocialPosts } from '@services/socialPostsService';
import HOMEPAGE from '../../../data/homePage.json';
import '../../../styles/social.css';

// Enough cards to fill a wide screen; more load as the track nears its end
const SOCIAL_PAGE_SIZE = 6;

export function SocialSection({ className = '', content = HOMEPAGE.social }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: true });
  const trackRef = useRef(null);
  const loadingRef = useRef(false);

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
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const result = await fetchSocialPosts({ page: page + 1, pageSize: SOCIAL_PAGE_SIZE });
      const records = result.records || [];
      setPosts(current => mergePosts(current, records));
      setPage(result.pagination?.page || page + 1);
      setHasMore(records.length > 0 && hasNextPage(result.pagination));
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
    }
  }, [page]);

  // Tracks whether the row can move either way, and loads the next page once less
  // than a screen of cards is left to the right
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    setEdges({ start: track.scrollLeft <= 1, end: track.scrollLeft >= maxScroll - 1 });
    if (hasMore && track.scrollLeft >= maxScroll - track.clientWidth) loadMore();
  }, [hasMore, loadMore]);

  // Re-measure once new cards are in the row
  useEffect(() => {
    const frame = requestAnimationFrame(handleScroll);
    return () => cancelAnimationFrame(frame);
  }, [posts, handleScroll]);

  function scrollByCard(direction) {
    const track = trackRef.current;
    const card = track?.firstElementChild;
    if (!card) return;

    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <section id="social" className={`section_blog padding-section-medium ${className}`.trim()}>
      <div className="padding-global">
        <div className="container-large" data-animate-scope data-animate-default-preset="fade-up">
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
                <div className="social-feed">
                  {/* Scrolls sideways (trackpad, touch or the arrows) and runs off the right edge */}
                  <ul
                    ref={trackRef}
                    className="social-feed__track"
                    aria-label="Social posts"
                    onScroll={handleScroll}
                  >
                    {posts.map(post => (
                      <li key={post.id} className="social-feed__item">
                        <SocialPostCard post={post} />
                      </li>
                    ))}
                  </ul>
                  <div className="simple-carousel__controls social-feed__controls">
                    <button
                      type="button"
                      className="simple-carousel__arrow"
                      aria-label="Show previous social posts"
                      disabled={edges.start}
                      onClick={() => scrollByCard(-1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="simple-carousel__arrow"
                      aria-label="Show next social posts"
                      disabled={edges.end && !hasMore}
                      onClick={() => scrollByCard(1)}
                    >
                      →
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Tall image card: the post's cover fills the card, the date and post text sit on top
 * in white, and a round arrow sits at the bottom right. The whole card links to the post.
 */
function SocialPostCard({ post }) {
  const postHref = post.externalUrl || getCompanySocialLink('linkedin');
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(post.coverImageUrl) && !imageFailed;

  return (
    <a
      href={postHref}
      className="social-feed-card"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOutbound(postHref, 'Open the post on LinkedIn', 'homepage_social')}
    >
      {/* The cover is 16:9: shown whole at the bottom over a blurred copy filling the
          card, instead of being enlarged and cropped to the card's tall shape */}
      {showImage ? (
        <>
          <img
            className="social-feed-card__backdrop"
            src={post.coverImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <img
            className="social-feed-card__image"
            src={post.coverImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        </>
      ) : (
        <div className="social-feed-card__placeholder" aria-hidden="true">
          <ArgMarkIcon />
        </div>
      )}

      <div className="social-feed-card__head">
        <p className="social-feed-card__label">
          <LinkedInIcon />
          <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{formatLikeCount(post.likeCount)}</span>
        </p>
        <p className="social-feed-card__excerpt">{post.excerpt}</p>
      </div>

      <span className="social-feed-card__open" aria-hidden="true">
        <span className="arrow_icon-embed">{arrowSvg}</span>
      </span>
    </a>
  );
}

function formatPostDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatLikeCount(value) {
  const likes = Number(value || 0);

  return likes === 1 ? '1 like' : `${likes} likes`;
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
