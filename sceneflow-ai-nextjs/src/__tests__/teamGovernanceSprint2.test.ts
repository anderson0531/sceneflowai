import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  INVITE_TOKEN_TTL_DAYS,
  canRoleDeleteProject,
  canRoleEditProject,
  canRoleSpendCredits,
  evaluateSeatAvailability,
  generateWorkspaceInviteToken,
  getSeatCapForTier,
  isInviteTokenExpired,
  normalizeLocalePmRouting,
  normalizeWorkspaceRole,
  resolveAutoAssignedPmForLocale,
} from '@/lib/producer/teamGovernance'

describe('Role capabilities & RBAC guardrails', () => {
  it('normalizes valid roles and defaults unknown inputs safely to project_manager', () => {
    expect(normalizeWorkspaceRole('admin')).toBe('admin')
    expect(normalizeWorkspaceRole('project_manager')).toBe('project_manager')
    expect(normalizeWorkspaceRole('qa_reviewer')).toBe('qa_reviewer')
    expect(normalizeWorkspaceRole('reviewer')).toBe('qa_reviewer')
    expect(normalizeWorkspaceRole('unknown-role')).toBe('project_manager')
  })

  it('prevents project_manager and qa_reviewer from permanently deleting projects', () => {
    expect(canRoleDeleteProject('owner')).toBe(true)
    expect(canRoleDeleteProject('admin')).toBe(true)
    expect(canRoleDeleteProject('project_manager')).toBe(false)
    expect(canRoleDeleteProject('qa_reviewer')).toBe(false)
    expect(canRoleDeleteProject(null)).toBe(false)
  })

  it('restricts qa_reviewer to zero credit spend and read-only approval', () => {
    expect(canRoleSpendCredits('owner')).toBe(true)
    expect(canRoleSpendCredits('admin')).toBe(true)
    expect(canRoleSpendCredits('project_manager')).toBe(true)
    expect(canRoleSpendCredits('qa_reviewer')).toBe(false)

    expect(canRoleEditProject('project_manager')).toBe(true)
    expect(canRoleEditProject('qa_reviewer')).toBe(false)
  })
})

describe('Tier seat cap enforcement', () => {
  it('maps TIER_CATALOG seat limits accurately for Pro (3), Agency Scale (10), and Enterprise', () => {
    expect(getSeatCapForTier('hobbyist')).toMatchObject({ totalSeats: 1, maxInvitedMembers: 0, unlimited: false })
    expect(getSeatCapForTier('starter')).toMatchObject({ totalSeats: 1, maxInvitedMembers: 0, unlimited: false })
    expect(getSeatCapForTier('pro')).toMatchObject({ totalSeats: 3, maxInvitedMembers: 2, unlimited: false })
    expect(getSeatCapForTier('studio')).toMatchObject({ totalSeats: 10, maxInvitedMembers: 9, unlimited: false })
    expect(getSeatCapForTier('enterprise').unlimited).toBe(true)
  })

  it('blocks inviting beyond tier cap while permitting updates to existing seats and platform admins', () => {
    const proOk = evaluateSeatAvailability({ tierName: 'pro', activeOrInvitedMemberCount: 1 })
    expect(proOk.allowed).toBe(true)
    expect(proOk.usedSeats).toBe(2)
    expect(proOk.remainingSeats).toBe(1)

    const proFull = evaluateSeatAvailability({ tierName: 'pro', activeOrInvitedMemberCount: 2 })
    expect(proFull.allowed).toBe(false)
    expect(proFull.remainingSeats).toBe(0)
    expect(proFull.error).toContain('3/3')

    const existingUpdate = evaluateSeatAvailability({
      tierName: 'pro',
      activeOrInvitedMemberCount: 2,
      isExistingNonRevokedMember: true,
    })
    expect(existingUpdate.allowed).toBe(true)

    const adminBypass = evaluateSeatAvailability({
      tierName: 'explorer',
      activeOrInvitedMemberCount: 5,
      isPlatformAdmin: true,
    })
    expect(adminBypass.allowed).toBe(true)
  })
})

