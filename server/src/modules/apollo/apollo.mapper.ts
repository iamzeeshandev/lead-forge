import type { CompanyProfile } from '../../common/types/company-profile.js';
import type { ApolloOrganization } from './interfaces/apollo-organization.js';

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
