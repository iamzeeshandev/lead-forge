/**
 * Query of `POST /mixed_people/api_search`. Apollo wants parameters in the query
 * string even though it's a POST. axios writes arrays as `person_titles[]=CTO&person_titles[]=VP`,
 * which is Apollo's array format, so the keys here have no `[]`.
 */
export interface ApolloPeopleSearchParams {
  q_keywords?: string;
  person_titles?: string[];
  include_similar_titles?: boolean;
  person_seniorities?: string[];
  person_locations?: string[];
  /** "min,max", e.g. "51,200". */
  organization_num_employees_ranges?: string[];
  q_organization_domains_list?: string[];
  page: number;
  per_page: number;
}

/** A person as the free search returns them: no email, phone or full last name. */
export interface ApolloSearchPerson {
  id: string;
  first_name?: string | null;
  /** "Hu***n": first two characters, asterisks, last character. */
  last_name_obfuscated?: string | null;
  title?: string | null;
  last_refreshed_at?: string | null;
  has_email?: boolean | null;
  has_city?: boolean | null;
  has_state?: boolean | null;
  has_country?: boolean | null;
  /** A string, not a boolean: "Yes" or "Maybe: please request direct dial via people/bulk_match". */
  has_direct_phone?: string | null;
  organization?: { name?: string | null } | null;
}

/** No pagination object, only the total. */
export interface ApolloPeopleSearchResponse {
  total_entries?: number | null;
  people?: ApolloSearchPerson[] | null;
}
