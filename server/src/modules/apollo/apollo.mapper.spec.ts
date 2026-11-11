import { readFileSync } from 'node:fs';
import { mapApolloOrganization } from './apollo.mapper.js';
import type {
  ApolloOrganization,
  ApolloOrganizationEnrichResponse,
} from './interfaces/apollo-organization.js';

// A real response (2026-11-11), with long lists we don't map shortened.
const fixture = JSON.parse(
  readFileSync(
    new URL(
      './__fixtures__/organization-enrich.apollo-io.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as Required<ApolloOrganizationEnrichResponse>;

describe('mapApolloOrganization', () => {
  it('maps a real enrichment response', () => {
    const company = mapApolloOrganization(fixture.organization);

    expect(company).toEqual({
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
      shortDescription: expect.stringMatching(/^Apollo\.io is /),
      technologies: expect.arrayContaining(['Google Cloud', 'Amplitude']),
    });
  });

  it('removes the repeated technology names Apollo sends', () => {
    const company = mapApolloOrganization(fixture.organization);

    expect(fixture.organization.technology_names).toHaveLength(195);
    expect(company.technologies).toHaveLength(191);
  });

  it('turns missing, null and blank fields into null', () => {
    const raw: ApolloOrganization = {
      id: 'org-1',
      name: 'Corvid',
      website_url: '   ',
      linkedin_url: null,
      estimated_num_employees: null,
    };

    expect(mapApolloOrganization(raw)).toEqual({
      source: 'apollo',
      externalId: 'org-1',
      name: 'Corvid',
      domain: null,
      websiteUrl: null,
      linkedinUrl: null,
      industry: null,
      employeeCount: null,
      annualRevenue: null,
      foundedYear: null,
      city: null,
      state: null,
      country: null,
      shortDescription: null,
      technologies: [],
    });
  });

  it('falls back to the domain, then the id, when the name is missing', () => {
    expect(
      mapApolloOrganization({ id: 'org-1', primary_domain: 'Corvid.example' })
        .name,
    ).toBe('corvid.example');
    expect(mapApolloOrganization({ id: 'org-1', name: ' ' }).name).toBe(
      'org-1',
    );
  });

  it('uses organization_revenue when annual_revenue is missing', () => {
    expect(
      mapApolloOrganization({ id: 'org-1', organization_revenue: 2_500_000 })
        .annualRevenue,
    ).toBe(2_500_000);
  });

  it('rejects numbers that cannot be real counts', () => {
    const company = mapApolloOrganization({
      id: 'org-1',
      estimated_num_employees: -1,
      annual_revenue: Number.NaN,
    });

    expect(company.employeeCount).toBeNull();
    expect(company.annualRevenue).toBeNull();
  });

  it('dedupes technologies case-insensitively and keeps the first spelling', () => {
    expect(
      mapApolloOrganization({
        id: 'org-1',
        technology_names: ['React', 'react', ' Next.js ', '', 'REACT'],
      }).technologies,
    ).toEqual(['React', 'Next.js']);
  });
});
