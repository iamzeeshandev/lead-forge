import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';
import type {
  DataTableColumn,
  DataTableFeatures,
} from '@/components/data/data-table';
import { TruncatedText } from '@/components/data/truncated-text';
import { formatDay } from '@/lib/format';
import type { Lead } from '@/types/lead';
import { LeadEmail, LeadName, LeadStatusBadge } from './lead-display';

const column = createColumnHelper<DataTableFeatures, Lead>();

function createLeadColumns(): DataTableColumn<Lead>[] {
  // Assigned before returning: returning the array directly lets the return
  // type's `any` flow into every accessor and erase its cell value type.
  const columns = column.columns([
    column.accessor('firstName', {
      id: 'name',
      header: 'Name',
      meta: { width: '24%' },
      cell: ({ row }) => (
        <Link
          href={`/leads/${row.original.id}`}
          className="block truncate font-medium hover:underline hover:underline-offset-2"
        >
          <LeadName lead={row.original} />
        </Link>
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
    column.accessor('status', {
      header: 'Status',
      meta: { width: '120px' },
      cell: ({ getValue }) => <LeadStatusBadge status={getValue()} />,
    }),
    column.accessor('email', {
      header: 'Email',
      meta: { width: '196px' },
      cell: ({ row }) => <LeadEmail lead={row.original} />,
    }),
    column.accessor('createdAt', {
      header: 'Saved',
      meta: { width: '100px', align: 'right' },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDay(getValue())}
        </span>
      ),
    }),
  ]);
  return columns;
}

export const leadColumns = createLeadColumns();
