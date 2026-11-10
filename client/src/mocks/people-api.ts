import { MAX_PAGE } from '@/features/people-search/search-params';
import { ApiError } from '@/lib/api-error';
import type { ApiErrorBody, Paginated } from '@/types/api';
import type { PeopleSearchParams } from '@/types/people-search';
import type { ProspectPerson } from '@/types/prospect';

const FIRST_NAMES = [
  'Dana',
  'Marcus',
  'Priya',
  'Tomás',
  'Elena',
  'Kwame',
  'Sofia',
  'Jonas',
  'Aiko',
  'Rahul',
  'Lena',
  'Mateo',
  'Grace',
  'Yusuf',
  'Ines',
  'Noah',
  'Mei',
  'Oskar',
  'Amara',
  'Diego',
];
const MASKED_LAST_NAMES = [
  'Ha***n',
  'O***e',
  'Sh***a',
  'Ro***z',
  'Vo***a',
  'As***h',
  'Li***d',
  'Be***r',
  'Na***a',
  'Me***a',
  'Ok***r',
  'Fe***z',
  'Ch***n',
  'Ka***i',
  'Mo***o',
];
const TITLES = [
  'VP Engineering',
  'Head of Engineering',
  'Head of Platform',
  'VP Product Engineering',
  'Director of Engineering',
  'Head of Infrastructure',
  'Engineering Manager',
  'CTO',
];
const COMPANIES = [
  'Northwind Logistics',
  'Brightwell Health',
  'Corvid Analytics',
  'Harbor & Finch',
  'Quillmark Commerce',
  'Meridian Freight',
  'Pinecrest Software',
  'Tidewater Energy',
  'Lumenfold Payments',
  'Stratus Media',
  'Copperline Labs',
  'Fieldnote Insurance',
];
const PHONES: ProspectPerson['directPhone'][] = ['yes', 'maybe', 'maybe', 'no'];

const BASE_TOTAL = 48_213;
const REFERENCE_TIME = Date.UTC(2026, 10, 10);
const DAY_MS = 86_400_000;

// Mock only: type one of these into Keywords to see the matching error state.
const ERROR_TRIGGERS: Record<string, ApiErrorBody> = {
  'test:rate-limit': {
    statusCode: 429,
    code: 'PROVIDER_RATE_LIMITED',
    message: "Apollo's hourly request limit is used up.",
    retryAfterSeconds: 840,
    requestId: 'mock-6f1c2a90',
  },
  'test:access-denied': {
    statusCode: 502,
    code: 'PROVIDER_ACCESS_DENIED',
    message: "The current Apollo plan doesn't include people search.",
    requestId: 'mock-3b77d015',
  },
  'test:timeout': {
    statusCode: 504,
    code: 'PROVIDER_TIMEOUT',
    message: "Apollo didn't respond within 10 seconds.",
  },
  'test:unavailable': {
    statusCode: 502,
    code: 'PROVIDER_UNAVAILABLE',
    message: 'Apollo returned an unexpected error.',
  },
};

/** FNV-1a: a fast, stable string hash, so the same search always returns the same people. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length];
}

function countFilters(params: PeopleSearchParams): number {
  return [
    params.keywords.trim(),
    params.titles,
    params.seniorities,
    params.locations,
    params.companySizes,
    params.domains,
  ].filter((filter) => filter.length > 0).length;
}

function totalFor(params: PeopleSearchParams, seed: number): number {
  if (params.keywords.trim().toLowerCase() === 'test:empty') {
    return 0;
  }
  return (
    Math.round(BASE_TOTAL / (1 + countFilters(params) * 1.8)) - (seed % 997)
  );
}

// Seeded by the result's absolute position, so a person keeps their place when perPage changes.
function makePerson(
  params: PeopleSearchParams,
  seed: number,
  position: number,
): ProspectPerson {
  const n = hash(`${seed}:${position}`);
  const missingDetails = n % 23 === 0;
  const externalId = [1, 2, 3]
    .map((part) =>
      hash(`${seed}:${position}:${part}`).toString(16).padStart(8, '0'),
    )
    .join('');

  return {
    source: 'apollo',
    externalId,
    firstName: pick(FIRST_NAMES, n),
    lastNameMasked: missingDetails ? null : pick(MASKED_LAST_NAMES, n >>> 3),
    title: missingDetails
      ? null
      : pick(params.titles.length > 0 ? params.titles : TITLES, n >>> 5),
    companyName: pick(COMPANIES, n >>> 7),
    hasEmail: n % 5 !== 0,
    directPhone: pick(PHONES, n >>> 9),
    hasLocation: n % 7 !== 0,
    lastRefreshedAt: missingDetails
      ? null
      : new Date(REFERENCE_TIME - (n % 120) * DAY_MS).toISOString(),
  };
}

// TanStack Query aborts requests it no longer needs (e.g. clicking through pages
// quickly); the real fetch in Phase 4 honours the same signal.
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export async function searchPeople(
  params: PeopleSearchParams,
  signal?: AbortSignal,
): Promise<Paginated<ProspectPerson>> {
  const { page, perPage, ...filters } = params;
  const seed = hash(JSON.stringify(filters));
  await delay(350 + (hash(`${seed}:${page}`) % 300), signal);

  const trigger = ERROR_TRIGGERS[params.keywords.trim().toLowerCase()];
  if (trigger) {
    throw new ApiError(trigger);
  }

  const totalItems = Math.max(0, totalFor(params, seed));
  const totalPages = Math.min(Math.ceil(totalItems / perPage), MAX_PAGE);
  const start = (page - 1) * perPage;
  // Like Apollo, a page past the end is not an error: it just has no people.
  const count = page > totalPages ? 0 : Math.min(perPage, totalItems - start);

  return {
    items: Array.from({ length: count }, (_, index) =>
      makePerson(params, seed, start + index),
    ),
    meta: {
      page,
      perPage,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
