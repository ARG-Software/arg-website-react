import { useEffect, useRef } from 'react';
import { SectionDivider } from '../../../components/layout/SectionDivider';
import { arrowSvg } from '../../../components/icons/SocialIcons';

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
    if (document.querySelector('script[src*="elfsight"]')) return;
    const script = document.createElement('script');
    script.src = 'https://static.elfsight.com/platform/platform.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Elfsight feed animations (moved from useScrollAnimations)
  useEffect(() => {
    const elfsightContainer = document.querySelector(
      '.elfsight-app-aafa18f0-0e7e-4ff0-a44e-5c047f44429b'
    );
    const swiperContainer = document.querySelector('.swiper_blog-component');
    if (!elfsightContainer || !swiperContainer) return;

    const CARD_SELECTOR = '[class*="CardContainer"]';
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
          const items = elfsightContainer.querySelectorAll(CARD_SELECTOR);
          if (items.length) animateItems(items);
          swiperObserver.unobserve(swiperContainer);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );

    swiperObserver.observe(swiperContainer);
    observersRef.current.push(swiperObserver);

    const feedObserver = new MutationObserver(() => {
      if (cardsAnimated) {
        const items = elfsightContainer.querySelectorAll(CARD_SELECTOR);
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
        <div className="container-large">
          <div className="blog-component">
            <div className="social-section_header">
              <div>
                <h2 className="heading-style-h2" style={{ color: '#fff' }}>
                  See what what we are saying outside of our website
                </h2>
              </div>
              <div className="subtitle_tag-wrapper is--white hide-mobile-landscape">
                <div>Social</div>
              </div>
            </div>
            <div className="swiper_blog-component">
              <div className="w-embed w-script">
                <div className="elfsight-app-aafa18f0-0e7e-4ff0-a44e-5c047f44429b"></div>
              </div>
            </div>
            <div className="social-load-more-container">
              <a
                href="#"
                className="text-button w-inline-block"
                onClick={handleLoadMoreClick}
                aria-label="Load more social posts"
              >
                <div className="text-button_list">
                  <div className="text-button_text text-no-wrap">Load More</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated">
                  <div className="text-button_text text-no-wrap">See Now</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
      <SectionDivider variant="light" hideOnMobile={true} />
    </section>
  );
}
