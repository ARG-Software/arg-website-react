import { useContext, useEffect, useRef } from 'react';
import { TextArrowButton } from '@ui/buttons/TextArrowButton.jsx';
import { trackEvent, trackMailto } from '@services/analytics';
import { TransitionContext } from '../../../providers/TransitionProvider';
import { LoadingContext } from '../../../providers/LoadingProvider';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { useWaterRipple } from '../../../hooks/useWaterRipple';
import { EMAIL_KEYS, getMailtoLink } from '../../../services/linksService';

// The moment in hero-video-opt.mp4 whose blob has the shape the intro video ends on.
const INTRO_HANDOFF_S = 9;

export function HeroSection({ content }) {
  useWaterRipple('water-ripple-canvas');
  const { scrollToHash } = useContext(TransitionContext);
  const loadingDone = useContext(LoadingContext);
  const videoRef = useRef(null);
  const waitsForIntroRef = useRef(!loadingDone);

  // Behind the intro the hero video waits on the frame the intro ends on, and plays on from
  // there once the intro is gone, so the blob carries on instead of jumping to another shape.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !waitsForIntroRef.current) return;
    if (loadingDone) {
      video.play().catch(() => {});
      return;
    }
    const seek = () => {
      video.currentTime = INTRO_HANDOFF_S;
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener('loadedmetadata', seek, { once: true });
    return () => video.removeEventListener('loadedmetadata', seek);
  }, [loadingDone]);

  const handleContactClick = event => {
    event.preventDefault();
    trackEvent('section_navigation', {
      section: 'contact',
      source_path: `${window.location.pathname}${window.location.search}`,
      target_path: '/',
    });
    scrollToHash('contact', {
      duration: 2.4,
    });
  };

  return (
    <header
      id="hero"
      className="hero_wrap"
      data-animate-scope
      data-animate-trigger="load"
      data-animate-default-preset="fade-up"
    >
      <div className="hero_contain container padding-global">
        <div className="hero_list">
          <h1 className="hero_heading heading-style-h1">
            <div className="heading_line">
              <div
                className="heading_text"
                data-animate="slide-up-rotate"
                data-animate-distance="150%"
                data-animate-duration="2.2s"
                data-animate-order="0"
              >
                {content.title[0]}
              </div>
            </div>
            <div className="heading_line">
              <div
                className="text-color-gradiant"
                data-animate="slide-up-rotate"
                data-animate-distance="150%"
                data-animate-duration="2.2s"
                data-animate-order="1"
              >
                {content.title[1]}
              </div>
            </div>
          </h1>
        </div>
        <div className="hero_bottom_wrap">
          <SectionDivider
            variant="white"
            id="hero-divider"
            data-animate="divider-expander-show"
            data-animate-order="2"
            data-animate-duration="1.8s"
            style={{ opacity: 0 }}
          />
          <div className="hero_bottom_list">
            <div className="hero_bottom_info">
              <div className="hero_bottom_content">
                <p
                  className="hero_bottom_paragraph"
                  data-animate-order="3"
                  data-animate-duration="1.8s"
                >
                  {content.subtitle}
                </p>
              </div>
            </div>
            <div className="hero_bottom_content">
              <TextArrowButton
                href={getMailtoLink(EMAIL_KEYS.HELLO, content.mailCta.subject)}
                label={content.mailCta.label}
                hoverLabel={content.mailCta.hoverLabel}
                listProps={{ 'data-animate-order': '4', 'data-animate-duration': '1.8s' }}
                onClick={() => trackMailto('share_ideas', 'hero')}
              />
            </div>
            <div className="bottom_buttons-wrapper">
              <div className="overflow-hidden">
                <TextArrowButton
                  href="#contact"
                  label={content.contactCta.label}
                  hoverLabel={content.contactCta.hoverLabel}
                  listProps={{ 'data-animate-order': '5', 'data-animate-duration': '1.8s' }}
                  onClick={handleContactClick}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="padding-global"></div>
      </div>
      <div className="hero_visual">
        <canvas id="water-ripple-canvas" />
        <div data-autoplay="true" data-loop="true" className="ambient-bg-video">
          <video
            id="hero-video"
            ref={videoRef}
            autoPlay={loadingDone}
            preload="auto"
            loop
            muted
            playsInline
          >
            <source src="videos/hero-video-opt.mp4" />
          </video>
        </div>
      </div>
    </header>
  );
}
