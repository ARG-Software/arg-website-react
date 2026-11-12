import AppLink from '@components/navigation/AppLink';
import { StudioCloudsArt } from '@components/animated/StudioCloudsArt';
import { getProjectBookingLink } from '@services/linksService';

function isExternal(href) {
  return /^https?:\/\//.test(href) || href.startsWith('mailto:');
}

function CTAButton({ link, children, ...props }) {
  if (/^(#|\/[^.?#]*([?#].*)?$)/.test(link)) {
    return (
      <AppLink to={link} {...props}>
        {children}
      </AppLink>
    );
  }

  const externalAttrs = isExternal(link) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  return (
    <a href={link} {...externalAttrs} {...props}>
      {children}
    </a>
  );
}

function ButtonLabel({ label, hoverLabel }) {
  return (
    <div className="button-base_text_wrap">
      <div className="button-base__button-text">{label}</div>
      <div className="button-base__button-text is-animated">{hoverLabel}</div>
    </div>
  );
}

// Full-screen call to action in the page flow, with two studio-lit clusters of liquid behind the
// type; the footer then waits underneath it
export function ContactSection({
  className = '',
  id = 'contact',
  title,
  titleHighlight,
  subtitle,
  buttonTextNotHover,
  buttonTextHover,
  buttonLink = getProjectBookingLink(),
  onPrimaryClick,
  secondButtonTextNotHover,
  secondButtonTextHover,
  secondButtonLink,
  onSecondaryClick,
}) {
  return (
    <section id={id} className={`home-cta ${className}`.trim()}>
      <StudioCloudsArt className="home-cta_canvas" />
      <div className="padding-global">
        <div className="container-large">
          <div
            className="home-cta_content"
            data-animate-scope
            data-animate-default-preset="fade-up"
          >
            <h2 className="home-cta_title">
              <span className="home-cta_title-line" data-animate="fade-up">
                {title}
              </span>
              {titleHighlight && (
                <span
                  className="home-cta_title-line home-cta_title-line--accent"
                  data-animate="fade-up"
                >
                  {titleHighlight}
                </span>
              )}
            </h2>
            {subtitle && (
              <p className="home-cta_subtitle" data-animate="fade-up">
                {subtitle}
              </p>
            )}
            <div className="home-cta_buttons">
              <CTAButton
                link={buttonLink}
                className="button-base"
                data-animate="fade-up"
                onClick={onPrimaryClick}
              >
                <ButtonLabel label={buttonTextNotHover} hoverLabel={buttonTextHover} />
              </CTAButton>
              {secondButtonLink && (
                <CTAButton
                  link={secondButtonLink}
                  className="button-base"
                  data-animate="fade-up"
                  onClick={onSecondaryClick}
                >
                  <ButtonLabel
                    label={secondButtonTextNotHover}
                    hoverLabel={secondButtonTextHover}
                  />
                </CTAButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
