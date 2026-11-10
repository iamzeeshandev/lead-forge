import type { PerPage } from './people-search';
import type { ProspectPerson, ProspectSource } from './prospect';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'disqualified',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type EnrichmentStatus =
  'not_enriched' | 'enriched' | 'not_found' | 'failed';

/** A person saved into LeadForge's own database. */
export interface Lead {
  id: string;
  source: ProspectSource;
  /** The provider's id. Together with `source` it is unique: one lead per provider person. */
  externalId: string;
  firstName: string | null;
  /** Known only after enrichment; search results carry the masked form. */
  lastName: string | null;
  lastNameMasked: string | null;
  title: string | null;
  companyName: string | null;
  email: string | null;
  linkedinUrl: string | null;
  /** Availability flags copied from the search result at import time. */
  hasEmail: boolean;
  directPhone: ProspectPerson['directPhone'];
  status: LeadStatus;
  notes: string | null;
  enrichmentStatus: EnrichmentStatus;
  createdAt: string;
  updatedAt: string;
  enrichedAt: string | null;
  lastSyncedAt: string | null;
}

export interface ImportLeadsResult {
  imported: number;
  /** Already saved (same source and externalId), so not imported again. */
  skipped: number;
}

export interface LeadUpdate {
  status?: LeadStatus;
  notes?: string | null;
}

/** Query of `GET /api/leads`. */
export interface LeadListParams {
  q: string;
  status: LeadStatus | null;
  page: number;
  perPage: PerPage;
}
