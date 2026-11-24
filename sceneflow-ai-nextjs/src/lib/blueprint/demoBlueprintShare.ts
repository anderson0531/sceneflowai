import {
  DEMO_MEMOIR_PROJECT_ID,
  DEMO_PROJECT_ID,
  DEMO_SILT_LINE_PROJECT_ID,
  DEMO_WHITE_CITY_PROJECT_ID,
  getUiSandboxProject,
  isDemoProjectId,
} from '@/lib/demo/uiSandboxProject'
import { resolveBlueprintHeroImageUrl } from '@/lib/blueprint/resolveBlueprintHeroImage'
import { sanitizeBlueprintARForShare } from '@/lib/blueprint/sanitizeShareAR'
import { loadBlueprintARFromMetadata } from '@/lib/types/audienceResonance'
import { DEFAULT_SHARE_AUDIO_LANGUAGE } from '@/lib/blueprint/shareAudioPayload'
import { DEFAULT_BLUEPRINT_GEMINI_VOICE } from '@/lib/tts/geminiFlashTts'
import type { BlueprintSessionPayload } from '@/lib/blueprint/shareTypes'

const DEMO_BLUEPRINT_SLUG_BY_PROJECT_ID: Record<string, string> = {
  [DEMO_PROJECT_ID]: 'demo-blueprint-glass-ledger',
  [DEMO_MEMOIR_PROJECT_ID]: 'demo-blueprint-harbor-books',
  [DEMO_WHITE_CITY_PROJECT_ID]: 'demo-blueprint-white-city',
  [DEMO_SILT_LINE_PROJECT_ID]: 'demo-blueprint-silt-line',
}

const PROJECT_ID_BY_DEMO_BLUEPRINT_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(DEMO_BLUEPRINT_SLUG_BY_PROJECT_ID).map(([projectId, slug]) => [slug, projectId])
)

export function getDemoBlueprintShareToken(
  projectId: string,
  options?: { clientMode?: boolean }
): string {
  const normalized = (projectId || '').trim().toLowerCase()
  const sandbox = isDemoProjectId(normalized) ? getUiSandboxProject(normalized) : null
  const canonicalId = sandbox?.id ? String(sandbox.id).toLowerCase() : normalized
  const baseSlug =
    DEMO_BLUEPRINT_SLUG_BY_PROJECT_ID[canonicalId] || 'demo-blueprint-harbor-books'
  return options?.clientMode ? `${baseSlug}-client` : baseSlug
}

export function resolveDemoBlueprintToken(
  token?: string | null
): { projectId: string; clientMode: boolean } | null {
  if (!token) return null
  const normalized = token.trim().toLowerCase()
  const isClientSuffix = normalized.endsWith('-client')
  const baseSlug = isClientSuffix ? normalized.slice(0, -'-client'.length) : normalized
  const projectId = PROJECT_ID_BY_DEMO_BLUEPRINT_SLUG[baseSlug]
  if (!projectId) return null
  return { projectId, clientMode: isClientSuffix }
}

export function isDemoBlueprintShareToken(token?: string | null): boolean {
  return resolveDemoBlueprintToken(token) !== null
}

export function buildDemoBlueprintSharePayload(
  projectId: string,
  options?: {
    clientMode?: boolean
    allowFeedback?: boolean
    neverExpires?: boolean
    treatmentOverride?: Record<string, unknown>
    heroImageUrlOverride?: string
    variantIdOverride?: string
  }
): BlueprintSessionPayload {
  const sandbox = getUiSandboxProject(projectId)
  const metadata = (sandbox.metadata || {}) as Record<string, unknown>
  const variants = Array.isArray(metadata.treatmentVariants)
    ? (metadata.treatmentVariants as Record<string, unknown>[])
    : []
  const baseTreatment =
    options?.treatmentOverride ||
    (metadata.filmTreatmentVariant as Record<string, unknown> | undefined) ||
    variants[0] || {
      id: 'demo-variant-1',
      title: sandbox.title,
      logline: sandbox.description || '',
    }

  const variantId =
    options?.variantIdOverride ||
    (typeof baseTreatment.id === 'string' && baseTreatment.id.trim()
      ? baseTreatment.id
      : 'demo-variant-1')

  const heroImageUrl =
    options?.heroImageUrlOverride ||
    resolveBlueprintHeroImageUrl(baseTreatment) ||
    (projectId === DEMO_MEMOIR_PROJECT_ID
      ? '/images/trailers/video-memoir-poster.webp'
      : undefined)

  const clientOrder = (metadata.clientOrder || null) as {
    isClientProject?: boolean
    maxFeedbackRounds?: number
  } | null
  const clientMode = Boolean(options?.clientMode ?? clientOrder?.isClientProject)

  const { persisted: persistedAR } = loadBlueprintARFromMetadata(metadata)
  const arSnapshot = sanitizeBlueprintARForShare(persistedAR)

  return {
    type: 'blueprint',
    projectId: String(sandbox.id),
    variantId,
    treatment: baseTreatment,
    heroImageUrl,
    audienceDefinition: null,
    shareSettings: {
      allowTts: true,
      collectEmail: false,
      allowFeedback: options?.allowFeedback !== false,
      neverExpires: options?.neverExpires !== false,
      ...(clientMode
        ? {
            clientMode: true,
            hideAudienceResonance: true,
            maxFeedbackRounds: clientOrder?.maxFeedbackRounds ?? 2,
            roundsUsed: 0,
            approvalStatus: 'pending_review',
            brandProfileSnapshot: {
              brandName: 'Meridian Storyworks',
              logoUrl: null,
              primaryColor: '#06b6d4',
              supportEmail: 'producers@meridianstoryworks.com',
              hideSceneFlowBranding: false,
            },
          }
        : {}),
    },
    ownerDisplayName: clientMode ? 'Meridian Storyworks' : 'SceneFlow Studio',
    sectionAudioStatus: 'skipped',
    sectionAudioLanguage: DEFAULT_SHARE_AUDIO_LANGUAGE,
    sectionAudioVoiceId: DEFAULT_BLUEPRINT_GEMINI_VOICE,
    sectionAudioByLanguage: {},
    blueprintAudienceResonance: clientMode ? null : arSnapshot ?? null,
  }
}
