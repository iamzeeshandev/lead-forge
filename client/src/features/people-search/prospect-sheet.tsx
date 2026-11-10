'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { DetailList } from '@/components/data/detail-list';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatDay } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ProspectPerson } from '@/types/prospect';
import { PHONE_LABELS } from './format';

interface ProspectSheetProps {
  person: ProspectPerson;
  /** The LeadForge lead id when this person is already saved. */
  savedLeadId: string | null;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  className?: string;
}

export function ProspectSheet({
  person,
  savedLeadId,
  saving,
  onSave,
  onClose,
  className,
}: ProspectSheetProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [person.externalId]);

  const role = [person.title, person.companyName].filter(Boolean).join(' · ');

  return (
    <aside
      aria-label="Prospect details"
      className={cn(
        'flex flex-col gap-4.5 border-l bg-card px-5 pt-5 pb-6',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="label-caps">Prospect</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close details"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight outline-none"
        >
          {person.firstName ?? 'Unnamed'}{' '}
          {person.lastNameMasked && (
            <span className="font-mono font-normal text-muted-foreground">
              {person.lastNameMasked}
            </span>
          )}
        </h2>
        <p className="text-foreground/90">
          {role || 'No title or company on record'}
        </p>
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 rounded-full',
              savedLeadId ? 'bg-success' : 'bg-status-new',
            )}
          />
          {savedLeadId ? 'Saved to leads' : 'Not saved'}
        </span>
      </div>

      <DetailList
        title="What the search returned"
        rows={[
          [
            'Last name',
            person.lastNameMasked ? (
              <>
                <span className="font-mono">{person.lastNameMasked}</span>{' '}
                <span className="text-subtle">masked by Apollo</span>
              </>
            ) : (
              'Not on record'
            ),
          ],
          ['Email', person.hasEmail ? 'Available · not revealed' : 'Not found'],
          ['Direct phone', PHONE_LABELS[person.directPhone]],
          [
            'Location',
            person.hasLocation ? 'On record · not revealed' : 'Not on record',
          ],
          [
            'Refreshed',
            <span key="refreshed" className="font-mono">
              {formatDay(person.lastRefreshedAt)}
            </span>,
          ],
        ]}
      />

      <DetailList
        title="Source"
        rows={[
          ['Provider', 'Apollo · sandbox'],
          [
            'Apollo ID',
            <span key="id" className="font-mono text-xs break-all">
              {person.externalId}
            </span>,
          ],
        ]}
      />

      <div className="mt-auto flex flex-col gap-2">
        {savedLeadId ? (
          <Link
            href={`/leads/${savedLeadId}`}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Open saved lead
          </Link>
        ) : (
          <Button size="lg" disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save lead'}
          </Button>
        )}
        <Button size="lg" variant="outline" disabled>
          Enrich · 1 credit
        </Button>
        <p className="text-2xs text-subtle">
          Enrichment reveals the full name, email and LinkedIn. It isn&apos;t
          included in the current Apollo plan.
        </p>
      </div>
    </aside>
  );
}
