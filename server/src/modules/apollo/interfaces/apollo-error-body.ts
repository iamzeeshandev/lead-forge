/**
 * Apollo's structured error. `code` (DOMAIN.CATEGORY.REASON) is stable; `message`
 * wording can change. The legacy root fields `error`, `error_code` and `message`
 * are removed on 2027-02-16, so they aren't typed here.
 */
export interface ApolloErrorDetails {
  code: string;
  message?: string;
  suggestions?: Array<{
    label?: string;
    url?: string;
    retry_after_seconds?: number;
  }>;
  context?: Record<string, { value: unknown; description?: string }>;
}

export interface ApolloErrorBody {
  error_details?: ApolloErrorDetails;
}
