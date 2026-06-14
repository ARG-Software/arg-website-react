export function Timeline({
  heading,
  rows,
  yearStart,
  yearEnd,
  items,
  ctaText = 'Your Project',
  ctaButtonText = 'Start Now',
  ctaLink = '#page-cta',
  onCtaClick,
  animate = true,
  rowPreset = 'fade-up',
  cardPreset = 'fade-up',
  stagger = 150,
}) {
  const isExternal = ctaLink.startsWith('http');
  const ctaAttrs = isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const yearColumns = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);

  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': cardPreset,
        'data-animate-default-stagger': String(stagger),
      }
    : {};

  const rowAttrs = i =>
    animate
      ? {
          'data-animate': rowPreset,
          'data-animate-order': String(i),
        }
      : {};

  const cardAttrs = i =>
    animate
      ? {
          'data-animate-order': String(i),
        }
      : {};

  return (
    <section className="pt-timeline-section padding-section-xlarge" {...scopeAttrs}>
      <div className="container padding-global pt-timeline-inner">
        <h2 className="pt-timeline-heading">{heading}</h2>

        {/* Desktop */}
        <div className="pt-timeline-desktop">
          <div className="pt-years-row">
            {yearColumns.map(year => (
              <span key={year} className="pt-year-label">
                {year}
              </span>
            ))}
          </div>
          <div className="pt-divider" />
          <div className="pt-rows">
            {rows.map((row, i) => {
              const startCol = row.startYear - yearStart + 1;
              const partners = row.slugs.map(slug => items[slug]).filter(Boolean);
              return (
                <div key={i} className="pt-row">
                  <div
                    className="pt-row-card"
                    style={{ gridColumn: `${startCol} / -1` }}
                    {...rowAttrs(i)}
                  >
                    <span className="pt-duration">{row.label}</span>
                    <div className="pt-row-logos">
                      {partners.map(p => (
                        <img
                          key={p.slug}
                          src={p.logoSmall || p.logo}
                          alt={p.name}
                          className="pt-row-logo"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-row">
              <div
                className="pt-row-cta-card"
                style={{ gridColumn: '1 / -1' }}
                {...rowAttrs(rows.length)}
              >
                <span className="pt-cta-label">{ctaText}</span>
                <a href={ctaLink} className="pt-cta-btn" {...ctaAttrs} onClick={onCtaClick}>
                  {ctaButtonText}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="pt-timeline-mobile">
          {rows.map((row, i) => {
            const partners = row.slugs.map(slug => items[slug]).filter(Boolean);
            return (
              <div key={i} className="pt-mobile-card" {...cardAttrs(i)}>
                <div className="pt-mobile-duration">{row.label}</div>
                <span className="pt-mobile-since">since {row.startYear}</span>
                <div className="pt-mobile-logos">
                  {partners.map(p => (
                    <img
                      key={p.slug}
                      src={p.logoSmall || p.logo}
                      alt={p.name}
                      className="pt-mobile-logo"
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="pt-mobile-cta" {...cardAttrs(rows.length)}>
            <span className="pt-mobile-cta-label">{ctaText}</span>
            <a href={ctaLink} className="pt-cta-btn" {...ctaAttrs} onClick={onCtaClick}>
              {ctaButtonText}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
