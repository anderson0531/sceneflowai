/**
 * Pre-Launch Access & Invite Gate Configuration
 *
 * While pre-launch mode is active (default `true`), all direct Whop payment
 * checkouts are blocked on both the server and client. Users instead submit a
 * Pre-Launch Access Request (or Additional Credits Request), which an admin
 * reviews and approves with exact tier + credit controls on `/admin/access`.
 *
 * Set `NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY=false` and `PRELAUNCH_ACCESS_ONLY=false`
 * in environment variables when ready to re-open self-serve Whop payments.
 */

export function isPrelaunchAccessModeEnabled(): boolean {
  const serverFlag = process.env.PRELAUNCH_ACCESS_ONLY?.trim().toLowerCase()
  const publicFlag = process.env.NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY?.trim().toLowerCase()

  if (serverFlag === 'false' || serverFlag === '0') return false
  if (publicFlag === 'false' || publicFlag === '0') return false

  return true
}

export const PRELAUNCH_CHECKOUT_BLOCKED_MESSAGE =
  'Self-serve payments are paused during pre-launch. Submit a Pre-Launch Access Request on your Billing & Access page and our team will activate your workspace and credits.'

export interface PrelaunchUseCaseOption {
  value: string
  label: string
}

export const PRELAUNCH_USE_CASE_OPTIONS: readonly PrelaunchUseCaseOption[] = [
  { value: 'memoir', label: 'Family Memoir & Tribute Video Service' },
  { value: 'agency', label: 'Commercial / Client Video Agency' },
  { value: 'series', label: 'Episodic Series & Narrative Film' },
  { value: 'creator', label: 'YouTube / Documentary / Creator Studio' },
  { value: 'property', label: 'Real Estate & Luxury Property Tours' },
  { value: 'training', label: 'Corporate Training & Multilingual Localization' },
  { value: 'other', label: 'Other Studio Production' },
] as const

export interface PrelaunchTierPreset {
  id: string
  dbTierName: 'explorer' | 'hobbyist' | 'starter' | 'pro' | 'studio' | 'enterprise'
  label: string
  defaultCredits: number
  defaultDurationDays: number
}

export const PRELAUNCH_TIER_PRESETS: readonly PrelaunchTierPreset[] = [
  {
    id: 'explorer',
    dbTierName: 'explorer',
    label: 'Explorer Test Flight (750 cr)',
    defaultCredits: 750,
    defaultDurationDays: 30,
  },
  {
    id: 'hobbyist',
    dbTierName: 'hobbyist',
    label: 'Creator & Vault (2,000 cr)',
    defaultCredits: 2000,
    defaultDurationDays: 30,
  },
  {
    id: 'starter',
    dbTierName: 'starter',
    label: 'Filmmaker & Pre-Vis (4,500 cr)',
    defaultCredits: 4500,
    defaultDurationDays: 30,
  },
  {
    id: 'pro',
    dbTierName: 'pro',
    label: 'Operator Pro White-Label Studio (10,000 cr)',
    defaultCredits: 10000,
    defaultDurationDays: 30,
  },
  {
    id: 'founding_operator',
    dbTierName: 'pro',
    label: 'Founding Operator 90-Day Charter (18,000 cr)',
    defaultCredits: 18000,
    defaultDurationDays: 90,
  },
  {
    id: 'studio',
    dbTierName: 'studio',
    label: 'Agency Scale Multi-PM Studio (45,000 cr)',
    defaultCredits: 45000,
    defaultDurationDays: 30,
  },
  {
    id: 'enterprise',
    dbTierName: 'enterprise',
    label: 'Enterprise Custom (200,000 cr)',
    defaultCredits: 200000,
    defaultDurationDays: 90,
  },
] as const

export function getPrelaunchTierPreset(tierId?: string | null): PrelaunchTierPreset {
  const normalized = (tierId || '').trim().toLowerCase()
  if (normalized === 'trial' || normalized === 'coffee_break') {
    return PRELAUNCH_TIER_PRESETS[0]
  }
  return (
    PRELAUNCH_TIER_PRESETS.find((preset) => preset.id === normalized) ||
    PRELAUNCH_TIER_PRESETS[0]
  )
}

export function getDefaultCreditsForTier(tierId?: string | null): number {
  return getPrelaunchTierPreset(tierId).defaultCredits
}

export function getDefaultDurationDaysForTier(tierId?: string | null): number {
  return getPrelaunchTierPreset(tierId).defaultDurationDays
}
