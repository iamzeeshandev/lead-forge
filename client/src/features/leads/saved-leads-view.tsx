'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DataTable } from '@/components/data/data-table';
import { Pagination } from '@/components/data/pagination';
import { PerPageSelect } from '@/components/data/per-page-select';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SearchInput } from '@/components/filters/search-input';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatRange } from '@/lib/pagination';
import { cn } from '@/lib/utils';
import {
  LEAD_STATUSES,
  type LeadListParams,
  type LeadStatus,
} from '@/types/lead';
import { PER_PAGE_OPTIONS } from '@/types/people-search';
import { LEAD_STATUS_LABELS } from './lead-display';
import { leadColumns } from './leads-columns';
import { parseListParams, toListSearchParams } from './list-params';
import { useLeads } from './queries';

const PAGE_HEADER = {
  title: 'Saved leads',
  description:
    "People you've saved from search, with their status, notes and source.",
};

export function SavedLeadsFallback() {
  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-6 px-6 pt-6 pb-8">
      <PageHeader {...PAGE_HEADER} />
    </main>
  );
}

const STATUS_FILTERS: ReadonlyArray<LeadStatus | null> = [
  null,
  ...LEAD_STATUSES,
];

export function SavedLeadsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(() => parseListParams(searchParams), [searchParams]);
  const leads = useLeads(params);

  const navigate = useCallback(
    (next: LeadListParams, mode: 'push' | 'replace' = 'push') => {
      const query = toListSearchParams(next).toString();
      router[mode](query ? `/leads?${query}` : '/leads', { scroll: false });
    },
    [router],
  );

  // This searches our own database, so it filters as you type instead of
  // waiting for a submit like the Apollo search, which spends rate limit.
  const [query, setQuery] = useState(params.q);
  const [urlQuery, setUrlQuery] = useState(params.q);
  if (params.q !== urlQuery) {
    // The URL changed from outside the input (Back/Forward): follow it.
    setUrlQuery(params.q);
    setQuery(params.q);
  }

  useEffect(() => {
    const next = query.trim();
    if (next === params.q) {
      return;
    }
    const timer = setTimeout(() => {
      // Recorded first, so the URL update isn't mistaken for an outside change
      // that would overwrite what the user typed in the meantime.
      setUrlQuery(next);
      navigate({ ...params, q: next, page: 1 }, 'replace');
    }, 300);
    return () => clearTimeout(timer);
  }, [query, params, navigate]);

  const data = leads.data;
  const filtered = params.q !== '' || params.status !== null;
  const pastLastPage =
    data !== undefined && data.items.length === 0 && data.meta.totalItems > 0;

  let results: ReactNode;
  if (leads.isError) {
    results = (
      <ErrorState
        title="Couldn't load saved leads"
        description="Something went wrong while loading the list. Try again."
        action={
          <Button variant="outline" onClick={() => leads.refetch()}>
            Try again
          </Button>
        }
      />
    );
  } else if (data && data.meta.totalItems === 0 && !filtered) {
    results = (
      <EmptyState
        title="No saved leads yet"
        description="Leads you save from People search land here with their source and import date. Saving costs no credits."
        action={
          <Link href="/people" className={buttonVariants()}>
            Search people
          </Link>
        }
      />
    );
  } else {
    results = (
      <>
        <DataTable
          label="Saved leads"
          columns={leadColumns}
          data={data?.items ?? []}
          getRowId={(lead) => lead.id}
          isLoading={leads.isPending}
          isRefreshing={leads.isPlaceholderData}
          loadingRows={8}
          minWidth="860px"
          empty={
            pastLastPage
              ? {
                  title: `Page ${params.page} is past the last page`,
                  description: `There are ${data.meta.totalPages} pages of saved leads.`,
                }
              : {
                  title: 'No leads match',
                  description: 'Try a different search or status.',
                }
          }
        />
        {data && data.meta.totalItems > 0 && (
          <Pagination
            page={params.page}
            totalPages={data.meta.totalPages}
            onPageChange={(page) => navigate({ ...params, page })}
            summary={
              <>
                Showing{' '}
                <span className="font-mono text-foreground">
                  {formatRange(
                    params.page,
                    params.perPage,
                    data.meta.totalItems,
                  )}
                </span>{' '}
                of{' '}
                <span className="font-mono text-foreground">
                  {data.meta.totalItems.toLocaleString('en-US')}
                </span>
              </>
            }
          />
        )}
      </>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-4 px-6 pt-6 pb-8">
      <PageHeader
        {...PAGE_HEADER}
        actions={
          <PerPageSelect
            value={params.perPage}
            options={PER_PAGE_OPTIONS}
            onValueChange={(perPage) =>
              navigate({ ...params, perPage, page: 1 })
            }
          />
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          aria-label="Search saved leads"
          placeholder="Name, title, company or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full max-w-80"
        />
        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap gap-1"
        >
          {STATUS_FILTERS.map((status) => {
            const active = params.status === status;
            return (
              <Button
                key={status ?? 'all'}
                size="sm"
                variant="outline"
                aria-pressed={active}
                onClick={() => navigate({ ...params, status, page: 1 })}
                className={cn(
                  active &&
                    'border-foreground bg-foreground text-background hover:bg-foreground/90',
                )}
              >
                {status ? LEAD_STATUS_LABELS[status] : 'All'}
              </Button>
            );
          })}
        </div>
      </div>

      {results}
    </main>
  );
}
