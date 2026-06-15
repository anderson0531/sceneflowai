/**
 * Spoken narration scripts for role "Show example" panels (AudiencePathStrip).
 * Used by scripts/generate-role-example-narration.ts (Gemini TTS).
 */

import type { UseCasePersonaId } from '@/config/landing/useCasePersonasCopy'

export type RoleExampleNarration = {
  id: UseCasePersonaId
  label: string
  script: string
}

export const ROLE_EXAMPLE_NARRATIONS: RoleExampleNarration[] = [
  {
    id: 'creator',
    label: 'Creator',
    script:
      "Here's the challenge. You have a strong script, but juggling six separate generation and edit tools — or getting stuck in slot-machine video loops — slows every upload. Serialized YouTube hits and drama cadences demand faster turnaround than fragmented AI tabs can deliver. SceneFlow is the automated storyteller: one studio where beat-first pre-vis, Reference Library continuity, and publish-ready masters keep your series consistent. The win? Move from occasional uploads to a reliable production cadence with less overhead.",
  },
  {
    id: 'team',
    label: 'In-house Team',
    script:
      "Here's the challenge. Comms, L&D, and marketing teams wait weeks for agency or vendor video — or face an overwhelming tool stack with no repeatable in-house system. Every path brings inconsistent branding and stalled campaigns. SceneFlow puts same-week in-house production in your hands: brand templates, approval before final render, and predictable credit budgets — no crew days or open-ended edit cycles. The win? Ship training, comms, and campaign video on your timeline — not the vendor's backlog.",
  },
  {
    id: 'productionShop',
    label: 'Production Shop',
    script:
      "Here's the challenge. Memoir, legacy, real estate, and education clients need fast turnaround — but every project starts from scratch. Per-deliverable handoffs and slot-machine re-rolls across script, image, voice, video, music, and edit tools eat margin on volume. SceneFlow lets you productize your video service: repeatable intake, white-label templates, voice clones, avatars, and pre-vis approval — customized per client with Express concurrent generation across beats. The win? Launch a niche studio service with repeatable delivery — not a one-off freelance grind.",
  },
  {
    id: 'agency',
    label: 'Agency',
    script:
      "Here's the challenge. Winning the pitch is only half the battle. Recurring client work needs fast turnaround — but per-deliverable handoffs and slot-machine video re-rolls across separate generation and edit tools slow every pitch cycle. SceneFlow delivers throughput plus client approval: brand-safe controls, client review before final render, and predictable credit costs per project — with Express pre-vis in front of stakeholders fast. The win? Deliver faster pitch cycles and recurring client work with less production risk and more margin.",
  },
  {
    id: 'filmProduction',
    label: 'Film Production',
    script:
      "Here's the challenge. You have a script — but table reads, storyboard cycles, and fragmented previz tools delay investor pitches, audience tests, and greenlight decisions. SceneFlow takes a script-first approach: upload your script, optimize with Audience Resonance, and generate an interactive pre-vis animatic to screen and test — with Express concurrent generation across beats, Screening Room audience testing, and fast multi-language overlays. The win? Validate story and audience fit before principal photography — with a shareable animatic, not a weeks-long previz cycle.",
  },
]
