import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  LEGAL_ABUSE_EMAIL,
  LEGAL_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_LEGAL_EMAIL,
  LEGAL_SERVICE_NAME,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_TRUST_EMAIL,
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

  it('exports the expected legal entity, MoR, and contact emails', () => {
    expect(LEGAL_COMPANY_NAME).toBe('Life Focus, LLC')
    expect(LEGAL_SERVICE_NAME).toBe('SceneFlow AI')
    expect(WHOP_MOR_NAME).toBe('Whop')
    expect(LEGAL_SUPPORT_EMAIL).toBe('support@sfai.studio')
    expect(LEGAL_ABUSE_EMAIL).toBe('abuse@sfai.com')
    expect(LEGAL_TRUST_EMAIL).toBe('trust@sfai.com')
    expect(LEGAL_ADDRESS).toBe('2900 W Anderson Ln, Suite C200, Austin, TX 78757, United States')
    expect(LEGAL_LEGAL_EMAIL).toBe('legal@sfai.com')
  })
})
