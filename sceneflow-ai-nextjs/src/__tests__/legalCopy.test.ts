import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  LEGAL_ABUSE_EMAIL,
  LEGAL_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_EIN,
  LEGAL_FORMATION_DATE,
  LEGAL_LEGAL_EMAIL,
  LEGAL_REGISTERED_AGENT,
  LEGAL_SERVICE_NAME,
  LEGAL_STATE_OF_FORMATION,
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
  it('uses LifeFocus, LLC as the legal entity across all legal pages', () => {
    for (const page of LEGAL_PAGES) {
      const content = readFileSync(join(process.cwd(), page), 'utf8')
      expect(content).toContain('LEGAL_COMPANY_NAME')
      expect(content).not.toContain('SceneFlow AI Inc.')
      expect(content).not.toContain('SceneFlow LLC')
    }
  })

  it('exports the expected Delaware LLC legal entity, EIN, MoR, and contact emails', () => {
    expect(LEGAL_COMPANY_NAME).toBe('LifeFocus, LLC')
    expect(LEGAL_EIN).toBe('99-5087112')
    expect(LEGAL_STATE_OF_FORMATION).toBe('Delaware')
    expect(LEGAL_FORMATION_DATE).toBe('September 23, 2024')
    expect(LEGAL_REGISTERED_AGENT).toBe('Legalinc Corporate Services, Inc.')
    expect(LEGAL_SERVICE_NAME).toBe('SceneFlow Studio')
    expect(WHOP_MOR_NAME).toBe('Whop')
    expect(LEGAL_SUPPORT_EMAIL).toBe('support@sceneflowai.studio')
    expect(LEGAL_ABUSE_EMAIL).toBe('abuse@sceneflowai.studio')
    expect(LEGAL_TRUST_EMAIL).toBe('trust@sceneflowai.studio')
    expect(LEGAL_ADDRESS).toBe('131 Continental Dr, Suite 305, Newark, DE 19713, United States')
    expect(LEGAL_LEGAL_EMAIL).toBe('legal@sceneflowai.studio')
  })
})
