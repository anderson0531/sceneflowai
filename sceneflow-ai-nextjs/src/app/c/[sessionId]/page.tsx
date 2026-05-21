import { redirect } from 'next/navigation'
import { getBlueprintShareRedirect } from './redirectBlueprint'
import CollaborationPageClient from './CollaborationPageClient'

type Props = { params: Promise<{ sessionId: string }> }

export default async function CollaborationPage({ params }: Props) {
  const { sessionId } = await params
  const blueprintPath = await getBlueprintShareRedirect(sessionId)
  if (blueprintPath) {
    redirect(blueprintPath)
  }
  return <CollaborationPageClient params={params} />
}
