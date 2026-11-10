import { describe, expect, it } from 'vitest';
import type { LeadListParams } from '@/types/lead';
import { parseListParams, toListSearchParams } from './list-params';

describe('parseListParams', () => {
  it('returns defaults for an empty URL', () => {
    expect(parseListParams(new URLSearchParams())).toEqual({
      q: '',
      status: null,
      page: 1,
      perPage: 25,
    });
  });

  it.each([
    ['status=archived', { status: null }],
    ['page=-2', { page: 1 }],
    ['perPage=1000', { perPage: 25 }],
    ['q=%20%20priya%20%20', { q: 'priya' }],
  ])('normalises %s', (query, expected) => {
    expect(parseListParams(new URLSearchParams(query))).toMatchObject(expected);
  });
});

describe('toListSearchParams', () => {
  it('writes nothing for the default view', () => {
    expect(
      toListSearchParams({
        q: '',
        status: null,
        page: 1,
        perPage: 25,
      }).toString(),
    ).toBe('');
  });

  it('round-trips every field', () => {
    const params: LeadListParams = {
      q: 'corvid',
      status: 'qualified',
      page: 3,
      perPage: 50,
    };
    expect(parseListParams(toListSearchParams(params))).toEqual(params);
  });
});
