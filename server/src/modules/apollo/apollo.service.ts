import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api-exception.js';
import {
  buildPaginationMeta,
  type Paginated,
} from '../../common/pagination.js';
import type { CompanyProfile } from '../../common/types/company-profile.js';
import type { ProspectPerson } from '../../common/types/prospect-person.js';
import { ApolloClient } from './apollo.client.js';
import { toApiException, toApolloApiError } from './apollo.errors.js';
import {
  APOLLO_MAX_PAGES,
  mapApolloOrganization,
  mapApolloPerson,
  toApolloPeopleSearchParams,
} from './apollo.mapper.js';
import type { SearchPeopleQuery } from './dto/search-people.query.js';

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

  async searchPeople(
    query: SearchPeopleQuery,
  ): Promise<Paginated<ProspectPerson>> {
    const response = await this.call(() =>
      this.client.searchPeople(toApolloPeopleSearchParams(query)),
    );
    return {
      items: (response.people ?? []).map(mapApolloPerson),
      meta: buildPaginationMeta(
        response.total_entries ?? 0,
        query.page,
        query.perPage,
        APOLLO_MAX_PAGES,
      ),
    };
  }

  private async call<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      throw toApiException(toApolloApiError(error));
    }
  }
}
