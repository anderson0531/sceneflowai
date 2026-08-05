import { resolveUser } from '@/lib/userHelper'
import {
  resolveCreatorCredit,
  resolveCreatorName,
  type UserDisplayNameInput,
} from '@/lib/user/displayName'

type SessionLike = {
  user?: ({ id?: string } & UserDisplayNameInput) | null
} | null

/**
 * Creator credit for the signed-in user, preferring the database over the session.
 *
 * The NextAuth JWT only carries first/last name from sign-in, so a profile edit
 * is invisible to it until the user re-authenticates. Returns '' when the account
 * has no real name on file, so callers omit the credit instead of printing a
 * login id.
 */
export async function resolveCreatorCreditForSession(
  session: SessionLike,
  fallback?: string
): Promise<string> {
  const key = session?.user?.id || session?.user?.email

  if (key) {
    try {
      const user = await resolveUser(key)
      const fromDb = resolveCreatorName({
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        username: user.username ?? null,
        email: user.email ?? null,
      })
      if (fromDb) return fromDb
    } catch (err) {
      console.warn('[creatorCredit] Could not read profile for credit:', err)
    }
  }

  const fromSession = resolveCreatorName(session?.user ?? null)
  if (fromSession) return fromSession

  // A client-supplied name is trusted only when it reads like a person's name.
  return resolveCreatorCredit(fallback, session?.user ?? null)
}
