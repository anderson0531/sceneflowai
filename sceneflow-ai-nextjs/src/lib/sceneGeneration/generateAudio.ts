/**
 * Pure (no DB writes) helper that produces all audio assets for a single
 * scene: narration, dialogue, music, and SFX.
 *
 * Lifted from the per-scene loop body of
 * `[api/vision/generate-all-audio/route.ts]`. Internal calls pass
 * `skipDbUpdate: true` to the per-scene audio route so this helper can be
 * driven from any caller (the per-scene route, the batch route, or the
 * Storyboard Express orchestrator) without racing on `project.update`.
 */

import { optimizeTextForTTS } from '../../lib/tts/textOptimizer'
import { toCanonicalName, generateAliases } from '../../lib/character/canonical'
import { resolveSfxDuration } from '../../lib/elevenlabs/sfxDuration'
import type { SceneAudioAsset, SceneAudioCounts, SceneAudioResult } from './types'

export interface GenerateSceneAudioParams {
  projectId: string
  sceneIndex: number
  scene: any
  characters: any[]
  narrationVoice: any
  /** Locale of dialog/narration ('en' by default). */
  language?: string
  /** Pre-translated narration/dialogue map keyed by sceneIndex. */
  storedTranslations?: Record<number, { narration?: string; dialogue?: string[] }>
  includeMusic?: boolean
  includeSFX?: boolean
  /** Existing SFX URLs (by index) to preserve when regenerating. */
  existingSfxAudio?: string[]
  /** Base URL for internal fetches (e.g. `http://localhost:3000`). */
  baseUrl: string
  /** Forward the inbound auth cookie so internal SFX charges find the user. */
  authCookie?: string
}

function findParentSegmentDurationSeconds(
  scene: any,
  sfxIdx: number,
  sfxId?: string
): number | undefined {
  const segments = Array.isArray(scene?.segments) ? scene.segments : null
  if (!segments) return undefined
  for (const seg of segments) {
    if (!seg || !Array.isArray(seg.sfx)) continue
    const match = seg.sfx.find((s: any) => {
      if (sfxId && s?.sfxId === sfxId) return true
      if (typeof s?.legacyIndex === 'number' && s.legacyIndex === sfxIdx) return true
      return false
    })
    if (match) {
      const start = typeof seg.startTime === 'number' ? seg.startTime : 0
      const end = typeof seg.endTime === 'number' ? seg.endTime : 0
      const dur = end - start
      return dur > 0 ? dur : undefined
    }
  }
  return undefined
}

