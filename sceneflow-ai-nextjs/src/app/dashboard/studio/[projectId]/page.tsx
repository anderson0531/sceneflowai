'use client';

import dynamic from 'next/dynamic';

// Load the entire page client-side only to avoid hydration issues
const StudioPageClient = dynamic(
  () => import('./StudioPageClient'),
  { ssr: false }
);

export default function SparkStudioPage({ params }: { params: { projectId: string } }) {
  return <StudioPageClient projectId={params.projectId} />;
}
