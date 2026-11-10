'use client';

import { type FormEvent, useState } from 'react';
import { CheckboxGroup } from '@/components/filters/checkbox-group';
import { FilterField, FilterRail } from '@/components/filters/filter-rail';
import { MultiValueInput } from '@/components/filters/multi-value-input';
import { SearchInput } from '@/components/filters/search-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  CompanySize,
  PeopleSearchFilters,
  Seniority,
} from '@/types/people-search';
import { countActiveFilters, EMPTY_FILTERS } from './search-params';

const FORM_ID = 'people-filters';

const SENIORITY_OPTIONS: ReadonlyArray<{ value: Seniority; label: string }> = [
  { value: 'founder', label: 'Founder' },
  { value: 'c_suite', label: 'C-suite' },
  { value: 'vp', label: 'VP' },
  { value: 'head', label: 'Head' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
];

const COMPANY_SIZE_OPTIONS: ReadonlyArray<{
  value: CompanySize;
  label: string;
}> = [
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-500', label: '201–500' },
  { value: '501-1000', label: '501–1,000' },
  { value: '1001-5000', label: '1,001–5,000' },
  { value: '5001+', label: '5,001+' },
];

interface FilterFormProps {
  initial: PeopleSearchFilters;
  onSubmit: (filters: PeopleSearchFilters) => void;
  className?: string;
}

/** Edits a draft; nothing is searched until Search is pressed. */
export function FilterForm({ initial, onSubmit, className }: FilterFormProps) {
  const [draft, setDraft] = useState(initial);

  function update<K extends keyof PeopleSearchFilters>(
    key: K,
    value: PeopleSearchFilters[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ ...draft, keywords: draft.keywords.trim() });
  }

  return (
    <FilterRail
      activeCount={countActiveFilters(draft)}
      className={className}
      footer={
        <>
          <div className="flex gap-2">
            <Button type="submit" form={FORM_ID} className="grow">
              Search
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft(EMPTY_FILTERS)}
            >
              Reset
            </Button>
          </div>
          <p className="text-2xs text-subtle">
            People search costs 0 credits. Each page is one request against your
            hourly limit.
          </p>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <FilterField label="Keywords" htmlFor="filter-keywords">
          <SearchInput
            id="filter-keywords"
            placeholder="Name, skill or keyword"
            value={draft.keywords}
            onChange={(event) => update('keywords', event.target.value)}
          />
        </FilterField>

        <FilterField label="Job titles" htmlFor="filter-titles">
          <MultiValueInput
            id="filter-titles"
            values={draft.titles}
            onValuesChange={(titles) => update('titles', titles)}
            placeholder="Add a title and press Enter"
            maxValues={99}
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={draft.includeSimilarTitles}
              onCheckedChange={(checked) =>
                update('includeSimilarTitles', checked)
              }
            />
            Include similar titles
          </label>
        </FilterField>

        <CheckboxGroup
          legend="Seniority"
          options={SENIORITY_OPTIONS}
          value={draft.seniorities}
          onValueChange={(seniorities) => update('seniorities', seniorities)}
        />

        <FilterField label="Person location" htmlFor="filter-locations">
          <MultiValueInput
            id="filter-locations"
            values={draft.locations}
            onValuesChange={(locations) => update('locations', locations)}
            placeholder="City, state or country"
          />
        </FilterField>

        <CheckboxGroup
          legend="Company size"
          options={COMPANY_SIZE_OPTIONS}
          value={draft.companySizes}
          onValueChange={(companySizes) => update('companySizes', companySizes)}
          mono
        />

        <FilterField label="Company domains" htmlFor="filter-domains">
          <MultiValueInput
            id="filter-domains"
            values={draft.domains}
            onValuesChange={(domains) => update('domains', domains)}
            placeholder="acme.com"
          />
        </FilterField>
      </form>
    </FilterRail>
  );
}
