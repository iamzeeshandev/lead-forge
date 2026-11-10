import type { ProspectPerson } from '@/types/prospect';

export const PHONE_LABELS: Record<ProspectPerson['directPhone'], string> = {
  yes: 'Yes',
  maybe: 'Maybe',
  no: '—',
};

export function personLabel(person: ProspectPerson): string {
  return (
    [person.firstName, person.lastNameMasked].filter(Boolean).join(' ') ||
    'Unnamed person'
  );
}

/** "2026-10-28" from an ISO date-time; dates in data tables stay locale-neutral and sortable. */
export function formatDay(isoDateTime: string | null): string {
  return isoDateTime ? isoDateTime.slice(0, 10) : '—';
}
