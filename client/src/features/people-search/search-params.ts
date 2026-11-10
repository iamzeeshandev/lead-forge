import { z } from 'zod';
import {
  COMPANY_SIZES,
  type PeopleSearchFilters,
  type PeopleSearchParams,
  type PerPage,
  SENIORITIES,
} from '@/types/people-search';

export const DEFAULT_PER_PAGE: PerPage = 25;
export const MAX_PAGE = 500;

export const EMPTY_FILTERS: PeopleSearchFilters = {
  keywords: '',
  titles: [],
  includeSimilarTitles: true,
  seniorities: [],
  locations: [],
  companySizes: [],
  domains: [],
};

function uniqueIgnoringCase(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const textList = z
  .array(z.string())
  .transform((values) =>
    uniqueIgnoringCase(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 100),
    ).slice(0, 99),
  );

function allowedList<T extends string>(allowed: readonly T[]) {
  return z
    .array(z.string())
    .transform((values) =>
      values.filter((value): value is T => allowed.includes(value as T)),
    );
}

// The URL is user input: every field falls back to its default instead of throwing.
const searchSchema = z.object({
  keywords: z.string().trim().max(200).catch(''),
  titles: textList,
  includeSimilarTitles: z
    .string()
    .nullable()
    .transform((value) => value !== 'false'),
  seniorities: allowedList(SENIORITIES),
  locations: textList,
  companySizes: allowedList(COMPANY_SIZES),
  domains: textList,
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1),
  perPage: z.coerce
    .number()
    .pipe(z.literal([10, 25, 50, 100]))
    .catch(DEFAULT_PER_PAGE),
});

type SearchParamsReader = Pick<URLSearchParams, 'get' | 'getAll' | 'has'>;

export function parseSearchParams(
  search: SearchParamsReader,
): PeopleSearchParams {
  return searchSchema.parse({
    keywords: search.get('keywords') ?? undefined,
    titles: search.getAll('titles'),
    includeSimilarTitles: search.get('includeSimilarTitles'),
    seniorities: search.getAll('seniorities'),
    locations: search.getAll('locations'),
    companySizes: search.getAll('companySizes'),
    domains: search.getAll('domains'),
    page: search.get('page') ?? undefined,
    perPage: search.get('perPage') ?? undefined,
  });
}

export function toSearchParams(params: PeopleSearchParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.keywords) {
    search.set('keywords', params.keywords);
  }
  params.titles.forEach((title) => search.append('titles', title));
  if (!params.includeSimilarTitles) {
    search.set('includeSimilarTitles', 'false');
  }
  params.seniorities.forEach((seniority) =>
    search.append('seniorities', seniority),
  );
  params.locations.forEach((location) => search.append('locations', location));
  params.companySizes.forEach((size) => search.append('companySizes', size));
  params.domains.forEach((domain) => search.append('domains', domain));
  // Always written, even for page 1: its presence is what marks that a search ran.
  search.set('page', String(params.page));
  if (params.perPage !== DEFAULT_PER_PAGE) {
    search.set('perPage', String(params.perPage));
  }
  return search;
}

export function hasSearched(search: SearchParamsReader): boolean {
  return search.has('page');
}

/** Identifies a search independent of paging; row selection resets when it changes. */
export function filtersKey(filters: PeopleSearchFilters): string {
  return JSON.stringify([
    filters.keywords,
    filters.titles,
    filters.includeSimilarTitles,
    filters.seniorities,
    filters.locations,
    filters.companySizes,
    filters.domains,
  ]);
}

export function countActiveFilters(filters: PeopleSearchFilters): number {
  return [
    filters.keywords.trim(),
    filters.titles,
    filters.seniorities,
    filters.locations,
    filters.companySizes,
    filters.domains,
  ].filter((filter) => filter.length > 0).length;
}
