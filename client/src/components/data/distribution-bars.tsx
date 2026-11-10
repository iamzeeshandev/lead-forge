interface DistributionBarsProps {
  title: string;
  items: ReadonlyArray<{ label: string; value: number }>;
  /** Shown next to the title, e.g. "248 leads". */
  summary?: string;
}

export function DistributionBars({
  title,
  items,
  summary,
}: DistributionBarsProps) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {summary && <span className="text-xs text-subtle">{summary}</span>}
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="grid grid-cols-[110px_minmax(0,1fr)_40px] items-center gap-2.5"
          >
            <span className="truncate" title={item.label}>
              {item.label}
            </span>
            <span aria-hidden="true" className="h-2 bg-divider">
              <span
                className="block h-full bg-foreground"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono">
              {item.value.toLocaleString('en-US')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
