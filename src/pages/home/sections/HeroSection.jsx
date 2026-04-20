import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackMailto } from '../../../hooks/useAnalytics';
import { usePageTransition } from '../../../hooks/usePageTransition';
import { SectionDivider } from '../../../components/layout/SectionDivider';
import { useWaterRipple } from '../../../hooks/useWaterRipple';

export function HeroSection() {
  useWaterRipple('water-ripple-canvas');
  const { createHashScrollHandler } = usePageTransition();

  const handleContactClick = createHashScrollHandler('contact', {
    duration: 2.4,
    easing: progress =>
      progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2,
  });

  return (
    <header
      className="hero_wrap"
      data-animate-scope
      data-animate-trigger="load"
      data-animate-default-trigger="load"
      data-animate-default-stagger="800"
      data-animate-default-preset="fade-up"
    >
      <div className="hero_contain container padding-global">
        <div className="hero_list" data-animate="fade-up">
          <h1 className="hero_heading heading-style-h1">
            <div className="heading_line" data-animate-order="4">
              <div className="heading_text">Building digital solutions</div>
            </div>
            <div className="heading_line" data-animate-order="5">
              <div className="text-color-gradiant">that grow with you</div>
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
                  Your partner in creating scalable, reliable solutions
                </p>
              </div>
            </div>
            <div className="hero_bottom_content">
              <a
                href="mailto:hello@arg.software?subject=I%20want%20to%20share%20my%20ideas"
                className="text-button w-inline-block"
                onClick={() => trackMailto('share_ideas', 'hero')}
              >
                <div className="text-button_list" data-animate="slide-up" data-animate-order="2">
                  <div className="text-button_text">Share my ideas</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
                <div className="text-button_list is-animated">
                  <div className="text-button_text">Write us</div>
                  <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                </div>
              </a>
            </div>
            <div className="bottom_buttons-wrapper">
              <div className="overflow-hidden">
                <a
                  href="#contact"
                  className="text-button w-inline-block"
                  onClick={handleContactClick}
                >
                  <div className="text-button_list" data-animate="slide-up" data-animate-order="3">
                    <div className="text-button_text">I want a new software</div>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
                  </div>
                  <div className="text-button_list is-animated">
                    <div className="text-button_text">We are here to help</div>
                    <div className="arrow_icon-embed w-embed">{arrowSvg}</div>
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
        <div
          data-autoplay="true"
          data-loop="true"
          data-wf-ignore="true"
          className="hero_bg-video w-background-video w-background-video-atom"
        >
          <video
            id="hero-video"
            autoPlay
            loop
            muted
            playsInline
            data-wf-ignore="true"
            data-object-fit="cover"
          >
            <source src="videos/hero-video-opt.mp4" data-wf-ignore="true" />
          </video>
        </div>
      </div>
    </header>
  );
}
