/**
 * A person from an external search, as the LeadForge API returns it.
 * Provisional: the real API contract is designed together in task 2.3.
 */
export interface ProspectPerson {
  externalId: string;
  firstName: string;
  lastNameMasked: string | null;
  title: string | null;
  companyName: string | null;
  hasEmail: boolean;
  directPhone: 'yes' | 'maybe' | 'no';
  lastRefreshedAt: string | null;
}