async function generateMusicForScene(
  scene: any,
  projectId: string,
  sceneIdx: number,
  baseUrl: string
): Promise<string | null> {
  try {
    const description =
      typeof scene.music === 'string' ? scene.music : scene.music?.description
    if (!description) return null

    const musicResponse = await fetch(`${baseUrl}/api/tts/google/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: description,
        duration: 30,
        saveToBlob: true,
        projectId,
        sceneId: `scene-${sceneIdx}`,
      }),
    })

    if (!musicResponse.ok) return null
    const result = await musicResponse.json()
    return result?.url ?? null
  } catch (error: any) {
    console.error(
      `[generateSceneAudio] Music generation failed for scene ${sceneIdx + 1}:`,
      error?.message || String(error)
    )
    return null
  }
}

async function generateSfxForCue(
  scene: any,
  projectId: string,
  sceneIdx: number,
  sfxIdx: number,
  baseUrl: string,
  authCookie?: string
): Promise<string | null> {
  try {
    const cue = Array.isArray(scene?.sfx) ? scene.sfx[sfxIdx] : null
    const description: string =
      typeof cue === 'string'
        ? cue
        : (cue?.description || cue?.label || cue?.tag || '').toString()
    if (!description.trim()) return null

    const sfxId: string | undefined =
      typeof cue === 'object' && cue && typeof cue.sfxId === 'string'
        ? cue.sfxId
        : undefined
    const segmentDurationSeconds = findParentSegmentDurationSeconds(
      scene,
      sfxIdx,
      sfxId
    )
    const durationSeconds = resolveSfxDuration({
      segmentDurationSeconds,
      override: 'auto',
    })

    const response = await fetch(`${baseUrl}/api/tts/elevenlabs/sound-effects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authCookie ? { Cookie: authCookie } : {}),
      },
      body: JSON.stringify({
        projectId,
        sfxId,
        sfxIndex: sfxIdx,
        text: description,
        durationSeconds,
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data?.url ?? null
  } catch (error: any) {
    console.error(
      `[generateSceneAudio] SFX generation error for scene ${sceneIdx + 1} cue ${sfxIdx + 1}:`,
      error?.message || String(error)
    )
    return null
  }
}

/**
 * Generate every audio asset attached to a single scene.
 *
 * Returns a flat list of `SceneAudioAsset` objects + counts; the caller is
 * responsible for merging them back into the scene shape (see
 * `applyAudioAssetsToScene`).
 */
export async function generateSceneAudio(
  params: GenerateSceneAudioParams
): Promise<SceneAudioResult> {
  const {
    projectId,
    sceneIndex,
    scene,
    characters,
    narrationVoice,
    language = 'en',
    storedTranslations = {},
    includeMusic = false,
    includeSFX = false,
    baseUrl,
    authCookie,
  } = params

  const assets: SceneAudioAsset[] = []
  const counts: SceneAudioCounts = {
    narration: 0,
    dialogue: 0,
    music: 0,
    sfx: 0,
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authCookie ? { Cookie: authCookie } : {}),
  }

  // 1. Narration
  if (scene?.narration && narrationVoice) {
    const sceneTranslation = storedTranslations?.[sceneIndex]
    const storedNarration = sceneTranslation?.narration
    const narrationText = storedNarration || scene.narration
    const optimized = optimizeTextForTTS(narrationText)

    try {
      const res = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          sceneIndex,
          audioType: 'narration',
          text: optimized.text,
          voiceConfig: narrationVoice,
          language,
          skipTranslation: !!storedNarration,
          skipDbUpdate: true,
        }),
      })
      const data = await res.json().catch(() => null as any)
      if (data?.success && data.audioUrl) {
        assets.push({
          audioType: 'narration',
          audioUrl: data.audioUrl,
          durationSeconds: data.duration ?? null,
          voiceId: narrationVoice?.voiceId ?? null,
          voiceProvider: narrationVoice?.provider ?? null,
        })
        counts.narration += 1
      }
    } catch (error: any) {
      console.error(
        `[generateSceneAudio] Narration failed for scene ${sceneIndex + 1}:`,
        error?.message || String(error)
      )
    }
  }

  // 2. Dialogue (per-line)
  if (Array.isArray(scene?.dialogue) && scene.dialogue.length > 0) {
    const dialogueTasks = scene.dialogue.map(
      async (dialogueLine: any, dialogueIndex: number) => {
        let character = dialogueLine.characterId
          ? characters.find((c: any) => c.id === dialogueLine.characterId)
          : null

        if (!character && dialogueLine.character) {
          const canonicalSearchName = toCanonicalName(dialogueLine.character)
          character = characters.find(
            (c: any) =>
              c.id === dialogueLine.characterId ||
              toCanonicalName(c.name) === canonicalSearchName ||
              generateAliases(c.name).includes(canonicalSearchName)
          )
        }

        if (!character || !character.voiceConfig) {
          return null
        }

        const sceneTranslation = storedTranslations?.[sceneIndex]
        const storedDialogueLine = sceneTranslation?.dialogue?.[dialogueIndex]
        const dialogueText = storedDialogueLine || dialogueLine.line
        const optimized = optimizeTextForTTS(dialogueText)

        try {
          const res = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              projectId,
              sceneIndex,
              audioType: 'dialogue',
              text: optimized.text,
              voiceConfig: character.voiceConfig,
              characterName: character.name,
              dialogueIndex,
              lineId: dialogueLine.lineId,
              language,
              skipTranslation: !!storedDialogueLine,
              skipDbUpdate: true,
            }),
          })
          const data = await res.json().catch(() => null as any)
          if (data?.success && data.audioUrl) {
            return {
              dialogueIndex,
              lineId: dialogueLine.lineId,
              character: character.name,
              audioUrl: data.audioUrl,
              durationSeconds: data.duration ?? null,
              voiceId: character.voiceConfig.voiceId ?? null,
              voiceProvider: character.voiceConfig.provider ?? null,
            }
          }
        } catch (error: any) {
          console.error(
            `[generateSceneAudio] Dialogue failed for scene ${sceneIndex + 1} line ${dialogueIndex}:`,
            error?.message || String(error)
          )
        }
        return null
      }
    )
    const dialogueResults = await Promise.all(dialogueTasks)
    for (const r of dialogueResults) {
      if (!r) continue
      assets.push({
        audioType: 'dialogue',
        dialogueIndex: r.dialogueIndex,
        lineId: r.lineId,
        character: r.character,
        audioUrl: r.audioUrl,
        durationSeconds: r.durationSeconds,
        voiceId: r.voiceId,
        voiceProvider: r.voiceProvider,
      })
      counts.dialogue += 1
    }
  }

  // 3. Music
  if (includeMusic && scene?.music && !scene.musicAudio) {
    const musicUrl = await generateMusicForScene(scene, projectId, sceneIndex, baseUrl)
    if (musicUrl) {
      assets.push({ audioType: 'music', audioUrl: musicUrl })
      counts.music += 1
    }
  }

  // 4. SFX (per-cue)
  if (includeSFX && Array.isArray(scene?.sfx) && scene.sfx.length > 0) {
    const existing = Array.isArray(params.existingSfxAudio)
      ? params.existingSfxAudio
      : Array.isArray(scene.sfxAudio)
      ? (scene.sfxAudio as string[])
      : []
    for (let sfxIdx = 0; sfxIdx < scene.sfx.length; sfxIdx++) {
      if (existing[sfxIdx]) continue
      const sfxUrl = await generateSfxForCue(
        scene,
        projectId,
        sceneIndex,
        sfxIdx,
        baseUrl,
        authCookie
      )
      if (sfxUrl) {
        assets.push({
          audioType: 'sfx',
          sfxIndex: sfxIdx,
          audioUrl: sfxUrl,
        })
        counts.sfx += 1
      }
    }
  }

  return { assets, counts }
}

