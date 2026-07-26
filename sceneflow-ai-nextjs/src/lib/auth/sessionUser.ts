import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveUserId } from '@/lib/userHelper'

/**
 * Identity string carried on the NextAuth session — a UUID or an email,
 * depending on the provider. Callers that need a database id should use
 * {@link getSessionUserId} instead.
 */
export async function getSessionUserKey(): Promise<string | null> {
  try {
    const session = (await getServerSession(authOptions as never)) as
      | { user?: { id?: string; email?: string } }
      | null
    return session?.user?.id || session?.user?.email || null
  } catch {
    return null
  }
}

/**
 * Resolved database user id for the caller's session, or null when
 * unauthenticated. Routes must prefer this over any client-supplied `userId`:
 * trusting the request body lets one account read or queue work for another.
 */
export async function getSessionUserId(): Promise<string | null> {
  const key = await getSessionUserKey()
  if (!key) return null
  try {
    return await resolveUserId(key)
  } catch {
    return null
  }
}
