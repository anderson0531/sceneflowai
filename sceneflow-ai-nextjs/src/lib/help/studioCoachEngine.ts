/**
 * Grounded SceneFlow Studio Coach Retrieval & Deterministic Answer Engine.
 *
 * Strictly indexes live SceneFlow truth (`helpAcademyConfig.ts`, `TIER_CATALOG`,
 * and `creditLots.ts`) so answers never hallucinate outdated plans, retired routes,
 * or unsupported features — and works instantaneously at $0 LLM cost whenever
 * external AI synthesis is disabled or unavailable.
 */

import {
  CREATOR_PLAYBOOKS,
  HELP_KNOWLEDGE_ARTICLES,
  INTERACTIVE_TUTORIALS,
  JIT_CONTEXT_GUIDES,
  getFallbackHrefForContext,
  type JitContextId,
} from '@/config/help/helpAcademyConfig'
import { TIER_CATALOG } from '@/lib/billing/tierCatalog'
import {
  ADDON_CREDIT_SHELF_LIFE_DAYS,
  EXPLORER_CREDIT_SHELF_LIFE_DAYS,
} from '@/lib/credits/creditLots'

export interface StudioCoachAction {
  label: string
  href?: string
  contextId?: JitContextId
  hotspotNumber?: number
  actionEvent?: string
}

export interface StudioCoachSource {
  title: string
  contextId: JitContextId
  kind: 'guide' | 'faq' | 'hotspot' | 'tutorial' | 'pricing'
}

export interface StudioCoachReply {
  answer: string
  sources: StudioCoachSource[]
  actions: StudioCoachAction[]
  mode: 'grounded-ai' | 'grounded-instant'
}

interface IndexedDoc {
  id: string
  title: string
  body: string
  keywords: string[]
  contextId: JitContextId
  kind: StudioCoachSource['kind']
  action?: StudioCoachAction
}

const MULTILINGUAL_SYNONYMS: Record<string, string[]> = {
  price: ['precio', 'preço', 'plan', 'plans', 'tier', 'cost', 'pricing', 'tarifa', '套餐', '价格', 'ราคา', 'แพ็กเกจ', 'السعر', 'الخطط', 'प्लान'],
  credit: ['credits', 'créditos', 'crédito', 'expiry', 'expire', 'addon', 'add-on', 'topup', 'top-up', '点数', '积分', 'เครดิต', 'الرصيد', 'क्रेडिट'],
  byok: ['vertex', 'gcp', 'key', 'keys', 'clave', 'chave', '密钥', 'คีย์', 'مفتاح', 'api'],
  agency: ['crm', 'clients', 'client', 'kanban', 'sla', 'pm', 'manager', 'team', 'seat', 'seats', 'qa', 'reviewer', 'workspace', 'switcher', 'purge', 'draft', 'margin', 'agencia', 'agência', '机构', 'เอเจนซี่', 'وكالة'],
  whitelabel: ['white-label', 'white', 'label', 'producer', 'domain', 'brand', 'intake', 'exif', 'consent', 'marca', 'blanca', '白标', 'แบรนด์', 'علامة'],
  vault: ['continuity', 'character', 'face', 'wardrobe', 'cast', 'location', 'reference', 'storage', 'gb', 'bóveda', 'cofre', '资产库', 'คลัง'],
  error: ['fail', 'failed', 'blocked', 'policy', 'investigate', 'kling', 'veo', 'creative', 'bug', 'flowdirector', 'falló', 'falhou', '失败', 'ล้มเหลว', 'خطأ'],
  mobile: ['pwa', 'phone', 'iphone', 'android', 'companion', 'push', 'install', 'voice', 'dictate', 'móvil', 'celular', '手机', 'มือถือ'],
  dub: ['dubbing', 'language', 'languages', 'spanish', 'portuguese', 'chinese', 'hindi', 'arabic', 'thai', 'doblaje', 'dublagem', '配音', 'พากย์', 'دبلجة'],
  series: ['episode', 'episodes', 'season', 'bible', 'delegation', 'delegate', 'serie', 'série', '剧集', 'ซีรีส์', 'مسلسل'],
  screening: ['share', 'link', 'review', 'animatic', 'stream', 'streams', 'export', 'mp4', 'proyección', 'exibição', '放映', 'ห้องฉาย'],
  blueprint: ['resonance', 'treatment', 'beat', 'script', 'pass', 'guion', 'roteiro', '蓝图', 'บลูพรินต์'],
}

