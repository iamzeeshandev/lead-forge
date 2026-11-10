'use client';

import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import {
  type DataTableColumn,
  type DataTableFeatures,
  DataTable,
} from '@/components/data/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadCompanies } from '@/features/leads/queries';
import { ApiError } from '@/lib/api-error';
import { describeApiError } from '@/lib/describe-api-error';
import { normalizeDomain } from '@/lib/domain';
import { formatDay } from '@/lib/format';
import type { LeadCompany } from '@/types/company';
import { CompanyProfileCard } from './company-profile-card';
import { useCompanyLookup } from './queries';

const column = createColumnHelper<DataTableFeatures, LeadCompany>();

function createCompanyColumns(): DataTableColumn<LeadCompany>[] {
  // Assigned before returning: returning the array directly lets the return
  // type's `any` flow into every accessor and erase its cell value type.
  const columns = column.columns([
    column.accessor('name', {
      header: 'Company',
      cell: ({ getValue }) => (
        <Link
          href={`/leads?q=${encodeURIComponent(getValue())}`}
          className="block truncate font-medium hover:underline hover:underline-offset-2"
        >
          {getValue()}
        </Link>
      ),
    }),
    column.accessor('leads', {
      header: 'Saved leads',
      meta: { width: '120px', align: 'right' },
      cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
    }),
    column.accessor('lastSavedAt', {
      header: 'Last saved',
      meta: { width: '120px', align: 'right' },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDay(getValue())}
        </span>
      ),
    }),
  ]);
  return columns;
}

const companyColumns = createCompanyColumns();

function LookupResult({ domain }: { domain: string }) {
  const lookup = useCompanyLookup(domain);

  if (lookup.isPending) {
    return (
      <div
        aria-busy="true"
        className="flex flex-col gap-2 rounded-lg border bg-card p-5"
      >
        <span className="sr-only">Looking up {domain}</span>
        <span
          aria-hidden="true"
          className="h-6 w-48 animate-pulse rounded-sm bg-divider"
        />
        <span
          aria-hidden="true"
          className="h-3 w-72 animate-pulse rounded-sm bg-divider"
        />
      </div>
    );
  }
  if (lookup.isError) {
    if (lookup.error instanceof ApiError && lookup.error.code === 'NOT_FOUND') {
      return (
        <EmptyState
          title={`No company found for ${domain}`}
          description="Check the spelling, or try the company's main website domain."
        />
      );
    }
    const error = describeApiError(lookup.error);
    return (
      <ErrorState
        eyebrow={error.eyebrow}
        title={error.title}
        description={error.description}
        detail={error.detail}
        action={
          error.canRetry ? (
            <Button variant="outline" onClick={() => lookup.refetch()}>
              Try again
            </Button>
          ) : undefined
        }
      />
    );
  }
  return <CompanyProfileCard company={lookup.data} />;
}

export function CompaniesView() {
  const [input, setInput] = useState('');
  const [domain, setDomain] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const companies = useLeadCompanies();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeDomain(input);
    if (!normalized) {
      setInputError('Enter a domain such as acme.com.');
      return;
    }
    setInputError(null);
    setInput(normalized);
    setDomain(normalized);
  }

  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-6 px-6 pt-6 pb-8">
      <PageHeader
        title="Companies"
        badge="Sample data"
        description="Look up a company by its domain to see its firmographics, and see which companies your saved leads work at."
      />

      <section aria-labelledby="lookup" className="flex flex-col gap-3">
        <h2 id="lookup" className="text-base font-semibold">
          Look up a company
        </h2>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-wrap items-start gap-2"
        >
          <div className="flex w-full max-w-80 flex-col gap-1">
            <label htmlFor="company-domain" className="sr-only">
              Company domain
            </label>
            <Input
              id="company-domain"
              value={input}
              placeholder="acme.com, or paste a website or email"
              aria-invalid={inputError ? true : undefined}
              aria-describedby="company-domain-hint"
              onChange={(event) => setInput(event.target.value)}
            />
            <p id="company-domain-hint" className="text-2xs text-subtle">
              {inputError ? (
                <span className="text-destructive">{inputError}</span>
              ) : (
                'Each lookup uses 1 Apollo credit. Looking a company up again within the hour reuses the result.'
              )}
            </p>
          </div>
          <Button type="submit">Look up · 1 credit</Button>
        </form>
        {domain && <LookupResult domain={domain} />}
      </section>

      <section
        aria-labelledby="lead-companies"
        className="flex flex-col gap-2.5"
      >
        <h2 id="lead-companies" className="text-base font-semibold">
          Companies in your saved leads
        </h2>
        {companies.isError ? (
          <ErrorState
            title="Couldn't load companies"
            description="Something went wrong while grouping your saved leads. Try again."
            action={
              <Button variant="outline" onClick={() => companies.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <DataTable
            label="Companies in your saved leads"
            columns={companyColumns}
            data={companies.data ?? []}
            getRowId={(company) => company.name.toLowerCase()}
            isLoading={companies.isPending}
            loadingRows={4}
            minWidth="520px"
            empty={{
              title: 'No companies yet',
              description:
                'Companies appear here as you save leads from People search.',
            }}
          />
        )}
      </section>
    </main>
  );
}
