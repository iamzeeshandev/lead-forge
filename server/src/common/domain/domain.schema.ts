import { z } from 'zod';
import { normalizeDomain } from './normalize-domain.js';

/** Accepts whatever people paste (URL, email, "www.") and outputs the bare domain. */
export const domainSchema = z.string().transform((value, context) => {
  const domain = normalizeDomain(value);
  if (!domain) {
    context.addIssue({
      code: 'custom',
      message: 'Enter a domain such as acme.com.',
    });
    return z.NEVER;
  }
  return domain;
});
