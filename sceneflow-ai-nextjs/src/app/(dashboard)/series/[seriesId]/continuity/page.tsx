import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ seriesId: string }>
}

/** Legacy continuity hub — unified in Series Studio Continuity tab. */
export default async function ContinuityRedirectPage({ params }: PageProps) {
  const { seriesId } = await params
  redirect(`/dashboard/series/${seriesId}?tab=continuity`)
}
