import { useQuery } from '@tanstack/react-query';
import { lookupCompany } from './api';

/**
 * Keyed by the normalised domain, so looking the same company up again within
 * the cache window reuses the result instead of spending another Apollo credit.
 */
export function useCompanyLookup(domain: string | null) {
  return useQuery({
    queryKey: ['company-lookup', domain],
    queryFn: ({ signal }) => lookupCompany(domain ?? '', signal),
    enabled: domain !== null,
    staleTime: 60 * 60_000,
  });
}
