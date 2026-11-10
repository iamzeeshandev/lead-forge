import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { getPageItems } from '@/lib/pagination';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Text on the left, e.g. "Showing 21–30 of 48,213". */
  summary?: ReactNode;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  summary,
}: PaginationProps) {
  const items = getPageItems(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {summary && <p className="text-muted-foreground">{summary}</p>}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center gap-1"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.min(page - 1, totalPages))}
          >
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          {items.map((item) =>
            item.type === 'gap' ? (
              <span
                key={item.id}
                aria-hidden="true"
                className="w-6 text-center text-subtle"
              >
                …
              </span>
            ) : item.isCurrent ? (
              <span
                key={item.page}
                aria-current="page"
                className="inline-flex h-7 min-w-8 items-center justify-center rounded-md border border-foreground bg-foreground px-2 font-mono text-sm font-medium text-background"
              >
                {item.page}
              </span>
            ) : (
              <Button
                key={item.page}
                variant="outline"
                size="sm"
                aria-label={`Page ${item.page}`}
                className="min-w-8 px-2 font-mono font-normal"
                onClick={() => onPageChange(item.page)}
              >
                {item.page}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
