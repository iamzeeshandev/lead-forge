import { ApiError } from '@/lib/api-error';

export interface ApiErrorView {
  eyebrow: string;
  title: string;
  description: string;
  detail?: string;
  canRetry: boolean;
}

function minutesLabel(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

export function describeApiError(error: unknown): ApiErrorView {
  if (!(error instanceof ApiError)) {
    // fetch() rejects without a response when the server is down or unreachable.
    return {
      eyebrow: 'No response',
      title: "Couldn't reach the LeadForge server",
      description: 'Check that the server is running, then try again.',
      canRetry: true,
    };
  }

  const detail = [error.code, error.requestId && `request ${error.requestId}`]
    .filter(Boolean)
    .join(' · ');

  switch (error.code) {
    case 'PROVIDER_RATE_LIMITED':
      return {
        eyebrow: '429 · Rate limited',
        title: "Apollo's hourly limit is used up",
        description: error.retryAfterSeconds
          ? `Apollo accepts requests again in ${minutesLabel(error.retryAfterSeconds)}.`
          : 'Wait a few minutes, then try again.',
        detail,
        canRetry: false,
      };
    case 'PROVIDER_ACCESS_DENIED':
      return {
        eyebrow: 'Not in plan',
        title: "This search isn't included in the current Apollo plan",
        description:
          'People search uses sandbox data until the plan includes it.',
        detail,
        canRetry: false,
      };
    case 'PROVIDER_TIMEOUT':
      return {
        eyebrow: `${error.status} · Timeout`,
        title: "Apollo didn't answer in time",
        description:
          'Your filters are kept. Try again; if it keeps failing, Apollo may be having an outage.',
        detail,
        canRetry: true,
      };
    case 'VALIDATION_FAILED':
      return {
        eyebrow: `${error.status} · Invalid search`,
        title: "This request can't be processed",
        description: error.message,
        detail,
        canRetry: false,
      };
    default:
      return {
        eyebrow: `${error.status} · Search failed`,
        title: "The request didn't complete",
        description: 'Something went wrong on the server. Try again.',
        detail,
        canRetry: true,
      };
  }
}
