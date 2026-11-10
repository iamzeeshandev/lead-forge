import { DetailList } from '@/components/data/detail-list';
import { formatCompactCurrency, formatNumber } from '@/lib/format';
import type { CompanyProfile } from '@/types/company';

const VISIBLE_TECHNOLOGIES = 16;

function ExternalLink({ url }: { url: string | null }) {
  if (!url) {
    return <span className="text-subtle">—</span>;
  }
  let label = url;
  try {
    const parsed = new URL(url);
    label = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  } catch {
    return <span className="break-all">{url}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary hover:underline"
    >
      {label}
    </a>
  );
}

export function CompanyProfileCard({ company }: { company: CompanyProfile }) {
  const location = [company.city, company.state, company.country]
    .filter(Boolean)
    .join(', ');
  const hidden = company.technologies.length - VISIBLE_TECHNOLOGIES;

  return (
    <section
      aria-labelledby="company-name"
      className="flex flex-col gap-4 rounded-lg border bg-card p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2
            id="company-name"
            className="text-xl font-semibold tracking-tight"
          >
            {company.name}
          </h2>
          <p className="text-muted-foreground first-letter:uppercase">
            {company.industry ?? 'Industry not on record'}
          </p>
        </div>
        <span className="font-mono text-xs text-subtle">{company.domain}</span>
      </div>

      {company.shortDescription && (
        <p className="max-w-3xl">{company.shortDescription}</p>
      )}

      <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
        <DetailList
          title="Firmographics"
          headingLevel="h3"
          rows={[
            [
              'Employees',
              <span key="employees" className="font-mono">
                {formatNumber(company.employeeCount)}
              </span>,
            ],
            [
              'Annual revenue',
              <span key="revenue" className="font-mono">
                {formatCompactCurrency(company.annualRevenue)}
              </span>,
            ],
            [
              'Founded',
              <span key="founded" className="font-mono">
                {company.foundedYear ?? '—'}
              </span>,
            ],
            ['Headquarters', location || '—'],
          ]}
        />
        <DetailList
          title="Links"
          headingLevel="h3"
          rows={[
            [
              'Website',
              <ExternalLink key="website" url={company.websiteUrl} />,
            ],
            [
              'LinkedIn',
              <ExternalLink key="linkedin" url={company.linkedinUrl} />,
            ],
            [
              'Apollo ID',
              <span key="id" className="font-mono text-xs break-all">
                {company.externalId}
              </span>,
            ],
          ]}
        />
      </div>

      {company.technologies.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="label-caps">
            Technologies · {company.technologies.length}
          </h3>
          <ul className="flex flex-wrap gap-1">
            {company.technologies
              .slice(0, VISIBLE_TECHNOLOGIES)
              .map((technology) => (
                <li
                  key={technology}
                  className="inline-flex h-6 items-center rounded-sm border bg-secondary px-2 text-xs"
                >
                  {technology}
                </li>
              ))}
            {hidden > 0 && (
              <li className="inline-flex h-6 items-center px-1 text-xs text-subtle">
                +{hidden} more
              </li>
            )}
          </ul>
        </section>
      )}
    </section>
  );
}
