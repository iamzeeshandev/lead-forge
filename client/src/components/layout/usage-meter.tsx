interface UsageMeterProps {
  label: string;
  used: number | null;
  limit: number | null;
}

export function UsageMeter({ label, used, limit }: UsageMeterProps) {
  const known = used !== null && limit !== null && limit > 0;
  const percent = known ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const valueText = known ? `${used} of ${limit}` : 'No data yet';

  return (
    <div className="flex w-48 flex-col gap-1">
      <div className="flex justify-between text-2xs text-subtle">
        <span>{label}</span>
        <span className="font-mono text-foreground">
          {known ? `${used} / ${limit}` : '—'}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit ?? 0}
        aria-valuenow={used ?? 0}
        aria-valuetext={valueText}
        className="h-1 overflow-hidden rounded-sm bg-divider"
      >
        <div
          className="h-full bg-foreground"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
