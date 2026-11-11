import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  ANIMATION_PRESETS,
  ATTRIBUTE_PRESETS,
  REVEAL_MAX_STEPS,
  REVEAL_STEP_MS,
} from '../../../animations/attribute-presets';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { AwardCard } from '@components/cards/AwardCard';
import { LinkedInIcon } from '@ui/icons/LinkedInIcon.jsx';
import { getAwards, getCompanySocialLink } from '@services/linksService';
import { trackOutbound } from '@services/analytics';
import { fetchSocialPosts } from '@services/socialPostsService';
import HOMEPAGE from '../../../data/homePage.json';
import '../../../styles/social.css';
import { prefersReducedMotion } from '@utils/helpers';

// Two rows of three on desktop, so the arrows stay in view
const SOCIAL_POST_COUNT = 6;

// Random start or end point of a card in the shuffle
const scatter = range => () => gsap.utils.random(-range, range);

export function SocialSection({ className = '', content = HOMEPAGE.social }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const wallRef = useRef(null);
  const pagesRef = useRef(new Map());
  const busyRef = useRef(false);
  const dealInRef = useRef(false);
  const tweenRef = useRef(null);
  const controlsRef = useRef(null);
  const revealedRef = useRef(false);

  // Most liked posts first; each page is fetched once and kept
  const loadPage = useCallback(pageNumber => {
    const cache = pagesRef.current;
    if (!cache.has(pageNumber)) {
      const request = fetchSocialPosts({
        page: pageNumber,
        pageSize: SOCIAL_POST_COUNT,
        sort: 'likes',
      }).catch(error => {
        cache.delete(pageNumber);
        throw error;
      });
      cache.set(pageNumber, request);
    }
    return cache.get(pageNumber);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadPage(1)
      .then(result => {
        if (cancelled) return;
        setPosts(result.records || []);
        setTotalPages(result.pagination?.totalPages || 1);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });

    return () => {
      cancelled = true;
      tweenRef.current?.kill();
    };
  }, [loadPage]);

  // Fetch the next page ahead, so the arrow responds at once
  useEffect(() => {
    if (page < totalPages) loadPage(page + 1).catch(() => {});
  }, [page, totalPages, loadPage]);

  const hasPosts = posts.length > 0;

  // The posts arrive after useScrollAnimations has collected the page, so the first page
  // reveals here, with the same fade-up preset and step: card by card in reading order,
  // then the arrows
  useEffect(() => {
    const wall = wallRef.current;
    if (!wall || revealedRef.current) return;
    if (prefersReducedMotion()) return;

    const preset = ATTRIBUTE_PRESETS[ANIMATION_PRESETS.fadeUp];
    const cards = [...wall.children].sort((a, b) => {
      const boxA = a.getBoundingClientRect();
      const boxB = b.getBoundingClientRect();
      return boxA.top - boxB.top || boxA.left - boxB.left;
    });
    const elements = controlsRef.current ? [...cards, controlsRef.current] : cards;
    elements.forEach(element => {
      element.style.opacity = preset.initialOpacity;
      element.style.transform = preset.initialTransform;
    });

    let cleanupTimer;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        revealedRef.current = true;
        elements.forEach((element, index) => {
          element.style.transition = preset.transition;
          element.style.transitionDelay = `${Math.min(index, REVEAL_MAX_STEPS) * REVEAL_STEP_MS}ms`;
          element.style.opacity = '';
          element.style.transform = '';
        });
        // Drop the transition afterwards, so it does not fight the shuffle
        cleanupTimer = setTimeout(
          () => elements.forEach(element => element.style.removeProperty('transition')),
          REVEAL_MAX_STEPS * REVEAL_STEP_MS + 1000
        );
      },
      { threshold: 0.1 }
    );
    observer.observe(wall);

    return () => {
      observer.disconnect();
      clearTimeout(cleanupTimer);
    };
  }, [hasPosts]);

  // Shuffle: the current cards scatter out, then the next page's cards are dealt in
  async function goToPage(nextPage) {
    if (busyRef.current || nextPage < 1 || nextPage > totalPages) return;
    busyRef.current = true;

    let result;
    try {
      result = await loadPage(nextPage);
    } catch {
      busyRef.current = false;
      return;
    }

    const showNextPage = () => {
      dealInRef.current = true;
      setPage(nextPage);
      setPosts(result.records || []);
    };

    const cards = wallRef.current?.children;
    if (!cards?.length || prefersReducedMotion()) {
      showNextPage();
      return;
    }

    tweenRef.current = gsap.to(cards, {
      x: scatter(120),
      y: scatter(60),
      rotation: scatter(10),
      scale: 0.9,
      opacity: 0,
      duration: 0.35,
      ease: 'power2.in',
      stagger: { each: 0.03, from: 'random' },
      onComplete: showNextPage,
    });
  }

  useLayoutEffect(() => {
    if (!dealInRef.current) return;
    dealInRef.current = false;

    const cards = wallRef.current?.children;
    if (!cards?.length || prefersReducedMotion()) {
      busyRef.current = false;
      return;
    }

    tweenRef.current = gsap.fromTo(
      cards,
      { x: scatter(120), y: scatter(60), rotation: scatter(10), scale: 0.9, opacity: 0 },
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out',
        stagger: { each: 0.04, from: 'random' },
        clearProps: 'transform,opacity',
        onComplete: () => {
          busyRef.current = false;
        },
      }
    );
  }, [posts]);

  // Only every other post with a cover keeps it, so the wall stays compact
  let coverCount = 0;
  const items = posts.map(post => {
    const showCover = Boolean(post.coverImageUrl) && coverCount++ % 2 === 0;
    return { post, showCover };
  });

  return (
    <section id="social" className={`section_blog padding-section-medium ${className}`.trim()}>
      <div className="padding-global">
        <div className="container-large" data-animate-scope data-animate-default-preset="fade-up">
          <div className="blog-component">
            <div className="home-section-header">
              <div>
                <h2 className="home-section-title home-section-title--light" data-animate-order="0">
                  {content.title}
                </h2>
              </div>
              <div
                className="subtitle_tag-wrapper is--white hide-mobile-landscape"
                data-animate-order="1"
              >
                <div>{content.eyebrow}</div>
              </div>
            </div>
            <ul className="social-awards" aria-label="Launch awards" data-animate-order="2">
              {getAwards().map(award => (
                <li key={award.name}>
                  <AwardCard award={award} location="homepage_social_awards" />
                </li>
              ))}
            </ul>
            {items.length > 0 ? (
              <div className="social-feed">
                {/* Masonry wall: the cards flow down three columns */}
                <ul ref={wallRef} className="social-feed__wall" aria-label="Social posts">
                  {items.map(({ post, showCover }) => (
                    <li key={post.id} className="social-feed__item">
                      <SocialPostCard post={post} showCover={showCover} />
                    </li>
                  ))}
                </ul>
                {totalPages > 1 ? (
                  <div
                    ref={controlsRef}
                    className="simple-carousel__controls social-feed__controls"
                  >
                    <button
                      type="button"
                      className="simple-carousel__arrow"
                      aria-label="Show previous social posts"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="simple-carousel__arrow"
                      aria-label="Show next social posts"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                    >
                      →
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Post card: the company as the author with the date under it, the start of the post
 * text, the cover image when asked for, and the like count. The whole card links to the
 * post.
 */
function SocialPostCard({ post, showCover }) {
  const postHref = post.externalUrl || getCompanySocialLink('linkedin');
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = showCover && !imageFailed;

  return (
    <a
      href={postHref}
      className="social-feed-card"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOutbound(postHref, 'Open the post on LinkedIn', 'homepage_social')}
    >
      <div className="social-feed-card__author">
        <span className="social-feed-card__avatar" aria-hidden="true">
          <ArgMarkIcon />
        </span>
        <span className="social-feed-card__who">
          <span className="social-feed-card__name">
            ARG Software
            <LinkedInIcon className="social-feed-card__network" />
          </span>
          <time className="social-feed-card__date" dateTime={post.publishedAt}>
            {formatPostDate(post.publishedAt)}
          </time>
        </span>
      </div>

      <p className="social-feed-card__text">{post.text || post.excerpt}</p>

      {showImage ? (
        <img
          className="social-feed-card__image"
          src={post.coverImageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : null}

      <p className="social-feed-card__stats">
        <span aria-hidden="true">♥</span> {formatLikeCount(post.likeCount)}
      </p>
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
