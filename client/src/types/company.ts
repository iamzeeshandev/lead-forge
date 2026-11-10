import type { ProspectSource } from './prospect';

/**
 * A company from a provider lookup by domain, as the LeadForge API returns it.
 * Shaped after a real Apollo organization enrichment response.
 */
export interface CompanyProfile {
  source: ProspectSource;
  externalId: string;
  name: string;
  domain: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  employeeCount: number | null;
  /** US dollars. Apollo also sends display strings like "150M"; the number is the one to trust. */
  annualRevenue: number | null;
  foundedYear: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  shortDescription: string | null;
  /** De-duplicated: Apollo's technology list repeats some names. */
  technologies: string[];
}

/** A company name as it appears on saved leads, until companies get their own records. */
export interface LeadCompany {
  name: string;
  leads: number;
  lastSavedAt: string;
}