function expandQueryTokens(raw: string): string[] {
  const baseTokens = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)

  const expanded = new Set<string>(baseTokens)
  for (const [canonical, synonyms] of Object.entries(MULTILINGUAL_SYNONYMS)) {
    if (
      baseTokens.includes(canonical) ||
      synonyms.some((syn) => raw.toLowerCase().includes(syn))
    ) {
      expanded.add(canonical)
      if (canonical === 'price') expanded.add('tier')
      if (canonical === 'whitelabel') expanded.add('producer')
      if (canonical === 'agency') expanded.add('clients')
      if (canonical === 'error') expanded.add('troubleshooting')
    }
  }
  return [...expanded]
}

function buildKnowledgeIndex(): IndexedDoc[] {
  const docs: IndexedDoc[] = []

  // Live TIER_CATALOG pricing truth doc
  docs.push({
    id: 'live-pricing-matrix',
    title: 'Live SceneFlow Plans, Credits, Seats & Expiry Rules',
    body: [
      `Explorer ($${TIER_CATALOG.explorer.priceUsd} one-time): ${TIER_CATALOG.explorer.credits.toLocaleString()} credits (valid ${EXPLORER_CREDIT_SHELF_LIFE_DAYS} days), ${TIER_CATALOG.explorer.storageGb} GB trial storage (30 days), 1080p.`,
      `Hobbyist — Creator & Vault ($${TIER_CATALOG.hobbyist.priceUsd}/mo): ${TIER_CATALOG.hobbyist.credits.toLocaleString()} cr/mo, ${TIER_CATALOG.hobbyist.storageGb} GB Vault, ${TIER_CATALOG.hobbyist.voiceCloneSlots} voice clone, unlocks 12-month Add-On packs.`,
      `Starter — Filmmaker & Pre-Vis ($${TIER_CATALOG.starter.priceUsd}/mo): ${TIER_CATALOG.starter.credits.toLocaleString()} cr/mo, ${TIER_CATALOG.starter.storageGb} GB Vault, ${TIER_CATALOG.starter.maxProjects} projects, ${TIER_CATALOG.starter.voiceCloneSlots} voice clones, live-action hybrid mixing.`,
      `Operator Pro ($${TIER_CATALOG.pro.priceUsd}/mo): ${TIER_CATALOG.pro.credits.toLocaleString()} cr/mo, ${TIER_CATALOG.pro.storageGb} GB Client Vault, ${TIER_CATALOG.pro.collaborationSeats} team seats, 4K Veo 3.1, 100% White-Label Client Portals, Vertex AI BYOK, $250 Bulk Pack ($0.010/cr).`,
      `Agency Scale Studio ($${TIER_CATALOG.studio.priceUsd}/mo): ${TIER_CATALOG.studio.credits.toLocaleString()} cr/mo, ${TIER_CATALOG.studio.storageGb} GB Vault, ${TIER_CATALOG.studio.collaborationSeats} team seats, Custom Domain white-label portals, Multi-PM RBAC, Kanban SLA & 1-Click Draft Purge.`,
      `Credit expiry: Monthly plan credits are spent FIRST. Subscriber Add-On packs remain valid for 12 months (${ADDON_CREDIT_SHELF_LIFE_DAYS} days) from purchase and spend soonest-expiring first. Pause-to-Vault is $19/mo.`,
    ].join('\n'),
    keywords: [
      'price',
      'tier',
      'credit',
      'explorer',
      'hobbyist',
      'starter',
      'pro',
      'studio',
      'billing',
      'expiry',
      'vault',
      'seats',
      'whop',
      'pause',
    ],
    contextId: 'billing',
    kind: 'pricing',
    action: { label: 'Open Plans & Billing', href: '/dashboard/settings/billing' },
  })

  for (const guide of Object.values(JIT_CONTEXT_GUIDES)) {
    for (const h of guide.hotspots) {
      docs.push({
        id: `hotspot-${h.id}`,
        title: `${guide.shortTitle} · ${h.label}`,
        body: [h.summary, h.proTip ? `Tip: ${h.proTip}` : '', h.creditNote ? `Cost: ${h.creditNote}` : '']
          .filter(Boolean)
          .join(' '),
        keywords: [guide.id, guide.shortTitle.toLowerCase(), h.label.toLowerCase(), h.locationTag.toLowerCase()],
        contextId: guide.id,
        kind: 'hotspot',
        action: h.actionHref
          ? { label: h.actionLabel || `Open ${guide.shortTitle}`, href: h.actionHref }
          : {
              label: `Inspect #${h.number} in ${guide.shortTitle}`,
              contextId: guide.id,
              hotspotNumber: h.number,
              actionEvent: h.actionEvent,
            },
      })
    }

    for (const faq of guide.troubleshooting) {
      docs.push({
        id: `faq-${guide.id}-${faq.question.slice(0, 24)}`,
        title: faq.question,
        body: faq.answer,
        keywords: [guide.id, 'troubleshooting', 'faq', guide.shortTitle.toLowerCase()],
        contextId: guide.id,
        kind: 'faq',
        action: faq.fixActionHref
          ? { label: faq.fixActionLabel || `Open ${guide.shortTitle}`, href: faq.fixActionHref }
          : faq.fixActionEvent
            ? { label: faq.fixActionLabel || 'Run Action', contextId: guide.id, actionEvent: faq.fixActionEvent }
            : { label: `View ${guide.shortTitle} Guide`, contextId: guide.id },
      })
    }
  }

  for (const article of HELP_KNOWLEDGE_ARTICLES) {
    docs.push({
      id: article.id,
      title: article.title,
      body: `${article.summary}\n${article.bullets.map((b) => `• ${b}`).join('\n')}\nPro Tip: ${article.proTip}`,
      keywords: [...article.tags, article.category],
      contextId: article.category,
      kind: 'guide',
      action: {
        label: `Open ${JIT_CONTEXT_GUIDES[article.category]?.shortTitle || 'Academy'}`,
        href: getFallbackHrefForContext(article.category),
      },
    })
  }

  for (const course of INTERACTIVE_TUTORIALS) {
    docs.push({
      id: `course-${course.id}`,
      title: `Tutorial: ${course.title}`,
      body: `${course.subtitle} Outcome: ${course.outcome} Steps: ${course.steps.map((s) => `${s.stepNumber}. ${s.title}`).join(' ')}`,
      keywords: ['tutorial', course.level.toLowerCase(), ...course.steps.map((s) => s.contextId)],
      contextId: course.steps[0]?.contextId || 'dashboard',
      kind: 'tutorial',
      action: {
        label: `Start "${course.title}"`,
        href: `/dashboard/help?tab=tutorials&course=${course.id}`,
      },
    })
  }

  for (const pb of CREATOR_PLAYBOOKS) {
    docs.push({
      id: `playbook-${pb.id}`,
      title: `Playbook: ${pb.persona} (${pb.recommendedPlan})`,
      body: `${pb.tagline} ${pb.workflowSummary} ${pb.milestones.map((m) => `${m.phase}: ${m.action}`).join(' ')}`,
      keywords: ['playbook', pb.id, pb.recommendedPlan.toLowerCase()],
      contextId: pb.id === 'hybrid-agency-studio' ? 'agency-ops' : 'dashboard',
      kind: 'guide',
      action: { label: 'Open Creator Playbooks', href: '/dashboard/help?tab=playbooks' },
    })
  }

  return docs
}

