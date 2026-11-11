/**
 * The fields of `organization` that LeadForge reads, typed from a real response
 * (2026-11-11), not only from the docs. Apollo leaves fields out or sends null
 * per company, so everything except `id` is optional and nullable.
 */
export interface ApolloOrganization {
  id: string;
  name?: string | null;
  primary_domain?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  industry?: string | null;
  estimated_num_employees?: number | null;
  annual_revenue?: number | null;
  // Undocumented; carried the same value as annual_revenue in the real response.
  organization_revenue?: number | null;
  founded_year?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  short_description?: string | null;
  /** Can repeat names. */
  technology_names?: string[] | null;
}

/** `GET /organizations/enrich`. No match is a 200 with `{}`, not a 404. */
export interface ApolloOrganizationEnrichResponse {
  organization?: ApolloOrganization;
}
