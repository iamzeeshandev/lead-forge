import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import type { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { toApolloApiError } from './apollo.errors.js';
import { readRateLimit, readRequestId } from './apollo.headers.js';
import type { ApolloOrganizationEnrichResponse } from './interfaces/apollo-organization.js';

/**
 * The only class that talks HTTP to Apollo. It returns Apollo's raw shapes and
 * throws ApolloApiError; mapping to LeadForge types happens in ApolloService.
 */
@Injectable()
export class ApolloClient {
  private readonly logger = new Logger(ApolloClient.name);

  constructor(private readonly http: HttpService) {}

  /** 1 credit when a company matches. */
  enrichOrganization(
    domain: string,
  ): Promise<ApolloOrganizationEnrichResponse> {
    return this.request({
      method: 'GET',
      url: '/organizations/enrich',
      params: { domain },
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    // Path only: query strings can hold names and emails, headers hold the key.
    const label = `${config.method} ${config.url}`;
    const startedAt = performance.now();
    try {
      const response = await firstValueFrom(this.http.request<T>(config));
      const headers = response.headers as Record<string, unknown>;
      const { minuteLeft, hourLeft, dayLeft } = readRateLimit(headers);
      this.logger.log(
        line(
          label,
          response.status,
          elapsed(startedAt),
          `left ${minuteLeft ?? '?'}/min ${hourLeft ?? '?'}/h ${dayLeft ?? '?'}/day`,
          `req ${readRequestId(headers) ?? '-'}`,
        ),
      );
      return response.data;
    } catch (error) {
      const apolloError = toApolloApiError(error);
      const { status, kind, code, detail, retryAfterSeconds, requestId } =
        apolloError.info;
      this.logger.warn(
        line(
          label,
          status ?? kind,
          code,
          elapsed(startedAt),
          retryAfterSeconds !== null && `retry in ${retryAfterSeconds}s`,
          `req ${requestId ?? '-'}`,
          detail,
        ),
      );
      throw apolloError;
    }
  }
}

function elapsed(startedAt: number): string {
  return `${Math.round(performance.now() - startedAt)}ms`;
}

function line(...parts: Array<string | number | false | null>): string {
  return parts.filter((part) => part !== false && part !== null).join(' | ');
}
