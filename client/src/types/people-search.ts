// Our own values, not Apollo's parameter formats: the server maps them to the
// provider, so the client and the URL never depend on one provider's API.
export const SENIORITIES = [
  'owner',
  'founder',
  'c_suite',
  'partner',
  'vp',
  'head',
  'director',
  'manager',
  'senior',
  'entry',
] as const;

export const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001+',
] as const;

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export type Seniority = (typeof SENIORITIES)[number];
export type CompanySize = (typeof COMPANY_SIZES)[number];
export type PerPage = (typeof PER_PAGE_OPTIONS)[number];

export interface PeopleSearchFilters {
  keywords: string;
  titles: string[];
  includeSimilarTitles: boolean;
  seniorities: Seniority[];
  locations: string[];
  companySizes: CompanySize[];
  domains: string[];
}

/** Query of `GET /api/people`. The URL of the People page uses the same names. */
export interface PeopleSearchParams extends PeopleSearchFilters {
  page: number;
  perPage: PerPage;
}
