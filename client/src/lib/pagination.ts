export type PageItem =
  | { type: 'page'; page: number; isCurrent: boolean }
  | { type: 'gap'; id: string };

/**
 * The page buttons to show: the first and last page, `siblings` pages either
 * side of the current one, and gaps where pages are skipped.
 */
export function getPageItems(
  current: number,
  totalPages: number,
  siblings = 1,
): PageItem[] {
  if (totalPages < 1) {
    return [];
  }

  const page = Math.min(Math.max(current, 1), totalPages);
  const shown = new Set([1, totalPages]);
  for (let p = page - siblings; p <= page + siblings; p++) {
    if (p >= 1 && p <= totalPages) {
      shown.add(p);
    }
  }

  const sorted = [...shown].sort((a, b) => a - b);
  const items: PageItem[] = [];
  sorted.forEach((p, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && p - previous === 2) {
      // A gap would hide exactly one page; showing the page itself takes the same space.
      items.push({ type: 'page', page: previous + 1, isCurrent: false });
    } else if (previous !== undefined && p - previous > 2) {
      items.push({ type: 'gap', id: `gap-after-${previous}` });
    }
    // Compared with the requested page, not the clamped one: past the last page
    // nothing is current, so the last page stays a link back into range.
    items.push({ type: 'page', page: p, isCurrent: p === current });
  });
  return items;
}

/** "21–30" for page 3 at 10 per page; the last page stops at `totalItems`. */
export function formatRange(
  page: number,
  perPage: number,
  totalItems: number,
): string {
  const start = (page - 1) * perPage + 1;
  // A page past the last result is possible: Apollo answers it with an empty list.
  if (totalItems <= 0 || start > totalItems) {
    return '0';
  }
  const end = Math.min(page * perPage, totalItems);
  return `${start.toLocaleString('en-US')}–${end.toLocaleString('en-US')}`;
}
