import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getServerSessionMock = vi.fn()
const generateTextMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/vertexai/gemini', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}))

import { HELP_UI_COPY, getHelpUiCopy } from '@/config/help/helpUiCopy'
import { buildDeterministicCoachReply } from '@/lib/help/studioCoachEngine'
import { POST as askStudioCoach } from '@/app/api/help/studio-coach/route'
import { TIER_CATALOG } from '@/lib/billing/tierCatalog'

describe('Sprint 3 — 14-Language Help UI Parity & Grounded Studio Coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('ships complete 14-language UI copy (en, es, pt, hi, zh, ar, th, ja, ko, de, fr, it, nl, ru) with RTL Arabic support', () => {
    const locales = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th', 'ja', 'ko', 'de', 'fr', 'it', 'nl', 'ru'] as const
    for (const loc of locales) {
      const copy = HELP_UI_COPY[loc]
      expect(copy).toBeDefined()
      expect(copy.isRtl).toBe(loc === 'ar')
      expect(copy.drawer.headerTitle.length).toBeGreaterThan(3)
      expect(copy.drawer.tabAskCoach.length).toBeGreaterThan(2)
      expect(copy.supportDialog.sendBtn.length).toBeGreaterThan(2)
      expect(copy.errorCard.troubleshootingGuideBtn.length).toBeGreaterThan(3)
      expect(copy.productionTour.steps).toHaveLength(7)
      for (const step of copy.productionTour.steps) {
        expect(step.title.length).toBeGreaterThan(3)
        expect(step.description.length).toBeGreaterThan(10)
        expect(step.tip.length).toBeGreaterThan(10)
      }
    }

    // Normalizes regional tags cleanly
    expect(getHelpUiCopy('zh-CN')).toBe(HELP_UI_COPY.zh)
    expect(getHelpUiCopy('ar-SA').isRtl).toBe(true)
    expect(getHelpUiCopy('pt-BR')).toBe(HELP_UI_COPY.pt)
    expect(getHelpUiCopy('ja-JP')).toBe(HELP_UI_COPY.ja)
    expect(getHelpUiCopy('ko-KR')).toBe(HELP_UI_COPY.ko)
    expect(getHelpUiCopy('de-DE')).toBe(HELP_UI_COPY.de)
    expect(getHelpUiCopy('fr-FR')).toBe(HELP_UI_COPY.fr)
    expect(getHelpUiCopy('it-IT')).toBe(HELP_UI_COPY.it)
    expect(getHelpUiCopy('nl-NL')).toBe(HELP_UI_COPY.nl)
    expect(getHelpUiCopy('ru-RU')).toBe(HELP_UI_COPY.ru)
  })

  it('grounds deterministic Studio Coach answers in live TIER_CATALOG, BYOK, Agency Ops, and FlowDirector QA across languages', () => {
    const pricingEn = buildDeterministicCoachReply('Compare plans and credit expiry', 'billing')
    expect(pricingEn.answer).toContain(`$${TIER_CATALOG.hobbyist.priceUsd}/mo`)
    expect(pricingEn.answer).toContain(`$${TIER_CATALOG.starter.priceUsd}/mo`)
    expect(pricingEn.answer).toContain(`$${TIER_CATALOG.pro.priceUsd}/mo`)
    expect(pricingEn.answer).toContain(`$${TIER_CATALOG.studio.priceUsd}/mo`)
    expect(pricingEn.answer).toContain('12 months')
    expect(pricingEn.actions.some((a) => a.href === '/dashboard/settings/billing')).toBe(true)

    // Multilingual synonym retrieval works for Spanish / Chinese / Thai pricing queries
    const pricingEs = buildDeterministicCoachReply('Comparar precio y créditos del plan', 'dashboard')
    expect(pricingEs.answer).toContain(`$${TIER_CATALOG.pro.priceUsd}/mo`)
    const pricingZh = buildDeterministicCoachReply('对比套餐价格和点数', 'dashboard')
    expect(pricingZh.answer).toContain(`$${TIER_CATALOG.studio.priceUsd}/mo`)

    const byokReply = buildDeterministicCoachReply('How do I connect Google Vertex AI BYOK key?', 'billing')
    expect(byokReply.answer).toContain('BYOK Settings')
    expect(byokReply.actions.some((a) => a.href === '/dashboard/settings/byok')).toBe(true)

    const agencyReply = buildDeterministicCoachReply('How does 1-Click Draft Purge and QA Reviewer work?', 'agency-ops')
    expect(agencyReply.answer.toLowerCase()).toContain('purge')
    expect(agencyReply.actions.some((a) => a.href === '/dashboard/clients' || a.href === '/dashboard/settings/billing')).toBe(true)

    const pwaReply = buildDeterministicCoachReply('How do I install Mobile Companion PWA on iPhone?', 'dashboard')
    expect(pwaReply.answer.toLowerCase()).toContain('mobile companion')
  })

  it('enforces authentication and serves $0 grounded answers by default on POST /api/help/studio-coach', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const unauthRes = await askStudioCoach(
      new NextRequest('https://sceneflowai.studio/api/help/studio-coach', {
        method: 'POST',
        body: JSON.stringify({ question: 'How much is Pro?' }),
      })
    )
    expect(unauthRes.status).toBe(401)

    getServerSessionMock.mockResolvedValueOnce({
      user: { id: 'coach-user-1', email: 'creator@studio.test' },
    })
    const emptyRes = await askStudioCoach(
      new NextRequest('https://sceneflowai.studio/api/help/studio-coach', {
        method: 'POST',
        body: JSON.stringify({ question: '   ' }),
      })
    )
    expect(emptyRes.status).toBe(400)

    getServerSessionMock.mockResolvedValueOnce({
      user: { id: 'coach-user-1', email: 'creator@studio.test' },
    })
    const okRes = await askStudioCoach(
      new NextRequest('https://sceneflowai.studio/api/help/studio-coach', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How do I connect Vertex AI BYOK?',
          contextId: 'billing',
          locale: 'es',
        }),
      })
    )
    expect(okRes.status).toBe(200)
    const json = await okRes.json()
    expect(json.success).toBe(true)
    expect(json.reply.mode).toBe('grounded-instant')
    expect(json.reply.answer).toContain('BYOK Settings')
    expect(
      json.reply.actions.some((a: { href?: string }) => a.href === '/dashboard/settings/byok')
    ).toBe(true)
    expect(generateTextMock).not.toHaveBeenCalled()
  })
})
