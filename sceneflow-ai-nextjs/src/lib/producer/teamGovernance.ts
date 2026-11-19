import crypto from 'crypto'
import { TIER_CATALOG, normalizeTierName, type BillingTierName } from '@/lib/billing/tierCatalog'

export type WorkspaceMemberRole = 'admin' | 'project_manager' | 'qa_reviewer'
export type EffectiveWorkspaceRole = 'owner' | WorkspaceMemberRole

export interface RoleCapabilities {
  canEditProjects: boolean
  canSpendCredits: boolean
  canDeleteProjects: boolean
  canManageTeam: boolean
  canManageBilling: boolean
  label: string
  description: string
}

export const ROLE_CAPABILITIES: Record<EffectiveWorkspaceRole, RoleCapabilities> = {
  owner: {
    canEditProjects: true,
    canSpendCredits: true,
    canDeleteProjects: true,
    canManageTeam: true,
    canManageBilling: true,
    label: 'Workspace Owner',
    description: 'Full access to all projects, series, team seats, BYOK keys, and billing.',
  },
  admin: {
    canEditProjects: true,
    canSpendCredits: true,
    canDeleteProjects: true,
    canManageTeam: true,
    canManageBilling: false,
    label: 'Workspace Admin',
    description: 'Access all workspace projects & series, assign PMs, and manage deliverables (billing stays owner-locked).',
  },
  project_manager: {
    canEditProjects: true,
    canSpendCredits: true,
    canDeleteProjects: false,
    canManageTeam: false,
    canManageBilling: false,
    label: 'Customer Project Manager',
    description: 'Produce assigned projects & series within monthly credit cap. Cannot permanently delete projects or edit billing.',
  },
  qa_reviewer: {
    canEditProjects: false,
    canSpendCredits: false,
    canDeleteProjects: false,
    canManageTeam: false,
    canManageBilling: false,
    label: 'QA Reviewer',
    description: 'View, review, comment, and approve assigned projects & series with zero credit spend or deletion permissions.',
  },
}

export function normalizeWorkspaceRole(raw: unknown): WorkspaceMemberRole {
  const val = String(raw || '').trim().toLowerCase()
  if (val === 'admin') return 'admin'
  if (val === 'qa_reviewer' || val === 'qa' || val === 'reviewer') return 'qa_reviewer'
  return 'project_manager'
}

export function getRoleCapabilities(role?: EffectiveWorkspaceRole | null): RoleCapabilities {
  if (!role || !(role in ROLE_CAPABILITIES)) {
    return ROLE_CAPABILITIES.qa_reviewer
  }
  return ROLE_CAPABILITIES[role]
}

export function canRoleDeleteProject(role?: EffectiveWorkspaceRole | null): boolean {
  return getRoleCapabilities(role).canDeleteProjects
}

export function canRoleSpendCredits(role?: EffectiveWorkspaceRole | null): boolean {
  return getRoleCapabilities(role).canSpendCredits
}

export function canRoleEditProject(role?: EffectiveWorkspaceRole | null): boolean {
  return getRoleCapabilities(role).canEditProjects
}

export interface SeatCapSummary {
  tierName: BillingTierName
  totalSeats: number
  maxInvitedMembers: number
  usedSeats: number
  remainingSeats: number
  unlimited: boolean
}

/**
 * Resolves team seat limits from the canonical `TIER_CATALOG`.
 * `totalSeats` includes the workspace owner (`pro = 3` -> owner + 2 invited seats;
 * `studio = 10` -> owner + 9 invited seats; `enterprise` -> unlimited).
 */
export function getSeatCapForTier(tierName?: string | null): {
  tierName: BillingTierName
  totalSeats: number
  maxInvitedMembers: number
  unlimited: boolean
} {
  const normalized: BillingTierName = normalizeTierName(tierName || '') ?? 'explorer'
  const def = TIER_CATALOG[normalized]
  const unlimited = normalized === 'enterprise'
  const totalSeats = Math.max(1, Number(def?.collaborationSeats ?? 1))
  const maxInvitedMembers = unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, totalSeats - 1)
  return {
    tierName: normalized,
    totalSeats,
    maxInvitedMembers,
    unlimited,
  }
}

