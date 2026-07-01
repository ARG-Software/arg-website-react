import { startTransition, useEffect, useRef, useState } from 'react';
import { BaseCard } from '../cards/BaseCard';
import AppLink from '../navigation/AppLink';
import { Pill } from '../pills/Pill';

const MOBILE_BREAKPOINT_PX = 767;
const DESKTOP_VISIBLE_COUNT = 2;
const MOBILE_VISIBLE_COUNT = 1;
const TRANSITION_DELAY_MS = 360;

export function RelatedArticlesCarousel({
  posts = [],
  sourceSlug,
  animate = false,
  animationPreset = 'fade-up',
  animationStagger = 120,
}) {
  const [startIndex, setStartIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const transitionTimer = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const syncMobile = () => setIsMobileView(mediaQuery.matches);
    syncMobile();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', syncMobile);
      return () => mediaQuery.removeEventListener('change', syncMobile);
    }
    mediaQuery.addListener(syncMobile);
    return () => mediaQuery.removeListener(syncMobile);
  }, []);

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    []
  );

  if (!posts.length) return null;

  const visibleCount = Math.min(
    isMobileView ? MOBILE_VISIBLE_COUNT : DESKTOP_VISIBLE_COUNT,
    posts.length
  );
  const maxStartIndex = Math.max(0, posts.length - visibleCount);
  const canGoPrevious = startIndex > 0;
  const canGoNext = startIndex < maxStartIndex;

  const visiblePosts = Array.from({ length: visibleCount }, (_, offset) => {
    return posts[startIndex + offset];
  });

  const navigate = direction => {
    if (isTransitioning) return;

    const nextIndex = Math.min(maxStartIndex, Math.max(0, startIndex + direction * visibleCount));

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

  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': animationPreset,
        'data-animate-default-stagger': String(animationStagger),
      }
    : {};

  const showControls = posts.length > visibleCount;

  return (
    <div
      className="related-articles-carousel"
      aria-labelledby="related-articles-carousel-title"
      {...scopeAttrs}
    >
      <div
        className="related-articles-carousel__head"
        data-animate-order={animate ? '0' : undefined}
      >
        <div className="related-articles-carousel__heading">
          <span className="related-articles-carousel__kicker">Continue reading</span>
          <h2 id="related-articles-carousel-title">
            More from <span>ARG</span>
          </h2>
        </div>
      </div>

      <div
        className={`related-articles-carousel__track${isTransitioning ? ' is-transitioning' : ''}`}
        aria-live="polite"
      >
        {visiblePosts.map((post, index) => (
          <BaseCard
            as={AppLink}
            key={post.slug}
            to={`/blog/${post.slug}/`}
            className="related-article-card"
            variant="glass"
            padding="sm"
            radius="lg"
            hover="none"
            animate={animate}
            animationOrder={index + 2}
            trackEvent="blog_related_click"
            trackData={{
              blog_post_slug: post.slug,
              source_slug: sourceSlug,
              location: 'blog_related_carousel',
            }}
          >
            <Pill className="related-article-card__tag" variant="muted" size="xs">
              {post.tag}
            </Pill>
            <h3>{post.title}</h3>
            <p>{post.subtitle}</p>
            <span className="related-article-card__meta">
              {[post.date, post.readTime].filter(Boolean).join(' · ')}
            </span>
          </BaseCard>
        ))}
      </div>

      {showControls && (
        <div
          className="related-articles-carousel__controls"
          data-animate-order={animate ? '1' : undefined}
        >
          <button
            type="button"
            className="related-articles-carousel__arrow related-articles-carousel__arrow--prev"
            aria-label="Show previous related articles"
            disabled={!canGoPrevious}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="related-articles-carousel__arrow related-articles-carousel__arrow--next"
            aria-label="Show next related articles"
            disabled={!canGoNext}
            onClick={() => navigate(1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
