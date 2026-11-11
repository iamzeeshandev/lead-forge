import { Controller, Get, Query } from '@nestjs/common';
import type { CompanyProfile } from '../../common/types/company-profile.js';
import { ApolloService } from './apollo.service.js';
import {
  type EnrichOrganizationQuery,
  enrichOrganizationQuerySchema,
} from './dto/enrich-organization.query.js';

@Controller('apollo')
export class ApolloController {
  constructor(private readonly apolloService: ApolloService) {}

  /** `GET /api/apollo/organizations/enrich?domain=apollo.io`. Costs 1 Apollo credit per match. */
  @Get('organizations/enrich')
  enrichOrganization(
    @Query({ schema: enrichOrganizationQuerySchema })
    query: EnrichOrganizationQuery,
  ): Promise<CompanyProfile> {
    return this.apolloService.enrichCompany(query.domain);
  }
}
