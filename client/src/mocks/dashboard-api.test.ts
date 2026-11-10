import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProspectPerson } from '@/types/prospect';
import { lookupCompany } from './companies-api';
import { getDashboardSummary } from './dashboard-api';
import {
  importLeads,
  listLeads,
  resetMockLeads,
  updateLead,
} from './leads-api';

function prospect(
  externalId: string,
  companyName: string,
  hasEmail = true,
): ProspectPerson {
  return {
    source: 'apollo',
    externalId,
    firstName: 'Ada',
    lastNameMasked: 'Lo***e',
    title: 'CTO',
    companyName,
    hasEmail,
    directPhone: 'no',
    hasLocation: true,
    lastRefreshedAt: null,
  };
}

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe('mock dashboard summary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockLeads();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts leads, companies, email availability and statuses', async () => {
    await settle(
      importLeads([
        prospect('a', 'Corvid Analytics'),
        prospect('b', 'corvid analytics'),
        prospect('c', 'Brightwell Health', false),
      ]),
    );
    const [lead] = (
      await settle(listLeads({ q: '', status: null, page: 1, perPage: 25 }))
    ).items;
    await settle(updateLead(lead.id, { status: 'qualified' }));

    const summary = await settle(getDashboardSummary());
    expect(summary.totals).toMatchObject({
      leads: 3,
      companies: 2,
      emailAvailable: 2,
      emailRevealed: 0,
      savedLast7Days: 3,
    });
    expect(summary.byStatus).toEqual({
      new: 2,
      contacted: 0,
      qualified: 1,
      disqualified: 0,
    });
    expect(summary.topCompanies[0]).toMatchObject({
      name: 'Corvid Analytics',
      leads: 2,
    });
  });

  it('only counts leads from the last 7 days as recent', async () => {
    await settle(importLeads([prospect('a', 'Corvid Analytics')]));
    const inTwoWeeks = Date.now() + 14 * 86_400_000;
    const summary = await settle(getDashboardSummary(undefined, inTwoWeeks));
    expect(summary.totals.savedLast7Days).toBe(0);
  });
});

describe('mock lookupCompany', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finds a company however the domain is written', async () => {
    const company = await settle(
      lookupCompany('https://www.Apollo.io/pricing'),
    );
    expect(company).toMatchObject({ name: 'Apollo.io', employeeCount: 800 });
  });

  it.each([
    ['unknown-company.example', 404, 'NOT_FOUND'],
    ['not a domain', 400, 'VALIDATION_FAILED'],
    ['rate-limit.example', 429, 'PROVIDER_RATE_LIMITED'],
  ])('rejects %s with %i %s', async (domain, status, code) => {
    const result = lookupCompany(domain);
    const assertion = expect(result).rejects.toMatchObject({ status, code });
    await vi.runAllTimersAsync();
    await assertion;
  });
});
