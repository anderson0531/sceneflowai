import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import {
  formatSceneForLocationVersionAnalysis,
  type LocationAnalysisSceneInput,
} from '@/lib/vision/locationStateAnalysis'
import { enrichSuggestionsWithBeatLocationState } from '@/lib/vision/locationScriptSync'
import type { LocationVersionAppliesFrom } from '@/types/visionReferences'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SuggestLocationVersionsRequest {
  location: {
    id: string
    location: string
    description?: string
    existingVersions?: Array<{
      name: string
      stateNotes?: string
      sceneNumbers?: number[]
    }>
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

    const body: SuggestLocationVersionsRequest = await req.json()
    const { location, scenes, screenplayContext } = body

    if (!location?.location) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
    }
    if (!scenes || scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes provided for analysis' }, { status: 400 })
    }

    const locationName = location.location
    const sceneContext = scenes
      .map((s) => formatSceneForLocationVersionAnalysis(s, locationName))
      .join('\n\n---\n\n')

    const existingList = location.existingVersions?.length
      ? `\n\nExisting versions (already defined — DO NOT suggest these again):\n${location.existingVersions
          .map(
            (v) =>
              `- ${v.name}${v.sceneNumbers?.length ? ` (Scenes ${v.sceneNumbers.join(', ')})` : ''}`
          )
          .join('\n')}`
      : ''

    const analysisPrompt = `You are a production designer and set-continuity supervisor analyzing a film script to determine whether ${locationName} needs DISTINCT set-state versions after lasting physical changes.

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

TASK: Determine what DISTINCT lasting set-state versions of ${locationName} are required.

CREATE a version ONLY for lasting physical / set-dressing changes at THIS same location that later beats would otherwise undo:
- Destruction: exploded door, collapsed wall, shattered window, burned room
- Persistent redress: furniture overturned, windows boarded, debris that stays
- Environment that is now the set: flooded, wrecked, lights smashed (not a lightingAccent mood)

DO NOT create a version for:
- Camera or shot-type changes
- Characters entering or leaving
- A door that opens and closes
- Time of day or lightingAccent alone
- A different location (new scene heading)
- Beat keyProps, propInteraction, or objects a character handles or introduces (journals, vellum, tools, weapons). Those belong on the beat frame, not this still.
- Built-in architectural hardware that is always on the set (door wheels, hatch wheels, vault wheels, bolted valves). Those belong on the BASE establishing shot, not a version.

RULES:
1. The intact establishing shot is the BASE — do not suggest a version for the undamaged set. Mounted hardware that is always present is part of the BASE, not a version.
2. Group consecutive beats that share the same post-change state into one version.
3. stateNotes must be the COMPLETE current STRUCTURAL set state at that point (door gone AND later fire), not a delta-only patch. stateNotes are used for reference image generation. stateNotes must NOT include beat keyProps, propInteraction, or handheld objects a character introduces.
4. appliesFrom is the first beat where this state is visible (sceneNumber 1-based, beatIndex 0-based). Later beats at this location keep this version until a newer version starts.
5. If nothing lasting changes, return an empty suggestions array.

For each DISTINCT version, provide:
- name: short label (e.g., "Exploded front door")
- stateNotes: complete visual set state for image generation
- sceneNumbers: scenes this state covers
- appliesFrom: { sceneNumber, beatIndex, beatId? }
- reason, confidence

Respond with valid JSON only:
{
  "suggestions": [
    {
      "name": "string",
      "stateNotes": "string",
      "sceneNumbers": [1],
      "appliesFrom": { "sceneNumber": 1, "beatIndex": 1, "beatId": "optional" },
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

    let suggestions: Array<{
      name: string
      stateNotes: string
      sceneNumbers: number[]
      appliesFrom?: LocationVersionAppliesFrom
      reason: string
      confidence: number
    }> = []
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
      console.error('[Location Version Suggestion] Failed to parse AI response:', parseError)
      console.error('[Location Version Suggestion] Raw response:', result.text)
    }

    if (location.existingVersions?.length) {
      const existingNames = location.existingVersions.map((v) => v.name.toLowerCase())
      suggestions = suggestions.filter((s) => !existingNames.includes(s.name.toLowerCase()))
    }

    suggestions = enrichSuggestionsWithBeatLocationState(suggestions, scenes)

    suggestions.sort((a, b) => {
      const aFirst = a.appliesFrom?.sceneNumber ?? Math.min(...(a.sceneNumbers || [999]))
      const bFirst = b.appliesFrom?.sceneNumber ?? Math.min(...(b.sceneNumbers || [999]))
      if (aFirst !== bFirst) return aFirst - bFirst
      const aBeat = a.appliesFrom?.beatIndex ?? 0
      const bBeat = b.appliesFrom?.beatIndex ?? 0
      return aBeat - bBeat
    })

    return NextResponse.json({
      suggestions,
      analysis,
      analyzedScenes: scenes.length,
    })
  } catch (error: any) {
    console.error('[Location Version Suggestion] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze script for location versions' },
      { status: 500 }
    )
  }
}
