'use client';

import {
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
  rowSelectionFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface DataTableColumnMeta {
  align?: 'left' | 'right';
  /** The table uses a fixed layout, so column widths decide where text truncates. */
  width?: string;
}

export const dataTableFeatures = tableFeatures({
  rowSelectionFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumn<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  // Each column has its own value type; TanStack's column helper types a mixed list the same way.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

interface DataTableProps<TData extends RowData> {
  label: string;
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  /** Passing this enables a checkbox column. Selection is keyed by row id, so it survives paging. */
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  rowSelection?: RowSelectionState;
  /** Names each row's checkbox for screen readers, e.g. "Select Priya Sh***a". */
  getRowLabel?: (row: TData) => string;
  activeRowId?: string | null;
  isLoading?: boolean;
  loadingRows?: number;
  empty?: { title: string; description: string };
  minWidth?: string;
}

const SKELETON_WIDTHS = ['w-3/5', 'w-4/5', 'w-1/2', 'w-2/3'];

export function DataTable<TData extends RowData>({
  label,
  columns,
  data,
  getRowId,
  onRowSelectionChange,
  rowSelection,
  getRowLabel,
  activeRowId,
  isLoading = false,
  loadingRows = 10,
  empty,
  minWidth,
}: DataTableProps<TData>) {
  const selectable = onRowSelectionChange !== undefined;

  const allColumns = useMemo<DataTableColumn<TData>[]>(() => {
    if (!selectable) {
      return columns;
    }
    const selectColumn: DataTableColumn<TData> = {
      id: 'select',
      meta: { width: '40px' },
      header: ({ table }) => {
        const all = table.getIsAllPageRowsSelected();
        return (
          <Checkbox
            aria-label="Select all rows on this page"
            checked={all}
            indeterminate={!all && table.getIsSomePageRowsSelected()}
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(checked)
            }
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${getRowLabel?.(row.original) ?? 'row'}`}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
        />
      ),
    };
    return [selectColumn, ...columns];
  }, [columns, selectable, getRowLabel]);

  const table = useTable({
    features: dataTableFeatures,
    columns: allColumns,
    data,
    getRowId: (row) => getRowId(row),
    enableRowSelection: selectable,
    onRowSelectionChange,
    state: { rowSelection: rowSelection ?? {} },
  });

  const rows = table.getRowModel().rows;
  const leafColumns = table.getAllLeafColumns();

  return (
    <Table
      aria-label={label}
      aria-busy={isLoading || undefined}
      className="table-fixed"
      style={{ minWidth }}
    >
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta;
              return (
                <TableHead
                  key={header.id}
                  scope="col"
                  style={{ width: meta?.width }}
                  className={cn(meta?.align === 'right' && 'text-right')}
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isLoading &&
          Array.from({ length: loadingRows }, (_, rowIndex) => (
            <TableRow
              key={`skeleton-${rowIndex}`}
              className="hover:bg-transparent"
            >
              {leafColumns.map((column, columnIndex) => (
                <TableCell key={column.id}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-2.5 animate-pulse rounded-sm bg-divider',
                      column.id === 'select'
                        ? 'size-3.5'
                        : SKELETON_WIDTHS[
                            (rowIndex + columnIndex) % SKELETON_WIDTHS.length
                          ],
                      column.columnDef.meta?.align === 'right' && 'ml-auto',
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}

        {!isLoading && rows.length === 0 && empty && (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={leafColumns.length}
              className="h-auto px-7 py-8 whitespace-normal"
            >
              <p className="text-lg font-semibold">{empty.title}</p>
              <p className="mt-1 max-w-xl text-muted-foreground">
                {empty.description}
              </p>
            </TableCell>
          </TableRow>
        )}

        {!isLoading &&
          rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? 'selected' : undefined}
              className={cn(
                row.id === activeRowId &&
                  'bg-selected hover:bg-selected data-[state=selected]:bg-selected',
              )}
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    cell.column.columnDef.meta?.align === 'right' &&
                      'text-right',
                  )}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
