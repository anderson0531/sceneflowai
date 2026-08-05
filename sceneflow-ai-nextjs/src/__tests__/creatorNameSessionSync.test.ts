import { readFileSync } from 'fs'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCreatorCredit, resolveCreatorName } from '@/lib/user/displayName'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

/** The reported account: a real name in the database, a handle in the JWT. */
const databaseProfile = {
  first_name: 'Brian',
  last_name: 'Anderson',
  username: 'anderson0531',
  email: 'anderson0531@gmail.com',
}

const staleSessionUser = {
  first_name: 'Anderson0531',
  last_name: null,
  username: 'anderson0531',
  email: 'anderson0531@gmail.com',
  name: 'Anderson0531',
}

describe('creator credit from the database profile', () => {
  it('REGRESSION: upgrades the stored handle to the saved name', () => {
    // The blueprint stored "Anderson0531" before the profile had a real name.
    expect(resolveCreatorCredit('Anderson0531', databaseProfile)).toBe('Brian Anderson')
  })

  it('REGRESSION: the stale session alone yields no credit, which is the bug', () => {
    // This is what the card saw, hence "Add your name" despite a saved profile.
    expect(resolveCreatorCredit('Anderson0531', staleSessionUser)).toBe('')
    expect(resolveCreatorName(staleSessionUser)).toBeNull()
  })

  it('prefers the database profile when both are available', () => {
    const preferred = databaseProfile ?? staleSessionUser
    expect(resolveCreatorCredit('Anderson0531', preferred)).toBe('Brian Anderson')
  })
})

describe('useCreatorProfile', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(user: unknown = databaseProfile) {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ user }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('reads first and last name from the profile endpoint', async () => {
    const fetchMock = stubFetch()
    const { loadCreatorProfile } = await import('@/hooks/useCreatorProfile')

    const profile = await loadCreatorProfile()

    expect(profile).toEqual({
      first_name: 'Brian',
      last_name: 'Anderson',
      username: 'anderson0531',
      email: 'anderson0531@gmail.com',
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/user/profile', { credentials: 'include' })
  })

  it('shares one request across consumers', async () => {
    const fetchMock = stubFetch()
    const { loadCreatorProfile } = await import('@/hooks/useCreatorProfile')

    const [a, b] = await Promise.all([loadCreatorProfile(), loadCreatorProfile()])

    expect(a).toEqual(b)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('serves the cache on later reads', async () => {
    const fetchMock = stubFetch()
    const { loadCreatorProfile } = await import('@/hooks/useCreatorProfile')

    await loadCreatorProfile()
    await loadCreatorProfile()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refetches after an edit invalidates the cache', async () => {
    const fetchMock = stubFetch()
    const { loadCreatorProfile, invalidateCreatorProfile } = await import(
      '@/hooks/useCreatorProfile'
    )

    await loadCreatorProfile()
    invalidateCreatorProfile()
    await loadCreatorProfile()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null rather than throwing when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    )
    const { loadCreatorProfile } = await import('@/hooks/useCreatorProfile')

    await expect(loadCreatorProfile()).resolves.toBeNull()
  })
})

describe('session can now reflect a profile edit', () => {
  const auth = readSource('src/lib/auth.ts')
  const profilePage = readSource('src/app/dashboard/settings/profile/page.tsx')

  it('REGRESSION: the jwt callback handles an update trigger', () => {
    // Previously the callback only ran `if (user)`, i.e. at sign-in, so the token
    // kept its original name fields forever.
    expect(auth).toContain("trigger === 'update'")
    expect(auth).toContain('token.first_name = patch.first_name')
    expect(auth).toContain('token.last_name = patch.last_name')
  })

  it('keeps the sign-in path intact', () => {
    expect(auth).toContain('if (user) {')
    expect(auth).toContain("token.first_name = (user as any).first_name ?? null")
  })

  it('rebuilds the display name from the updated parts', () => {
    expect(auth).toContain('rebuilt')
    expect(auth).toContain('token.name = rebuilt')
  })

  it('the profile page refreshes the session after saving', () => {
    expect(profilePage).toContain('const { data: session, update } = useSession()')
    expect(profilePage).toContain('await update({')
    expect(profilePage).toContain('invalidateCreatorProfile()')
  })
})

describe('the card no longer trusts the session for the credit', () => {
  const card = readSource('src/components/blueprint/TreatmentCard.tsx')

  it('resolves the credit from the fetched profile first', () => {
    expect(card).toContain('useCreatorProfile()')
    expect(card).toContain('creatorProfile ?? session?.user')
  })

  it('stays quiet while the profile is loading', () => {
    // Otherwise the row flashes "Add your name" on every page load.
    expect(card).toContain('creatorProfileLoading')
  })
})
