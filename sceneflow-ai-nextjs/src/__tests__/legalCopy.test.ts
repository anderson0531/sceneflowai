import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  LEGAL_COMPANY_NAME,
  LEGAL_SERVICE_NAME,
  WHOP_MOR_NAME,
} from '@/config/legal/legalCopy'

const LEGAL_PAGES = [
  'src/app/(legal)/privacy/page.tsx',
  'src/app/(legal)/terms/page.tsx',
  'src/app/(legal)/trust-safety/page.tsx',
  'src/app/(legal)/refunds/page.tsx',
]

describe('legal document consistency', () => {
  it('uses Life Focus, LLC as the legal entity across all legal pages', () => {
    for (const page of LEGAL_PAGES) {
      const content = readFileSync(join(process.cwd(), page), 'utf8')
      expect(content).toContain('LEGAL_COMPANY_NAME')
      expect(content).not.toContain('SceneFlow AI Inc.')
      expect(content).not.toContain('SceneFlow LLC')
    }
  })

  it('exports the expected legal entity and MoR names', () => {
    expect(LEGAL_COMPANY_NAME).toBe('Life Focus, LLC')
    expect(LEGAL_SERVICE_NAME).toBe('SceneFlow AI')
    expect(WHOP_MOR_NAME).toBe('Whop')
  })
})
