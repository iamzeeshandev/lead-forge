import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PeopleSearchParams } from '@/types/people-search';
import { searchPeople } from './api';

export function usePeopleSearch(params: PeopleSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ['people-search', params],
    queryFn: ({ signal }) => searchPeople(params, signal),
    enabled,
    // Keeps the current page on screen while the next one loads, so the table doesn't flash empty.
    placeholderData: keepPreviousData,
  });
}
