import { describe, expect, it } from 'vitest'
import {
  getUserDisplayName,
  isEmailDerivedName,
  resolveCreatorCredit,
  resolveCreatorName,
} from '@/lib/user/displayName'
import {
  creditLinesJsonForPrompt,
  ensureCinematicBookends,
} from '@/lib/script/cinematicBookends'

/**
 * The reported account: resolveUser auto-creates users with first_name seeded
 * from the email local part and no last_name, so the stored "name" is a handle.
 */
const handleAccount = {
  first_name: 'Anderson0531',
  last_name: null,
  username: 'anderson0531',
  email: 'anderson0531@gmail.com',
}

const realAccount = {
  first_name: 'Jane',
  last_name: 'Doe',
  username: 'jdoe',
  email: 'jane.doe@example.com',
}

describe('isEmailDerivedName', () => {
  it('flags a handle with digits', () => {
    expect(isEmailDerivedName('Anderson0531', 'anderson0531@gmail.com')).toBe(true)
    expect(isEmailDerivedName('User123', null)).toBe(true)
  })

  it('flags a single word matching the email local part', () => {
    expect(isEmailDerivedName('Anderson', 'anderson@gmail.com')).toBe(true)
  })

  it('accepts a two-word name even when it came from the email', () => {
    // "Jane Doe" is presentable on a title card regardless of its origin.
    expect(isEmailDerivedName('Jane Doe', 'jane.doe@example.com')).toBe(false)
  })

  it('accepts a single real first name that is not the email local part', () => {
    expect(isEmailDerivedName('Jane', 'jdoe@example.com')).toBe(false)
  })

  it('ignores empty values', () => {
    expect(isEmailDerivedName('', 'a@b.com')).toBe(false)
    expect(isEmailDerivedName(null, 'a@b.com')).toBe(false)
  })
})

describe('resolveCreatorName', () => {
  it('REGRESSION: refuses the email-derived handle', () => {
    expect(resolveCreatorName(handleAccount)).toBeNull()
  })

  it('uses first and last name when both are present', () => {
    expect(resolveCreatorName(realAccount)).toBe('Jane Doe')
  })

  it('trusts first plus last even if it matches the email', () => {
    expect(
      resolveCreatorName({ first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@x.com' })
    ).toBe('Jane Doe')
  })

  it('accepts a spaced session name when first and last are missing', () => {
    expect(resolveCreatorName({ name: 'Ada Lovelace', email: 'ada@x.com' })).toBe('Ada Lovelace')
  })

  it('never falls back to the username or the email', () => {
    expect(resolveCreatorName({ username: 'jdoe', email: 'jdoe@example.com' })).toBeNull()
    expect(resolveCreatorName({ email: 'someone@example.com' })).toBeNull()
    expect(resolveCreatorName(null)).toBeNull()
  })

  it('is stricter than getUserDisplayName, which still greets the user', () => {
    // Greetings may use a handle; credits may not.
    expect(getUserDisplayName(handleAccount)).toBe('Anderson0531')
    expect(resolveCreatorName(handleAccount)).toBeNull()
  })
})

describe('resolveCreatorCredit', () => {
  it('REGRESSION: blanks a stored handle so the credit is omitted', () => {
    expect(resolveCreatorCredit('Anderson0531', handleAccount)).toBe('')
  })

  it('keeps a stored human name', () => {
    expect(resolveCreatorCredit('Jane Doe', handleAccount)).toBe('Jane Doe')
  })

  it('upgrades a stored handle when the profile has a real name', () => {
    expect(resolveCreatorCredit('Anderson0531', realAccount)).toBe('Jane Doe')
  })

  it('falls back to the profile when nothing is stored', () => {
    expect(resolveCreatorCredit('', realAccount)).toBe('Jane Doe')
    expect(resolveCreatorCredit(undefined, handleAccount)).toBe('')
  })

  it('rejects the old placeholder', () => {
    expect(resolveCreatorCredit('Creator', null)).toBe('')
    expect(resolveCreatorCredit('User', null)).toBe('')
  })
})

describe('script credits', () => {
  const base = { title: 'The Last Signal', genre: 'sci-fi', tone: 'tense' }
  const scenes = [{ sceneNumber: 1, heading: 'INT. LAB - DAY', action: 'Main', beats: [] }]

  it('credits a real name on the title and outro scenes', () => {
    const result = ensureCinematicBookends(scenes, { ...base, author_writer: 'Jane Doe' })
    const credits = JSON.stringify(result.scenes)
    expect(credits).toContain('Written by')
    expect(credits).toContain('Jane Doe')
  })

  it('REGRESSION: omits the credit for a stored handle', () => {
    const result = ensureCinematicBookends(scenes, { ...base, author_writer: 'Anderson0531' })
    const credits = JSON.stringify(result.scenes)
    expect(credits).not.toContain('Anderson0531')
    expect(credits).not.toContain('Written by')
  })

  it('omits the credit when no author is stored', () => {
    const result = ensureCinematicBookends(scenes, { ...base, author_writer: '' })
    expect(JSON.stringify(result.scenes)).not.toContain('Written by')
  })

  it('gives the prompt an empty credit array rather than a placeholder', () => {
    expect(creditLinesJsonForPrompt('')).toBe('[]')
    expect(creditLinesJsonForPrompt('Anderson0531')).toBe('[]')
    expect(creditLinesJsonForPrompt(undefined)).toBe('[]')
    // The old prompt hardcoded "Creator" as the name.
    expect(creditLinesJsonForPrompt('Creator')).toBe('[]')
  })

  it('gives the prompt a real name when one exists', () => {
    expect(creditLinesJsonForPrompt('Jane Doe')).toBe(
      JSON.stringify([{ name: 'Jane Doe', role: 'Written by', isPrimary: false }])
    )
  })
})
