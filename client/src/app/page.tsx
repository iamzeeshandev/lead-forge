import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';

// The layout's title template only applies to child segments, and this page
// shares the root segment with the layout, so the full title is set here.
export const metadata: Metadata = {
  title: { absolute: 'Overview · LeadForge' },
};

export default function OverviewPage() {
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
      <EmptyState
        title="Nothing to count yet"
        description="Save leads from People search and this page fills with totals, recent imports and status breakdowns."
      />
    </main>
  );
}