describe('Locale PM auto-routing', () => {
  it('sanitizes unsupported locales and empty assignments', () => {
    const clean = normalizeLocalePmRouting({
      es: 'pm-maria',
      'zh-CN': 'pm-wei',
      default: 'pm-alex',
      invalid_locale: 'pm-hacker',
      pt: '__none__',
      fr: '   ',
    })
    expect(clean).toEqual({
      es: 'pm-maria',
      'zh-CN': 'pm-wei',
      default: 'pm-alex',
    })
  })

  it('resolves exact, base-language, and default fallback PMs cleanly', () => {
    const routing = {
      es: 'pm-maria',
      'zh-CN': 'pm-wei',
      default: 'pm-alex',
    }
    expect(resolveAutoAssignedPmForLocale(routing, 'es')).toBe('pm-maria')
    expect(resolveAutoAssignedPmForLocale(routing, 'es-MX')).toBe('pm-maria')
    expect(resolveAutoAssignedPmForLocale(routing, 'zh-CN')).toBe('pm-wei')
    expect(resolveAutoAssignedPmForLocale(routing, 'zh')).toBe('pm-wei')
    expect(resolveAutoAssignedPmForLocale(routing, 'th')).toBe('pm-alex')
    expect(resolveAutoAssignedPmForLocale({ es: 'pm-maria' }, 'th')).toBeNull()
  })
})

describe('Signed workspace invite tokens', () => {
  it('generates unique high-entropy tokens with 14-day TTL and checks expiration accurately', () => {
    const a = generateWorkspaceInviteToken()
    const b = generateWorkspaceInviteToken()
    expect(a.token).not.toBe(b.token)
    expect(a.token.length).toBeGreaterThanOrEqual(30)

    const ttlDays = (a.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    expect(ttlDays).toBeGreaterThan(INVITE_TOKEN_TTL_DAYS - 0.1)
    expect(ttlDays).toBeLessThanOrEqual(INVITE_TOKEN_TTL_DAYS + 0.1)

    expect(isInviteTokenExpired(a.expiresAt)).toBe(false)
    expect(isInviteTokenExpired(new Date(Date.now() - 10_000))).toBe(true)
  })
})

describe('Sprint 2 architecture contracts', () => {
  const root = process.cwd()

  it('enforces delete guardrail on DELETE /api/projects/[id] and DELETE /api/series/[seriesId]', () => {
    const projectIdRoute = readFileSync(path.join(root, 'src/app/api/projects/[id]/route.ts'), 'utf8')
    expect(projectIdRoute).toContain('canRoleDeleteProject')
    expect(projectIdRoute).toContain('status: 403')

    const seriesIdRoute = readFileSync(path.join(root, 'src/app/api/series/[seriesId]/route.ts'), 'utf8')
    expect(seriesIdRoute).toContain('checkWorkspaceSeriesAccess')
    expect(seriesIdRoute).toContain('canRoleEditProject')
    expect(seriesIdRoute).toContain('canRoleDeleteProject')
  })

  it('wires SeriesAssignment inheritance, qa_reviewer spend block, and locale auto-routing', () => {
    const accessSrc = readFileSync(path.join(root, 'src/lib/producer/workspaceAccess.ts'), 'utf8')
    expect(accessSrc).toContain('SeriesAssignment')
    expect(accessSrc).toContain('canRoleSpendCredits')
    expect(accessSrc).toContain('autoAssignProjectByLocale')

    const intakeSrc = readFileSync(path.join(root, 'src/lib/intake/intakeService.ts'), 'utf8')
    expect(intakeSrc).toContain('autoAssignProjectByLocale')
  })

  it('registers /invite/ as a public route and consumes single-use invite tokens', () => {
    const publicRoutesSrc = readFileSync(path.join(root, 'src/constants/publicRoutes.ts'), 'utf8')
    expect(publicRoutesSrc).toContain("'/invite/'")

    const inviteApiSrc = readFileSync(
      path.join(root, 'src/app/api/workspace/invite/[token]/route.ts'),
      'utf8'
    )
    expect(inviteApiSrc).toContain('invite_token: null')
    expect(inviteApiSrc).toContain('isInviteTokenExpired')

    const membersApiSrc = readFileSync(
      path.join(root, 'src/app/api/workspace/members/route.ts'),
      'utf8'
    )
    expect(membersApiSrc).toContain('evaluateSeatAvailability')
    expect(membersApiSrc).toContain('SEAT_CAP_REACHED')
    expect(membersApiSrc).toContain('SeriesAssignment')
  })

  it('mounts WorkspaceSwitcher in GlobalHeader and propagates workspaceOwnerId to Projects & Series', () => {
    const headerSrc = readFileSync(path.join(root, 'src/components/layout/GlobalHeader.tsx'), 'utf8')
    expect(headerSrc).toContain('WorkspaceSwitcher')

    const projectsPageSrc = readFileSync(path.join(root, 'src/app/dashboard/projects/page.tsx'), 'utf8')
    expect(projectsPageSrc).toContain('workspaceOwnerId')
    expect(projectsPageSrc).toContain('subscribeActiveWorkspace')

    const seriesHookSrc = readFileSync(path.join(root, 'src/hooks/useSeries.ts'), 'utf8')
    expect(seriesHookSrc).toContain('workspaceOwnerId')
    expect(seriesHookSrc).toContain('subscribeActiveWorkspace')
  })
})
