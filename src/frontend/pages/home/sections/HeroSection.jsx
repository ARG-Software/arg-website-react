import { useContext } from 'react';
import { arrowSvg } from '@ui/icons/SocialIcons.jsx';
import { trackEvent, trackMailto } from '@services/analytics';
import { TransitionContext } from '../../../providers/TransitionProvider';
import { SectionDivider } from '@ui/layout/SectionDivider.jsx';
import { useWaterRipple } from '../../../hooks/useWaterRipple';
import { EMAIL_KEYS, getMailtoLink } from '../../../services/linksService';

export function HeroSection({ content }) {
  useWaterRipple('water-ripple-canvas');
  const { scrollToHash } = useContext(TransitionContext);

  const handleContactClick = event => {
    event.preventDefault();
    trackEvent('section_navigation', {
      section: 'contact',
      source_path: `${window.location.pathname}${window.location.search}`,
      target_path: '/',
    });
    scrollToHash('contact', {
      duration: 2.4,
      easing: progress =>
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2,
    });
  };

  return (
    <header
      id="hero"
      className="hero_wrap"
      data-animate-scope
      data-animate-trigger="load"
      data-animate-default-stagger="500"
      data-animate-default-preset="fade-up"
    >
      <div className="hero_contain container padding-global">
        <div className="hero_list" data-animate="fade-up">
          <h1 className="hero_heading heading-style-h1">
            <div className="heading_line" data-animate-order="4">
              <div className="heading_text">{content.title[0]}</div>
            </div>
            <div className="heading_line" data-animate-order="5">
              <div className="text-color-gradiant">{content.title[1]}</div>
            </div>
          </h1>
        </div>
        <div className="hero_bottom_wrap">
          <SectionDivider
            variant="white"
            id="hero-divider"
            data-animate="divider-expander-show"
            data-animate-order="0"
            style={{ opacity: 0 }}
          />
          <div className="hero_bottom_list">
            <div className="hero_bottom_info">
              <div className="hero_bottom_content">
                <p className="hero_bottom_paragraph" data-animate="slide-up" data-animate-order="1">
                  {content.subtitle}
                </p>
              </div>
            </div>
            <div className="hero_bottom_content">
              <a
                href={getMailtoLink(EMAIL_KEYS.HELLO, content.mailCta.subject)}
                className="text-button"
                onClick={() => trackMailto('share_ideas', 'hero')}
              >
                <div className="text-button_list" data-animate="slide-up" data-animate-order="2">
                  <div className="text-button_text">{content.mailCta.label}</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated">
                  <div className="text-button_text">{content.mailCta.hoverLabel}</div>
                  <div className="arrow_icon-embed">{arrowSvg}</div>
                </div>
              </a>
            </div>
            <div className="bottom_buttons-wrapper">
              <div className="overflow-hidden">
                <a href="#contact" className="text-button" onClick={handleContactClick}>
                  <div className="text-button_list" data-animate="slide-up" data-animate-order="3">
                    <div className="text-button_text">{content.contactCta.label}</div>
                    <div className="arrow_icon-embed">{arrowSvg}</div>
                  </div>
                  <div className="text-button_list is-animated">
                    <div className="text-button_text">{content.contactCta.hoverLabel}</div>
                    <div className="arrow_icon-embed">{arrowSvg}</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="padding-global"></div>
      </div>
      <div className="hero_visual">
        <canvas id="water-ripple-canvas" />
        <div data-autoplay="true" data-loop="true" className="ambient-bg-video">
          <video id="hero-video" autoPlay loop muted playsInline>
            <source src="videos/hero-video-opt.mp4" />
          </video>
        </div>
      </div>
    </header>
  );
}
