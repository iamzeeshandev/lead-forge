import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-7 pt-7 pb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-xl text-muted-foreground">{description}</p>
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
