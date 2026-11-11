import { z } from 'zod';
import { normalizeDomain } from '../../../common/domain/normalize-domain.js';

export const enrichOrganizationQuerySchema = z.object({
  domain: z.string().transform((value, context) => {
    const domain = normalizeDomain(value);
    if (!domain) {
      context.addIssue({
        code: 'custom',
        message: 'Enter a domain such as acme.com.',
      });
      return z.NEVER;
    }
    return domain;
  }),
});

export type EnrichOrganizationQuery = z.output<
  typeof enrichOrganizationQuerySchema
>;
