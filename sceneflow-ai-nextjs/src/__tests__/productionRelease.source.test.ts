import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

function readRepoRootFile(relativePath: string): string {
  const candidates = [
    path.join(process.cwd(), '..', relativePath),
    path.join(process.cwd(), relativePath),
  ]
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) {
    throw new Error(`Missing ${relativePath} at repo root`)
  }
  return readFileSync(found, 'utf8')
}

describe('production release contract', () => {
  it('tells agents and humans to ship Production by merging main, not Promote', () => {
    const agents = readRepoRootFile('AGENTS.md')
    const deployment = readRepoRootFile('DEPLOYMENT.md')

    expect(agents).toContain('Production deploys from git `main`')
    expect(agents).toContain('Do not use Vercel Promote Preview → Production')
    expect(agents).toContain('Merging a PR into `origin/main` is the production release')

    expect(deployment).toContain('Merge to `main` is the production release')
    expect(deployment).toContain('Do **not** use Vercel **Promote Preview → Production**')
    expect(deployment).toContain('Branch Tracking')
    expect(deployment).toContain('sceneflow-ai-nextjs')
  })
})
