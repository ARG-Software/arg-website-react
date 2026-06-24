import {
  MONTHS_PER_YEAR,
  createTimelineRows,
  formatTimelineDuration,
  formatTimelineRange,
  getTimelineYearColumns,
} from '../../utils/timeline';

export function Timeline({
  heading,
  clients = [],
  yearStart = 2020,
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
  const safeYearEnd = new Date().getFullYear();
  const yearColumns = getTimelineYearColumns(yearStart, safeYearEnd);
  const monthColumnCount = yearColumns.length * MONTHS_PER_YEAR;
  const timelineRows = createTimelineRows(clients, yearStart, safeYearEnd);
  const timelineStartMonthIndex = yearStart * MONTHS_PER_YEAR;
  const finalYearStartColumn = (yearColumns.length - 1) * MONTHS_PER_YEAR + 1;

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
    <div
      className="container padding-global pt-timeline-inner"
      style={{ '--pt-month-count': monthColumnCount }}
      {...scopeAttrs}
    >
      <h2 className="pt-timeline-heading" data-animate-order={animate ? '0' : undefined}>
        {heading}
      </h2>

      {/* Desktop */}
      <div className="pt-timeline-desktop">
        <div className="pt-years-row" data-animate-order={animate ? '1' : undefined}>
          {yearColumns.map(year => (
            <span
              key={year}
              className="pt-year-label"
              style={{ gridColumn: `span ${MONTHS_PER_YEAR}` }}
            >
              {year}
            </span>
          ))}
        </div>
        <div className="pt-divider" data-animate-order={animate ? '2' : undefined} />
        <div className="pt-rows">
          {timelineRows.map((row, i) => {
            const startCol = row.visibleStartMonthIndex - timelineStartMonthIndex + 1;
            const span = row.visibleEndMonthIndex - row.visibleStartMonthIndex + 1;

            return (
              <div key={row.key} className="pt-row">
                <div
                  className="pt-row-card"
                  style={{ gridColumn: `${startCol} / span ${span}` }}
                  {...rowAttrs(i + 3)}
                >
                  <span className="pt-duration">
                    {formatTimelineDuration(row.durationMonths, row.ongoing)}
                  </span>
                  <div className="pt-row-logos">
                    {row.clients.map(p => (
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
            <a
              href={ctaLink}
              className="button-base button-contact w-inline-block pt-row-cta-card"
              style={{ gridColumn: `${finalYearStartColumn} / -1` }}
              {...ctaAttrs}
              onClick={onCtaClick}
              {...rowAttrs(timelineRows.length + 3)}
            >
              <div className="button-base_text_wrap">
                <div className="button-base__button-text">{ctaText}</div>
                <div className="button-base__button-text is-animated">{ctaButtonText}</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="pt-timeline-mobile">
        {timelineRows.map((row, i) => {
          return (
            <div key={row.key} className="pt-mobile-card" {...cardAttrs(i + 1)}>
              <div className="pt-mobile-duration">
                {formatTimelineDuration(row.durationMonths, row.ongoing)}
              </div>
              <span className="pt-mobile-since">{formatTimelineRange(row)}</span>
              <div className="pt-mobile-logos">
                {row.clients.map(p => (
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
        <a
          href={ctaLink}
          className="button-base button-contact w-inline-block pt-mobile-cta"
          {...ctaAttrs}
          onClick={onCtaClick}
          {...cardAttrs(timelineRows.length + 1)}
        >
          <div className="button-base_text_wrap">
            <div className="button-base__button-text">{ctaText}</div>
            <div className="button-base__button-text is-animated">{ctaButtonText}</div>
          </div>
        </a>
      </div>
    </div>
  );
}
