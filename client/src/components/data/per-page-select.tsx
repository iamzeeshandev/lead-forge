interface PerPageSelectProps {
  value: number;
  options: readonly number[];
  onValueChange: (value: number) => void;
}

export function PerPageSelect({
  value,
  options,
  onValueChange,
}: PerPageSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Per page
      <select
        value={value}
        onChange={(event) => onValueChange(Number(event.target.value))}
        className="h-8 rounded-md border border-input bg-popover px-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
