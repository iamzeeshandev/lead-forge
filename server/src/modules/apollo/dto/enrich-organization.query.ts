import { z } from 'zod';
import { domainSchema } from '../../../common/domain/domain.schema.js';

export const enrichOrganizationQuerySchema = z.object({
  domain: domainSchema,
});

export type EnrichOrganizationQuery = z.output<
  typeof enrichOrganizationQuerySchema
>;
