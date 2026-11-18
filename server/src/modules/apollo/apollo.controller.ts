import { Controller, Get, Query } from '@nestjs/common';
import type { Paginated } from '../../common/pagination.js';
import type { CompanyProfile } from '../../common/types/company-profile.js';
import type { ProspectPerson } from '../../common/types/prospect-person.js';
import { ApolloService } from './apollo.service.js';
import {
  type EnrichOrganizationQuery,
  enrichOrganizationQuerySchema,
} from './dto/enrich-organization.query.js';
import {
  type SearchPeopleQuery,
  searchPeopleQuerySchema,
} from './dto/search-people.query.js';

@Controller('apollo')
export class ApolloController {
  constructor(private readonly apolloService: ApolloService) {}

  /** `GET /api/apollo/people?titles=CTO&titles=VP&page=2`. 0 credits. */
  @Get('people')
  searchPeople(
    @Query({ schema: searchPeopleQuerySchema }) query: SearchPeopleQuery,
  ): Promise<Paginated<ProspectPerson>> {
    return this.apolloService.searchPeople(query);
  }

  /** `GET /api/apollo/organizations/enrich?domain=apollo.io`. Costs 1 Apollo credit per match. */
  @Get('organizations/enrich')
  enrichOrganization(
    @Query({ schema: enrichOrganizationQuerySchema })
    query: EnrichOrganizationQuery,
  ): Promise<CompanyProfile> {
    return this.apolloService.enrichCompany(query.domain);
  }
}
