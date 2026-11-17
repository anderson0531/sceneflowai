import crypto from 'crypto'
import { QueryTypes, type Transaction } from 'sequelize'
import { sequelize, User, SubscriptionTier } from '@/models'
import { hasColumns } from '@/lib/database/schemaProbe'
import { ensureCreditLotsTable } from '@/lib/database/migrateCreditLots'
import { assignBalances, loadUserLots, saveUserLots } from '@/lib/credits/creditLotStore'
import {
  addDays,
  applyPackGrant,
  createLot,
  expireDueLots,
  sumLots,
  type CreditLedgerIntent,
  type CreditLot,
} from '@/lib/credits/creditLots'
import { writeLedgerIntents } from '@/services/CreditService'
import { hasActiveSubscriptionAccess } from '@/lib/billing/subscriptionAccess'
import {
  getDefaultCreditsForTier,
  getDefaultDurationDaysForTier,
  getPrelaunchTierPreset,
} from '@/lib/billing/prelaunchAccess'

export type AccessRequestStatus = 'pending' | 'approved' | 'declined' | 'revoked'
export type AccessRequestType = 'initial_access' | 'additional_credits'
export type AdminCreditMode = 'set' | 'add' | 'keep'

export interface PrelaunchAccessRequestRecord {
  id: string
  email: string
  user_id: string | null
  full_name: string | null
  company_name: string | null
  use_case: string | null
  requested_tier: string | null
  requested_credits: number | null
  project_details: string | null
  request_type: AccessRequestType
  status: AccessRequestStatus
  granted_tier: string | null
  granted_credits: number | null
  granted_duration_days: number | null
  fulfilled_at: string | null
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined user fields (when listed in admin console)
  registered_user_id?: string | null
  user_subscription_status?: string | null
  user_tier_name?: string | null
  user_tier_display_name?: string | null
  user_total_credits?: number | null
  user_is_active?: boolean | null
}

export interface AdminManagedUserSummary {
  id: string
  email: string
  username: string
  first_name: string | null
  last_name: string | null
  is_active: boolean
  subscription_status: string | null
  subscription_start_date: string | null
  subscription_end_date: string | null
  tier_id: string | null
  tier_name: string | null
  tier_display_name: string | null
  credits: number
  subscription_credits_monthly: number
  addon_credits: number
  one_time_tiers_purchased: string[]
  has_active_access: boolean
  created_at: string
  last_login: string | null
}

let prelaunchAccessTableReady = false

export async function ensurePrelaunchAccessTable(): Promise<void> {
  if (prelaunchAccessTableReady) return

  if (
    await hasColumns('prelaunch_access_requests', [
      'id',
      'email',
      'status',
      'request_type',
      'fulfilled_at',
    ])
  ) {
    prelaunchAccessTableReady = true
    return
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS prelaunch_access_requests (
      id UUID PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      user_id UUID NULL,
      full_name VARCHAR(200) NULL,
      company_name VARCHAR(200) NULL,
      use_case VARCHAR(100) NULL,
      requested_tier VARCHAR(64) NULL,
      requested_credits BIGINT NULL,
      project_details TEXT NULL,
      request_type VARCHAR(32) NOT NULL DEFAULT 'initial_access',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      granted_tier VARCHAR(64) NULL,
      granted_credits BIGINT NULL,
      granted_duration_days INTEGER NULL,
      fulfilled_at TIMESTAMPTZ NULL,
      admin_notes TEXT NULL,
      reviewed_by VARCHAR(255) NULL,
      reviewed_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_prelaunch_access_email_lower
      ON prelaunch_access_requests (LOWER(email));
  `)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_prelaunch_access_status_created
      ON prelaunch_access_requests (status, created_at DESC);
  `)

  prelaunchAccessTableReady = true
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val.trim()
  )
}

function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.map(String)
      } catch {
        // ignore
      }
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((s) => s.replace(/^"|"$/g, '').trim())
        .filter(Boolean)
    }
  }
  return []
}

