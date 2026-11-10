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
