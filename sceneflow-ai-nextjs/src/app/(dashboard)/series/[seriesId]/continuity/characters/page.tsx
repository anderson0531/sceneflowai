import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ seriesId: string }>
}

/** Retired route — cast lives in Reference Library. */
export default async function CharactersRedirectPage({ params }: PageProps) {
  const { seriesId } = await params
  redirect(`/dashboard/series/${seriesId}?tab=reference-library&section=cast`)
}
