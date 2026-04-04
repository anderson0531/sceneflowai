import { Op, QueryTypes, col, fn, where as sqlWhere } from 'sequelize'
import { sequelize } from '@/config/database'
import { User } from '@/models/User'

const TAG = '[userHelper]'

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function readUserId(user: User): string | undefined {
  try {
    const dv = user.getDataValue('id' as keyof User)
    if (dv != null && dv !== '') return String(dv)
  } catch { /* ignore */ }
  const fromGetter = user.id
  if (fromGetter != null && fromGetter !== '') return String(fromGetter)
  const raw = (user as unknown as { dataValues?: Record<string, unknown> }).dataValues?.id
  return raw != null && raw !== '' ? String(raw) : undefined
}

function applyUserId(user: User, id: string): void {
  user.setDataValue('id', id)
}

async function fetchUserIdRawByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email)
  const rows = await sequelize.query<{ id: string }>(
    `SELECT id::text AS id FROM public.users WHERE LOWER(TRIM(email)) = :email LIMIT 1`,
    { replacements: { email: normalized }, type: QueryTypes.SELECT }
  )
  const id = rows[0]?.id
  return id != null && id !== '' ? String(id) : null
}


async function ensureUserRowHasId(user: User): Promise<User> {
  let id = readUserId(user)
  if (id) {
    applyUserId(user, id)
    return user
  }
  console.warn(`${TAG} id missing after findOne, dataValues:`, JSON.stringify(
    (user as unknown as { dataValues?: Record<string, unknown> }).dataValues
  )?.slice(0, 800))

  await user.reload({ attributes: ['id', 'email', 'username'] })
  id = readUserId(user)
  if (id) {
    applyUserId(user, id)
    return user
  }

  const emailVal = user.getDataValue('email' as keyof User) ?? (user as User & { email?: string }).email
  if (emailVal) {
    const rawId = await fetchUserIdRawByEmail(String(emailVal))
    if (rawId) {
      console.log(`${TAG} recovered id via raw SQL: ${rawId}`)
      applyUserId(user, rawId)
      return user
    }
  }

  throw new Error(
    `User row has no id (email=${emailVal ?? 'unknown'}). Check DB primary key on public.users.`
  )
}

async function findUserByEmailLoose(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email)
  const byLower = await User.findOne({
    where: sqlWhere(fn('LOWER', col('email')), normalized),
  })
  if (byLower) return byLower
  return User.findOne({
    where: { email: { [Op.iLike]: normalized } },
  })
}

/**
 * Resolve a user by either UUID or email address.
 *
 * The NextAuth session can store session.user.id as either a UUID or an
 * email address. This function handles both and returns a User with a
 * guaranteed id.  If the user doesn't exist it will be auto-created.
 */
export async function resolveUser(userIdOrEmail: string): Promise<User> {
  if (!userIdOrEmail) {
    throw new Error('User ID or email is required')
  }

  let user: User | null = null

  if (isUUID(userIdOrEmail)) {
    user = await User.findByPk(userIdOrEmail)
  } else {
    user = await findUserByEmailLoose(userIdOrEmail)
  }

  if (!user) {
    if (isUUID(userIdOrEmail)) {
      throw new Error(`User not found: ${userIdOrEmail}`)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userIdOrEmail)) {
      throw new Error(`Invalid email format: ${userIdOrEmail}`)
    }

    const normalizedEmail = normalizeEmail(userIdOrEmail)
    const emailPrefix = userIdOrEmail.split('@')[0]
    const sanitizedUsername = emailPrefix
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 48)
    const username = sanitizedUsername || `user_${Date.now()}`
    const displayName =
      emailPrefix
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim() || username

    console.log(`${TAG} Auto-creating user for email: ${normalizedEmail}`)

    try {
      user = await User.create({
        email: normalizedEmail,
        username,
        first_name: displayName,
        password_hash: 'session-user',
        is_active: true,
        email_verified: false,
        credits: 0,
        subscription_credits_monthly: 0,
        addon_credits: 0,
        storage_used_gb: 0,
        one_time_tiers_purchased: [],
      } as any)
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError' || error.message?.includes('unique')) {
        user =
          (await findUserByEmailLoose(userIdOrEmail)) ||
          (await User.findOne({ where: { username } }))
        if (user) {
          console.log(`${TAG} Resolved user after unique race: ${readUserId(user)} (${user.email})`)
        }
      }
      if (!user) {
        console.error(`${TAG} Failed to auto-create user: ${error.message}`)
        throw new Error(`Failed to create user: ${error.message}`)
      }
    }

    if (user) {
      console.log(`${TAG} User ready: ${readUserId(user)} (${user.email})`)
    }
  }

  if (!user) {
    throw new Error(`User not found: ${userIdOrEmail}`)
  }

  return ensureUserRowHasId(user)
}

/**
 * Resolve user ID (UUID) from either UUID or email address.
 */
export async function resolveUserId(userIdOrEmail: string): Promise<string> {
  const user = await resolveUser(userIdOrEmail)
  const id = readUserId(user)
  if (!id) {
    throw new Error(`${TAG} User has no id after full resolution: ${userIdOrEmail}`)
  }
  return id
}
