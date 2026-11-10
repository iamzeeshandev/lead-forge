'use client';

import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { DataTable } from '@/components/data/data-table';
import { Pagination } from '@/components/data/pagination';
import { PerPageSelect } from '@/components/data/per-page-select';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { formatRange } from '@/lib/pagination';
import type { PaginationMeta } from '@/types/api';
import {
  PER_PAGE_OPTIONS,
  type PeopleSearchParams,
} from '@/types/people-search';
import type { ProspectPerson } from '@/types/prospect';
import { FilterForm } from './filter-form';
import { personLabel } from './format';
import { createPeopleColumns } from './people-columns';
import { ProspectSheet } from './prospect-sheet';
import { describeSearchError } from './search-error';
import {
  filtersKey,
  hasSearched,
  MAX_PAGE,
  parseSearchParams,
  toSearchParams,
} from './search-params';
import { usePeopleSearch } from './use-people-search';

const PAGE_HEADER = {
  title: 'People',
  badge: 'Sandbox data',
  description:
    "Apollo's free people search returns masked last names and availability flags only. Save a prospect to keep it; enrichment reveals the rest.",
};

export function PeopleSearchFallback() {
  return (
    <main className="flex flex-1 flex-col gap-3.5 px-6 pt-5 pb-7">
      <PageHeader {...PAGE_HEADER} />
    </main>
  );
}

function ResultsSummary({ meta }: { meta: PaginationMeta }) {
  const capped = meta.totalPages * meta.perPage < meta.totalItems;
  return (
    <>
      Showing{' '}
      <span className="font-mono text-foreground">
        {formatRange(meta.page, meta.perPage, meta.totalItems)}
      </span>{' '}
      of{' '}
      <span className="font-mono text-foreground">
        {meta.totalItems.toLocaleString('en-US')}
      </span>
      {capped && <> · Apollo shows the first {MAX_PAGE} pages</>}
    </>
  );
}

export function PeopleSearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const searched = hasSearched(searchParams);
  const search = usePeopleSearch(params, searched);
  const searchKey = filtersKey(params);

  // Stored with the search it belongs to: a new search starts with nothing
  // selected, while paging through the same search keeps the selection.
  const [selection, setSelection] = useState({
    searchKey,
    rows: {} as RowSelectionState,
  });
  const rowSelection = selection.searchKey === searchKey ? selection.rows : {};
  const selectedIds = Object.keys(rowSelection);

  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [openPerson, setOpenPerson] = useState<ProspectPerson | null>(null);

  const save = useCallback((ids: string[]) => {
    setSavedIds((current) => new Set([...current, ...ids]));
  }, []);

  const columns = useMemo(
    () =>
      createPeopleColumns({
        savedIds,
        onSave: (person) => save([person.externalId]),
        onOpen: setOpenPerson,
      }),
    [savedIds, save],
  );

  const handleSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    setSelection({
      searchKey,
      rows: typeof updater === 'function' ? updater(rowSelection) : updater,
    });
  };

  function navigate(next: PeopleSearchParams) {
    router.push(`/people?${toSearchParams(next).toString()}`, {
      scroll: false,
    });
  }

  function saveSelected() {
    save(selectedIds);
    setSelection({ searchKey, rows: {} });
  }

  const data = search.data;
  const pastLastPage =
    data !== undefined && data.items.length === 0 && data.meta.totalItems > 0;

  let results: ReactNode;
  if (!searched) {
    results = (
      <EmptyState
        title="No search yet"
        description="Choose job titles, seniority, location or company size, then select Search. Searching costs no credits; each page is one request against your hourly Apollo limit."
      />
    );
  } else if (search.isError) {
    const error = describeSearchError(search.error);
    results = (
      <ErrorState
        eyebrow={error.eyebrow}
        title={error.title}
        description={error.description}
        detail={error.detail}
        action={
          error.canRetry ? (
            <Button variant="outline" onClick={() => search.refetch()}>
              Try again
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    results = (
      <>
        <DataTable
          label="People search results"
          columns={columns}
          data={data?.items ?? []}
          getRowId={(person) => person.externalId}
          getRowLabel={personLabel}
          rowSelection={rowSelection}
          onRowSelectionChange={handleSelectionChange}
          activeRowId={openPerson?.externalId}
          isLoading={search.isPending}
          isRefreshing={search.isPlaceholderData}
          loadingRows={Math.min(params.perPage, 25)}
          minWidth="900px"
          empty={
            pastLastPage
              ? {
                  title: `Page ${params.page} is past the last page`,
                  description: `These filters have ${data.meta.totalPages.toLocaleString('en-US')} pages of results.`,
                }
              : {
                  title: 'No people match these filters',
                  description:
                    'Try fewer job titles, more seniority levels or a wider company size.',
                }
          }
        />
        {data && data.meta.totalItems > 0 && (
          <Pagination
            page={params.page}
            totalPages={data.meta.totalPages}
            onPageChange={(page) => navigate({ ...params, page })}
            summary={<ResultsSummary meta={data.meta} />}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-wrap items-stretch">
      <FilterForm
        key={searchKey}
        initial={params}
        className="flex-[1_1_260px]"
        onSubmit={(filters) => {
          setOpenPerson(null);
          navigate({ ...filters, page: 1, perPage: params.perPage });
        }}
      />

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 px-6 pt-5 pb-7">
        <PageHeader
          {...PAGE_HEADER}
          actions={
            searched && (
              <>
                {selectedIds.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.length} selected
                    </span>
                    <Button onClick={saveSelected}>
                      Save {selectedIds.length}{' '}
                      {selectedIds.length === 1 ? 'lead' : 'leads'}
                    </Button>
                  </>
                )}
                <PerPageSelect
                  value={params.perPage}
                  options={PER_PAGE_OPTIONS}
                  onValueChange={(perPage) =>
                    navigate({ ...params, perPage, page: 1 })
                  }
                />
              </>
            )
          }
        />
        {results}
      </main>

      {openPerson && (
        <ProspectSheet
          key={openPerson.externalId}
          person={openPerson}
          saved={savedIds.has(openPerson.externalId)}
          onSave={() => save([openPerson.externalId])}
          onClose={() => setOpenPerson(null)}
          className="flex-[1_1_320px]"
        />
      )}
    </div>
  );
}
