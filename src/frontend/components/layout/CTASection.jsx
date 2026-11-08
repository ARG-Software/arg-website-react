import AppLink from '@components/navigation/AppLink';
import { getProjectBookingLink } from '../../services/linksService';

function isExternal(href) {
  return /^https?:\/\//.test(href) || href.startsWith('mailto:');
}

// Site pages go through AppLink for the page transition; external links, email and files stay plain
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

function ResponsiveText({ children, mobileText }) {
  if (!mobileText) return children;

  return (
    <>
      <span className="cta-copy cta-copy--desktop">{children}</span>
      <span className="cta-copy cta-copy--mobile">{mobileText}</span>
    </>
  );
}

export function CTASection({
  title = 'Ready to build',
  titleHighlight = 'with us?',
  subtitle,
  mobileTitle,
  mobileTitleHighlight,
  mobileSubtitle,
  buttonTextNotHover = 'Book a Meeting',
  buttonTextHover = "Let's meet",
  buttonLink = getProjectBookingLink(),
  onPrimaryClick,
  showSplitTitle = true,
  showTitleHighlight = true,
  wrapInSection = true,
  includePadding = true,
  id,
  renderTitle,
  animationClass = '',
  secondButtonTextNotHover,
  secondButtonTextHover,
  secondButtonLink,
  onSecondaryClick,
  animate = true,
  animationPreset = 'fade-up',
}) {
  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': animationPreset,
      }
    : {};

  const animationAttrs = order =>
    animate
      ? {
          'data-animate': animationPreset,
          'data-animate-order': String(order),
        }
      : {};

  const innerContent = (
    <div className="container-large">
      <div className="padding-bottom padding-80-40"></div>
      <div className="cta-wrapper border-radius-all">
        <div className="cta-content" {...scopeAttrs}>
          <div className="heading_wrap">
            {renderTitle ? (
              renderTitle()
            ) : showSplitTitle ? (
              <>
                <div className="header-animation">
                  <h2 className={`heading-style-h1 ${animationClass}`} {...animationAttrs(0)}>
                    <ResponsiveText mobileText={mobileTitle}>{title}</ResponsiveText>
                  </h2>
                </div>
                {showTitleHighlight && (
                  <div className="header-animation">
                    <h2
                      className={`heading-style-h1 text-color-gradiant-2 ${animationClass} pp-d1`}
                      {...animationAttrs(1)}
                      style={{
                        color: '#000',
                        WebkitTextFillColor: 'transparent',
                        backgroundImage: 'var(--arg-gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                      }}
                    >
                      <ResponsiveText mobileText={mobileTitleHighlight}>
                        {titleHighlight}
                      </ResponsiveText>
                    </h2>
                  </div>
                )}
              </>
            ) : (
              <div className="header-animation">
                <h2 className={`heading-style-h1 ${animationClass}`} {...animationAttrs(0)}>
                  <ResponsiveText mobileText={mobileTitle}>{title}</ResponsiveText>
                </h2>
              </div>
            )}
          </div>
          {subtitle && (
            <div className="padding-bottom padding-48">
              <p className="cta-subtitle" {...animationAttrs(2)}>
                <ResponsiveText mobileText={mobileSubtitle}>{subtitle}</ResponsiveText>
              </p>
            </div>
          )}
          <div className="padding-bottom padding-48"></div>
          <div className="cta-buttons">
            <CTAButton
              link={buttonLink}
              className={`button-base button-contact ${animationClass} pp-d2`}
              {...animationAttrs(3)}
              onClick={onPrimaryClick}
            >
              <div className="button-base_text_wrap">
                <div className="button-base__button-text">{buttonTextNotHover}</div>
                <div className="button-base__button-text is-animated">{buttonTextHover}</div>
              </div>
            </CTAButton>
            {secondButtonLink && (
              <CTAButton
                link={secondButtonLink}
                className={`button-base button-contact ${animationClass} pp-d2`}
                {...animationAttrs(4)}
                onClick={onSecondaryClick}
              >
                <div className="button-base_text_wrap">
                  <div className="button-base__button-text">{secondButtonTextNotHover}</div>
                  <div className="button-base__button-text is-animated">
                    {secondButtonTextHover}
                  </div>
                </div>
              </CTAButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const content = includePadding ? (
    <div className="section_cta">
      <div className="padding-global is--cta-mobile">{innerContent}</div>
    </div>
  ) : (
    <div className="section_cta">{innerContent}</div>
  );

  if (!wrapInSection) {
    return content;
  }

  return <section id={id}>{content}</section>;
}
