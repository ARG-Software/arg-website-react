import { useEffect, useRef } from 'react';
import '../../../styles/elfsight.css';

const ELFSIGHT_APP_SELECTOR = '.elfsight-app-aafa18f0-0e7e-4ff0-a44e-5c047f44429b';
const ELFSIGHT_CARD_SELECTOR =
  '[class*="CardContainer"], .eapps-social-feed-posts-item, .eapps-instagram-feed-posts-grid-item';
const ELFSIGHT_MEDIA_SELECTOR = 'img, video';

function getMediaScore(media) {
  const rect = media.getBoundingClientRect();
  const renderedArea = rect.width * rect.height;
  if (renderedArea > 0) return renderedArea;

  if (media instanceof HTMLImageElement) {
    return media.naturalWidth * media.naturalHeight;
  }

  if (media instanceof HTMLVideoElement) {
    return media.videoWidth * media.videoHeight;
  }

  return 0;
}

function isLargeFeedMedia(media) {
  if (media instanceof HTMLVideoElement) return true;

  if (!(media instanceof HTMLImageElement)) return false;

  const src = media.currentSrc || media.src || '';
  const className = String(media.className || '');
  if (/\.svg($|\?)/i.test(src)) return false;
  if (/avatar|profile|logo|icon|emoji/i.test(className)) return false;

  const score = getMediaScore(media);
  return score === 0 || score >= 14400;
}

function hasMeaningfulText(element) {
  return element.textContent.trim().length > 0;
}

function markMediaFrame(media, card) {
  let element = media.parentElement;

  while (element && element !== card && !hasMeaningfulText(element)) {
    element.classList.add('arg-elfsight-media-frame');
    element = element.parentElement;
  }
}

function normalizeElfsightFeed(container) {
  container.classList.add('arg-elfsight-feed');

  container.querySelectorAll(ELFSIGHT_CARD_SELECTOR).forEach(card => {
    card.classList.add('arg-elfsight-card');

    const media = Array.from(card.querySelectorAll(ELFSIGHT_MEDIA_SELECTOR))
      .filter(isLargeFeedMedia)
      .sort((a, b) => getMediaScore(b) - getMediaScore(a))[0];

    if (!media) return;

    media.classList.add('arg-elfsight-media-element');
    markMediaFrame(media, card);

    if (media instanceof HTMLImageElement && !media.dataset.argElfsightLoadObserved) {
      media.dataset.argElfsightLoadObserved = 'true';
      media.addEventListener('load', () => normalizeElfsightFeed(container), { once: true });
    }
  });
}

export function SocialSection({ className = '' }) {
  const observersRef = useRef([]);

  const handleLoadMoreClick = e => {
    e.preventDefault();

    // Try multiple selectors to find the plugin's hidden button
    const selectors = [
      '.es-load-more-button-container > button',
      '.eapps-social-feed-posts-load-more-button',
      '[class*="load-more"] button',
      'button[class*="LoadMore"]',
    ];

    for (const selector of selectors) {
      const pluginButton = document.querySelector(selector);
      if (pluginButton) {
        pluginButton.click();
        return;
      }
    }

    console.warn('Could not find plugin load more button');
  };

  useEffect(() => {
    const container = document.querySelector(ELFSIGHT_APP_SELECTOR);
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (document.querySelector('script[src*="elfsight"]')) return;
        const script = document.createElement('script');
        script.src = 'https://static.elfsight.com/platform/platform.js';
        script.async = true;
        document.body.appendChild(script);
      },
      { rootMargin: '1800px' }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Elfsight feed animations (moved from useScrollAnimations)
  useEffect(() => {
    const elfsightContainer = document.querySelector(ELFSIGHT_APP_SELECTOR);
    const swiperContainer = document.querySelector('.swiper_blog-component');
    if (!elfsightContainer || !swiperContainer) return;

    normalizeElfsightFeed(elfsightContainer);
    let cardsAnimated = false;

    const animateItems = items => {
      const fresh = Array.from(items).filter(item => !item.dataset.animated);
      if (!fresh.length) return;

      fresh.forEach((item, i) => {
        item.dataset.animated = 'true';
        item.style.opacity = '0';
        item.style.transform = 'translate3d(0, 2.5rem, 0)';
        item.style.transition = 'none';

        setTimeout(() => {
          item.style.transition =
            'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
          item.style.opacity = '1';
          item.style.transform = 'translate3d(0, 0, 0)';
        }, 100 * i);
      });
    };

    // Only animate cards when swiper container is in view
    const swiperObserver = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !cardsAnimated) {
          cardsAnimated = true;
          normalizeElfsightFeed(elfsightContainer);
          const items = elfsightContainer.querySelectorAll(ELFSIGHT_CARD_SELECTOR);
          if (items.length) animateItems(items);
          swiperObserver.unobserve(swiperContainer);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );

    swiperObserver.observe(swiperContainer);
    observersRef.current.push(swiperObserver);

    const feedObserver = new MutationObserver(() => {
      normalizeElfsightFeed(elfsightContainer);
      if (cardsAnimated) {
        const items = elfsightContainer.querySelectorAll(ELFSIGHT_CARD_SELECTOR);
        if (items.length) animateItems(items);
      }
    });

    feedObserver.observe(elfsightContainer, {
      childList: true,
      subtree: true,
    });
    observersRef.current.push(feedObserver);

    // Cleanup
    return () => {
      observersRef.current.forEach(observer => {
        if (observer.disconnect) observer.disconnect();
        else if (observer.unobserve) observer.unobserve(swiperContainer);
      });
      observersRef.current = [];
      document.removeEventListener('click', handleLoadMoreClick);
    };
  }, []);
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
            <div className="social-section_header" data-animate-order="0">
              <div>
                <h2 className="heading-style-h2" style={{ color: '#fff' }}>
                  What we share outside the site
                </h2>
              </div>
              <div className="subtitle_tag-wrapper is--white hide-mobile-landscape">
                <div>Social</div>
              </div>
            </div>
            <div className="swiper_blog-component" data-animate-order="1">
              <div className="elfsight-app-aafa18f0-0e7e-4ff0-a44e-5c047f44429b"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
