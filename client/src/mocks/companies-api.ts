import { ApiError } from '@/lib/api-error';
import { normalizeDomain } from '@/lib/domain';
import type { CompanyProfile, LeadCompany } from '@/types/company';
import { delay } from './delay';
import { mockLeadsSnapshot } from './leads-api';

// apollo.io is mapped from a real Apollo organization enrichment response
// (public company data); the other company is fictional and has gaps on purpose.
const COMPANIES: Record<string, CompanyProfile> = {
  'apollo.io': {
    source: 'apollo',
    externalId: '5e66b6381e05b4008c8331b8',
    name: 'Apollo.io',
    domain: 'apollo.io',
    websiteUrl: 'http://www.apollo.io',
    linkedinUrl: 'http://www.linkedin.com/company/apolloio',
    industry: 'information technology & services',
    employeeCount: 800,
    annualRevenue: 150_000_000,
    foundedYear: 2015,
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
    shortDescription:
      'B2B sales intelligence and engagement platform: a contact and company database with prospecting, outreach automation and CRM integrations.',
    technologies: [
      'Amazon AWS',
      'Cloudflare',
      'Docker',
      'Elasticsearch',
      'GitHub Actions',
      'Google Cloud',
      'Kafka',
      'Kubernetes',
      'MongoDB',
      'MySQL',
      'Next.js',
      'React',
      'Redis',
      'Ruby On Rails',
      'Salesforce',
      'Snowflake',
      'Stripe',
      'Tailwind CSS',
      'Terraform',
      'TypeScript',
    ],
  },
  'corvid-analytics.example': {
    source: 'apollo',
    externalId: '6512c0f3a1b2c3d4e5f6c001',
    name: 'Corvid Analytics',
    domain: 'corvid-analytics.example',
    websiteUrl: 'https://corvid-analytics.example',
    linkedinUrl: null,
    industry: 'computer software',
    employeeCount: 140,
    annualRevenue: null,
    foundedYear: null,
    city: 'Austin',
    state: 'Texas',
    country: 'United States',
    shortDescription: null,
    technologies: ['AWS', 'PostgreSQL', 'React'],
  },
};

export async function lookupCompany(
  domainInput: string,
  signal?: AbortSignal,
): Promise<CompanyProfile> {
  await delay(450, signal);
  const domain = normalizeDomain(domainInput);
  if (!domain) {
    throw new ApiError({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Enter a domain such as acme.com.',
    });
  }
  if (domain === 'rate-limit.example') {
    throw new ApiError({
      statusCode: 429,
      code: 'PROVIDER_RATE_LIMITED',
      message: "Apollo's hourly request limit is used up.",
      retryAfterSeconds: 300,
      requestId: 'mock-9e04b1c7',
    });
  }
  const company = COMPANIES[domain];
  if (!company) {
    throw new ApiError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: `Apollo has no company for ${domain}.`,
    });
  }
  return company;
}

/** Saved leads grouped by company name, most leads first. */
export function groupLeadsByCompany(): LeadCompany[] {
  const groups = new Map<string, LeadCompany>();
  for (const lead of mockLeadsSnapshot()) {
    const name = lead.companyName?.trim();
    if (!name) {
      continue;
    }
    // Grouped case-insensitively: providers don't always agree on capitalisation.
    const key = name.toLowerCase();
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { name, leads: 1, lastSavedAt: lead.createdAt });
    } else {
      group.leads += 1;
      if (lead.createdAt > group.lastSavedAt) {
        group.lastSavedAt = lead.createdAt;
      }
    }
  }
  return [...groups.values()].sort(
    (a, b) => b.leads - a.leads || a.name.localeCompare(b.name),
  );
}

export async function listLeadCompanies(
  signal?: AbortSignal,
): Promise<LeadCompany[]> {
  await delay(200, signal);
  return groupLeadsByCompany();
}
