import { describe, expect, it } from 'vitest';
import { formatRange, getPageItems, type PageItem } from './pagination';

function render(items: PageItem[]): string {
  return items
    .map((item) => {
      if (item.type === 'gap') {
        return '…';
      }
      return item.isCurrent ? `[${item.page}]` : String(item.page);
    })
    .join(' ');
}

describe('getPageItems', () => {
  it.each([
    [1, 500, '[1] 2 … 500'],
    [3, 500, '1 2 [3] 4 … 500'],
    [4, 500, '1 2 3 [4] 5 … 500'],
    [250, 500, '1 … 249 [250] 251 … 500'],
    [497, 500, '1 … 496 [497] 498 499 500'],
    [500, 500, '1 … 499 [500]'],
    [3, 5, '1 2 [3] 4 5'],
    [1, 1, '[1]'],
    [2, 2, '1 [2]'],
  ])('page %i of %i → %s', (current, total, expected) => {
    expect(render(getPageItems(current, total))).toBe(expected);
  });

  it('clamps a page beyond the last one', () => {
    expect(render(getPageItems(600, 500))).toBe('1 … 499 [500]');
  });

  it('clamps a page below the first one', () => {
    expect(render(getPageItems(0, 500))).toBe('[1] 2 … 500');
  });

  it('returns nothing when there are no pages', () => {
    expect(getPageItems(1, 0)).toEqual([]);
  });

  it('gives each gap a unique id', () => {
    const gaps = getPageItems(250, 500).filter((item) => item.type === 'gap');
    expect(new Set(gaps.map((gap) => gap.id)).size).toBe(2);
  });
});

describe('formatRange', () => {
  it('formats a full page', () => {
    expect(formatRange(3, 10, 48_213)).toBe('21–30');
  });

  it('stops at the total on the last page', () => {
    expect(formatRange(5, 10, 43)).toBe('41–43');
  });

  it('uses thousands separators', () => {
    expect(formatRange(3, 1_000, 48_213)).toBe('2,001–3,000');
  });

  it('returns 0 for an empty result', () => {
    expect(formatRange(1, 25, 0)).toBe('0');
  });

  it('returns 0 for a page past the last result', () => {
    expect(formatRange(500, 100, 48_213)).toBe('0');
  });
});
