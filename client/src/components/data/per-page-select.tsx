interface PerPageSelectProps<T extends number> {
  value: T;
  options: readonly T[];
  onValueChange: (value: T) => void;
}

export function PerPageSelect<T extends number>({
  value,
  options,
  onValueChange,
}: PerPageSelectProps<T>) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Per page
      <select
        value={value}
        onChange={(event) => {
          const next = options.find(
            (option) => option === Number(event.target.value),
          );
          if (next !== undefined) {
            onValueChange(next);
          }
        }}
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
