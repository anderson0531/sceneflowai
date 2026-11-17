import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  getDefaultCreditsForTier,
  getDefaultDurationDaysForTier,
  getPrelaunchTierPreset,
  isPrelaunchAccessModeEnabled,
} from '@/lib/billing/prelaunchAccess'
import { isAdminEmail } from '@/lib/adminUtils'

const mockGetServerSession = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/services/CreditService', () => ({
  CreditService: {
    grantCredits: vi.fn(),
  },
  writeLedgerIntents: vi.fn(),
}))

vi.mock('@/services/SubscriptionService', () => ({
  SubscriptionService: {
    canPurchaseOneTimeTier: vi.fn(async () => true),
  },
}))

vi.mock('@/lib/billing/checkoutHelper', () => ({
  createWhopAddonCheckoutSession: vi.fn(),
  createWhopCharterCheckoutSession: vi.fn(),
  createWhopCheckoutSession: vi.fn(),
  handleDemoCheckout: vi.fn(),
  isCheckoutConfigured: vi.fn(() => true),
  isValidAddonPack: vi.fn(() => false),
  isValidCharterOffer: vi.fn(() => false),
  isValidCheckoutTier: vi.fn(() => true),
  shouldUseDemoCheckout: vi.fn(() => false),
}))

vi.mock('@/lib/billing/whopClient', () => ({
  ensureWhopRuntimeConfig: vi.fn(async () => undefined),
}))

vi.mock('@/lib/env', () => ({
  isDemoMode: vi.fn(() => false),
  allowDemoFallback: vi.fn(() => false),
}))

const mockSubmitPrelaunchAccessRequest = vi.fn()
const mockGetUserAccessRequests = vi.fn()
const mockGetAdminAccessDashboardData = vi.fn()
const mockAdminGrantUserAccessAndCredits = vi.fn()
const mockAdminDeclineAccessRequest = vi.fn()
const mockAdminRevokeUserAccess = vi.fn()

vi.mock('@/lib/admin/accessControlService', () => ({
  submitPrelaunchAccessRequest: (...args: unknown[]) =>
    mockSubmitPrelaunchAccessRequest(...args),
  getUserAccessRequests: (...args: unknown[]) => mockGetUserAccessRequests(...args),
  getAdminAccessDashboardData: (...args: unknown[]) =>
    mockGetAdminAccessDashboardData(...args),
  adminGrantUserAccessAndCredits: (...args: unknown[]) =>
    mockAdminGrantUserAccessAndCredits(...args),
  adminDeclineAccessRequest: (...args: unknown[]) =>
    mockAdminDeclineAccessRequest(...args),
  adminRevokeUserAccess: (...args: unknown[]) => mockAdminRevokeUserAccess(...args),
  fulfillPendingApprovedGrantForUser: vi.fn(async () => false),
}))

vi.mock('@/lib/userHelper', () => ({
  resolveUser: vi.fn(async (id: string) => ({
    id,
    email: 'creator@example.com',
    username: 'creator',
    first_name: 'Alex',
    last_name: 'Rivera',
  })),
}))

describe('Pre-Launch Access Flag & Tier Presets', () => {
  const originalPrelaunch = process.env.PRELAUNCH_ACCESS_ONLY
  const originalPublicPrelaunch = process.env.NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY

  afterEach(() => {
    if (originalPrelaunch === undefined) delete process.env.PRELAUNCH_ACCESS_ONLY
    else process.env.PRELAUNCH_ACCESS_ONLY = originalPrelaunch

    if (originalPublicPrelaunch === undefined) delete process.env.NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY
    else process.env.NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY = originalPublicPrelaunch
  })

  it('defaults pre-launch access mode to true so Whop payments are blocked', () => {
    delete process.env.PRELAUNCH_ACCESS_ONLY
    delete process.env.NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY
    expect(isPrelaunchAccessModeEnabled()).toBe(true)
  })

  it('allows disabling pre-launch gate via env flag when ready for public billing', () => {
    process.env.PRELAUNCH_ACCESS_ONLY = 'false'
    expect(isPrelaunchAccessModeEnabled()).toBe(false)

    delete process.env.PRELAUNCH_ACCESS_ONLY
    process.env.NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY = '0'
    expect(isPrelaunchAccessModeEnabled()).toBe(false)
  })

  it('maps tier presets to accurate default credits and durations', () => {
    expect(getDefaultCreditsForTier('explorer')).toBe(750)
    expect(getDefaultCreditsForTier('starter')).toBe(4500)
    expect(getDefaultCreditsForTier('pro')).toBe(15000)
    expect(getDefaultCreditsForTier('founding_operator')).toBe(18000)
    expect(getDefaultDurationDaysForTier('founding_operator')).toBe(90)
    expect(getPrelaunchTierPreset('founding_operator').dbTierName).toBe('pro')
  })
})

