import { ApiError } from '@/lib/api-error';
import type { Paginated } from '@/types/api';
import type {
  ImportLeadsResult,
  Lead,
  LeadListParams,
  LeadUpdate,
} from '@/types/lead';
import type { ProspectPerson, ProspectSource } from '@/types/prospect';
import { delay } from './delay';

const STORAGE_KEY = 'leadforge:mock-leads';
const LATENCY_MS = 280;

let memory: Lead[] | null = null;

// localStorage keeps saved leads across reloads until Phase 5 replaces this
// with the database. Tests run without a window and use memory only.
function readStore(): Lead[] {
  if (memory) {
    return memory;
  }
  memory = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      memory = raw ? (JSON.parse(raw) as Lead[]) : [];
    } catch {
      memory = [];
    }
  }
  return memory;
}

function writeStore(leads: Lead[]) {
  memory = leads;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch {
      // Storage full or blocked: the in-memory copy still works for this session.
    }
  }
}

export function resetMockLeads() {
  writeStore([]);
}

function notFound(): ApiError {
  return new ApiError({
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'Lead not found.',
  });
}

function toLead(person: ProspectPerson, now: string): Lead {
  return {
    id: crypto.randomUUID(),
    source: person.source,
    externalId: person.externalId,
    firstName: person.firstName,
    lastName: null,
    lastNameMasked: person.lastNameMasked,
    title: person.title,
    companyName: person.companyName,
    email: null,
    linkedinUrl: null,
    hasEmail: person.hasEmail,
    directPhone: person.directPhone,
    status: 'new',
    notes: null,
    enrichmentStatus: 'not_enriched',
    createdAt: now,
    updatedAt: now,
    enrichedAt: null,
    lastSyncedAt: now,
  };
}

function matches(lead: Lead, query: string): boolean {
  const haystack = [
    lead.firstName,
    lead.lastName,
    lead.lastNameMasked,
    lead.title,
    lead.companyName,
    lead.email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export async function importLeads(
  people: ProspectPerson[],
  signal?: AbortSignal,
): Promise<ImportLeadsResult> {
  await delay(LATENCY_MS, signal);
  const existing = readStore();
  const keys = new Set(
    existing.map((lead) => `${lead.source}:${lead.externalId}`),
  );
  const now = new Date().toISOString();
  const created: Lead[] = [];

  // Mirrors the database's unique (source, externalId) constraint, including a
  // person who appears twice in the same request.
  for (const person of people) {
    const key = `${person.source}:${person.externalId}`;
    if (!keys.has(key)) {
      keys.add(key);
      created.push(toLead(person, now));
    }
  }

  writeStore([...created, ...existing]);
  return { imported: created.length, skipped: people.length - created.length };
}

export async function listLeads(
  params: LeadListParams,
  signal?: AbortSignal,
): Promise<Paginated<Lead>> {
  await delay(LATENCY_MS, signal);
  const query = params.q.trim();
  const filtered = readStore()
    .filter((lead) => params.status === null || lead.status === params.status)
    .filter((lead) => query === '' || matches(lead, query))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPages = Math.ceil(filtered.length / params.perPage);
  const start = (params.page - 1) * params.perPage;
  return {
    items: filtered.slice(start, start + params.perPage),
    meta: {
      page: params.page,
      perPage: params.perPage,
      totalItems: filtered.length,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPreviousPage: params.page > 1,
    },
  };
}

export async function getLead(id: string, signal?: AbortSignal): Promise<Lead> {
  await delay(LATENCY_MS, signal);
  const lead = readStore().find((candidate) => candidate.id === id);
  if (!lead) {
    throw notFound();
  }
  return lead;
}

export async function updateLead(
  id: string,
  update: LeadUpdate,
): Promise<Lead> {
  await delay(LATENCY_MS);
  const leads = readStore();
  const current = leads.find((lead) => lead.id === id);
  if (!current) {
    throw notFound();
  }
  const notes =
    update.notes === undefined ? current.notes : update.notes?.trim() || null;
  const updated: Lead = {
    ...current,
    status: update.status ?? current.status,
    notes,
    updatedAt: new Date().toISOString(),
  };
  writeStore(leads.map((lead) => (lead.id === id ? updated : lead)));
  return updated;
}

export async function deleteLead(id: string): Promise<void> {
  await delay(LATENCY_MS);
  const leads = readStore();
  if (!leads.some((lead) => lead.id === id)) {
    throw notFound();
  }
  writeStore(leads.filter((lead) => lead.id !== id));
}

/** Which of these provider people are already saved, as externalId → lead id. */
export async function findSavedProspects(
  source: ProspectSource,
  externalIds: string[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  await delay(LATENCY_MS / 2, signal);
  const wanted = new Set(externalIds);
  const saved: Record<string, string> = {};
  for (const lead of readStore()) {
    if (lead.source === source && wanted.has(lead.externalId)) {
      saved[lead.externalId] = lead.id;
    }
  }
  return saved;
}