const KNOWLEDGE_INDEX = buildKnowledgeIndex()

export function retrieveStudioCoachContext(
  question: string,
  currentContextId: JitContextId = 'dashboard',
  limit = 4
): IndexedDoc[] {
  const tokens = expandQueryTokens(question)
  if (tokens.length === 0) {
    return KNOWLEDGE_INDEX.filter((d) => d.contextId === currentContextId).slice(0, limit)
  }

  const scored = KNOWLEDGE_INDEX.map((doc) => {
    const haystack = `${doc.title} ${doc.body} ${doc.keywords.join(' ')}`.toLowerCase()
    const titleLower = doc.title.toLowerCase()
    let score = 0
    for (const token of tokens) {
      if (doc.keywords.some((k) => k.includes(token))) score += 5
      if (titleLower.includes(token)) score += 4
      if (haystack.includes(token)) score += 2
    }
    // Slight context affinity boost when relevant
    if (score > 0 && doc.contextId === currentContextId) {
      score += 1.5
    }
    // Extra precision boost for pricing & BYOK queries
    if (tokens.includes('price') && doc.kind === 'pricing') score += 8
    if (tokens.includes('byok') && doc.id.includes('byok')) score += 6
    if (tokens.includes('agency') && doc.contextId === 'agency-ops') score += 4
    if (tokens.includes('whitelabel') && doc.contextId === 'producer') score += 4
    if (tokens.includes('error') && doc.id === 'kb-flowdirector-qa') score += 6
    if (tokens.includes('mobile') && doc.id === 'kb-mobile-companion-pwa') score += 8
    return { doc, score }
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return KNOWLEDGE_INDEX.filter((d) => d.contextId === currentContextId).slice(0, 2)
  }

  return scored.slice(0, limit).map((s) => s.doc)
}

export function buildGroundedCoachPromptContext(docs: IndexedDoc[]): string {
  return docs
    .map((d, i) => `[${i + 1}] (${d.kind.toUpperCase()} — ${d.title})\n${d.body}`)
    .join('\n\n')
}

export function buildDeterministicCoachReply(
  question: string,
  currentContextId: JitContextId = 'dashboard'
): StudioCoachReply {
  const docs = retrieveStudioCoachContext(question, currentContextId, 3)

  if (docs.length === 0) {
    return {
      answer:
        'I could not find an exact guide for that question. Try browsing Studio Academy or submit a Support Ticket so our team can help directly.',
      sources: [],
      actions: [
        { label: 'Open Studio Academy', href: '/dashboard/help' },
        { label: 'View Plans & Billing', href: '/dashboard/settings/billing' },
      ],
      mode: 'grounded-instant',
    }
  }

  const primary = docs[0]
  const secondary = docs.slice(1)
  const answerLines: string[] = [
    `**${primary.title}**`,
    primary.body,
  ]

  if (secondary.length > 0) {
    answerLines.push('', '**Related Studio Guidance:**')
    for (const s of secondary) {
      const firstSentence = s.body.split('\n')[0]?.slice(0, 200) || s.body.slice(0, 200)
      answerLines.push(`• **${s.title}**: ${firstSentence}`)
    }
  }

  const seenLabels = new Set<string>()
  const actions: StudioCoachAction[] = []
  for (const d of docs) {
    if (d.action && !seenLabels.has(d.action.label)) {
      seenLabels.add(d.action.label)
      actions.push(d.action)
    }
  }

  return {
    answer: answerLines.join('\n'),
    sources: docs.map((d) => ({
      title: d.title,
      contextId: d.contextId,
      kind: d.kind,
    })),
    actions: actions.slice(0, 3),
    mode: 'grounded-instant',
  }
}
