import type { Metadata } from 'next';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = { title: 'Companies' };

export default function CompaniesPage() {
  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-6 px-6 pt-6 pb-8">
      <PageHeader
        title="Companies"
        description="Look up a company by its domain to pull firmographics from Apollo, or browse the companies behind your saved leads."
      />
      <EmptyState
        title="No companies yet"
        description="Look up a company by its domain to add it. Each lookup uses 1 Apollo credit."
      />
    </main>
  );
}
