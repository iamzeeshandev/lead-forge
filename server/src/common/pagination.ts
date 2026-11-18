// Mirrors client/src/types/api.ts.
export interface PaginationMeta {
  page: number;
  perPage: number;
  totalItems: number;
  /** Capped by the provider: Apollo serves at most 500 pages, whatever totalItems says. */
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Apollo's search returns only `total_entries`, no pagination object, so the
 * page counts are ours to compute. 48,213 results at 25 per page is 1,929 pages,
 * but only 500 are reachable.
 */
export function buildPaginationMeta(
  totalItems: number,
  page: number,
  perPage: number,
  maxPages = Number.POSITIVE_INFINITY,
): PaginationMeta {
  const totalPages = Math.min(Math.ceil(totalItems / perPage), maxPages);
  return {
    page,
    perPage,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
