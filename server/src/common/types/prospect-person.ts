import type { ProviderSource } from './company-profile.js';

/**
 * A person from a provider search. Mirrors client/src/types/prospect.ts: only
 * what the free search exposes, so no email or phone and a masked last name.
 */
export interface ProspectPerson {
  source: ProviderSource;
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
