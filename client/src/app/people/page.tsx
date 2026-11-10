import type { Metadata } from 'next';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'People' };

export default function PeoplePage() {
  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-6 px-6 pt-6 pb-8">
      <PageHeader
        title="People"
        badge="Sandbox data"
        description="Apollo's free people search returns masked last names and availability flags only. Save a prospect to keep it; enrichment reveals the rest."
      />
      <EmptyState
        title="No search yet"
        description="Choose job titles, seniority, location or company size, then run a search. Searching costs no credits; each page is one request against your hourly Apollo limit."
      />
    </main>
  );
}
