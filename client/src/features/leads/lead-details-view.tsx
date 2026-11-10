'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DetailList } from '@/components/data/detail-list';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PHONE_LABELS } from '@/features/people-search/format';
import { ApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';
import type { Lead } from '@/types/lead';
import {
  ENRICHMENT_LABELS,
  LeadEmail,
  LeadStatusSelect,
  leadName,
} from './lead-display';
import { useDeleteLead, useLead, useUpdateLead } from './queries';

function BackLink() {
  return (
    <Link
      href="/leads"
      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft aria-hidden="true" className="size-3.5" />
      Saved leads
    </Link>
  );
}

function NotesEditor({ lead }: { lead: Lead }) {
  const [draft, setDraft] = useState(lead.notes ?? '');
  const save = useUpdateLead(lead.id);
  const dirty = draft.trim() !== (lead.notes ?? '');

  return (
    <section className="flex flex-col gap-2">
      <label htmlFor="lead-notes" className="label-caps">
        Notes
      </label>
      <Textarea
        id="lead-notes"
        value={draft}
        maxLength={5000}
        placeholder="Context for the next conversation"
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate({ notes: draft })}
        >
          {save.isPending ? 'Saving…' : 'Save notes'}
        </Button>
        <span role="status" className="text-xs">
          {save.isError && (
            <span className="text-destructive">
              Couldn&apos;t save the notes.
            </span>
          )}
          {save.isSuccess && !dirty && (
            <span className="text-success">Saved</span>
          )}
        </span>
      </div>
    </section>
  );
}

function LeadDetails({ lead }: { lead: Lead }) {
  const router = useRouter();
  const statusUpdate = useUpdateLead(lead.id);
  const remove = useDeleteLead(lead.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const role = [lead.title, lead.companyName].filter(Boolean).join(' · ');

  return (
    <>
      <PageHeader
        title={leadName(lead)}
        description={role || 'No title or company on record'}
        actions={
          <>
            <LeadStatusSelect
              value={lead.status}
              disabled={statusUpdate.isPending}
              onValueChange={(status) => statusUpdate.mutate({ status })}
            />
            <Button
              variant="destructive-outline"
              onClick={() => setConfirmOpen(true)}
            >
              Delete lead
            </Button>
          </>
        }
      />
      {statusUpdate.isError && (
        <p role="alert" className="text-xs text-destructive">
          Couldn&apos;t change the status. Try again.
        </p>
      )}

      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <DetailList
            title="Contact"
            rows={[
              ['Email', <LeadEmail key="email" lead={lead} />],
              ['LinkedIn', lead.linkedinUrl ?? 'Revealed by enrichment'],
              ['Direct phone', PHONE_LABELS[lead.directPhone]],
            ]}
          />
          <DetailList
            title="Provenance"
            rows={[
              ['Source', 'Apollo · sandbox'],
              [
                'Apollo ID',
                <span key="id" className="font-mono text-xs break-all">
                  {lead.externalId}
                </span>,
              ],
              ['Saved', formatDateTime(lead.createdAt)],
              ['Last synced', formatDateTime(lead.lastSyncedAt)],
              ['Enrichment', ENRICHMENT_LABELS[lead.enrichmentStatus]],
            ]}
          />
        </div>
        <div className="flex flex-col gap-6">
          <NotesEditor lead={lead} />
          <section className="flex flex-col gap-2">
            <h2 className="label-caps">Enrichment</h2>
            <p className="max-w-md text-muted-foreground">
              Enrichment reveals the full name, email and LinkedIn for 1 Apollo
              credit. It isn&apos;t included in the current Apollo plan.
            </p>
            <div>
              <Button variant="outline" disabled>
                Enrich · 1 credit
              </Button>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${leadName(lead)}?`}
        description="This removes the lead and its notes from LeadForge. Nothing changes in Apollo, and saving them again later is free."
        confirmLabel="Delete lead"
        pendingLabel="Deleting…"
        pending={remove.isPending}
        error={
          remove.isError ? "Couldn't delete the lead. Try again." : undefined
        }
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              setConfirmOpen(false);
              router.push('/leads');
            },
          })
        }
      />
    </>
  );
}

export function LeadDetailsView({ id }: { id: string }) {
  const lead = useLead(id);

  return (
    <main className="mx-auto flex w-full max-w-340 flex-col gap-5 px-6 pt-5 pb-8">
      <BackLink />
      {lead.isPending && (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Loading lead</span>
          <span
            aria-hidden="true"
            className="h-6 w-64 animate-pulse rounded-sm bg-divider"
          />
          <span
            aria-hidden="true"
            className="h-3 w-80 animate-pulse rounded-sm bg-divider"
          />
        </div>
      )}
      {lead.isError &&
        (lead.error instanceof ApiError && lead.error.code === 'NOT_FOUND' ? (
          <EmptyState
            title="Lead not found"
            description="It may have been deleted. Saved leads lists everyone you've kept."
            action={
              <Link
                href="/leads"
                className={buttonVariants({ variant: 'outline' })}
              >
                Go to saved leads
              </Link>
            }
          />
        ) : (
          <ErrorState
            title="Couldn't load this lead"
            description="Something went wrong while loading it. Try again."
            action={
              <Button variant="outline" onClick={() => lead.refetch()}>
                Try again
              </Button>
            }
          />
        ))}
      {lead.data && <LeadDetails lead={lead.data} />}
    </main>
  );
}
