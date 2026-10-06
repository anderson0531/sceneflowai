import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('root Vercel monorepo install', () => {
  it('skips the legacy repo-root project and still installs Next when a build runs', () => {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), '..', 'vercel.json'), 'utf8')
    ) as { ignoreCommand?: string; installCommand?: string }
    expect(vercel.ignoreCommand).toBe('exit 0')
    expect(vercel.installCommand).toContain('npm install --prefix sceneflow-ai-nextjs')
    expect(vercel.installCommand).toMatch(/&&\s*npm install\s*$/)
  })

  it('does not skip the production app vercel.json', () => {
    const appVercel = readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')
    expect(appVercel).not.toContain('ignoreCommand')
  })
})
