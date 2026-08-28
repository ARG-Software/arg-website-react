export function formatDateTime(value) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatCountry(countryCode) {
  if (!countryCode || countryCode === '??') return 'Unknown';

  try {
    return (
      new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(countryCode) ||
      countryCode
    );
  } catch {
    return countryCode;
  }
}

export function formatCountryBreakdown(items) {
  return items
    .map(item => ({
      ...item,
      label: formatCountry(item.label),
      value: Number(item.value || 0),
    }))
    .filter(item => item.value > 0);
}

export function createReferrerRow(item) {
  return {
    id: item.label,
    label: item.label,
    value: item.value,
  };
}

export function formatDuration(valueMs) {
  const durationMs = Number(valueMs || 0);
  if (!Number.isFinite(durationMs) || durationMs <= 0) return '-';

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 1) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
