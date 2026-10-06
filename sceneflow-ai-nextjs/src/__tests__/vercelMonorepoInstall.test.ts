import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('root Vercel monorepo install', () => {
  it('installs the app and root package.json so Next.js is detected', () => {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), '..', 'vercel.json'), 'utf8')
    ) as { installCommand?: string }
    expect(vercel.installCommand).toContain('npm install --prefix sceneflow-ai-nextjs')
    expect(vercel.installCommand).toMatch(/&&\s*npm install\s*$/)
  })
})
