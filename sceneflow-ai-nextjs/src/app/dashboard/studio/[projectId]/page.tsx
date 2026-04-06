'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

// Load the entire page client-side only to avoid hydration issues
const StudioPageClient = dynamic(
  () => import('./StudioPageClient'),
  { ssr: false }
);

export default function SparkStudioPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  return <StudioPageClient projectId={projectId} />;
}
