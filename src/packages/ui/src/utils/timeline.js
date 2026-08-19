const MONTHS_PER_YEAR = 12;

function toInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function pluralize(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function pluralUnit(value, singular, plural = `${singular}s`) {
  return value === 1 ? singular : plural;
}

function getCurrentMonthIndex(date = new Date()) {
  return date.getFullYear() * MONTHS_PER_YEAR + date.getMonth();
}

function getTimelineStartMonthIndex(timeline) {
  return toInteger(timeline.startYear) * MONTHS_PER_YEAR;
}

function getFixedDurationMonths(timeline) {
  const durationYears = Math.max(0, toInteger(timeline.durationYears));
  const durationMonths = Math.max(0, toInteger(timeline.durationMonths));
  return durationYears * MONTHS_PER_YEAR + durationMonths;
}

function getTimelineDurationMonths(timeline, currentDate) {
  if (timeline.ongoing) {
    return Math.max(
      1,
      getCurrentMonthIndex(currentDate) - getTimelineStartMonthIndex(timeline) + 1
    );
  }

  return Math.max(1, getFixedDurationMonths(timeline) || MONTHS_PER_YEAR);
}

function getTimelineEndMonthIndex(timeline, currentDate) {
  if (timeline.ongoing) return getCurrentMonthIndex(currentDate);
  return (
    getTimelineStartMonthIndex(timeline) + getTimelineDurationMonths(timeline, currentDate) - 1
  );
}

function getYearFromMonthIndex(monthIndex) {
  return Math.floor(monthIndex / MONTHS_PER_YEAR);
}

export function getTimelineYearColumns(yearStart, yearEnd) {
  return Array.from({ length: yearEnd - yearStart + 1 }, (_, index) => yearStart + index);
}

export function formatTimelineDuration(durationMonths, ongoing = false) {
  if (ongoing) {
    const elapsedYears = Math.floor(durationMonths / MONTHS_PER_YEAR);
    if (elapsedYears > 0) return `${elapsedYears}+ ${pluralUnit(elapsedYears, 'Year')}`;
    return `${durationMonths}+ ${pluralUnit(durationMonths, 'Month')}`;
  }

  const years = Math.floor(durationMonths / MONTHS_PER_YEAR);
  const months = durationMonths % MONTHS_PER_YEAR;
  const parts = [];

  if (years) parts.push(pluralize(years, 'Year'));
  if (months) parts.push(pluralize(months, 'Month'));

  return parts.length ? parts.join(' ') : pluralize(1, 'Month');
}

export function formatTimelineRange(row) {
  if (row.ongoing) return `since ${row.startYear}`;
  if (row.startYear === row.endYear) return String(row.startYear);
  return `${row.startYear}-${row.endYear}`;
}

export function createTimelineRows(clients, yearStart, yearEnd, currentDate = new Date()) {
  const rowsByTimeframe = new Map();
  const visibleStartMonthIndex = yearStart * MONTHS_PER_YEAR;
  const visibleEndMonthIndex = yearEnd * MONTHS_PER_YEAR + MONTHS_PER_YEAR - 1;

  clients.forEach(client => {
    const clientTimeline = client.timeline;
    if (!clientTimeline?.startYear) return;

    const startMonthIndex = getTimelineStartMonthIndex(clientTimeline);
    const endMonthIndex = getTimelineEndMonthIndex(clientTimeline, currentDate);
    if (endMonthIndex < visibleStartMonthIndex || startMonthIndex > visibleEndMonthIndex) return;

    const durationMonths = getTimelineDurationMonths(clientTimeline, currentDate);
    const rowKey = [
      startMonthIndex,
      endMonthIndex,
      clientTimeline.ongoing ? 'ongoing' : 'fixed',
    ].join('-');

    if (!rowsByTimeframe.has(rowKey)) {
      rowsByTimeframe.set(rowKey, {
        key: rowKey,
        startMonthIndex,
        endMonthIndex,
        visibleStartMonthIndex: Math.max(startMonthIndex, visibleStartMonthIndex),
        visibleEndMonthIndex: Math.min(endMonthIndex, visibleEndMonthIndex),
        startYear: getYearFromMonthIndex(startMonthIndex),
        endYear: getYearFromMonthIndex(endMonthIndex),
        durationMonths,
        ongoing: Boolean(clientTimeline.ongoing),
        clients: [],
      });
    }

    rowsByTimeframe.get(rowKey).clients.push(client);
  });

  return Array.from(rowsByTimeframe.values()).sort((a, b) => {
    if (a.startMonthIndex !== b.startMonthIndex) return a.startMonthIndex - b.startMonthIndex;
    return a.endMonthIndex - b.endMonthIndex;
  });
}

export { MONTHS_PER_YEAR };
