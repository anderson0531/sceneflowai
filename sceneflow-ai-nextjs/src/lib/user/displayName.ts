export type UserDisplayNameInput = {
  first_name?: string | null
  last_name?: string | null
  name?: string | null
  username?: string | null
  email?: string | null
}

function formatEmailLocalPart(email: string): string {
  const local = email.split('@')[0] || ''
  if (!local) return ''
  return local
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Resolve a human-friendly display name from session/profile fields. */
export function getUserDisplayName(user?: UserDisplayNameInput | null): string {
  if (!user) return 'User'

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName

  const name = user.name?.trim()
  const username = user.username?.trim()

  if (name && name.includes(' ')) return name
  if (name && username && name.toLowerCase() !== username.toLowerCase()) return name

  if (user.email) {
    const fromEmail = formatEmailLocalPart(user.email)
    if (fromEmail) return fromEmail
  }

  if (name) return name
  if (username) return username
  return 'User'
}

/** True when stored author looks like a login username rather than a display name. */
export function isUsernameLikeAuthor(
  authorWriter: string | undefined | null,
  user?: UserDisplayNameInput | null
): boolean {
  const stored = authorWriter?.trim()
  if (!stored) return false
  if (stored.includes(' ')) return false

  const username = user?.username?.trim()
  const sessionName = user?.name?.trim()

  if (username && stored.toLowerCase() === username.toLowerCase()) return true
  if (sessionName && stored.toLowerCase() === sessionName.toLowerCase()) return true

  return /^[a-zA-Z0-9_-]+$/.test(stored)
}

/** Display stored author_writer, upgrading username-like values from session profile. */
export function resolveAuthorWriterDisplay(
  authorWriter: string | undefined | null,
  user?: UserDisplayNameInput | null
): string {
  const stored = authorWriter?.trim()
  if (!stored) return getUserDisplayName(user)

  if (isUsernameLikeAuthor(stored, user)) {
    const resolved = getUserDisplayName(user)
    if (resolved !== 'User') return resolved
  }

  return stored
}
