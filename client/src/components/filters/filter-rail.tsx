import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FilterRailProps {
  activeCount: number;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FilterRail({
  activeCount,
  children,
  footer,
  className,
}: FilterRailProps) {
  return (
    <aside
      aria-label="Filters"
      className={cn(
        'flex flex-col gap-5 border-r bg-card px-5 pt-5 pb-6',
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Filters</h2>
        {activeCount > 0 && (
          <span className="text-xs text-subtle">{activeCount} active</span>
        )}
      </div>
      {children}
      {footer && (
        <div className="mt-auto flex flex-col gap-2 border-t border-divider pt-4">
          {footer}
        </div>
      )}
    </aside>
  );
}

interface FilterFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
}

export function FilterField({ label, htmlFor, children }: FilterFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="label-caps">
        {label}
      </label>
      {children}
    </div>
  );
}
