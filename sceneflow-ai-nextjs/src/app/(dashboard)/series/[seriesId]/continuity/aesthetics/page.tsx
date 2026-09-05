import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ seriesId: string }>
}

export default async function AestheticsRedirectPage({ params }: PageProps) {
  const { seriesId } = await params
  redirect(`/dashboard/series/${seriesId}?tab=continuity&section=aesthetics`)
}
