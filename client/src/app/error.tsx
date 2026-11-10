'use client';

import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';

interface RouteErrorProps {
  // A Client Component can throw anything, so Next types this as unknown.
  error: unknown;
  retry: () => void;
}

export default function RouteError({ error, retry }: RouteErrorProps) {
  // Server Component errors reach the browser with a generic message; the
  // digest is the id that matches the full error in the server logs.
  const digest =
    error instanceof Error &&
    'digest' in error &&
    typeof error.digest === 'string'
      ? error.digest
      : undefined;

  return (
    <main className="mx-auto w-full max-w-340 px-6 pt-6 pb-8">
      <ErrorState
        title="This page failed to load"
        description="Something went wrong while rendering it. Trying again usually helps."
        detail={digest ? `Error digest ${digest}` : undefined}
        action={
          <Button variant="outline" onClick={() => retry()}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
