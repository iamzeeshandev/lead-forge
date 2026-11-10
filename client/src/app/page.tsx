import { Button } from '@/components/ui/button';

// Temporary page to confirm the setup works. Replaced in Phase 2.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-3 px-6 py-16">
      <p className="font-mono text-xs text-muted-foreground">client · :3000</p>
      <h1 className="text-2xl font-semibold">LeadForge</h1>
      <p className="text-sm text-muted-foreground">
        The client is running. Pages and the design system are built in Phase 2.
      </p>
      <div>
        <Button>Sample button</Button>
      </div>
    </main>
  );
}
