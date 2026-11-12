import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import '@/models'
import Project from '@/models/Project'
import { resolveStoryLocale } from '@/i18n/server/storyLocale'
import { loadBlueprintARFromMetadata } from '@/lib/types/audienceResonance'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import { type CharacterLocalizationContext } from '@/lib/character/characterIntelligence'
import { enrichEnsembleCastWithIntelligence } from '@/lib/character/characterIntelligence.server'
import { persistCastCatalogEnrichment } from '@/lib/vision/referenceExpress/castCatalogSync'

export const runtime = 'nodejs'
export const maxDuration = 120

interface SyncCastFromScriptRequest {
  projectId?: string
  characters?: Array<Record<string, any>>
  scenes?: Array<Record<string, any>>
  locations?: Array<Record<string, any>>
  props?: Array<Record<string, any>>
  screenplayContext?: {
    title?: string
    genre?: string
    tone?: string
    setting?: string
    logline?: string
    synopsis?: string
    targetAudience?: string
    artStyle?: string
  }
  storyLocale?: string
  forceOverwrite?: boolean
  persist?: boolean
}

/**
 * POST /api/character/sync-cast-from-script
 *
 * Wardrobe-parallel Cast Intelligence endpoint: analyzes the entire cast ensemble
 * against the script scenes, dialogue, locations, props, wardrobes, cultural
 * localization signals, and family/kinship lineage (same-ethnicity inheritance +
 * mixed-heritage blending + biologically plausible generational age gaps).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as SyncCastFromScriptRequest
    const {
      projectId,
      forceOverwrite = false,
      persist = Boolean(projectId),
    } = body

    let projectRecord: any = null
    if (projectId && !projectId.startsWith('new-project')) {
      projectRecord = await Project.findByPk(projectId)
      if (projectRecord && projectRecord.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const metadata: Record<string, any> = projectRecord?.metadata || {}
    const visionPhase: Record<string, any> = metadata.visionPhase || {}
    const treatment: Record<string, any> = metadata.filmTreatmentVariant || {}
    const refs: Record<string, any> = visionPhase.references || {}

    const characters = Array.isArray(body.characters) && body.characters.length > 0
      ? body.characters
      : Array.isArray(visionPhase.characters)
        ? visionPhase.characters
        : []

    if (characters.length === 0) {
      return NextResponse.json({
        success: true,
        characters: [],
        updates: [],
        analysis: 'No characters available to sync.',
        usedFallback: false,
      })
    }

    const scenes = Array.isArray(body.scenes) && body.scenes.length > 0
      ? body.scenes
      : Array.isArray(visionPhase.scenes) && visionPhase.scenes.length > 0
        ? visionPhase.scenes
        : Array.isArray(visionPhase.script?.script?.scenes)
          ? visionPhase.script.script.scenes
          : []

    const locations = Array.isArray(body.locations) && body.locations.length > 0
      ? body.locations
      : Array.isArray(refs.locationReferences)
        ? refs.locationReferences
        : []

    const props = Array.isArray(body.props) && body.props.length > 0
      ? body.props
      : Array.isArray(refs.objectReferences)
        ? refs.objectReferences
        : []

    const { storyLocale } = await resolveStoryLocale({
      explicit: body.storyLocale,
      projectId: projectRecord ? projectId : undefined,
      userIdOrEmail: session.user.id || session.user.email,
      includeProperNouns: false,
    })

    const arState = loadBlueprintARFromMetadata(metadata)
    const setting =
      body.screenplayContext?.setting ||
      treatment.setting ||
      undefined

    const localization: CharacterLocalizationContext = {
      setting,
      storyLocale,
      targetAudience:
        body.screenplayContext?.targetAudience ||
        treatment.target_audience ||
        treatment.audience,
      audienceDefinition: arState.audienceDefinition,
      locations: locations.map((l: any) => ({
        name: l.name || l.locationDisplay || l.location,
        location: l.location,
        description: l.description || l.atmosphere,
      })),
      props: props.map((p: any) => ({
        name: p.name,
        category: p.category,
        description: p.description,
      })),
    }

    const result = await enrichEnsembleCastWithIntelligence({
      characters,
      storyContext: {
        title: body.screenplayContext?.title || treatment.title || projectRecord?.title,
        logline:
          body.screenplayContext?.logline ||
          visionPhase.script?.logline ||
          treatment.logline ||
          projectRecord?.description,
        synopsis: body.screenplayContext?.synopsis || treatment.synopsis || treatment.film_treatment,
        genre: body.screenplayContext?.genre || projectRecord?.genre || treatment.genre,
        tone:
          body.screenplayContext?.tone ||
          projectRecord?.tone ||
          treatment.tone_description ||
          treatment.tone,
        setting,
        artStyle: body.screenplayContext?.artStyle || resolveProjectArtStyle(metadata),
      },
      localization,
      scenes,
      forceOverwrite,
    })

    let persistedCharacters = result.characters
    if (persist && projectRecord && result.updates.length > 0) {
      const saved = await persistCastCatalogEnrichment({
        projectId: projectRecord.id,
        updates: result.updates,
        forceOverwrite,
      })
      if (saved.saved && saved.characters.length > 0) {
        persistedCharacters = saved.characters
      }
    }

    return NextResponse.json({
      success: true,
      characters: persistedCharacters,
      updates: result.updates,
      analysis: result.analysis,
      usedFallback: result.usedFallback,
    })
  } catch (error: any) {
    console.error('[Sync Cast From Script] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to sync cast baselines from script' },
      { status: 500 }
    )
  }
}
