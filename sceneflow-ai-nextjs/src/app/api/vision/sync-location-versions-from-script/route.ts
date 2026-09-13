import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import {
  formatSceneForLocationVersionAnalysis,
  type LocationAnalysisSceneInput,
} from '@/lib/vision/locationStateAnalysis'
import {
  buildLocationVersionSyncDiff,
  enrichSuggestionsWithBeatLocationState,
  summarizeLocationVersionSyncDiff,
  type ExistingLocationVersionLike,
  type LocationVersionSuggestionLike,
} from '@/lib/vision/locationScriptSync'
import type { LocationVersionAppliesFrom } from '@/types/visionReferences'

export const runtime = 'nodejs'
export const maxDuration = 300

interface SyncLocationVersionsRequest {
  location: {
    id: string
    location: string
    description?: string
    versions?: ExistingLocationVersionLike[]
  }
  scenes: LocationAnalysisSceneInput[]
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    logline?: string
  }
}

function parseAppliesFrom(raw: unknown): LocationVersionAppliesFrom | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const rec = raw as Record<string, unknown>
  const sceneNumber = Number(rec.sceneNumber)
  const beatIndex = Number(rec.beatIndex)
  if (!Number.isFinite(sceneNumber) || sceneNumber < 1) return undefined
  if (!Number.isFinite(beatIndex) || beatIndex < 0) return undefined
  const beatId = typeof rec.beatId === 'string' && rec.beatId.trim() ? rec.beatId.trim() : undefined
  return { sceneNumber, beatIndex, beatId }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SyncLocationVersionsRequest = await req.json()
    const { location, scenes, screenplayContext } = body

    if (!location?.id || !location?.location) {
      return NextResponse.json({ error: 'location is required' }, { status: 400 })
    }
    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided for analysis' }, { status: 400 })
    }

    const locationName = location.location
    const existing = location.versions || []
    const sceneContext = scenes
      .map((s) => formatSceneForLocationVersionAnalysis(s, locationName))
      .join('\n\n---\n\n')

    const existingList = existing.length
      ? `\n\nEXISTING VERSIONS (prefer UPDATING these — match by name/state; remap sceneNumbers; only create when truly new):\n${existing
          .map(
            (v) =>
              `- id=${v.id} name="${v.name}" scenes=[${(v.sceneNumbers || []).join(', ')}] notes="${(v.stateNotes || '').slice(0, 160)}"`
          )
          .join('\n')}`
      : ''

    const analysisPrompt = `You are a production designer and set-continuity supervisor RESYNCING set-state versions after a script edit for ${locationName}.

LOCATION: ${locationName}
Description: ${location.description || 'Not specified'}

SCREENPLAY CONTEXT:
Genre: ${screenplayContext?.genre || 'Drama'}
Tone: ${screenplayContext?.tone || 'Neutral'}
Setting: ${screenplayContext?.setting || 'Contemporary'}
Logline: ${screenplayContext?.logline || 'Not specified'}

SCENES AT THIS LOCATION (including beat-level detail):
${sceneContext}
${existingList}

TASK: Produce the DISTINCT lasting set-state versions ${locationName} needs NOW based on the current script.

RESYNC RULES:
1. Prefer updating an existing version (same name / same damage) with refreshed sceneNumbers and stateNotes over creating near-duplicates.
2. Create a new version only for a clearly different lasting set state.
3. stateNotes is the COMPLETE current set state (accumulated), used for image generation.
4. Do NOT invent versions for lighting, camera, or people moving.
5. The intact base is not a version — omit it.
6. appliesFrom is the first beat where this state is visible.

For each DISTINCT version, provide name, stateNotes, sceneNumbers, appliesFrom, reason, confidence.

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "string",
      "stateNotes": "string",
      "sceneNumbers": [1],
      "appliesFrom": { "sceneNumber": 1, "beatIndex": 1 },
      "reason": "string",
      "confidence": 0.9
    }
  ],
  "analysis": "Brief overall analysis"
}`

    const result = await generateText(analysisPrompt, {
      temperature: 0.5,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    })

    let suggestions: LocationVersionSuggestionLike[] = []
    let analysis = ''

    try {
      const parsed = safeParseJsonFromText(result.text)
      suggestions = (parsed.suggestions || []).map((s: any) => ({
        name: s.name,
        stateNotes: s.stateNotes || s.description || '',
        sceneNumbers: s.sceneNumbers || [],
        appliesFrom: parseAppliesFrom(s.appliesFrom),
        reason: s.reason || '',
        confidence: s.confidence || 0.7,
      }))
      analysis = parsed.analysis || ''
    } catch (parseError) {
      console.error('[Location Version Sync] Failed to parse AI response:', parseError)
      console.error('[Location Version Sync] Raw response:', result.text)
    }

    suggestions = enrichSuggestionsWithBeatLocationState(suggestions, scenes, existing)

    suggestions.sort((a, b) => {
      const aFirst = a.appliesFrom?.sceneNumber ?? Math.min(...(a.sceneNumbers || [999]))
      const bFirst = b.appliesFrom?.sceneNumber ?? Math.min(...(b.sceneNumbers || [999]))
      if (aFirst !== bFirst) return aFirst - bFirst
      return (a.appliesFrom?.beatIndex ?? 0) - (b.appliesFrom?.beatIndex ?? 0)
    })

    const diff = buildLocationVersionSyncDiff(
      location.id,
      locationName,
      existing,
      suggestions,
      analysis
    )

    return NextResponse.json({
      success: true,
      diff,
      totals: summarizeLocationVersionSyncDiff(diff),
      analyzedScenes: scenes.length,
    })
  } catch (error: any) {
    console.error('[Location Version Sync] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync location versions from script' },
      { status: 500 }
    )
  }
}