describe('Whop Checkout Server-Side Blocking in Pre-Launch Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.PRELAUNCH_ACCESS_ONLY
    delete process.env.NEXT_PUBLIC_PRELAUNCH_ACCESS_ONLY
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-uuid-1', email: 'creator@example.com' },
    })
  })

  it('blocks POST /api/billing/checkout with 403 PRELAUNCH_ACCESS_ONLY', async () => {
    const { POST } = await import('@/app/api/billing/checkout/route')
    const req = new NextRequest('https://sceneflowai.studio/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tierName: 'pro' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('PRELAUNCH_ACCESS_ONLY')
    expect(body.prelaunchOnly).toBe(true)
  })

  it('blocks POST /api/subscription/purchase-trial and purchase-coffee-break with 403', async () => {
    const { POST: postTrial } = await import('@/app/api/subscription/purchase-trial/route')
    const { POST: postCoffee } = await import(
      '@/app/api/subscription/purchase-coffee-break/route'
    )

    const res1 = await postTrial(
      new NextRequest('https://sceneflowai.studio/api/subscription/purchase-trial', {
        method: 'POST',
      })
    )
    expect(res1.status).toBe(403)

    const res2 = await postCoffee(
      new NextRequest('https://sceneflowai.studio/api/subscription/purchase-coffee-break', {
        method: 'POST',
      })
    )
    expect(res2.status).toBe(403)
  })
})

describe('User Access Request Endpoint (/api/access-requests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits a pre-launch access request for an authenticated user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-uuid-1', email: 'creator@example.com', name: 'Alex Rivera' },
    })
    mockSubmitPrelaunchAccessRequest.mockResolvedValueOnce({
      id: 'req-123',
      email: 'creator@example.com',
      requested_tier: 'pro',
      requested_credits: 15000,
      status: 'pending',
      request_type: 'initial_access',
    })

    const { POST } = await import('@/app/api/access-requests/route')
    const req = new NextRequest('https://sceneflowai.studio/api/access-requests', {
      method: 'POST',
      body: JSON.stringify({
        companyName: 'Rivera Pictures',
        useCase: 'memoir',
        requestedTier: 'pro',
        requestedCredits: 15000,
        projectDetails: 'Client family memoir pilot',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockSubmitPrelaunchAccessRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'creator@example.com',
        companyName: 'Rivera Pictures',
        requestedTier: 'pro',
        requestedCredits: 15000,
        requestType: 'initial_access',
      })
    )
  })
})

