import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  SavedLeadsFallback,
  SavedLeadsView,
} from '@/features/leads/saved-leads-view';

export const metadata: Metadata = { title: 'Saved leads' };

export default function SavedLeadsPage() {
  return (
    <Suspense fallback={<SavedLeadsFallback />}>
      <SavedLeadsView />
    </Suspense>
  );
}
