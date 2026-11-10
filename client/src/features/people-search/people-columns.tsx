import { createColumnHelper } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import type {
  DataTableColumn,
  DataTableFeatures,
} from '@/components/data/data-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProspectPerson } from '@/types/prospect';

const column = createColumnHelper<DataTableFeatures, ProspectPerson>();

const PHONE_LABELS: Record<ProspectPerson['directPhone'], string> = {
  yes: 'Yes',
  maybe: 'Maybe',
  no: '—',
};

export function personLabel(person: ProspectPerson): string {
  return [person.firstName, person.lastNameMasked].filter(Boolean).join(' ');
}

function TruncatedText({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-subtle">—</span>;
  }
  return (
    <span className="block truncate text-foreground/90" title={value}>
      {value}
    </span>
  );
}

interface PeopleColumnsOptions {
  savedIds: ReadonlySet<string>;
  onSave: (person: ProspectPerson) => void;
}

export function createPeopleColumns({
  savedIds,
  onSave,
}: PeopleColumnsOptions): DataTableColumn<ProspectPerson>[] {
  // Assigned before returning: returning the array directly lets the return
  // type's `any` flow into every accessor and erase its cell value type.
  const columns = column.columns([
    column.accessor('firstName', {
      id: 'name',
      header: 'Name',
      meta: { width: '22%' },
      cell: ({ row }) => (
        <span className="block truncate font-medium">
          {row.original.firstName}{' '}
          {row.original.lastNameMasked && (
            <span className="font-mono font-normal text-muted-foreground">
              {row.original.lastNameMasked}
            </span>
          )}
        </span>
      ),
    }),
    column.accessor('title', {
      header: 'Title',
      meta: { width: '20%' },
      cell: ({ getValue }) => <TruncatedText value={getValue()} />,
    }),
    column.accessor('companyName', {
      header: 'Company',
      meta: { width: '20%' },
      cell: ({ getValue }) => <TruncatedText value={getValue()} />,
    }),
    column.accessor('hasEmail', {
      header: 'Email',
      meta: { width: '112px' },
      cell: ({ getValue }) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 rounded-full',
              getValue() ? 'bg-success' : 'bg-status-new',
            )}
          />
          {getValue() ? 'Available' : 'Not found'}
        </span>
      ),
    }),
    column.accessor('directPhone', {
      header: 'Direct phone',
      meta: { width: '104px' },
      cell: ({ getValue }) => (
        <span className="text-xs">{PHONE_LABELS[getValue()]}</span>
      ),
    }),
    column.accessor('lastRefreshedAt', {
      header: 'Refreshed',
      meta: { width: '100px', align: 'right' },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {getValue() ?? '—'}
        </span>
      ),
    }),
    column.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { width: '88px', align: 'right' },
      cell: ({ row }) =>
        savedIds.has(row.original.externalId) ? (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
            Saved
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Save ${personLabel(row.original)}`}
            onClick={() => onSave(row.original)}
          >
            Save
          </Button>
        ),
    }),
  ]);
  return columns;
}