export function evaluateSeatAvailability(input: {
  tierName?: string | null
  activeOrInvitedMemberCount: number
  isExistingNonRevokedMember?: boolean
  isPlatformAdmin?: boolean
}): SeatCapSummary & { allowed: boolean; error?: string } {
  const cap = getSeatCapForTier(input.tierName)
  const usedInvited = Math.max(0, Math.floor(input.activeOrInvitedMemberCount))
  const usedSeats = 1 + usedInvited // owner + invited/active team members
  const remainingSeats = cap.unlimited
    ? 999
    : Math.max(0, cap.maxInvitedMembers - usedInvited)

  if (input.isPlatformAdmin || cap.unlimited || input.isExistingNonRevokedMember) {
    return {
      ...cap,
      usedSeats,
      remainingSeats,
      allowed: true,
    }
  }

  if (usedInvited >= cap.maxInvitedMembers) {
    const planLabel = TIER_CATALOG[cap.tierName]?.displayName || cap.tierName
    const error =
      cap.maxInvitedMembers === 0
        ? `Your ${planLabel} plan includes 1 solo seat. Upgrade to Operator Pro (3 seats) or Agency Scale (10 seats) to invite team members.`
        : `Seat limit reached (${usedSeats}/${cap.totalSeats} seats used on ${planLabel}). Revoke an unused seat or upgrade to Agency Scale for up to 10 team seats.`
    return {
      ...cap,
      usedSeats,
      remainingSeats: 0,
      allowed: false,
      error,
    }
  }

  return {
    ...cap,
    usedSeats,
    remainingSeats,
    allowed: true,
  }
}

export const SUPPORTED_ROUTING_LOCALES = [
  'default',
  'en',
  'es',
  'pt',
  'fr',
  'de',
  'hi',
  'zh-CN',
  'ar',
  'th',
] as const

const SUPPORTED_ROUTING_SET = new Set<string>(SUPPORTED_ROUTING_LOCALES)

export type LocalePmRoutingMap = Record<string, string>

/**
 * Sanitizes a locale -> PM memberUserId mapping object.
 * Drops unknown keys or empty values so DB JSONB stays clean.
 */
export function normalizeLocalePmRouting(raw: unknown): LocalePmRoutingMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  const result: LocalePmRoutingMap = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = k.trim()
    if (!SUPPORTED_ROUTING_SET.has(key)) continue
    if (typeof v === 'string' && v.trim().length > 0 && v.trim() !== '__none__') {
      result[key] = v.trim().slice(0, 80)
    }
  }
  return result
}

/**
 * Resolves the auto-assigned PM `memberUserId` for an incoming client intake locale.
 * Lookup order:
 * 1. Exact locale match (e.g. `zh-CN`, `es`)
 * 2. Case-insensitive / base-language match (e.g. `es-MX` -> `es`, `zh` -> `zh-CN`)
 * 3. `default` fallback PM (if configured)
 */
export function resolveAutoAssignedPmForLocale(
  routing: LocalePmRoutingMap | null | undefined,
  locale?: string | null
): string | null {
  if (!routing || typeof routing !== 'object') return null

  const cleanLocale = (locale || '').trim()
  if (cleanLocale) {
    if (routing[cleanLocale]) return routing[cleanLocale]

    const lower = cleanLocale.toLowerCase()
    for (const [k, v] of Object.entries(routing)) {
      if (k.toLowerCase() === lower && v) return v
    }

    const baseLang = lower.split(/[-_]/)[0]
    if (baseLang) {
      if (routing[baseLang]) return routing[baseLang]
      if (baseLang === 'zh' && routing['zh-CN']) return routing['zh-CN']
    }
  }

  return routing.default || null
}

export const INVITE_TOKEN_TTL_DAYS = 14

export function generateWorkspaceInviteToken(): {
  token: string
  expiresAt: Date
} {
  const token = crypto.randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, expiresAt }
}

export function isInviteTokenExpired(
  expiresAt: Date | string | null | undefined,
  now = new Date()
): boolean {
  if (!expiresAt) return false
  const ts = typeof expiresAt === 'string' ? Date.parse(expiresAt) : expiresAt.getTime()
  if (!Number.isFinite(ts)) return false
  return ts < now.getTime()
}
