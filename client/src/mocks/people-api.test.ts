import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_FILTERS } from '@/features/people-search/search-params';
import { ApiError } from '@/lib/api-error';
import type { PeopleSearchParams } from '@/types/people-search';
import { searchPeople } from './people-api';

const base: PeopleSearchParams = {
  ...EMPTY_FILTERS,
  titles: ['CTO'],
  page: 1,
  perPage: 25,
};

async function run(params: PeopleSearchParams, signal?: AbortSignal) {
  const result = searchPeople(params, signal);
  await vi.runAllTimersAsync();
  return result;
}

describe('mock searchPeople', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the same people for the same search', async () => {
    const first = await run(base);
    const second = await run(base);
    expect(second).toEqual(first);
  });

  it('returns different people on different pages', async () => {
    const page1 = await run(base);
    const page2 = await run({ ...base, page: 2 });
    const ids = new Set(page1.items.map((person) => person.externalId));
    expect(page2.items.some((person) => ids.has(person.externalId))).toBe(
      false,
    );
  });

  it('keeps a person at the same position when perPage changes', async () => {
    const small = await run({ ...base, page: 2, perPage: 25 });
    const large = await run({ ...base, page: 1, perPage: 50 });
    expect(large.items[25]).toEqual(small.items[0]);
  });

  it('caps totalPages at 500 and honours perPage', async () => {
    const result = await run({ ...EMPTY_FILTERS, page: 1, perPage: 10 });
    expect(result.items).toHaveLength(10);
    expect(result.meta.totalPages).toBe(500);
    expect(result.meta.totalItems).toBeGreaterThan(5_000);
  });

  it('returns an empty page, not an error, past the last page', async () => {
    const first = await run({ ...base, perPage: 100 });
    const past = await run({
      ...base,
      perPage: 100,
      page: first.meta.totalPages + 1,
    });
    expect(past.items).toEqual([]);
    expect(past.meta.hasNextPage).toBe(false);
  });

  it('returns no results for the test:empty keyword', async () => {
    const result = await run({ ...base, keywords: 'test:empty' });
    expect(result.items).toEqual([]);
    expect(result.meta.totalItems).toBe(0);
  });

  it('rejects with an ApiError for an error trigger', async () => {
    const result = searchPeople({ ...base, keywords: 'test:rate-limit' });
    const assertion = expect(result).rejects.toMatchObject({
      status: 429,
      code: 'PROVIDER_RATE_LIMITED',
      retryAfterSeconds: 840,
    });
    await vi.runAllTimersAsync();
    await assertion;
    await expect(result).rejects.toBeInstanceOf(ApiError);
  });

  it('stops when the request is aborted', async () => {
    const controller = new AbortController();
    const result = searchPeople(base, controller.signal);
    controller.abort();
    await expect(result).rejects.toThrow();
  });
});
