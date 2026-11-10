'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProspectPerson } from '@/types/prospect';
import { formatDay, PHONE_LABELS } from './format';

interface ProspectSheetProps {
  person: ProspectPerson;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  className?: string;
}

function Details({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, ReactNode]>;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="label-caps">{title}</h3>
      <dl className="grid grid-cols-[112px_minmax(0,1fr)] border-t border-divider">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="col-span-2 grid grid-cols-subgrid border-b border-divider py-1.75"
          >
            <dt className="text-subtle">{label}</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ProspectSheet({
  person,
  saved,
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
              saved ? 'bg-success' : 'bg-status-new',
            )}
          />
          {saved ? 'Saved to leads' : 'Not saved'}
        </span>
      </div>

      <Details
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

      <Details
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
        {saved ? (
          <Link
            href="/leads"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Open saved leads
          </Link>
        ) : (
          <Button size="lg" onClick={onSave}>
            Save lead
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
