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
 * If the user doesn't exist (common in demo mode or failed auth), it will
 * auto-create the user in the database.
 * 
 * @param userIdOrEmail - Either a UUID or email address
 * @returns User instance with UUID
 * @throws Error if user cannot be found or created
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

  // If user not found, auto-create (common in demo mode or when session has email as ID)
  if (!user) {
    // Only auto-create if input is an email (not a UUID)
    if (!isUUID(userIdOrEmail)) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userIdOrEmail)) {
        throw new Error(`Invalid email format: ${userIdOrEmail}`)
      }

      try {
        // Generate username from email (take part before @, sanitize, limit length)
        const emailPrefix = userIdOrEmail.split('@')[0]
        const sanitizedUsername = emailPrefix
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 48) // Limit to 48 chars (username max is 50, leave some buffer)
        const username = sanitizedUsername || `user_${Date.now()}`

        console.log(`[userHelper] Auto-creating user for email: ${userIdOrEmail}`)
        
        // Create new user
        user = await User.create({
          email: userIdOrEmail,
          username: username,
          password_hash: 'session-user', // Placeholder for session-based users
          is_active: true,
          email_verified: false,
          credits: 0,
          subscription_credits_monthly: 0,
          addon_credits: 0,
          storage_used_gb: 0,
          one_time_tiers_purchased: [],
        } as any)

        console.log(`[userHelper] Successfully created user: ${user.id} (${user.email})`)
      } catch (error: any) {
        // Handle unique constraint violation (user created between check and create)
        if (error.name === 'SequelizeUniqueConstraintError' || error.message?.includes('unique')) {
          // Try to find the user again (it was created by another request)
          user = await User.findOne({
            where: { email: userIdOrEmail },
          })
          if (user) {
            console.log(`[userHelper] User was created by another request: ${user.id}`)
            return user
          }
        }
        console.error(`[userHelper] Failed to auto-create user: ${error.message}`)
        throw new Error(`Failed to create user: ${error.message}`)
      }
    } else {
      // UUID was provided but user doesn't exist - don't auto-create
      throw new Error(`User not found: ${userIdOrEmail}`)
    }
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