async function resolveTierRow(tierIdOrName: string): Promise<SubscriptionTier> {
  const preset = getPrelaunchTierPreset(tierIdOrName)
  let tier = await SubscriptionTier.findOne({ where: { name: preset.dbTierName } })

  if (!tier) {
    try {
      const { seedSubscriptionTiers } = await import('@/lib/database/seedSubscriptionTiers')
      await seedSubscriptionTiers()
      tier = await SubscriptionTier.findOne({ where: { name: preset.dbTierName } })
    } catch (err) {
      console.warn('[AccessControlService] Failed to auto-seed subscription_tiers:', err)
    }
  }

  if (!tier) {
    throw new Error(`Subscription tier "${preset.dbTierName}" not found in database`)
  }
  return tier
}

async function findUserByIdOrEmail(idOrEmail: string): Promise<User | null> {
  const clean = idOrEmail.trim()
  if (!clean) return null
  if (isUuid(clean)) {
    const byPk = await User.findByPk(clean)
    if (byPk) return byPk
  }
  const normalized = normalizeEmail(clean)
  return User.findOne({
    where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), normalized),
  })
}

export async function submitPrelaunchAccessRequest(input: {
  email: string
  userId?: string | null
  fullName?: string | null
  companyName?: string | null
  useCase?: string | null
  requestedTier?: string | null
  requestedCredits?: number | null
  projectDetails?: string | null
  requestType?: AccessRequestType
}): Promise<PrelaunchAccessRequestRecord> {
  await ensurePrelaunchAccessTable()

  const email = normalizeEmail(input.email || '')
  if (!isValidEmail(email)) {
    throw new Error('Please provide a valid email address.')
  }

  const requestType: AccessRequestType =
    input.requestType === 'additional_credits' ? 'additional_credits' : 'initial_access'
  const fullName = input.fullName?.trim().slice(0, 200) || null
  const companyName = input.companyName?.trim().slice(0, 200) || null
  const useCase = input.useCase?.trim().slice(0, 100) || null
  const requestedTier = input.requestedTier?.trim().toLowerCase().slice(0, 64) || 'explorer'
  const requestedCredits =
    typeof input.requestedCredits === 'number' && Number.isFinite(input.requestedCredits)
      ? Math.max(0, Math.round(input.requestedCredits))
      : null
  const projectDetails = input.projectDetails?.trim().slice(0, 4000) || null

  let resolvedUserId = input.userId || null
  if (!resolvedUserId) {
    const existingUser = await findUserByIdOrEmail(email)
    if (existingUser) resolvedUserId = existingUser.id
  }

  const existingPending = await sequelize.query<PrelaunchAccessRequestRecord>(
    `
      SELECT *
      FROM prelaunch_access_requests
      WHERE LOWER(email) = :email
        AND status = 'pending'
        AND request_type = :requestType
      ORDER BY created_at DESC
      LIMIT 1
    `,
    {
      replacements: { email, requestType },
      type: QueryTypes.SELECT,
    }
  )

  if (existingPending.length > 0) {
    const rowId = existingPending[0].id
    const updated = await sequelize.query<PrelaunchAccessRequestRecord>(
      `
        UPDATE prelaunch_access_requests
        SET
          user_id = COALESCE(:userId, user_id),
          full_name = COALESCE(:fullName, full_name),
          company_name = COALESCE(:companyName, company_name),
          use_case = COALESCE(:useCase, use_case),
          requested_tier = COALESCE(:requestedTier, requested_tier),
          requested_credits = COALESCE(:requestedCredits, requested_credits),
          project_details = COALESCE(:projectDetails, project_details),
          updated_at = NOW()
        WHERE id = :rowId
        RETURNING *
      `,
      {
        replacements: {
          rowId,
          userId: resolvedUserId,
          fullName,
          companyName,
          useCase,
          requestedTier,
          requestedCredits,
          projectDetails,
        },
        type: QueryTypes.SELECT,
      }
    )
    return updated[0]
  }

  const id = crypto.randomUUID()
  const inserted = await sequelize.query<PrelaunchAccessRequestRecord>(
    `
      INSERT INTO prelaunch_access_requests (
        id,
        email,
        user_id,
        full_name,
        company_name,
        use_case,
        requested_tier,
        requested_credits,
        project_details,
        request_type,
        status,
        created_at,
        updated_at
      )
      VALUES (
        :id,
        :email,
        :userId,
        :fullName,
        :companyName,
        :useCase,
        :requestedTier,
        :requestedCredits,
        :projectDetails,
        :requestType,
        'pending',
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    {
      replacements: {
        id,
        email,
        userId: resolvedUserId,
        fullName,
        companyName,
        useCase,
        requestedTier,
        requestedCredits,
        projectDetails,
        requestType,
      },
      type: QueryTypes.SELECT,
    }
  )

  return inserted[0]
}

export async function getUserAccessRequests(
  email: string,
  userId?: string | null
): Promise<PrelaunchAccessRequestRecord[]> {
  await ensurePrelaunchAccessTable()
  const normalized = normalizeEmail(email || '')
  if (!normalized && !userId) return []

  return sequelize.query<PrelaunchAccessRequestRecord>(
    `
      SELECT *
      FROM prelaunch_access_requests
      WHERE LOWER(email) = :email
         OR (:userId IS NOT NULL AND user_id = :userId)
      ORDER BY created_at DESC
      LIMIT 10
    `,
    {
      replacements: { email: normalized, userId: userId || null },
      type: QueryTypes.SELECT,
    }
  )
}

async function applyAccessAndCreditsInTx(params: {
  tx: Transaction
  userId: string
  tierName: string | null // null or 'keep' keeps current tier; otherwise activates tier
  credits: number
  creditMode: AdminCreditMode
  durationDays: number
  adminEmail: string
  adminNotes?: string | null
  refPrefix?: string
}): Promise<{
  user: User
  appliedTierName: string | null
  appliedTierDisplayName: string | null
  previousCredits: number
  newCredits: number
}> {
  const {
    tx,
    userId,
    tierName,
    credits,
    creditMode,
    durationDays,
    adminEmail,
    adminNotes,
    refPrefix = 'admin_access',
  } = params

  const user = await User.findByPk(userId, {
    transaction: tx,
    lock: tx.LOCK.UPDATE,
  })
  if (!user) {
    throw new Error('Target user not found')
  }

  const now = new Date()
  const safeDuration = Math.max(1, Math.min(3650, Math.round(durationDays || 30)))
  let appliedTier: SubscriptionTier | null = null

  if (tierName && tierName !== 'keep' && tierName !== 'none') {
    appliedTier = await resolveTierRow(tierName)
    user.subscription_tier_id = appliedTier.id
    user.subscription_status = 'active'
    user.is_active = true
    user.subscription_start_date = now
    user.subscription_end_date = addDays(now, safeDuration)

    if (appliedTier.name === 'explorer') {
      const existingPurchased = Array.isArray(user.one_time_tiers_purchased)
        ? user.one_time_tiers_purchased
        : []
      if (!existingPurchased.includes('explorer')) {
        user.one_time_tiers_purchased = [...existingPurchased, 'explorer']
      }
    }
  } else {
    user.is_active = true
  }

  const { lots } = await loadUserLots(user, now, tx)
  const expired = expireDueLots(lots, now)
  const previousCredits = sumLots(expired.lots)
  const safeCredits = Math.max(0, Math.round(Number(credits || 0)))
  const refTag = `${refPrefix}_${now.getTime()}`

  if (creditMode === 'set') {
    const isExplorer = appliedTier?.name === 'explorer'
    const isMonthlyTier = Boolean(appliedTier && appliedTier.name !== 'explorer')
    const lotSource = isExplorer ? 'explorer' : isMonthlyTier ? 'subscription' : 'addon'
    const lotExpiryDays = isExplorer
      ? Math.max(safeDuration, 90)
      : isMonthlyTier
        ? safeDuration
        : 365

    const nextLots: CreditLot[] =
      safeCredits > 0
        ? [
            createLot({
              source: lotSource,
              credits: safeCredits,
              purchasedAt: now,
              expiresAt: addDays(now, lotExpiryDays),
              ref: refTag,
            }),
          ]
        : []

    await saveUserLots(user.id, nextLots, tx)
    assignBalances(user, nextLots, now)

    const delta = safeCredits - previousCredits
    if (delta !== 0) {
      const intents: CreditLedgerIntent[] = [
        {
          delta,
          prev: previousCredits,
          next: safeCredits,
          reason: 'adjustment',
          creditType: lotSource === 'subscription' ? 'subscription' : 'addon',
          meta: {
            kind: 'admin_set_balance',
            tier: tierName,
            granted_by: adminEmail,
            notes: adminNotes || null,
          },
        },
      ]
      await writeLedgerIntents(user.id, intents, tx, refTag)
    }
  } else if (creditMode === 'add' && safeCredits > 0) {
    const granted = applyPackGrant({
      lots: expired.lots,
      source: 'addon',
      credits: safeCredits,
      now,
      ref: refTag,
      ledgerReason: 'adjustment',
      meta: {
        kind: 'admin_grant',
        tier: tierName,
        granted_by: adminEmail,
        notes: adminNotes || null,
      },
    })
    await saveUserLots(user.id, granted.lots, tx)
    assignBalances(user, granted.lots, now)
    await writeLedgerIntents(user.id, granted.intents, tx, refTag)
  } else {
    // 'keep': preserve current active lots while syncing expired clean-up
    await saveUserLots(user.id, expired.lots, tx)
    assignBalances(user, expired.lots, now)
  }

  await user.save({ transaction: tx })

  return {
    user,
    appliedTierName: appliedTier?.name ?? null,
    appliedTierDisplayName: appliedTier?.display_name ?? null,
    previousCredits,
    newCredits: Number(user.credits || 0),
  }
}

/**
 * Automatically fulfills an unfulfilled admin pre-approval as soon as the user
 * logs in or queries `/api/subscription/status`.
 */
export async function fulfillPendingApprovedGrantForUser(input: {
  id: string
  email?: string | null
}): Promise<boolean> {
  if (!input.email) return false
  await ensurePrelaunchAccessTable()
  await ensureCreditLotsTable()

  const normalized = normalizeEmail(input.email)
  const unfulfilled = await sequelize.query<PrelaunchAccessRequestRecord>(
    `
      SELECT *
      FROM prelaunch_access_requests
      WHERE LOWER(email) = :email
        AND status = 'approved'
        AND fulfilled_at IS NULL
      ORDER BY reviewed_at DESC NULLS LAST, updated_at DESC
      LIMIT 1
    `,
    {
      replacements: { email: normalized },
      type: QueryTypes.SELECT,
    }
  )

  if (unfulfilled.length === 0) return false

  return sequelize.transaction(async (tx) => {
    const lockedRows = await sequelize.query<PrelaunchAccessRequestRecord>(
      `
        SELECT *
        FROM prelaunch_access_requests
        WHERE id = :id
          AND status = 'approved'
          AND fulfilled_at IS NULL
        FOR UPDATE
      `,
      {
        replacements: { id: unfulfilled[0].id },
        type: QueryTypes.SELECT,
        transaction: tx,
      }
    )

    if (lockedRows.length === 0) return false
    const reqRow = lockedRows[0]
    const targetTier = reqRow.granted_tier || reqRow.requested_tier || 'explorer'
    const targetCredits =
      reqRow.granted_credits !== null && reqRow.granted_credits !== undefined
        ? Number(reqRow.granted_credits)
        : getDefaultCreditsForTier(targetTier)
    const targetDuration =
      reqRow.granted_duration_days || getDefaultDurationDaysForTier(targetTier)
    const creditMode: AdminCreditMode =
      reqRow.request_type === 'additional_credits' ? 'add' : 'set'

    await applyAccessAndCreditsInTx({
      tx,
      userId: input.id,
      tierName: reqRow.request_type === 'additional_credits' ? 'keep' : targetTier,
      credits: targetCredits,
      creditMode,
      durationDays: targetDuration,
      adminEmail: reqRow.reviewed_by || 'admin_preapproval',
      adminNotes: reqRow.admin_notes,
      refPrefix: 'prelaunch_auto_fulfill',
    })

    await sequelize.query(
      `
        UPDATE prelaunch_access_requests
        SET fulfilled_at = NOW(),
            user_id = :userId,
            updated_at = NOW()
        WHERE id = :id
      `,
      {
        replacements: { id: reqRow.id, userId: input.id },
        transaction: tx,
      }
    )

    return true
  })
}

export async function adminGrantUserAccessAndCredits(input: {
  requestId?: string | null
  targetEmailOrUserId?: string | null
  tierName?: string | null // 'explorer' | 'hobbyist' | 'starter' | 'pro' | 'founding_operator' | 'studio' | 'enterprise' | 'keep'
  credits: number
  creditMode?: AdminCreditMode
  durationDays?: number
  adminEmail: string
  adminNotes?: string | null
}): Promise<{
  fulfilledImmediately: boolean
  email: string
  userId: string | null
  tierName: string | null
  newCredits: number
  message: string
}> {
  await ensurePrelaunchAccessTable()
  await ensureCreditLotsTable()

  let reqRow: PrelaunchAccessRequestRecord | null = null
  if (input.requestId) {
    const rows = await sequelize.query<PrelaunchAccessRequestRecord>(
      `SELECT * FROM prelaunch_access_requests WHERE id = :id LIMIT 1`,
      {
        replacements: { id: input.requestId },
        type: QueryTypes.SELECT,
      }
    )
    reqRow = rows[0] || null
    if (!reqRow) {
      throw new Error('Access request not found')
    }
  }

  const targetIdentifier = (
    input.targetEmailOrUserId ||
    reqRow?.user_id ||
    reqRow?.email ||
    ''
  ).trim()

  if (!targetIdentifier) {
    throw new Error('Target email or user ID is required')
  }

  const user = await findUserByIdOrEmail(targetIdentifier)
  const resolvedEmail = normalizeEmail(
    user?.email || reqRow?.email || targetIdentifier
  )

  const effectiveTier =
    input.tierName ??
    (reqRow?.request_type === 'additional_credits'
      ? 'keep'
      : reqRow?.requested_tier || 'explorer')
  const effectiveCredits = Math.max(0, Math.round(Number(input.credits ?? 0)))
  const effectiveMode: AdminCreditMode =
    input.creditMode ||
    (reqRow?.request_type === 'additional_credits' ? 'add' : 'set')
  const effectiveDuration =
    input.durationDays || getDefaultDurationDaysForTier(effectiveTier)
  const notes = input.adminNotes?.trim().slice(0, 2000) || null

  if (user) {
    const txResult = await sequelize.transaction(async (tx) => {
      const applied = await applyAccessAndCreditsInTx({
        tx,
        userId: user.id,
        tierName: effectiveTier,
        credits: effectiveCredits,
        creditMode: effectiveMode,
        durationDays: effectiveDuration,
        adminEmail: input.adminEmail,
        adminNotes: notes,
        refPrefix: 'admin_grant',
      })

      if (reqRow) {
        await sequelize.query(
          `
            UPDATE prelaunch_access_requests
            SET status = 'approved',
                user_id = :userId,
                granted_tier = :grantedTier,
                granted_credits = :grantedCredits,
                granted_duration_days = :durationDays,
                fulfilled_at = NOW(),
                admin_notes = COALESCE(:adminNotes, admin_notes),
                reviewed_by = :adminEmail,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
          `,
          {
            replacements: {
              id: reqRow.id,
              userId: user.id,
              grantedTier: effectiveTier,
              grantedCredits: effectiveCredits,
              durationDays: effectiveDuration,
              adminNotes: notes,
              adminEmail: input.adminEmail,
            },
            transaction: tx,
          }
        )
      } else {
        // Also close out any pending initial request for this email so queue stays tidy
        await sequelize.query(
          `
            UPDATE prelaunch_access_requests
            SET status = 'approved',
                user_id = :userId,
                granted_tier = :grantedTier,
                granted_credits = :grantedCredits,
                granted_duration_days = :durationDays,
                fulfilled_at = NOW(),
                admin_notes = COALESCE(:adminNotes, admin_notes),
                reviewed_by = :adminEmail,
                reviewed_at = NOW(),
                updated_at = NOW()
            WHERE LOWER(email) = :email
              AND status = 'pending'
          `,
          {
            replacements: {
              email: resolvedEmail,
              userId: user.id,
              grantedTier: effectiveTier,
              grantedCredits: effectiveCredits,
              durationDays: effectiveDuration,
              adminNotes: notes,
              adminEmail: input.adminEmail,
            },
            transaction: tx,
          }
        )
      }

      return applied
    })

    return {
      fulfilledImmediately: true,
      email: user.email,
      userId: user.id,
      tierName: txResult.appliedTierName || effectiveTier,
      newCredits: txResult.newCredits,
      message: `Activated ${user.email} (${txResult.newCredits.toLocaleString()} available credits).`,
    }
  }

  // User hasn't created their password account yet — store pre-approval for automatic fulfillment on signup/login!
  if (!isValidEmail(resolvedEmail)) {
    throw new Error('User not found and identifier is not a valid email address.')
  }

  const preapproveTier =
    !effectiveTier || effectiveTier === 'keep' ? 'explorer' : effectiveTier

  if (reqRow) {
    await sequelize.query(
      `
        UPDATE prelaunch_access_requests
        SET status = 'approved',
            granted_tier = :grantedTier,
            granted_credits = :grantedCredits,
            granted_duration_days = :durationDays,
            fulfilled_at = NULL,
            admin_notes = COALESCE(:adminNotes, admin_notes),
            reviewed_by = :adminEmail,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = :id
      `,
      {
        replacements: {
          id: reqRow.id,
          grantedTier: preapproveTier,
          grantedCredits: effectiveCredits,
          durationDays: effectiveDuration,
          adminNotes: notes,
          adminEmail: input.adminEmail,
        },
      }
    )
  } else {
    await sequelize.query(
      `
        INSERT INTO prelaunch_access_requests (
          id,
          email,
          requested_tier,
          requested_credits,
          request_type,
          status,
          granted_tier,
          granted_credits,
          granted_duration_days,
          fulfilled_at,
          admin_notes,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
        )
        VALUES (
          :id,
          :email,
          :grantedTier,
          :grantedCredits,
          'initial_access',
          'approved',
          :grantedTier,
          :grantedCredits,
          :durationDays,
          NULL,
          :adminNotes,
          :adminEmail,
          NOW(),
          NOW(),
          NOW()
        )
      `,
      {
        replacements: {
          id: crypto.randomUUID(),
          email: resolvedEmail,
          grantedTier: preapproveTier,
          grantedCredits: effectiveCredits,
          durationDays: effectiveDuration,
          adminNotes: notes,
          adminEmail: input.adminEmail,
        },
      }
    )
  }

  return {
    fulfilledImmediately: false,
    email: resolvedEmail,
    userId: null,
    tierName: preapproveTier,
    newCredits: effectiveCredits,
    message: `Pre-approved ${resolvedEmail} for ${preapproveTier} (${effectiveCredits.toLocaleString()} credits). Access & credits will activate automatically when they sign up.`,
  }
}

export async function adminRevokeUserAccess(input: {
  targetEmailOrUserId: string
  clearCredits?: boolean
  adminEmail: string
  adminNotes?: string | null
}): Promise<{ email: string; userId: string | null; message: string }> {
  await ensurePrelaunchAccessTable()
  await ensureCreditLotsTable()

  const user = await findUserByIdOrEmail(input.targetEmailOrUserId)
  const normalizedEmail = normalizeEmail(user?.email || input.targetEmailOrUserId)
  const notes = input.adminNotes?.trim().slice(0, 2000) || null

  if (user) {
    await sequelize.transaction(async (tx) => {
      const lockedUser = await User.findByPk(user.id, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      })
      if (!lockedUser) return

      lockedUser.subscription_status = 'cancelled'
      lockedUser.subscription_tier_id = null
      lockedUser.subscription_end_date = new Date()
      lockedUser.one_time_tiers_purchased = []

      if (input.clearCredits) {
        const now = new Date()
        const { lots } = await loadUserLots(lockedUser, now, tx)
        const prevBalance = sumLots(expireDueLots(lots, now).lots)
        await saveUserLots(lockedUser.id, [], tx)
        assignBalances(lockedUser, [], now)
        if (prevBalance > 0) {
          await writeLedgerIntents(
            lockedUser.id,
            [
              {
                delta: -prevBalance,
                prev: prevBalance,
                next: 0,
                reason: 'adjustment',
                creditType: null,
                meta: {
                  kind: 'admin_revoke_clear_credits',
                  revoked_by: input.adminEmail,
                  notes,
                },
              },
            ],
            tx,
            `admin_revoke_${now.getTime()}`
          )
        }
      }

      await lockedUser.save({ transaction: tx })
    })
  }

  if (normalizedEmail) {
    await sequelize.query(
      `
        UPDATE prelaunch_access_requests
        SET status = 'revoked',
            admin_notes = COALESCE(:adminNotes, admin_notes),
            reviewed_by = :adminEmail,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE LOWER(email) = :email
          AND status IN ('pending', 'approved')
      `,
      {
        replacements: {
          email: normalizedEmail,
          adminNotes: notes,
          adminEmail: input.adminEmail,
        },
      }
    )
  }

  return {
    email: user?.email || normalizedEmail,
    userId: user?.id || null,
    message: `Revoked Studio access for ${user?.email || normalizedEmail}${
      input.clearCredits ? ' and cleared credits to 0.' : '.'
    }`,
  }
}

export async function adminDeclineAccessRequest(input: {
  requestId: string
  adminEmail: string
  adminNotes?: string | null
}): Promise<{ id: string; email: string; message: string }> {
  await ensurePrelaunchAccessTable()

  const rows = await sequelize.query<PrelaunchAccessRequestRecord>(
    `
      UPDATE prelaunch_access_requests
      SET status = 'declined',
          admin_notes = COALESCE(:adminNotes, admin_notes),
          reviewed_by = :adminEmail,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = :id
      RETURNING *
    `,
    {
      replacements: {
        id: input.requestId,
        adminNotes: input.adminNotes?.trim().slice(0, 2000) || null,
        adminEmail: input.adminEmail,
      },
      type: QueryTypes.SELECT,
    }
  )

  if (rows.length === 0) {
    throw new Error('Access request not found')
  }

  return {
    id: rows[0].id,
    email: rows[0].email,
    message: `Declined access request from ${rows[0].email}.`,
  }
}

export async function getAdminAccessDashboardData(options: {
  requestStatus?: string
  userFilter?: string
  search?: string
  limit?: number
}): Promise<{
  stats: {
    pendingRequests: number
    approvedRequests: number
    activeUsers: number
    totalUsers: number
    totalActiveCredits: number
  }
  requests: PrelaunchAccessRequestRecord[]
  users: AdminManagedUserSummary[]
}> {
  await ensurePrelaunchAccessTable()

  const limit = Math.min(200, Math.max(10, Number(options.limit || 100)))
  const searchRaw = (options.search || '').trim().toLowerCase()
  const searchPattern = searchRaw ? `%${searchRaw}%` : null
  const requestStatus = (options.requestStatus || 'all').trim().toLowerCase()
  const userFilter = (options.userFilter || 'all').trim().toLowerCase()

  const [reqStatsRows, userStatsRows] = await Promise.all([
    sequelize.query<{ pending_count: string; approved_count: string }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')::text AS pending_count,
          COUNT(*) FILTER (WHERE status = 'approved')::text AS approved_count
        FROM prelaunch_access_requests
      `,
      { type: QueryTypes.SELECT }
    ),
    sequelize.query<{
      total_users: string
      active_users: string
      total_credits: string
    }>(
      `
        SELECT
          COUNT(*)::text AS total_users,
          COUNT(*) FILTER (
            WHERE is_active = true
              AND (
                subscription_status IN ('active', 'trial')
                OR one_time_tiers_purchased::text ILIKE '%explorer%'
                OR one_time_tiers_purchased::text ILIKE '%trial%'
              )
          )::text AS active_users,
          COALESCE(SUM(GREATEST(COALESCE(credits, 0), 0)), 0)::text AS total_credits
        FROM users
      `,
      { type: QueryTypes.SELECT }
    ),
  ])

  const requestWhereClauses: string[] = ['1 = 1']
  if (
    requestStatus === 'pending' ||
    requestStatus === 'approved' ||
    requestStatus === 'declined' ||
    requestStatus === 'revoked'
  ) {
    requestWhereClauses.push(`r.status = :requestStatus`)
  }
  if (searchPattern) {
    requestWhereClauses.push(
      `(LOWER(r.email) LIKE :searchPattern OR LOWER(COALESCE(r.full_name, '')) LIKE :searchPattern OR LOWER(COALESCE(r.company_name, '')) LIKE :searchPattern)`
    )
  }

  const requests = await sequelize.query<PrelaunchAccessRequestRecord>(
    `
      SELECT
        r.*,
        u.id AS registered_user_id,
        u.subscription_status AS user_subscription_status,
        t.name::text AS user_tier_name,
        t.display_name AS user_tier_display_name,
        COALESCE(u.credits, 0)::bigint AS user_total_credits,
        u.is_active AS user_is_active
      FROM prelaunch_access_requests r
      LEFT JOIN users u ON LOWER(u.email) = LOWER(r.email)
      LEFT JOIN subscription_tiers t ON t.id = u.subscription_tier_id
      WHERE ${requestWhereClauses.join(' AND ')}
      ORDER BY
        CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END ASC,
        r.created_at DESC
      LIMIT :limit
    `,
    {
      replacements: {
        requestStatus,
        searchPattern,
        limit,
      },
      type: QueryTypes.SELECT,
    }
  )

  const userWhereClauses: string[] = ['1 = 1']
  if (searchPattern) {
    userWhereClauses.push(
      `(LOWER(u.email) LIKE :searchPattern OR LOWER(u.username) LIKE :searchPattern OR LOWER(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) LIKE :searchPattern)`
    )
  }

  const rawUsers = await sequelize.query<{
    id: string
    email: string
    username: string
    first_name: string | null
    last_name: string | null
    is_active: boolean
    subscription_status: string | null
    subscription_start_date: string | null
    subscription_end_date: string | null
    tier_id: string | null
    tier_name: string | null
    tier_display_name: string | null
    credits: string | number | null
    subscription_credits_monthly: string | number | null
    addon_credits: string | number | null
    one_time_tiers_purchased: unknown
    created_at: string
    last_login: string | null
  }>(
    `
      SELECT
        u.id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.is_active,
        u.subscription_status::text AS subscription_status,
        u.subscription_start_date,
        u.subscription_end_date,
        u.subscription_tier_id AS tier_id,
        t.name::text AS tier_name,
        t.display_name AS tier_display_name,
        COALESCE(u.credits, 0) AS credits,
        COALESCE(u.subscription_credits_monthly, 0) AS subscription_credits_monthly,
        COALESCE(u.addon_credits, 0) AS addon_credits,
        u.one_time_tiers_purchased,
        u.created_at,
        u.last_login
      FROM users u
      LEFT JOIN subscription_tiers t ON t.id = u.subscription_tier_id
      WHERE ${userWhereClauses.join(' AND ')}
      ORDER BY u.created_at DESC
      LIMIT :limit
    `,
    {
      replacements: { searchPattern, limit },
      type: QueryTypes.SELECT,
    }
  )

  const mappedUsers: AdminManagedUserSummary[] = rawUsers
    .map((u) => {
      const purchased = parseStringArray(u.one_time_tiers_purchased)
      const activeAccess =
        Boolean(u.is_active) &&
        hasActiveSubscriptionAccess({
          subscriptionStatus: u.subscription_status,
          tierName: u.tier_name,
          tierId: u.tier_id,
          oneTimeTiersPurchased: purchased,
        })
      return {
        id: u.id,
        email: u.email,
        username: u.username,
        first_name: u.first_name,
        last_name: u.last_name,
        is_active: Boolean(u.is_active),
        subscription_status: u.subscription_status,
        subscription_start_date: u.subscription_start_date,
        subscription_end_date: u.subscription_end_date,
        tier_id: u.tier_id,
        tier_name: u.tier_name,
        tier_display_name: u.tier_display_name,
        credits: Number(u.credits || 0),
        subscription_credits_monthly: Number(u.subscription_credits_monthly || 0),
        addon_credits: Number(u.addon_credits || 0),
        one_time_tiers_purchased: purchased,
        has_active_access: activeAccess,
        created_at: u.created_at,
        last_login: u.last_login,
      }
    })
    .filter((u) => {
      if (userFilter === 'active') return u.has_active_access
      if (userFilter === 'no_access') return !u.has_active_access
      return true
    })

  return {
    stats: {
      pendingRequests: Number(reqStatsRows[0]?.pending_count || 0),
      approvedRequests: Number(reqStatsRows[0]?.approved_count || 0),
      activeUsers: Number(userStatsRows[0]?.active_users || 0),
      totalUsers: Number(userStatsRows[0]?.total_users || 0),
      totalActiveCredits: Number(userStatsRows[0]?.total_credits || 0),
    },
    requests: requests.map((r) => ({
      ...r,
      requested_credits:
        r.requested_credits !== null && r.requested_credits !== undefined
          ? Number(r.requested_credits)
          : null,
      granted_credits:
        r.granted_credits !== null && r.granted_credits !== undefined
          ? Number(r.granted_credits)
          : null,
      user_total_credits:
        r.user_total_credits !== null && r.user_total_credits !== undefined
          ? Number(r.user_total_credits)
          : null,
    })),
    users: mappedUsers,
  }
}
