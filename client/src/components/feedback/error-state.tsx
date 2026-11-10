import { type LucideIcon, TriangleExclamationPoint } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title: string;
  description: ReactNode;
  /** Status line above the title, e.g. "429 · Rate limited". */
  eyebrow?: string;
  /** Details for support, e.g. the provider's error code and request id. */
  detail?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}

export function ErrorState({
  title,
  description,
  eyebrow,
  detail,
  action,
  icon: Icon = TriangleExclamationPoint,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap gap-3.5 rounded-lg border border-input bg-card px-5 py-4.5"
    >
      <Icon aria-hidden="true" className="mt-px size-4.5 shrink-0" />
      <div className="flex min-w-0 grow basis-80 flex-col gap-1.5">
        {eyebrow && <span className="label-caps">{eyebrow}</span>}
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
        {detail && (
          <p className="font-mono text-xs break-all text-subtle">{detail}</p>
        )}
      </div>
      {action && <div className="self-center">{action}</div>}
    </div>
  );
}
