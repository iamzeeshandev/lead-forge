/** "2026-10-28" from an ISO date-time; dates in data tables stay locale-neutral and sortable. */
export function formatDay(isoDateTime: string | null): string {
  return isoDateTime ? isoDateTime.slice(0, 10) : '—';
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
