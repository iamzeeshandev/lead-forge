/** "2026-10-28" from an ISO date-time; dates in data tables stay locale-neutral and sortable. */
export function formatDay(isoDateTime: string | null): string {
  return isoDateTime ? isoDateTime.slice(0, 10) : '—';
}

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** "$150M" from 150000000. */
export function formatCompactCurrency(value: number | null): string {
  return value === null ? '—' : compactCurrency.format(value);
}

export function formatNumber(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('en-US');
}

export function formatDateTime(isoDateTime: string | null): string {
  if (!isoDateTime) {
    return '—';
  }
  return new Date(isoDateTime).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
