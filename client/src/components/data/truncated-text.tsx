export function TruncatedText({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-subtle">—</span>;
  }
  return (
    <span className="block truncate text-foreground/90" title={value}>
      {value}
    </span>
  );
}
