import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('Blueprint audience-resonance route auth wiring', () => {
  it('resolves canonical user id and passes legacy owner to persist', () => {
    const source = readSource('src/app/api/treatment/audience-resonance/route.ts')

    expect(source).toContain('getAuthenticatedUserId')
    expect(source).not.toContain('getServerSession(authOptions')
    expect(source).toContain('body.legacyOwnerId')
    expect(source).toContain('persistedToProject')
  })
})
