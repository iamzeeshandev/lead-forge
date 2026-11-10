import type { Metadata } from 'next';
import { PeopleSearchView } from '@/features/people-search/people-search-view';

export const metadata: Metadata = { title: 'People' };

export default function PeoplePage() {
  return <PeopleSearchView />;
}
