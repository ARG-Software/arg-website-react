import {
  MONTHS_PER_YEAR,
  createTimelineRows,
  formatTimelineDuration,
  formatTimelineRange,
  getTimelineYearColumns,
} from '../utils/timeline.js';
import { AnimatedArrowButton } from '../buttons/AnimatedArrowButton.jsx';
import { arrowSvg } from '../icons/SocialIcons.jsx';

function formatTimelineLabel(row) {
  const range = row.ongoing ? `since ${row.startYear}, ongoing` : formatTimelineRange(row);
  return `${row.client.name}: ${formatTimelineDuration(row.durationMonths, row.ongoing)}, ${range}`;
}

export function Timeline({
  heading,
  clients = [],
  yearStart = 2020,
  ctaText = 'Your Time',
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
  const now = new Date();
  const currentYear = now.getFullYear();
  // One dimmed future year after the current one leaves room for the "Your time" row
  const yearEnd = currentYear + 1;
  const yearColumns = getTimelineYearColumns(yearStart, yearEnd);
  const monthColumnCount = yearColumns.length * MONTHS_PER_YEAR;
  const timelineRows = createTimelineRows(clients, yearStart, yearEnd, now);
  const timelineStartMonthIndex = yearStart * MONTHS_PER_YEAR;
  const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const todayMonths =
    (currentYear - yearStart) * MONTHS_PER_YEAR +
    now.getMonth() +
    (now.getDate() - 1) / daysInMonth;
  const todayPercent = (todayMonths / monthColumnCount) * 100;

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
      style={{
        '--pt-month-count': monthColumnCount,
        '--pt-year-count': yearColumns.length,
        '--pt-today': `${todayPercent}%`,
      }}
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
              className={`pt-year-label${year > currentYear ? ' is-future' : ''}`}
              style={{ gridColumn: `span ${MONTHS_PER_YEAR}` }}
            >
              {year}
            </span>
          ))}
        </div>
        <div className="pt-divider" data-animate-order={animate ? '2' : undefined} />

        <div className="pt-chart">
          <div className="pt-today" aria-hidden="true">
            <span className="pt-today-label">Today</span>
          </div>

          <ol className="pt-rows">
            {timelineRows.map((row, i) => {
              const startCol = row.visibleStartMonthIndex - timelineStartMonthIndex + 1;
              const span = row.visibleEndMonthIndex - row.visibleStartMonthIndex + 1;
              const { client } = row;

              return (
                <li key={row.key} className="pt-row">
                  <div
                    className={`pt-row-item${row.ongoing ? ' is-ongoing' : ''}`}
                    style={{ gridColumn: `${startCol} / span ${span}` }}
                    role="img"
                    aria-label={formatTimelineLabel(row)}
                    {...rowAttrs(i + 3)}
                  >
                    <img
                      src={client.logoSmall || client.logo}
                      alt=""
                      className="pt-row-logo"
                      data-partner={client.slug}
                    />
                  </div>
                </li>
              );
            })}
          </ol>

          {/* An open slot in the future, after Today: the gradient draws itself around it */}
          <a
            href={ctaLink}
            className="pt-future"
            {...ctaAttrs}
            onClick={onCtaClick}
            {...rowAttrs(timelineRows.length + 4)}
          >
            <span className="pt-future-kicker">{ctaText}</span>
            <span className="pt-future-title">
              {ctaButtonText}
              <span className="arrow_icon-embed" aria-hidden="true">
                {arrowSvg}
              </span>
            </span>
          </a>
        </div>
      </div>

      {/* Mobile */}
      <ol className="pt-timeline-mobile">
        {timelineRows.map((row, i) => (
          <li key={row.key} className="pt-mobile-row" {...cardAttrs(i + 1)}>
            <span className={`pt-mobile-range${row.ongoing ? ' is-ongoing' : ''}`}>
              {formatTimelineRange(row)}
            </span>
            <img
              src={row.client.logoSmall || row.client.logo}
              alt={row.client.name}
              className="pt-mobile-logo"
              data-partner={row.client.slug}
            />
          </li>
        ))}
        <li className="pt-mobile-row pt-mobile-row--cta" {...cardAttrs(timelineRows.length + 1)}>
          <AnimatedArrowButton
            href={ctaLink}
            variant="ghost"
            className="pt-mobile-cta"
            {...ctaAttrs}
            onClick={onCtaClick}
            hoverText={ctaButtonText}
          >
            {ctaText}
          </AnimatedArrowButton>
        </li>
      </ol>
    </div>
  );
}
