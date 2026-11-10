import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Saved leads' };

export default function SavedLeadsPage() {
  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-6 px-6 pt-6 pb-8">
      <PageHeader
        title="Saved leads"
        description="People you've saved from search, with their status, notes and source."
      />
      <EmptyState
        title="No saved leads yet"
        description="Leads you save from People search land here with their source and import date. Saving costs no credits."
        action={
          <Link href="/people" className={buttonVariants()}>
            Search people
          </Link>
        }
      />
    </main>
  );
}