/**
 * Mutates a scene object in-place, applying the audio assets returned by
 * `generateSceneAudio` so the resulting scene has populated
 * narrationAudio / dialogueAudio / musicAudio / sfxAudio fields ready to be
 * persisted to the project metadata.
 */
export function applyAudioAssetsToScene(
  scene: any,
  language: string,
  result: SceneAudioResult
): void {
  if (!scene || !result?.assets) return

  for (const asset of result.assets) {
    if (asset.audioType === 'narration') {
      scene.narrationAudio = scene.narrationAudio || {}
      scene.narrationAudio[language] = {
        url: asset.audioUrl,
        duration: asset.durationSeconds || 0,
        generatedAt: new Date().toISOString(),
        voiceId: asset.voiceId,
      }
    } else if (asset.audioType === 'dialogue') {
      scene.dialogueAudio = scene.dialogueAudio || {}
      scene.dialogueAudio[language] = scene.dialogueAudio[language] || []
      const arr: any[] = scene.dialogueAudio[language]
      const idx = asset.dialogueIndex ?? 0
      while (arr.length <= idx) arr.push(null)
      arr[idx] = {
        audioUrl: asset.audioUrl,
        duration: asset.durationSeconds || 0,
        character: asset.character || null,
        generatedAt: new Date().toISOString(),
        voiceId: asset.voiceId,
        lineId: asset.lineId,
      }
    } else if (asset.audioType === 'music') {
      scene.musicAudio = asset.audioUrl
    } else if (asset.audioType === 'sfx') {
      const existing = Array.isArray(scene.sfxAudio) ? [...scene.sfxAudio] : []
      const idx = asset.sfxIndex ?? 0
      while (existing.length <= idx) existing.push(null as any)
      existing[idx] = asset.audioUrl
      scene.sfxAudio = existing
      if (
        Array.isArray(scene.sfx) &&
        typeof scene.sfx[idx] === 'object' &&
        scene.sfx[idx]
      ) {
        scene.sfx[idx].audioUrl = asset.audioUrl
      }
    }
  }
}
