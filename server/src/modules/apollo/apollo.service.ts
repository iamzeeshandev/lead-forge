import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception.js';
import type { CompanyProfile } from '../../common/types/company-profile.js';
import { ApolloClient } from './apollo.client.js';
import { toApiException, toApolloApiError } from './apollo.errors.js';
import { mapApolloOrganization } from './apollo.mapper.js';

/**
 * The Apollo module's boundary: callers get LeadForge types and ApiExceptions,
 * never Apollo field names or ApolloApiError.
 */
@Injectable()
export class ApolloService {
  constructor(private readonly client: ApolloClient) {}

  /** Spends 1 Apollo credit when the domain matches a company. */
  async enrichCompany(domain: string): Promise<CompanyProfile> {
    const response = await this.call(() =>
      this.client.enrichOrganization(domain),
    );
    if (!response.organization) {
      throw new ApiException({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'NOT_FOUND',
        message: `Apollo has no company for ${domain}.`,
      });
    }
    return mapApolloOrganization(response.organization);
  }

  private async call<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      throw toApiException(toApolloApiError(error));
    }
  }
}
