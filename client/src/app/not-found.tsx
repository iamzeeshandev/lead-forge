import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-340 px-6 pt-6 pb-8">
      <PageHeader
        title="Page not found"
        description="This address doesn't match any page in LeadForge."
        actions={
          <Link href="/" className={buttonVariants()}>
            Go to overview
          </Link>
        }
      />
    </main>
  );
}
