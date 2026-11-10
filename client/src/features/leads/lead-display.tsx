import { cn } from '@/lib/utils';
import {
  type EnrichmentStatus,
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from '@/types/lead';

export const ENRICHMENT_LABELS: Record<EnrichmentStatus, string> = {
  not_enriched: 'Not enriched',
  enriched: 'Enriched',
  not_found: 'No match found',
  failed: 'Failed',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  disqualified: 'Disqualified',
};

const STATUS_DOT: Record<LeadStatus, string> = {
  new: 'bg-status-new',
  contacted: 'bg-status-contacted',
  qualified: 'bg-status-qualified',
  disqualified: 'bg-status-disqualified',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', STATUS_DOT[status])}
      />
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

interface LeadStatusSelectProps {
  value: LeadStatus;
  onValueChange: (status: LeadStatus) => void;
  disabled?: boolean;
}

export function LeadStatusSelect({
  value,
  onValueChange,
  disabled,
}: LeadStatusSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Status
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = LEAD_STATUSES.find(
            (status) => status === event.target.value,
          );
          if (next) {
            onValueChange(next);
          }
        }}
        className="h-8 rounded-md border border-input bg-popover px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-60"
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {LEAD_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function leadName(lead: Lead): string {
  const last = lead.lastName ?? lead.lastNameMasked;
  return [lead.firstName, last].filter(Boolean).join(' ') || 'Unnamed lead';
}

/** Shows the full last name once known, otherwise the masked one in mono. */
export function LeadName({ lead }: { lead: Lead }) {
  return (
    <>
      {lead.firstName ?? 'Unnamed'}{' '}
      {lead.lastName ??
        (lead.lastNameMasked && (
          <span className="font-mono font-normal text-muted-foreground">
            {lead.lastNameMasked}
          </span>
        ))}
    </>
  );
}

export function LeadEmail({ lead }: { lead: Lead }) {
  if (lead.email) {
    return <span className="font-mono text-xs">{lead.email}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          lead.hasEmail ? 'bg-success' : 'bg-status-new',
        )}
      />
      {lead.hasEmail ? 'Available · enrich to reveal' : 'Not found'}
    </span>
  );
}
