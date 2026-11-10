import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { LeadListParams, LeadUpdate } from '@/types/lead';
import type { ProspectPerson, ProspectSource } from '@/types/prospect';
import {
  deleteLead,
  findSavedProspects,
  getLead,
  importLeads,
  listLeads,
  updateLead,
} from './api';

// Every key starts with 'leads', so one invalidation refreshes lists, details
// and the "already saved" markers in search together.
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (params: LeadListParams) => [...leadKeys.lists(), params] as const,
  detail: (id: string) => [...leadKeys.all, 'detail', id] as const,
  saved: (source: ProspectSource, externalIds: string[]) =>
    [...leadKeys.all, 'saved', source, externalIds] as const,
};

export function useLeads(params: LeadListParams) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: ({ signal }) => listLeads(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: ({ signal }) => getLead(id, signal),
  });
}

export function useSavedProspects(
  source: ProspectSource,
  externalIds: string[],
) {
  return useQuery({
    queryKey: leadKeys.saved(source, externalIds),
    queryFn: ({ signal }) => findSavedProspects(source, externalIds, signal),
    enabled: externalIds.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (people: ProspectPerson[]) => importLeads(people),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: LeadUpdate) => updateLead(id, update),
    onSuccess: (lead) => {
      queryClient.setQueryData(leadKeys.detail(id), lead);
      return queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

export function useDeleteLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteLead(id),
    onSuccess: () => {
      // Removed rather than invalidated: refetching a deleted lead would only produce a 404.
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
