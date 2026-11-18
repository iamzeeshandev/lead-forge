import type { CompanyProfile } from '../../common/types/company-profile.js';
import type { ProspectPerson } from '../../common/types/prospect-person.js';
import type {
  CompanySize,
  SearchPeopleQuery,
} from './dto/search-people.query.js';
import type { ApolloOrganization } from './interfaces/apollo-organization.js';
import type {
  ApolloPeopleSearchParams,
  ApolloSearchPerson,
} from './interfaces/apollo-person.js';

export const APOLLO_MAX_PAGES = 500;

// Apollo wants "min,max" with both ends, so the open-ended bucket gets an upper bound.
const EMPLOYEE_RANGES: Record<CompanySize, string> = {
  '1-10': '1,10',
  '11-50': '11,50',
  '51-200': '51,200',
  '201-500': '201,500',
  '501-1000': '501,1000',
  '1001-5000': '1001,5000',
  '5001+': '5001,1000000',
};

/** Our filters → Apollo's parameters. Empty filters are left out, not sent empty. */
export function toApolloPeopleSearchParams(
  query: SearchPeopleQuery,
): ApolloPeopleSearchParams {
  const params: ApolloPeopleSearchParams = {
    page: query.page,
    per_page: query.perPage,
  };
  if (query.keywords) {
    params.q_keywords = query.keywords;
  }
  if (query.titles.length > 0) {
    params.person_titles = query.titles;
    // Apollo's default is true, so only the strict case needs sending.
    if (!query.includeSimilarTitles) {
      params.include_similar_titles = false;
    }
  }
  if (query.seniorities.length > 0) {
    params.person_seniorities = query.seniorities;
  }
  if (query.locations.length > 0) {
    params.person_locations = query.locations;
  }
  if (query.companySizes.length > 0) {
    params.organization_num_employees_ranges = query.companySizes.map(
      (size) => EMPLOYEE_RANGES[size],
    );
  }
  if (query.domains.length > 0) {
    params.q_organization_domains_list = query.domains;
  }
  return params;
}

export function mapApolloPerson(raw: ApolloSearchPerson): ProspectPerson {
  return {
    source: 'apollo',
    externalId: raw.id,
    firstName: text(raw.first_name),
    lastNameMasked: text(raw.last_name_obfuscated),
    title: text(raw.title),
    companyName: text(raw.organization?.name),
    hasEmail: raw.has_email === true,
    directPhone: phoneAvailability(raw.has_direct_phone),
    hasLocation:
      raw.has_city === true ||
      raw.has_state === true ||
      raw.has_country === true,
    lastRefreshedAt: isoDate(raw.last_refreshed_at),
  };
}

// Matched by prefix: the "Maybe" value carries advice text that Apollo may reword.
function phoneAvailability(
  value: string | null | undefined,
): ProspectPerson['directPhone'] {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (normalized === 'yes') {
    return 'yes';
  }
  return normalized.startsWith('maybe') ? 'maybe' : 'no';
}

function isoDate(value: string | null | undefined): string | null {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function mapApolloOrganization(raw: ApolloOrganization): CompanyProfile {
  const domain = text(raw.primary_domain)?.toLowerCase() ?? null;
  return {
    source: 'apollo',
    externalId: raw.id,
    name: text(raw.name) ?? domain ?? raw.id,
    domain,
    websiteUrl: text(raw.website_url),
    linkedinUrl: text(raw.linkedin_url),
    industry: text(raw.industry),
    employeeCount: count(raw.estimated_num_employees),
    // annual_revenue is the documented field; organization_revenue is a fallback seen in real responses.
    annualRevenue: count(raw.annual_revenue) ?? count(raw.organization_revenue),
    foundedYear: count(raw.founded_year),
    city: text(raw.city),
    state: text(raw.state),
    country: text(raw.country),
    shortDescription: text(raw.short_description),
    technologies: uniqueNames(raw.technology_names),
  };
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function count(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function uniqueNames(names: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names ?? []) {
    const value = text(name);
    if (value && !seen.has(value.toLowerCase())) {
      seen.add(value.toLowerCase());
      result.push(value);
    }
  }
  return result;
}
