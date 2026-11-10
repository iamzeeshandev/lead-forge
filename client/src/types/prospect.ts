export type ProspectSource = 'apollo';

/**
 * A person from an external search, as the LeadForge API returns it. It holds
 * only what the provider's free search exposes: no email or phone, a masked
 * last name, and flags saying whether those details exist.
 */
export interface ProspectPerson {
  source: ProspectSource;
  externalId: string;
  firstName: string | null;
  lastNameMasked: string | null;
  title: string | null;
  companyName: string | null;
  hasEmail: boolean;
  directPhone: 'yes' | 'maybe' | 'no';
  hasLocation: boolean;
  /** ISO 8601 date-time. */
  lastRefreshedAt: string | null;
}
