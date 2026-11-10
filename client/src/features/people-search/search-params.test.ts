import { describe, expect, it } from 'vitest';
import type { PeopleSearchParams } from '@/types/people-search';
import {
  countActiveFilters,
  EMPTY_FILTERS,
  filtersKey,
  hasSearched,
  parseSearchParams,
  toSearchParams,
} from './search-params';

const full: PeopleSearchParams = {
  keywords: 'platform',
  titles: ['VP Engineering', 'CTO'],
  includeSimilarTitles: false,
  seniorities: ['vp', 'head'],
  locations: ['United States'],
  companySizes: ['51-200', '201-500'],
  domains: ['acme.com'],
  page: 3,
  perPage: 50,
};

describe('parseSearchParams', () => {
  it('returns defaults for an empty URL', () => {
    expect(parseSearchParams(new URLSearchParams())).toEqual({
      ...EMPTY_FILTERS,
      page: 1,
      perPage: 25,
    });
  });

  it('reads repeated keys as lists', () => {
    const search = new URLSearchParams(
      'titles=CTO&titles=VP+Engineering&seniorities=vp&seniorities=head&page=2',
    );
    const params = parseSearchParams(search);
    expect(params.titles).toEqual(['CTO', 'VP Engineering']);
    expect(params.seniorities).toEqual(['vp', 'head']);
    expect(params.page).toBe(2);
  });

  it.each([
    ['page=abc', 'page', 1],
    ['page=0', 'page', 1],
    ['page=501', 'page', 1],
    ['page=2.5', 'page', 1],
    ['perPage=7', 'perPage', 25],
    ['perPage=lots', 'perPage', 25],
  ])('falls back to the default for %s', (query, key, expected) => {
    const params = parseSearchParams(new URLSearchParams(query));
    expect(params[key as keyof PeopleSearchParams]).toBe(expected);
  });

  it('drops values the API does not accept', () => {
    const params = parseSearchParams(
      new URLSearchParams(
        'seniorities=vp&seniorities=wizard&companySizes=huge&companySizes=1-10',
      ),
    );
    expect(params.seniorities).toEqual(['vp']);
    expect(params.companySizes).toEqual(['1-10']);
  });

  it('trims, drops empty and de-duplicates text lists ignoring case', () => {
    const params = parseSearchParams(
      new URLSearchParams('titles=+CTO+&titles=&titles=cto&titles=VP'),
    );
    expect(params.titles).toEqual(['CTO', 'VP']);
  });

  it('only turns similar titles off for an explicit "false"', () => {
    expect(
      parseSearchParams(new URLSearchParams('includeSimilarTitles=false'))
        .includeSimilarTitles,
    ).toBe(false);
    expect(
      parseSearchParams(new URLSearchParams('includeSimilarTitles=no'))
        .includeSimilarTitles,
    ).toBe(true);
  });
});

describe('toSearchParams', () => {
  it('round-trips every field', () => {
    expect(parseSearchParams(toSearchParams(full))).toEqual(full);
  });

  it('leaves defaults out of the URL but always writes the page', () => {
    const search = toSearchParams({ ...EMPTY_FILTERS, page: 1, perPage: 25 });
    expect(search.toString()).toBe('page=1');
  });

  it('marks that a search ran, even with no filters', () => {
    expect(hasSearched(new URLSearchParams())).toBe(false);
    expect(
      hasSearched(toSearchParams({ ...EMPTY_FILTERS, page: 1, perPage: 25 })),
    ).toBe(true);
  });
});

describe('filtersKey', () => {
  it('ignores paging, so selection survives page changes', () => {
    expect(filtersKey({ ...full, page: 1 } as PeopleSearchParams)).toBe(
      filtersKey(full),
    );
  });

  it('changes when a filter changes', () => {
    expect(filtersKey({ ...full, titles: ['CTO'] })).not.toBe(filtersKey(full));
  });
});

describe('countActiveFilters', () => {
  it('counts each non-empty filter once', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
    expect(countActiveFilters(full)).toBe(6);
  });

  it('ignores whitespace-only keywords', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, keywords: '   ' })).toBe(0);
  });
});
