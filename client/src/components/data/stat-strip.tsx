import { cn } from '@/lib/utils';

export interface Stat {
  label: string;
  value: string;
  context?: string;
}

export function StatStrip({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <section
      aria-label={label}
      className="flex flex-wrap border-t border-b border-input"
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            'flex flex-[1_1_200px] flex-col gap-1.5 py-4 pr-5',
            index > 0 && 'border-l pl-5',
          )}
        >
          <span className="label-caps">{stat.label}</span>
          <span className="font-mono text-3xl font-medium tracking-tight">
            {stat.value}
          </span>
          {stat.context && (
            <span className="text-xs text-muted-foreground">
              {stat.context}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}

export function StatStripSkeleton({ count }: { count: number }) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-wrap border-t border-b border-input"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            'flex flex-[1_1_200px] flex-col gap-2 py-4 pr-5',
            index > 0 && 'border-l pl-5',
          )}
        >
          <span className="h-2.5 w-24 animate-pulse rounded-sm bg-divider" />
          <span className="h-7 w-16 animate-pulse rounded-sm bg-divider" />
        </div>
      ))}
    </div>
  );
}
