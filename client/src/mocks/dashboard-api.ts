import type { DashboardSummary } from '@/types/dashboard';
import { groupLeadsByCompany } from './companies-api';
import { delay } from './delay';
import { mockLeadsSnapshot } from './leads-api';

const WEEK_MS = 7 * 86_400_000;

export async function getDashboardSummary(
  signal?: AbortSignal,
  now = Date.now(),
): Promise<DashboardSummary> {
  await delay(250, signal);
  const leads = [...mockLeadsSnapshot()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const weekAgo = new Date(now - WEEK_MS).toISOString();
  const companies = groupLeadsByCompany();

  const summary: DashboardSummary = {
    totals: {
      leads: leads.length,
      companies: companies.length,
      emailAvailable: leads.filter((lead) => lead.hasEmail).length,
      emailRevealed: leads.filter((lead) => lead.email !== null).length,
      savedLast7Days: leads.filter((lead) => lead.createdAt >= weekAgo).length,
    },
    byStatus: { new: 0, contacted: 0, qualified: 0, disqualified: 0 },
    byEnrichment: { not_enriched: 0, enriched: 0, not_found: 0, failed: 0 },
    topCompanies: companies.slice(0, 5),
    recentLeads: leads.slice(0, 5),
  };
  for (const lead of leads) {
    summary.byStatus[lead.status] += 1;
    summary.byEnrichment[lead.enrichmentStatus] += 1;
  }
  return summary;
}
