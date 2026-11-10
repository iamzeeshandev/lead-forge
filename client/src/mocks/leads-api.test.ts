import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeadListParams } from '@/types/lead';
import type { ProspectPerson } from '@/types/prospect';
import {
  deleteLead,
  findSavedProspects,
  getLead,
  importLeads,
  listLeads,
  resetMockLeads,
  updateLead,
} from './leads-api';

function prospect(
  externalId: string,
  overrides: Partial<ProspectPerson> = {},
): ProspectPerson {
  return {
    source: 'apollo',
    externalId,
    firstName: 'Priya',
    lastNameMasked: 'Sh***a',
    title: 'VP Engineering',
    companyName: 'Corvid Analytics',
    hasEmail: true,
    directPhone: 'maybe',
    hasLocation: true,
    lastRefreshedAt: '2026-10-30T00:00:00.000Z',
    ...overrides,
  };
}

const listAll: LeadListParams = { q: '', status: null, page: 1, perPage: 25 };

function must<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected a value');
  }
  return value;
}

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe('mock leads API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetMockLeads();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('imports new people as leads with status "new"', async () => {
    const result = await settle(importLeads([prospect('a'), prospect('b')]));
    expect(result).toEqual({ imported: 2, skipped: 0 });

    const { items } = await settle(listLeads(listAll));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      status: 'new',
      enrichmentStatus: 'not_enriched',
      lastName: null,
    });
  });

  it('skips people who are already saved', async () => {
    await settle(importLeads([prospect('a')]));
    const result = await settle(importLeads([prospect('a'), prospect('b')]));
    expect(result).toEqual({ imported: 1, skipped: 1 });
  });

  it('skips a person listed twice in the same request', async () => {
    const result = await settle(importLeads([prospect('a'), prospect('a')]));
    expect(result).toEqual({ imported: 1, skipped: 1 });
  });

  it('filters by status and by every word of the query', async () => {
    await settle(
      importLeads([
        prospect('a', { firstName: 'Priya', companyName: 'Corvid Analytics' }),
        prospect('b', {
          firstName: 'Marcus',
          companyName: 'Brightwell Health',
        }),
      ]),
    );
    const { items: all } = await settle(listLeads(listAll));
    const marcus = must(all.find((lead) => lead.firstName === 'Marcus'));
    await settle(updateLead(marcus.id, { status: 'qualified' }));

    const byStatus = await settle(
      listLeads({ ...listAll, status: 'qualified' }),
    );
    expect(byStatus.items.map((lead) => lead.firstName)).toEqual(['Marcus']);

    const byQuery = await settle(listLeads({ ...listAll, q: 'priya corvid' }));
    expect(byQuery.items.map((lead) => lead.firstName)).toEqual(['Priya']);
  });

  it('paginates with consistent metadata', async () => {
    await settle(
      importLeads(
        Array.from({ length: 12 }, (_, index) => prospect(`p${index}`)),
      ),
    );
    const page = await settle(listLeads({ ...listAll, perPage: 10, page: 2 }));
    expect(page.items).toHaveLength(2);
    expect(page.meta).toMatchObject({
      totalItems: 12,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('stores trimmed notes, and an empty note as null', async () => {
    await settle(importLeads([prospect('a')]));
    const [lead] = (await settle(listLeads(listAll))).items;

    expect(
      (await settle(updateLead(lead.id, { notes: '  Met at a conference  ' })))
        .notes,
    ).toBe('Met at a conference');
    expect(
      (await settle(updateLead(lead.id, { notes: '   ' }))).notes,
    ).toBeNull();
  });

  it('keeps notes when only the status changes', async () => {
    await settle(importLeads([prospect('a')]));
    const [lead] = (await settle(listLeads(listAll))).items;
    await settle(updateLead(lead.id, { notes: 'Follow up in Q1' }));

    const updated = await settle(updateLead(lead.id, { status: 'contacted' }));
    expect(updated).toMatchObject({
      status: 'contacted',
      notes: 'Follow up in Q1',
    });
  });

  it('answers 404 for a lead that does not exist', async () => {
    const result = getLead('missing');
    const assertion = expect(result).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('deletes a lead, after which it is no longer marked as saved', async () => {
    await settle(importLeads([prospect('a')]));
    const [lead] = (await settle(listLeads(listAll))).items;
    expect(await settle(findSavedProspects('apollo', ['a', 'b']))).toEqual({
      a: lead.id,
    });

    await settle(deleteLead(lead.id));
    expect(await settle(findSavedProspects('apollo', ['a']))).toEqual({});
  });
});
