function getTimelineEndYear(timeline, yearEnd) {
  if (timeline.ongoing) return yearEnd;
  return timeline.startYear + timeline.durationYears - 1;
}

function getDurationLabel(row) {
  const duration = row.ongoing ? Math.max(1, row.endYear - row.startYear) : row.durationYears;
  const suffix = duration === 1 ? 'Year' : 'Years';
  return `${duration}${row.ongoing ? '+' : ''} ${suffix}`;
}

function getRangeLabel(row) {
  if (row.ongoing) return `since ${row.startYear}`;
  if (row.startYear === row.endYear) return String(row.startYear);
  return `${row.startYear}-${row.endYear}`;
}

function createTimelineRows(clients, yearStart, yearEnd) {
  const rowsByTimeframe = new Map();

  clients.forEach(client => {
    const clientTimeline = client.timeline;
    if (!clientTimeline?.startYear) return;

    const endYear = getTimelineEndYear(clientTimeline, yearEnd);
    if (endYear < yearStart || clientTimeline.startYear > yearEnd) return;

    const rowKey = [
      clientTimeline.startYear,
      endYear,
      clientTimeline.ongoing ? 'ongoing' : 'fixed',
    ].join('-');

    if (!rowsByTimeframe.has(rowKey)) {
      const visibleStartYear = Math.max(clientTimeline.startYear, yearStart);
      const visibleEndYear = Math.min(endYear, yearEnd);

      rowsByTimeframe.set(rowKey, {
        key: rowKey,
        startYear: clientTimeline.startYear,
        endYear,
        visibleStartYear,
        visibleEndYear,
        durationYears: clientTimeline.durationYears,
        ongoing: Boolean(clientTimeline.ongoing),
        clients: [],
      });
    }

    rowsByTimeframe.get(rowKey).clients.push(client);
  });

  return Array.from(rowsByTimeframe.values()).sort((a, b) => {
    if (a.startYear !== b.startYear) return a.startYear - b.startYear;
    return a.endYear - b.endYear;
  });
}

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
  const yearColumns = Array.from({ length: safeYearEnd - yearStart + 1 }, (_, i) => yearStart + i);
  const timelineRows = createTimelineRows(clients, yearStart, safeYearEnd);

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
      style={{ '--pt-year-count': yearColumns.length }}
      {...scopeAttrs}
    >
      <h2 className="pt-timeline-heading" data-animate-order={animate ? '0' : undefined}>
        {heading}
      </h2>

      {/* Desktop */}
      <div className="pt-timeline-desktop">
        <div className="pt-years-row" data-animate-order={animate ? '1' : undefined}>
          {yearColumns.map(year => (
            <span key={year} className="pt-year-label">
              {year}
            </span>
          ))}
        </div>
        <div className="pt-divider" data-animate-order={animate ? '2' : undefined} />
        <div className="pt-rows">
          {timelineRows.map((row, i) => {
            const startCol = row.visibleStartYear - yearStart + 1;
            const span = row.visibleEndYear - row.visibleStartYear + 1;

            return (
              <div key={row.key} className="pt-row">
                <div
                  className="pt-row-card"
                  style={{ gridColumn: `${startCol} / span ${span}` }}
                  {...rowAttrs(i + 3)}
                >
                  <span className="pt-duration">{getDurationLabel(row)}</span>
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
              style={{ gridColumn: `${yearColumns.length} / -1` }}
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
              <div className="pt-mobile-duration">{getDurationLabel(row)}</div>
              <span className="pt-mobile-since">{getRangeLabel(row)}</span>
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
