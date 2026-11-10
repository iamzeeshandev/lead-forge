import Link from 'next/link';
import { MainNav } from '@/components/layout/main-nav';
import { UsageMeter } from '@/components/layout/usage-meter';

export function AppHeader() {
  return (
    <header className="flex min-h-13 flex-wrap items-center gap-x-7 border-b bg-card px-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
      >
        <span aria-hidden="true" className="size-3.5 rounded-sm bg-primary" />
        LeadForge
      </Link>
      <MainNav />
      <div className="ml-auto py-2">
        {/* Fed by Apollo's rate-limit response headers once the client calls the server (Phase 4). */}
        <UsageMeter
          label="Apollo requests this hour"
          used={null}
          limit={null}
        />
      </div>
    </header>
  );
}
