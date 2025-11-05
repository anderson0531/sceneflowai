import { User } from '@/models/User'

/**
 * Check if a string is a valid UUID format
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Resolve a user by either UUID or email address
 * 
 * The NextAuth session can store session.user.id as either:
 * - A UUID (when user is properly authenticated)
 * - An email address (fallback when login API doesn't return proper UUID)
 * 
 * This function handles both cases and returns the user with their UUID.
 * 
 * @param userIdOrEmail - Either a UUID or email address
 * @returns User instance with UUID
 * @throws Error if user is not found
 */
export async function resolveUser(userIdOrEmail: string): Promise<User> {
  if (!userIdOrEmail) {
    throw new Error('User ID or email is required')
  }

  let user: User | null = null

  if (isUUID(userIdOrEmail)) {
    // It's a UUID, use findByPk
    user = await User.findByPk(userIdOrEmail)
  } else {
    // It's likely an email, use findOne
    user = await User.findOne({
      where: { email: userIdOrEmail },
    })
  }

  if (!user) {
    throw new Error(`User not found: ${userIdOrEmail}`)
  }

  return user
}

/**
 * Resolve user ID (UUID) from either UUID or email address
 * 
 * This is a convenience function that returns just the UUID string.
 * 
 * @param userIdOrEmail - Either a UUID or email address
 * @returns User's UUID as string
 * @throws Error if user is not found
 */
export async function resolveUserId(userIdOrEmail: string): Promise<string> {
  const user = await resolveUser(userIdOrEmail)
  return user.id
}

