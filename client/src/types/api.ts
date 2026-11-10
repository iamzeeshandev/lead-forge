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

export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'PROVIDER_ACCESS_DENIED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR';

/** The JSON body of every non-2xx response from the LeadForge API. */
export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  retryAfterSeconds?: number;
  /** The provider's request id (Apollo's x-request-id), for support tickets. */
  requestId?: string;
}
