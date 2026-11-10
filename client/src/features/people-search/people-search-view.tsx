'use client';

import type { RowSelectionState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data/data-table';
import { Pagination } from '@/components/data/pagination';
import { PerPageSelect } from '@/components/data/per-page-select';
import { CheckboxGroup } from '@/components/filters/checkbox-group';
import { FilterField, FilterRail } from '@/components/filters/filter-rail';
import { MultiValueInput } from '@/components/filters/multi-value-input';
import { SearchInput } from '@/components/filters/search-input';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatRange } from '@/lib/pagination';
import { SAMPLE_PEOPLE, SAMPLE_TOTAL_ENTRIES } from '@/mocks/people';
import type { ProspectPerson } from '@/types/prospect';
import { createPeopleColumns, personLabel } from './people-columns';

// Values match Apollo's person_seniorities[] and organization_num_employees_ranges[] parameters.
const SENIORITY_OPTIONS = [
  { value: 'founder', label: 'Founder' },
  { value: 'c_suite', label: 'C-suite' },
  { value: 'vp', label: 'VP' },
  { value: 'head', label: 'Head' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
];

const COMPANY_SIZE_OPTIONS = [
  { value: '1,10', label: '1–10' },
  { value: '11,50', label: '11–50' },
  { value: '51,200', label: '51–200' },
  { value: '201,500', label: '201–500' },
  { value: '501,1000', label: '501–1,000' },
  { value: '1001,1000000', label: '1,001+' },
];

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const APOLLO_MAX_PAGES = 500;

export function PeopleSearchView() {
  const [keywords, setKeywords] = useState('');
  const [titles, setTitles] = useState<string[]>([]);
  const [includeSimilarTitles, setIncludeSimilarTitles] = useState(true);
  const [seniorities, setSeniorities] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const activeFilters = [
    keywords.trim(),
    titles,
    seniorities,
    locations,
    companySizes,
    domains,
  ].filter((filter) => filter.length > 0).length;
  const totalPages = Math.min(
    Math.ceil(SAMPLE_TOTAL_ENTRIES / perPage),
    APOLLO_MAX_PAGES,
  );
  const selectedIds = Object.keys(rowSelection);

  const columns = useMemo(
    () =>
      createPeopleColumns({
        savedIds,
        onSave: (person: ProspectPerson) =>
          setSavedIds((current) => new Set(current).add(person.externalId)),
      }),
    [savedIds],
  );

  function search() {
    // Simulates the request until task 2.3 adds the mock API.
    setPage(1);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 700);
  }

  function resetFilters() {
    setKeywords('');
    setTitles([]);
    setIncludeSimilarTitles(true);
    setSeniorities([]);
    setLocations([]);
    setCompanySizes([]);
    setDomains([]);
  }

  function saveSelected() {
    setSavedIds((current) => new Set([...current, ...selectedIds]));
    setRowSelection({});
  }

  return (
    <div className="flex flex-1 flex-wrap items-stretch">
      <FilterRail
        activeCount={activeFilters}
        className="flex-[1_1_260px]"
        footer={
          <>
            <div className="flex gap-2">
              <Button className="grow" onClick={search}>
                Search
              </Button>
              <Button variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            </div>
            <p className="text-2xs text-subtle">
              People search costs 0 credits. Each page is one request against
              your hourly limit.
            </p>
          </>
        }
      >
        <FilterField label="Keywords" htmlFor="filter-keywords">
          <SearchInput
            id="filter-keywords"
            placeholder="Name, skill or keyword"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
          />
        </FilterField>

        <FilterField label="Job titles" htmlFor="filter-titles">
          <MultiValueInput
            id="filter-titles"
            values={titles}
            onValuesChange={setTitles}
            placeholder="Add a title and press Enter"
            maxValues={99}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={includeSimilarTitles}
              onCheckedChange={(checked) => setIncludeSimilarTitles(checked)}
            />
            Include similar titles
          </label>
        </FilterField>

        <CheckboxGroup
          legend="Seniority"
          options={SENIORITY_OPTIONS}
          value={seniorities}
          onValueChange={setSeniorities}
        />

        <FilterField label="Person location" htmlFor="filter-locations">
          <MultiValueInput
            id="filter-locations"
            values={locations}
            onValuesChange={setLocations}
            placeholder="City, state or country"
          />
        </FilterField>

        <CheckboxGroup
          legend="Company size"
          options={COMPANY_SIZE_OPTIONS}
          value={companySizes}
          onValueChange={setCompanySizes}
          mono
        />

        <FilterField label="Company domains" htmlFor="filter-domains">
          <MultiValueInput
            id="filter-domains"
            values={domains}
            onValuesChange={setDomains}
            placeholder="acme.com"
          />
        </FilterField>
      </FilterRail>

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 px-6 pt-5 pb-7">
        <PageHeader
          title="People"
          badge="Sandbox data"
          description="Apollo's free people search returns masked last names and availability flags only. Save a prospect to keep it; enrichment reveals the rest."
          actions={
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
                value={perPage}
                options={PER_PAGE_OPTIONS}
                onValueChange={(value) => {
                  setPerPage(value);
                  setPage(1);
                }}
              />
            </>
          }
        />

        <DataTable
          label="People search results"
          columns={columns}
          data={SAMPLE_PEOPLE}
          getRowId={(person) => person.externalId}
          getRowLabel={personLabel}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          isLoading={isLoading}
          loadingRows={perPage > 25 ? 25 : perPage}
          minWidth="900px"
          empty={{
            title: 'No people match these filters',
            description: 'Try fewer job titles or a wider company size.',
          }}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          summary={
            <>
              Showing{' '}
              <span className="font-mono text-foreground">
                {formatRange(page, perPage, SAMPLE_TOTAL_ENTRIES)}
              </span>{' '}
              of{' '}
              <span className="font-mono text-foreground">
                {SAMPLE_TOTAL_ENTRIES.toLocaleString('en-US')}
              </span>{' '}
              · Apollo shows the first {APOLLO_MAX_PAGES} pages
            </>
          }
        />
      </main>
    </div>
  );
}
