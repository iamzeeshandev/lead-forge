import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  PeopleSearchFallback,
  PeopleSearchView,
} from '@/features/people-search/people-search-view';

export const metadata: Metadata = { title: 'People' };

export default function PeoplePage() {
  return (
    <Suspense fallback={<PeopleSearchFallback />}>
      <PeopleSearchView />
    </Suspense>
  );
}
