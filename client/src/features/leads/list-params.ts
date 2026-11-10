import { z } from 'zod';
import { LEAD_STATUSES, type LeadListParams } from '@/types/lead';

export const DEFAULT_PER_PAGE = 25;

const listSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  status: z.enum(LEAD_STATUSES).nullable().catch(null),
  page: z.coerce.number().int().min(1).catch(1),
  perPage: z.coerce
    .number()
    .pipe(z.literal([10, 25, 50, 100]))
    .catch(DEFAULT_PER_PAGE),
});

type SearchParamsReader = Pick<URLSearchParams, 'get'>;

export function parseListParams(search: SearchParamsReader): LeadListParams {
  return listSchema.parse({
    q: search.get('q') ?? undefined,
    status: search.get('status'),
    page: search.get('page') ?? undefined,
    perPage: search.get('perPage') ?? undefined,
  });
}

export function toListSearchParams(params: LeadListParams): URLSearchParams {
  const search = new URLSearchParams();
  if (params.q) {
    search.set('q', params.q);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.page > 1) {
    search.set('page', String(params.page));
  }
  if (params.perPage !== DEFAULT_PER_PAGE) {
    search.set('perPage', String(params.perPage));
  }
  return search;
}
