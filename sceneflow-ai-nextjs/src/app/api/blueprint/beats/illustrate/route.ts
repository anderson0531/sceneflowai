import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId, assertProjectAccess } from '@/lib/projectAccess'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { generateImageWithGemini, type ReferenceImage } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { resolveVariantArtStyle } from '@/lib/treatment/blueprintFoundation'
import { getArtStylePromptSuffix } from '@/lib/vision/artStyle'
import { findActiveBlueprintSession, getPayload } from '@/lib/blueprint/shareSession'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_BEATS_PER_BATCH = 12

interface IllustrateBeatsBody {
  projectId: string
  variantId?: string
  beatIndex?: number
  force?: boolean
}

function buildBeatStoryboardPrompt(params: {
  beat: Record<string, unknown>
  beatIndex: number
  variant: Record<string, unknown>
  artStyleSuffix: string
}): string {
  const { beat, beatIndex, variant, artStyleSuffix } = params
  const title = String(beat.title || `Chapter ${beatIndex + 1}`).trim()
  const synopsis = String(beat.synopsis || beat.intent || '').trim()
  const era = String(beat.eraOrAge || '').trim()
  const settingHint = String(beat.settingHint || variant.setting || '').trim()
  const tone = String(variant.tone || 'cinematic').trim()
  const characters = Array.isArray(beat.characters)
    ? beat.characters.map((c) => String(c || '').trim()).filter(Boolean)
    : []

  const parts = [
    `Cinematic 16:9 storyboard keyframe illustration for Chapter ${beatIndex + 1}: "${title}".`,
    synopsis ? `Scene action & moment: ${synopsis}` : '',
    era ? `Historical era / character age context: ${era}.` : '',
    settingHint ? `Environment & setting: ${settingHint}.` : '',
    characters.length > 0 ? `Key subjects in frame: ${characters.join(', ')}.` : '',
    `Emotional tone: ${tone}.`,
    artStyleSuffix || 'High-production cinematic lighting, natural composition, expressive framing.',
    'No text, no captions, no watermarks, no UI overlays, no split-screen.',
  ].filter(Boolean)

  return parts.join(' ')
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as IllustrateBeatsBody
    const { projectId, variantId, beatIndex, force = false } = body

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      )
    }

    const access = await assertProjectAccess(projectId, userId)
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      )
    }

    const billingOwnerId = access.billingOwnerUserId || userId
    const project = access.project
    const metadata = { ...((project.metadata || {}) as Record<string, any>) }

    const variants: Array<Record<string, any>> = Array.isArray(metadata.treatmentVariants)
      ? [...metadata.treatmentVariants]
      : metadata.filmTreatmentVariant
        ? [metadata.filmTreatmentVariant]
        : []

    if (variants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Blueprint variant found on project' },
        { status: 404 }
      )
    }

    const targetVariantIdx = variantId
      ? Math.max(
          0,
          variants.findIndex((v) => String(v?.id) === String(variantId))
        )
      : 0
    const variant = { ...variants[targetVariantIdx] }
    const beats: Array<Record<string, any>> = Array.isArray(variant.beats)
      ? variant.beats.map((b: Record<string, any>) => ({ ...b }))
      : []

    if (beats.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No story beats found on Blueprint variant' },
        { status: 400 }
      )
    }

    let indicesToGenerate: number[] = []
    if (typeof beatIndex === 'number') {
      if (beatIndex < 0 || beatIndex >= beats.length) {
        return NextResponse.json(
          { success: false, error: 'Invalid beatIndex' },
          { status: 400 }
        )
      }
      indicesToGenerate = [beatIndex]
    } else {
      indicesToGenerate = beats
        .map((b, idx) => ({
          idx,
          hasImg: Boolean(b?.imageUrl || b?.storyboardStillUrl || b?.stillUrl),
        }))
        .filter((item) => force || !item.hasImg)
        .map((item) => item.idx)
        .slice(0, MAX_BEATS_PER_BATCH)
    }

    if (indicesToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        generatedCount: 0,
        creditsCharged: 0,
        beats,
      })
    }

    const creditsPerBeat = IMAGE_CREDITS.FRAME_GENERATION
    const requiredCredits = indicesToGenerate.length * creditsPerBeat
    const hasCredits = await CreditService.ensureCredits(billingOwnerId, requiredCredits)
    if (!hasCredits) {
      const breakdown = await CreditService.getCreditBreakdown(billingOwnerId).catch(() => null)
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits for beat storyboard illustrations',
          creditsRequired: requiredCredits,
          creditsAvailable: breakdown?.total_credits ?? 0,
        },
        { status: 402 }
      )
    }

    const { storyLocale, properNouns } = await resolveRequestStoryLocale(request, {
      projectId,
      userIdOrEmail: billingOwnerId,
    })

    const resolvedStyle = resolveVariantArtStyle(variant)
    const artStyleSuffix = getArtStylePromptSuffix(
      resolvedStyle || String(variant.visual_style || 'realistic')
    )

    const visionChars: Array<Record<string, any>> = Array.isArray(
      metadata.visionPhase?.characters
    )
      ? metadata.visionPhase.characters
      : []

    let generatedCount = 0
    const errors: Array<{ beatIndex: number; message: string }> = []

    for (const idx of indicesToGenerate) {
      const beat = beats[idx]
      try {
        const prompt = buildBeatStoryboardPrompt({
          beat,
          beatIndex: idx,
          variant,
          artStyleSuffix,
        })

        // Attach up to 2 Continuity character portrait references matching beat.characters
        const beatCharNames = Array.isArray(beat.characters)
          ? beat.characters.map((c: unknown) => String(c || '').toLowerCase().trim())
          : []
        const matchedRefs: ReferenceImage[] = []
        for (const vc of visionChars) {
          if (matchedRefs.length >= 2) break
          const refUrl = vc?.referenceImage || vc?.imageUrl
          const cName = String(vc?.name || '').trim()
          if (!refUrl || !cName) continue
          if (
            beatCharNames.some(
              (bn: string) =>
                bn === cName.toLowerCase() || cName.toLowerCase().includes(bn)
            )
          ) {
            matchedRefs.push({
              referenceId: matchedRefs.length + 1,
              imageUrl: String(refUrl),
              subjectDescription: `Character reference for "${cName}" — preserve facial identity and appearance`,
            })
          }
        }

        const modelPrompt = await englishForModel(prompt, storyLocale, properNouns)
        const base64Image = await generateImageWithGemini(modelPrompt, {
          aspectRatio: '16:9',
          imageSize: '1K',
          ...(matchedRefs.length > 0 ? { referenceImages: matchedRefs } : {}),
        })

        const blobUrl = await uploadImageToBlob(
          base64Image,
          `blueprint-beats/beat-${idx + 1}-${Date.now()}.png`,
          projectId
        )

        beats[idx] = {
          ...beat,
          imageUrl: blobUrl,
          storyboardStillUrl: blobUrl,
          illustratedAt: new Date().toISOString(),
        }
        generatedCount += 1
      } catch (err) {
        console.error(`[blueprint/beats/illustrate] Beat ${idx} failed:`, err)
        errors.push({
          beatIndex: idx,
          message: err instanceof Error ? err.message : 'Illustration failed',
        })
      }
    }

    let creditsCharged = 0
    if (generatedCount > 0) {
      creditsCharged = generatedCount * creditsPerBeat
      await CreditService.charge(
        billingOwnerId,
        creditsCharged,
        'ai_usage',
        projectId,
        {
          feature: 'blueprint_beat_illustration',
          projectId,
          generatedCount,
        }
      )

      variant.beats = beats
      variants[targetVariantIdx] = variant
      metadata.treatmentVariants = variants
      if (metadata.filmTreatmentVariant?.id === variant.id) {
        metadata.filmTreatmentVariant = variant
      }

      project.set('metadata', metadata)
      project.changed('metadata', true)
      await project.save()

      // Sync active Blueprint share session if one exists
      try {
        const activeShare = await findActiveBlueprintSession(projectId, billingOwnerId)
        if (activeShare) {
          const sharePayload = getPayload(activeShare)
          if (sharePayload) {
            await activeShare.update({
              payload: {
                ...sharePayload,
                treatment: {
                  ...sharePayload.treatment,
                  beats,
                },
              },
            })
          }
        }
      } catch (shareSyncErr) {
        console.warn('[blueprint/beats/illustrate] Share sync warning:', shareSyncErr)
      }
    }

    if (generatedCount === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors[0].message,
          errors,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      generatedCount,
      creditsCharged,
      beats,
      ...(errors.length > 0 ? { partialErrors: errors } : {}),
    })
  } catch (error) {
    console.error('[blueprint/beats/illustrate] POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Beat illustration failed',
      },
      { status: 500 }
    )
  }
}
