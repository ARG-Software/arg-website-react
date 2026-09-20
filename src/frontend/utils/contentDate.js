const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export function parseContentDate(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const writtenDate = /^(\w+)\s+(\d{1,2}),\s*(\d{4})$/.exec(trimmed);
  if (writtenDate) {
    const [, monthName, day, year] = writtenDate;
    const month = MONTHS[monthName.toLowerCase()];
    if (month !== undefined) return new Date(Date.UTC(Number(year), month, Number(day)));
  }

  const timestamp = Date.parse(trimmed);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function toContentDateIso(value) {
  return parseContentDate(value)?.toISOString() || '';
}

export function toContentDateOnly(value) {
  return toContentDateIso(value).slice(0, 10);
}
