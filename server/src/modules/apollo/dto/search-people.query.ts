import { z } from 'zod';
import { domainSchema } from '../../../common/domain/domain.schema.js';

// Our own filter values, the same ones the client uses. The mapper converts them
// to Apollo's formats, so the client never depends on one provider's API.
export const SENIORITIES = [
  'owner',
  'founder',
  'c_suite',
  'partner',
  'vp',
  'head',
  'director',
  'manager',
  'senior',
  'entry',
] as const;

export const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001+',
] as const;

export type CompanySize = (typeof COMPANY_SIZES)[number];

// `?titles=CTO` arrives as a string and `?titles=CTO&titles=VP` as an array.
// Apollo rejects searches with 100 or more titles.
const list = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (value === undefined ? [] : [value].flat()),
    z.array(item).max(99),
  );

const text = z.string().trim().min(1).max(100);

export const searchPeopleQuerySchema = z.object({
  keywords: z.string().trim().max(200).default(''),
  titles: list(text),
  includeSimilarTitles: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  seniorities: list(z.enum(SENIORITIES)),
  locations: list(text),
  companySizes: list(z.enum(COMPANY_SIZES)),
  domains: list(domainSchema),
  // Apollo serves 500 pages at most.
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce
    .number()
    .pipe(z.literal([10, 25, 50, 100]))
    .default(25),
});

export type SearchPeopleQuery = z.output<typeof searchPeopleQuerySchema>;
