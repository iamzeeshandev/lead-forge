import { describe, expect, it } from 'vitest';
import { normalizeDomain } from './domain';

describe('normalizeDomain', () => {
  it.each([
    ['apollo.io', 'apollo.io'],
    ['  Apollo.IO  ', 'apollo.io'],
    ['https://www.apollo.io/pricing?ref=nav#plans', 'apollo.io'],
    ['http://apollo.io:8080', 'apollo.io'],
    ['www2.acme.co.uk', 'acme.co.uk'],
    ['jane.doe@acme.com', 'acme.com'],
    ['acme.com.', 'acme.com'],
    ['münchen.de', 'xn--mnchen-3ya.de'],
  ])('normalises %j to %s', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'localhost',
    'acme',
    'not a domain',
    '192.168.0.1',
    'acme.c0m',
    '-acme.com',
  ])('rejects %j', (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});
