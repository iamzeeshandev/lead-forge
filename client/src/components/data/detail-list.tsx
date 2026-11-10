import type { ReactNode } from 'react';

interface DetailListProps {
  title: string;
  rows: ReadonlyArray<readonly [label: string, value: ReactNode]>;
  headingLevel?: 'h2' | 'h3';
}

export function DetailList({
  title,
  rows,
  headingLevel: Heading = 'h2',
}: DetailListProps) {
  return (
    <section className="flex flex-col gap-2">
      <Heading className="label-caps">{title}</Heading>
      <dl className="grid grid-cols-[112px_minmax(0,1fr)] border-t border-divider">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="col-span-2 grid grid-cols-subgrid border-b border-divider py-1.75"
          >
            <dt className="text-subtle">{label}</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
