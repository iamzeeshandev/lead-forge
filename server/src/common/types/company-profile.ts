// Mirrors client/src/types/company.ts. Provider-neutral: nothing outside the
// Apollo module sees Apollo's field names.
export type ProviderSource = 'apollo';

export interface CompanyProfile {
  source: ProviderSource;
  externalId: string;
  name: string;
  domain: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  employeeCount: number | null;
  /** US dollars. */
  annualRevenue: number | null;
  foundedYear: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  shortDescription: string | null;
  technologies: string[];
}
