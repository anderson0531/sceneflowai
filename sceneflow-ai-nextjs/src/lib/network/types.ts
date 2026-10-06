/**
 * SceneFlow Network contracts for later catalog, delivery, and payout phases.
 * Phase 1 does not persist these — they exist so later agents do not re-litigate
 * the model in SCENEFLOW_NETWORK_PLAYBOOK.md.
 */

export type NetworkTitleStatus = 'submitted' | 'hold' | 'accepted' | 'rejected' | 'packaged' | 'live'

export type NetworkProgrammingDecision = 'accepted' | 'hold' | 'rejected'

export interface NetworkTitle {
  id: string
  creatorUserId: string
  projectId: string
  title: string
  logline: string
  exclusivePremiereUntil?: string
  status: NetworkTitleStatus
  mezzanineUri?: string
  hlsPrefix?: string
  packagedAt?: string
  liveAt?: string
}

export interface NetworkCatalogEntry {
  titleId: string
  slug: string
  displayTitle: string
  creatorName: string
  trailerMinutes: number
  requiresWatchEntitlement: boolean
}

export type QualifiedWatchExclusion =
  | 'unauthenticated'
  | 'trailer'
  | 'self_watch'
  | 'hidden_tab'
  | 'bot_burst'
  | 'under_threshold'
  | 'daily_cap'

export interface WatchHeartbeat {
  titleId: string
  accountId: string
  creatorUserId: string
  atMs: number
  deltaSeconds: number
  isSubscriber: boolean
  isTrailer: boolean
  isVisible: boolean
  titleElapsedSeconds: number
}

export interface MonthlyPoolInput {
  grossWatchRevenue: number
  paymentGatewayFees: number
  hostingAndCdnCost: number
  transcodeCost: number
  qualifiedMinutesByTitle: Record<string, number>
}

export interface TitlePoolShare {
  titleId: string
  qualifiedMinutes: number
  poolShare: number
}

export interface MonthlyPoolResult {
  netRevenue: number
  creatorPool: number
  platformShare: number
  shares: TitlePoolShare[]
}

export interface ReferralAttribution {
  creatorId: string
  referredSubscriberId: string
  active: boolean
  monthlyBountyUsd: number
}
