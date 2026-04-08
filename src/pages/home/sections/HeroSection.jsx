import { arrowSvg } from '../../../components/icons/SocialIcons';
import { trackMailto } from '../../../hooks/useAnalytics';
import { usePageTransition } from '../../../hooks/usePageTransition';
import { SectionDivider } from '../../../components/layout/SectionDivider';
import { useWaterRipple } from '../../../hooks/useWaterRipple';

export function HeroSection() {
  //useHeroParallax();
  useWaterRipple('water-ripple-canvas');
  const { createHashScrollHandler } = usePageTransition();

  const handleContactClick = createHashScrollHandler('contact', {
    duration: 2.4,
    easing: progress =>
      progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2,
  });

  return (
    <header data-w-id="03b45077-cd1d-c5f8-448b-54b3be3b8dac" className="hero_wrap">
      <div className="hero_contain container padding-global">
        <div className="hero_list">
          <h1 className="hero_heading heading-style-h1">
            <div className="heading_line">
              <div className="heading_text hero-reveal" style={{ animationDelay: '1.2s' }}>
                Building digital solutions
              </div>
            </div>
            <div className="heading_line">
              <div className="text-color-gradiant hero-reveal" style={{ animationDelay: '1.35s' }}>
                that grow with you
              </div>
            </div>
          </h1>
        </div>
        <div className="hero_bottom_wrap">
          <SectionDivider
            variant="hero"
            data-w-id="2e342a7e-467f-011c-2fd9-6d344b25d7f9"
            style={{
              opacity: 0,
              transform:
                'translate3d(0, 0, 0) scale3d(0.1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
            }}
          />
          <div className="hero_bottom_list">
            <div className="hero_bottom_info">
              <div className="hero_bottom_content">
                <p
                  data-w-id="3a77596f-692e-0850-209d-f23fa68c2ed0"
                  style={{
                    transform:
                      'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                  }}
                  className="hero_bottom_paragraph"
                >
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
                <div
                  style={{
                    transform:
                      'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                  }}
                  className="text-button_list"
                >
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
                  <div
                    style={{
                      transform:
                        'translate3d(0, 100%, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(0) skew(0, 0)',
                    }}
                    className="text-button_list"
                  >
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
