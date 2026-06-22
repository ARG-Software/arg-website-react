import { startTransition, useEffect, useRef, useState } from 'react';
import AppLink from '../navigation/AppLink';

const VISIBLE_COUNT = 3;
const TRANSITION_DELAY_MS = 360;

export function RelatedArticlesCarousel({ posts = [], sourceSlug }) {
  const [startIndex, setStartIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef(null);

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    []
  );

  if (!posts.length) return null;

  const visibleCount = Math.min(VISIBLE_COUNT, posts.length);
  const maxStartIndex = Math.max(0, posts.length - visibleCount);
  const canGoPrevious = startIndex > 0;
  const canGoNext = startIndex < maxStartIndex;

  const visiblePosts = Array.from({ length: visibleCount }, (_, offset) => {
    return posts[startIndex + offset];
  });

  const navigate = direction => {
    if (isTransitioning) return;

    const nextIndex = Math.min(maxStartIndex, Math.max(0, startIndex + direction * VISIBLE_COUNT));

    if (nextIndex === startIndex) return;

    setIsTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      startTransition(() => {
        setStartIndex(nextIndex);
        setIsTransitioning(false);
      });
    }, TRANSITION_DELAY_MS);
  };

  return (
    <section className="bp-related-carousel" aria-labelledby="bp-related-title">
      <div className="bp-related-carousel__inner">
        <div className="bp-related-carousel__head">
          <div>
            <span className="bp-related-carousel__kicker">Continue reading</span>
            <h2 id="bp-related-title">
              More related articles from <span>ARG</span>
            </h2>
          </div>
        </div>

        <div className="bp-related-carousel__stage">
          {posts.length > visibleCount && (
            <button
              type="button"
              className="bp-related-carousel__arrow bp-related-carousel__arrow--prev"
              aria-label="Show previous related articles"
              disabled={!canGoPrevious}
              onClick={() => navigate(-1)}
            >
              ←
            </button>
          )}

          <div
            className={`bp-related-carousel__track${isTransitioning ? ' is-transitioning' : ''}`}
            aria-live="polite"
          >
            {visiblePosts.map(post => (
              <AppLink
                key={post.slug}
                to={`/blog/${post.slug}/`}
                className="bp-related-card"
                trackEvent="blog_related_click"
                trackData={{
                  blog_post_slug: post.slug,
                  source_slug: sourceSlug,
                  location: 'blog_related_carousel',
                }}
              >
                <span className="bp-related-card__tag">{post.tag}</span>
                <h3>{post.title}</h3>
                <p>{post.subtitle || post.excerpt}</p>
                <span className="bp-related-card__meta">
                  {[post.date, post.readTime].filter(Boolean).join(' - ')}
                </span>
              </AppLink>
            ))}
          </div>

          {posts.length > visibleCount && (
            <button
              type="button"
              className="bp-related-carousel__arrow bp-related-carousel__arrow--next"
              aria-label="Show next related articles"
              disabled={!canGoNext}
              onClick={() => navigate(1)}
            >
              →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
