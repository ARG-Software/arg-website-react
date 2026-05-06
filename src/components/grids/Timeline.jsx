export function Timeline({
  heading,
  rows,
  yearStart,
  yearEnd,
  items,
  ctaText = 'Your Project',
  ctaButtonText = 'Start Now',
  ctaLink = '#page-cta',
}) {
  const yearColumns = Array.from(
    { length: yearEnd - yearStart + 1 },
    (_, i) => yearStart + i,
  );

  return (
    <section className="pt-timeline-section padding-section-xlarge">
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
              const minCols = 4;
              const naturalStart = row.startYear - yearStart + 1;
              const startCol = Math.min(naturalStart, yearColumns.length + 1 - minCols);
              const partners = row.slugs.map(slug => items[slug]).filter(Boolean);
              return (
                <div key={i} className="pt-row">
                  <div
                    className="pt-row-card"
                    style={{ gridColumn: `${startCol} / -1` }}
                  >
                    <span className="pt-duration">{row.label}</span>
                    <div className="pt-row-logos">
                      {partners.map(p => (
                        <img
                          key={p.slug}
                          src={p.logoSmall}
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
                style={{
                  gridColumn: `${Math.min(
                    rows.length > 0
                      ? rows[rows.length - 1].startYear - yearStart + 1
                      : yearColumns.length,
                    yearColumns.length + 1 - 4
                  )} / -1`,
                }}
              >
                <span className="pt-cta-label">{ctaText}</span>
                <a href={ctaLink} className="pt-cta-btn">
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
              <div key={i} className="pt-mobile-card">
                <div className="pt-mobile-duration">{row.label}</div>
                <span className="pt-mobile-since">since {row.startYear}</span>
                <div className="pt-mobile-logos">
                  {partners.map(p => (
                    <img
                      key={p.slug}
                      src={p.logoSmall}
                      alt={p.name}
                      className="pt-mobile-logo"
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="pt-mobile-cta">
            <span className="pt-mobile-cta-label">{ctaText}</span>
            <a href={ctaLink} className="pt-cta-btn">
              {ctaButtonText}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
