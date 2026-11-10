import { createColumnHelper } from '@tanstack/react-table';
import { Check } from 'lucide-react';
import type {
  DataTableColumn,
  DataTableFeatures,
} from '@/components/data/data-table';
import { TruncatedText } from '@/components/data/truncated-text';
import { Button } from '@/components/ui/button';
import { formatDay } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ProspectPerson } from '@/types/prospect';
import { PHONE_LABELS, personLabel } from './format';

const column = createColumnHelper<DataTableFeatures, ProspectPerson>();

interface PeopleColumnsOptions {
  savedIds: ReadonlySet<string>;
  savingIds: ReadonlySet<string>;
  onSave: (person: ProspectPerson) => void;
  onOpen: (person: ProspectPerson) => void;
}

export function createPeopleColumns({
  savedIds,
  savingIds,
  onSave,
  onOpen,
}: PeopleColumnsOptions): DataTableColumn<ProspectPerson>[] {
  // Assigned before returning: returning the array directly lets the return
  // type's `any` flow into every accessor and erase its cell value type.
  const columns = column.columns([
    column.accessor('firstName', {
      id: 'name',
      header: 'Name',
      meta: { width: '22%' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="block max-w-full cursor-pointer truncate text-left font-medium hover:underline hover:underline-offset-2"
        >
          {row.original.firstName ?? 'Unnamed'}{' '}
          {row.original.lastNameMasked && (
            <span className="font-mono font-normal text-muted-foreground">
              {row.original.lastNameMasked}
            </span>
          )}
        </button>
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
          {formatDay(getValue())}
        </span>
      ),
    }),
    column.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { width: '88px', align: 'right' },
      cell: ({ row }) => {
        const { externalId } = row.original;
        if (savedIds.has(externalId)) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
              Saved
            </span>
          );
        }
        const saving = savingIds.has(externalId);
        return (
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            aria-label={`Save ${personLabel(row.original)}`}
            onClick={() => onSave(row.original)}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        );
      },
    }),
  ]);
  return columns;
}
