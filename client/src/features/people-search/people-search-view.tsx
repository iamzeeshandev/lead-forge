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
import { useImportLeads, useSavedProspects } from '@/features/leads/queries';
import type { ImportLeadsResult } from '@/types/lead';
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

function describeImport({ imported, skipped }: ImportLeadsResult): string {
  const saved =
    imported === 0
      ? 'Nothing new saved'
      : `Saved ${imported} ${imported === 1 ? 'lead' : 'leads'}`;
  return skipped === 0 ? saved : `${saved} · ${skipped} already saved`;
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
  // Each person is kept as a snapshot because a bulk save can include people
  // from pages that are no longer on screen.
  const [selection, setSelection] = useState<{
    searchKey: string;
    people: Record<string, ProspectPerson>;
  }>({ searchKey, people: {} });
  const selectedPeople = useMemo(
    () => (selection.searchKey === searchKey ? selection.people : {}),
    [selection, searchKey],
  );
  const rowSelection = useMemo<RowSelectionState>(
    () =>
      Object.fromEntries(
        Object.keys(selectedPeople).map((id) => [id, true as const]),
      ),
    [selectedPeople],
  );
  const selectedCount = Object.keys(selectedPeople).length;

  const [openPerson, setOpenPerson] = useState<ProspectPerson | null>(null);
  const [importResult, setImportResult] = useState<ImportLeadsResult | null>(
    null,
  );

  const lookupIds = useMemo(() => {
    const ids = (search.data?.items ?? []).map((person) => person.externalId);
    return openPerson && !ids.includes(openPerson.externalId)
      ? [...ids, openPerson.externalId]
      : ids;
  }, [search.data, openPerson]);
  const savedLookup = useSavedProspects('apollo', lookupIds);
  const savedLeadIds = useMemo(
    () => savedLookup.data ?? {},
    [savedLookup.data],
  );

  const {
    mutate: importPeople,
    isPending: importing,
    isError: importFailed,
    variables: importingPeople,
  } = useImportLeads();

  const savingIds = useMemo(
    () =>
      new Set(
        importing
          ? (importingPeople ?? []).map((person) => person.externalId)
          : [],
      ),
    [importing, importingPeople],
  );

  const saveOne = useCallback(
    (person: ProspectPerson) =>
      importPeople([person], { onSuccess: setImportResult }),
    [importPeople],
  );

  const columns = useMemo(
    () =>
      createPeopleColumns({
        savedIds: new Set(Object.keys(savedLeadIds)),
        savingIds,
        onSave: saveOne,
        onOpen: setOpenPerson,
      }),
    [savedLeadIds, savingIds, saveOne],
  );

  const handleSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const next =
      typeof updater === 'function' ? updater(rowSelection) : updater;
    const visible = new Map(
      (search.data?.items ?? []).map((person) => [person.externalId, person]),
    );
    const people: Record<string, ProspectPerson> = {};
    for (const id of Object.keys(next)) {
      const person = selectedPeople[id] ?? visible.get(id);
      if (person) {
        people[id] = person;
      }
    }
    setSelection({ searchKey, people });
  };

  function navigate(next: PeopleSearchParams) {
    router.push(`/people?${toSearchParams(next).toString()}`, {
      scroll: false,
    });
  }

  function saveSelected() {
    importPeople(Object.values(selectedPeople), {
      onSuccess: (result) => {
        setImportResult(result);
        setSelection({ searchKey, people: {} });
      },
    });
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
          setImportResult(null);
          navigate({ ...filters, page: 1, perPage: params.perPage });
        }}
      />

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 px-6 pt-5 pb-7">
        <PageHeader
          {...PAGE_HEADER}
          actions={
            searched && (
              <>
                <span role="status" className="text-xs text-muted-foreground">
                  {importFailed
                    ? "Couldn't save. Try again."
                    : importResult && describeImport(importResult)}
                </span>
                {selectedCount > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {selectedCount} selected
                    </span>
                    <Button disabled={importing} onClick={saveSelected}>
                      {importing
                        ? 'Saving…'
                        : `Save ${selectedCount} ${selectedCount === 1 ? 'lead' : 'leads'}`}
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
          savedLeadId={savedLeadIds[openPerson.externalId] ?? null}
          saving={savingIds.has(openPerson.externalId)}
          onSave={() => saveOne(openPerson)}
          onClose={() => setOpenPerson(null)}
          className="flex-[1_1_320px]"
        />
      )}
    </div>
  );
}
