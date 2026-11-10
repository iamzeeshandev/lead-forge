'use client';

import Link from 'next/link';
import { DataTable } from '@/components/data/data-table';
import { DistributionBars } from '@/components/data/distribution-bars';
import { StatStrip, StatStripSkeleton } from '@/components/data/stat-strip';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  ENRICHMENT_LABELS,
  LEAD_STATUS_LABELS,
} from '@/features/leads/lead-display';
import { leadColumns } from '@/features/leads/leads-columns';
import { useDashboardSummary } from '@/features/leads/queries';
import type { DashboardSummary } from '@/types/dashboard';
import { type EnrichmentStatus, LEAD_STATUSES } from '@/types/lead';

const ENRICHMENT_ORDER: EnrichmentStatus[] = [
  'not_enriched',
  'enriched',
  'not_found',
  'failed',
];

function percent(part: number, whole: number): string {
  return whole === 0 ? '0%' : `${Math.round((part / whole) * 100)}%`;
}

function countLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`;
}

function Summary({ summary }: { summary: DashboardSummary }) {
  const { totals } = summary;

  return (
    <>
      <StatStrip
        label="Key figures"
        stats={[
          {
            label: 'Saved leads',
            value: totals.leads.toLocaleString('en-US'),
            context: `across ${countLabel(totals.companies, 'company', 'companies')}`,
          },
          {
            label: 'Companies',
            value: totals.companies.toLocaleString('en-US'),
            context: 'named on saved leads',
          },
          {
            label: 'Email available',
            value: percent(totals.emailAvailable, totals.leads),
            context: `${totals.emailAvailable} of ${totals.leads} · ${totals.emailRevealed} revealed`,
          },
          {
            label: 'Saved this week',
            value: totals.savedLast7Days.toLocaleString('en-US'),
            context: 'in the last 7 days',
          },
        ]}
      />

      <div className="flex flex-wrap items-start gap-8">
        <section
          aria-labelledby="recent"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-2.5"
        >
          <div className="flex items-baseline justify-between">
            <h2 id="recent" className="text-base font-semibold">
              Recently saved
            </h2>
            <Link
              href="/leads"
              className="text-xs text-primary hover:underline"
            >
              All saved leads
            </Link>
          </div>
          <DataTable
            label="Recently saved leads"
            columns={leadColumns}
            data={summary.recentLeads}
            getRowId={(lead) => lead.id}
            minWidth="760px"
          />
        </section>

        <aside
          aria-label="Breakdowns"
          className="flex flex-[1_1_320px] flex-col gap-6"
        >
          <DistributionBars
            title="Lead status"
            summary={countLabel(totals.leads, 'lead')}
            items={LEAD_STATUSES.map((status) => ({
              label: LEAD_STATUS_LABELS[status],
              value: summary.byStatus[status],
            }))}
          />
          <DistributionBars
            title="Enrichment"
            items={ENRICHMENT_ORDER.map((status) => ({
              label: ENRICHMENT_LABELS[status],
              value: summary.byEnrichment[status],
            }))}
          />
          {summary.topCompanies.length > 0 && (
            <DistributionBars
              title="Top companies"
              items={summary.topCompanies.map((company) => ({
                label: company.name,
                value: company.leads,
              }))}
            />
          )}
        </aside>
      </div>
    </>
  );
}

export function DashboardView() {
  const summary = useDashboardSummary();

  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-6 px-6 pt-6 pb-8">
      <PageHeader
        title="Overview"
        description="Everything here is counted from your LeadForge database, not from Apollo."
        actions={
          <Link href="/people" className={buttonVariants()}>
            Find people
          </Link>
        }
      />
      {summary.isPending && <StatStripSkeleton count={4} />}
      {summary.isError && (
        <ErrorState
          title="Couldn't load the overview"
          description="Something went wrong while counting your leads. Try again."
          action={
            <Button variant="outline" onClick={() => summary.refetch()}>
              Try again
            </Button>
          }
        />
      )}
      {summary.data &&
        (summary.data.totals.leads === 0 ? (
          <EmptyState
            title="Nothing to count yet"
            description="Save leads from People search and this page fills with totals, recent saves and status breakdowns."
          />
        ) : (
          <Summary summary={summary.data} />
        ))}
    </main>
  );
}
