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

/**
 * Two or more alphabetic words — the shape of a credit you would put on a title
 * card. Deliberately excludes digits, so handles never qualify.
 */
function looksLikeHumanName(value: string): boolean {
  return /^[\p{L}][\p{L}'\u2019.-]*(?:\s+[\p{L}][\p{L}'\u2019.-]*)+$/u.test(value.trim())
}

/**
 * True when a stored name is the email local part dressed up rather than a name
 * the user gave us.
 *
 * Accounts auto-created from a session get `first_name` seeded from their email
 * (see resolveUser in lib/userHelper), so `anderson0531@gmail.com` is stored as
 * "Anderson0531". That reads as a login id wherever it is credited.
 */
export function isEmailDerivedName(
  value: string | null | undefined,
  email?: string | null
): boolean {
  const trimmed = value?.trim()
  if (!trimmed) return false

  // A digit in a name is a handle, whatever its origin.
  if (/\d/.test(trimmed)) return true

  // "Jane Doe" is presentable even when it came from jane.doe@example.com.
  if (looksLikeHumanName(trimmed)) return false

  if (!email) return false
  const fromEmail = formatEmailLocalPart(email)
  return !!fromEmail && fromEmail.toLowerCase() === trimmed.toLowerCase()
}

/**
 * A name suitable for a creator credit, or null when the account has no real
 * name on file.
 *
 * Unlike {@link getUserDisplayName} this never falls back to the email local
 * part or the username: a wrong name on a screenplay title card is worse than
 * no name, so callers omit the credit when this returns null.
 */
export function resolveCreatorName(user?: UserDisplayNameInput | null): string | null {
  if (!user) return null

  const first = user.first_name?.trim() || ''
  const last = user.last_name?.trim() || ''

  // A surname is strong evidence a person filled the profile in.
  if (first && last) return `${first} ${last}`

  const single = first || last
  if (single && !isEmailDerivedName(single, user.email)) return single

  const name = user.name?.trim()
  if (name && looksLikeHumanName(name)) return name

  return null
}

/**
 * Creator credit for a stored `author_writer`, or '' when nothing presentable is
 * available. Stored values are re-evaluated on read, so blueprints saved with an
 * email-derived handle recover once the profile has a real name.
 */
export function resolveCreatorCredit(
  authorWriter: string | null | undefined,
  user?: UserDisplayNameInput | null
): string {
  const fromProfile = resolveCreatorName(user)
  const stored = authorWriter?.trim()

  if (!stored) return fromProfile ?? ''
  if (looksLikeHumanName(stored) && !/\d/.test(stored)) return stored

  return fromProfile ?? ''
}

// resolveAuthorWriterDisplay and isUsernameLikeAuthor were removed in favour of
// resolveCreatorCredit. They always returned a string, falling back through the
// email local part, which is how a login id reached the "Created by" field and
// the screenplay's "Written by" credit.
