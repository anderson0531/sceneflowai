import CollabSession from '@/models/CollabSession'
import { getPayload } from '@/lib/blueprint/shareSession'

export async function getBlueprintShareRedirect(
  sessionId: string
): Promise<string | null> {
  try {
    const session = await CollabSession.findByPk(sessionId)
    if (!session) return null
    const payload = getPayload(session)
    if (!payload) return null
    const token = (session as { token?: string }).token
    if (!token) return null
    return `/blueprint/share/${token}`
  } catch {
    return null
  }
}
