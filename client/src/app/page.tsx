import type { Metadata } from 'next';
import { DashboardView } from '@/features/dashboard/dashboard-view';

// The layout's title template only applies to child segments, and this page
// shares the root segment with the layout, so the full title is set here.
export const metadata: Metadata = {
  title: { absolute: 'Overview · LeadForge' },
};

export default function OverviewPage() {
  return <DashboardView />;
}