describe('Admin Access & Credits Console Security & Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('whitelists configured admin emails and rejects regular users', () => {
    expect(isAdminEmail('anderson0531@gmail.com')).toBe(true)
    expect(isAdminEmail('brian@sceneflowai.studio')).toBe(true)
    expect(isAdminEmail('random.visitor@gmail.com')).toBe(false)
  })

  it('rejects non-admin users from GET and POST /api/admin/access with 403', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-2', email: 'intruder@example.com' },
    })

    const { GET, POST } = await import('@/app/api/admin/access/route')
    const getRes = await GET(new NextRequest('https://sceneflowai.studio/api/admin/access'))
    expect(getRes.status).toBe(403)

    const postRes = await POST(
      new NextRequest('https://sceneflowai.studio/api/admin/access', {
        method: 'POST',
        body: JSON.stringify({
          action: 'grant',
          targetEmailOrUserId: 'intruder@example.com',
          credits: 99999,
        }),
      })
    )
    expect(postRes.status).toBe(403)
    expect(mockAdminGrantUserAccessAndCredits).not.toHaveBeenCalled()
  })

  it('rejects non-admin users from POST /api/admin/credits/grant with 403', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-2', email: 'intruder@example.com' },
    })
    const { POST } = await import('@/app/api/admin/credits/grant/route')
    const res = await POST(
      new NextRequest('https://sceneflowai.studio/api/admin/credits/grant', {
        method: 'POST',
        body: JSON.stringify({ userIdOrEmail: 'intruder@example.com', credits: 5000 }),
      })
    )
    expect(res.status).toBe(403)
  })

  it('allows an admin to approve requests, set exact credit balances, and revoke access', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'anderson0531@gmail.com' },
    })
    mockAdminGrantUserAccessAndCredits.mockResolvedValue({
      fulfilledImmediately: true,
      email: 'creator@example.com',
      userId: 'user-uuid-1',
      tierName: 'pro',
      newCredits: 4200,
      message: 'Activated creator@example.com (4,200 available credits).',
    })
    mockAdminRevokeUserAccess.mockResolvedValue({
      email: 'creator@example.com',
      userId: 'user-uuid-1',
      message: 'Revoked Studio access for creator@example.com.',
    })

    const { POST } = await import('@/app/api/admin/access/route')

    // 1. Approve request with custom exact credit amount (4,200)
    const approveRes = await POST(
      new NextRequest('https://sceneflowai.studio/api/admin/access', {
        method: 'POST',
        body: JSON.stringify({
          action: 'approve',
          requestId: 'req-123',
          tierName: 'pro',
          credits: 4200,
          creditMode: 'set',
          durationDays: 30,
        }),
      })
    )
    expect(approveRes.status).toBe(200)
    expect(mockAdminGrantUserAccessAndCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        tierName: 'pro',
        credits: 4200,
        creditMode: 'set',
        durationDays: 30,
        adminEmail: 'anderson0531@gmail.com',
      })
    )

    // 2. Set exact credits (= 0) without changing tier
    const setZeroRes = await POST(
      new NextRequest('https://sceneflowai.studio/api/admin/access', {
        method: 'POST',
        body: JSON.stringify({
          action: 'set-credits',
          targetEmailOrUserId: 'user-uuid-1',
          credits: 0,
        }),
      })
    )
    expect(setZeroRes.status).toBe(200)
    expect(mockAdminGrantUserAccessAndCredits).toHaveBeenLastCalledWith(
      expect.objectContaining({
        targetEmailOrUserId: 'user-uuid-1',
        tierName: 'keep',
        credits: 0,
        creditMode: 'set',
      })
    )

    // 3. Revoke Studio access
    const revokeRes = await POST(
      new NextRequest('https://sceneflowai.studio/api/admin/access', {
        method: 'POST',
        body: JSON.stringify({
          action: 'revoke',
          targetEmailOrUserId: 'user-uuid-1',
          clearCredits: true,
        }),
      })
    )
    expect(revokeRes.status).toBe(200)
    expect(mockAdminRevokeUserAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        targetEmailOrUserId: 'user-uuid-1',
        clearCredits: true,
        adminEmail: 'anderson0531@gmail.com',
      })
    )
  })
})

describe('UI Pre-Launch Wiring Invariants', () => {
  const root = path.resolve(__dirname, '..')

  it('keeps PricingTierGrid free of Tailwind truncate while wiring pre-launch CTA', () => {
    const src = fs.readFileSync(
      path.join(root, 'components/landing/PricingTierGrid.tsx'),
      'utf8'
    )
    expect(src).not.toContain('truncate')
    expect(src).toContain('Request Pre-Launch Access')
  })

  it('renders PrelaunchAccessRequestCard on BillingPage and guards /admin with isAdminEmail', () => {
    const billingSrc = fs.readFileSync(
      path.join(root, 'app/dashboard/settings/billing/page.tsx'),
      'utf8'
    )
    expect(billingSrc).toContain('PrelaunchAccessRequestCard')
    expect(billingSrc).toContain('isPrelaunchAccessModeEnabled')

    const adminPageSrc = fs.readFileSync(path.join(root, 'app/admin/page.tsx'), 'utf8')
    const adminAccessPageSrc = fs.readFileSync(
      path.join(root, 'app/admin/access/page.tsx'),
      'utf8'
    )
    expect(adminPageSrc).toContain('isAdminEmail')
    expect(adminAccessPageSrc).toContain('isAdminEmail')
  })
})
