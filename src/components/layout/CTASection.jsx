import React from 'react';

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
  // Backward compatibility - will be removed later
  buttonText,
  animationClass = '',
  // Second button (optional)
  secondButtonTextNotHover,
  secondButtonTextHover,
  secondButtonLink,
  onSecondaryClick,
}) {
  // Handle backward compatibility for buttonText
  const notHoverText = buttonText || buttonTextNotHover;
  let hoverText = buttonTextHover;

  // Map hover text for backward compatibility
  if (buttonText === 'Book a Meeting') {
    hoverText = "Let's meet";
  } else if (buttonText === 'Show me more') {
    hoverText = 'View Portfolio';
  } else if (buttonText && !buttonTextHover) {
    hoverText = 'Get started';
  }

  const innerContent = (
    <div className="container-large">
      <div className="padding-bottom padding-80-40"></div>
      <div className="cta-wrapper border-radius-all">
        <div className="cta-content">
          <div className="heading_wrap">
            {renderTitle ? (
              renderTitle()
            ) : showSplitTitle ? (
              <>
                <div className="header-animation">
                  <h2 className={`heading-style-h1 ${animationClass}`} data-animate="fade-up">
                    {title}
                  </h2>
                </div>
                {showTitleHighlight && (
                  <div className="header-animation">
                    <h2
                      className={`heading-style-h1 text-color-gradiant-2 ${animationClass} pp-d1`}
                      data-animate="fade-up"
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
                <h2 className={`heading-style-h1 ${animationClass}`} data-animate="fade-up">
                  {title}
                </h2>
              </div>
            )}
          </div>
          {subtitle && (
            <div className="padding-bottom padding-48">
              <p className="cta-subtitle">{subtitle}</p>
            </div>
          )}
          <div className="padding-bottom padding-48"></div>
          <div
            className="cta-buttons"
            style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <a
              href={buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`button-base button-contact w-inline-block ${animationClass} pp-d2`}
              data-animate="fade-up"
              onClick={onPrimaryClick}
            >
              <div className="button-base_text_wrap">
                <div className="button-base__button-text">{notHoverText}</div>
                <div className="button-base__button-text is-animated">{hoverText}</div>
              </div>
            </a>
            {secondButtonLink && (
              <a
                href={secondButtonLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`button-base button-contact w-inline-block ${animationClass} pp-d2`}
                data-animate="fade-up"
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
