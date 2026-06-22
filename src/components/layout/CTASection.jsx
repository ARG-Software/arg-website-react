export function CTASection({
  title = 'Ready to build',
  titleHighlight = 'with us?',
  subtitle,
  buttonTextNotHover = 'Book a Meeting',
  buttonTextHover = "Let's meet",
  buttonLink = 'https://zcal.co/argsoftware/project',
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
  animationStagger = 120,
}) {
  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': animationPreset,
        'data-animate-default-stagger': String(animationStagger),
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
                    {title}
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
                        backgroundImage: 'linear-gradient(to right, #f0060d, #c924d7 49%, #7904fd)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                      }}
                    >
                      {titleHighlight}
                    </h2>
                  </div>
                )}
              </>
            ) : (
              <div className="header-animation">
                <h2 className={`heading-style-h1 ${animationClass}`} {...animationAttrs(0)}>
                  {title}
                </h2>
              </div>
            )}
          </div>
          {subtitle && (
            <div className="padding-bottom padding-48">
              <p className="cta-subtitle" {...animationAttrs(2)}>
                {subtitle}
              </p>
            </div>
          )}
          <div className="padding-bottom padding-48"></div>
          <div className="cta-buttons">
            <a
              href={buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`button-base button-contact w-inline-block ${animationClass} pp-d2`}
              {...animationAttrs(3)}
              onClick={onPrimaryClick}
            >
              <div className="button-base_text_wrap">
                <div className="button-base__button-text">{buttonTextNotHover}</div>
                <div className="button-base__button-text is-animated">{buttonTextHover}</div>
              </div>
            </a>
            {secondButtonLink && (
              <a
                href={secondButtonLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`button-base button-contact w-inline-block ${animationClass} pp-d2`}
                {...animationAttrs(4)}
                onClick={onSecondaryClick}
              >
                <div className="button-base_text_wrap">
                  <div className="button-base__button-text">{secondButtonTextNotHover}</div>
                  <div className="button-base__button-text is-animated">
                    {secondButtonTextHover}
                  </div>
                </div>
              </a>
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
