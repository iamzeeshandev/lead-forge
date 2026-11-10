import type { LeadCompany } from './company';
import type { EnrichmentStatus, Lead, LeadStatus } from './lead';

/** Response of `GET /api/dashboard/summary`, counted from LeadForge's own data. */
export interface DashboardSummary {
  totals: {
    leads: number;
    companies: number;
    /** The search said an email exists. */
    emailAvailable: number;
    /** The email address is actually known (only after enrichment). */
    emailRevealed: number;
    savedLast7Days: number;
  };
  byStatus: Record<LeadStatus, number>;
  byEnrichment: Record<EnrichmentStatus, number>;
  topCompanies: LeadCompany[];
  recentLeads: Lead[];
}
