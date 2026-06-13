/**
 * Audio cleanup utilities for scene edits
 * 
 * When scene content (dialogue, narration, description) changes,
 * the associated audio files become stale and should be cleared.
 */

import { mergeScenePreservingMedia } from '@/lib/storyboard/mergeSceneMedia'
import { stripGhostStandaloneNarration } from '@/lib/script/narration'
import { coerceSceneSfxFlatArray } from '@/lib/script/segmentScript'

export type PreserveElement =
  | 'dialogueBeats'
  | 'actionBeats'
  | 'music'
  | 'sceneDirection'
  | 'beatFrames'

/** Legacy values accepted by revise-scene / older clients. */
export type LegacyPreserveElement = 'narration' | 'dialogue' | 'sfx'

export type PreserveElementInput = PreserveElement | LegacyPreserveElement

/** Map legacy preserve flags to the new category model. */
export function normalizePreserveElements(
  elements: PreserveElementInput[] = []
): PreserveElement[] {
  const out = new Set<PreserveElement>()
  for (const el of elements) {
    switch (el) {
      case 'dialogue':
      case 'dialogueBeats':
        out.add('dialogueBeats')
        break
      case 'sfx':
      case 'actionBeats':
        out.add('actionBeats')
        break
      case 'music':
        out.add('music')
        break
      case 'sceneDirection':
        out.add('sceneDirection')
        break
      case 'beatFrames':
        out.add('beatFrames')
        break
      case 'narration':
        break
    }
  }
  return [...out]
}

function preservesLegacyNarration(elements: PreserveElementInput[]): boolean {
  return elements.includes('narration')
}

/** Scene-level fields that store generated audio references. */
export const SCENE_AUDIO_FIELD_KEYS = [
  'dialogueAudio',
  'narrationAudio',
  'narrationAudioUrl',
  'narrationDuration',
  'narrationAudioGeneratedAt',
  'descriptionAudio',
  'descriptionAudioUrl',
  'descriptionDuration',
  'descriptionAudioGeneratedAt',
  'musicAudio',
  'musicUrl',
  'musicDuration',
  'sfxAudio',
  'sfxSourceMeta',
  'dialogueAudioGeneratedAt',
] as const

const SFX_AUDIO_FIELD_KEYS = ['sfxAudio', 'sfxSourceMeta'] as const

function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls.filter((url) => url && typeof url === 'string'))]
}

/** Normalize scene music spec for change detection. */
export function normalizeMusicSpec(music: unknown): string {
  if (!music) return ''
  if (typeof music === 'string') return music.trim()
  if (typeof music === 'object' && music !== null) {
    const description = (music as { description?: unknown }).description
    return typeof description === 'string' ? description.trim() : ''
  }
  return ''
}

/** Ordered SFX cue descriptions for display / prompt serialization. */
export function normalizeSfxSpecsOrdered(sfx: unknown): string[] {
  return coerceSceneSfxFlatArray(sfx)
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        return String(
          (item as { description?: unknown; text?: unknown; name?: unknown }).description ??
            (item as { text?: unknown }).text ??
            (item as { name?: unknown }).name ??
            ''
        ).trim()
      }
      return ''
    })
    .filter(Boolean)
}

/** Sorted SFX descriptions for multiset comparison. */
export function normalizeSfxSpecs(sfx: unknown): string[] {
  return [...normalizeSfxSpecsOrdered(sfx)].sort()
}

export function formatMusicForPrompt(music: unknown): string {
  const spec = normalizeMusicSpec(music)
  return spec || 'No music specified'
}

export function formatSfxForPrompt(sfx: unknown): string {
  const specs = normalizeSfxSpecsOrdered(sfx)
  return specs.length > 0 ? specs.join(', ') : 'No sound effects'
}

function collectNarrationAudioUrls(scene: any, target: string[]): void {
  if (scene?.narrationAudio && typeof scene.narrationAudio === 'object') {
    for (const langAudio of Object.values(scene.narrationAudio)) {
      if ((langAudio as { url?: string })?.url) target.push((langAudio as { url: string }).url)
    }
  }
  if (scene?.narrationAudioUrl && !target.includes(scene.narrationAudioUrl)) {
    target.push(scene.narrationAudioUrl)
  }
}

function collectDescriptionAudioUrls(scene: any, target: string[]): void {
  if (scene?.descriptionAudio && typeof scene.descriptionAudio === 'object') {
    for (const langAudio of Object.values(scene.descriptionAudio)) {
      if ((langAudio as { url?: string })?.url) target.push((langAudio as { url: string }).url)
    }
  }
  if (scene?.descriptionAudioUrl && !target.includes(scene.descriptionAudioUrl)) {
    target.push(scene.descriptionAudioUrl)
  }
}

function collectMusicAudioUrls(scene: any, target: string[]): void {
  if (scene?.musicAudio) target.push(scene.musicAudio)
  if (scene?.music?.url) target.push(scene.music.url)
  if (scene?.musicUrl && !target.includes(scene.musicUrl)) target.push(scene.musicUrl)
}

function collectSfxAudioUrls(scene: any, target: string[]): void {
  if (Array.isArray(scene?.sfxAudio)) {
    for (const sfxUrl of scene.sfxAudio) {
      if (sfxUrl) target.push(sfxUrl)
    }
  }
  for (const item of coerceSceneSfxFlatArray(scene?.sfx)) {
    if (item && typeof item === 'object' && (item as { audioUrl?: string }).audioUrl) {
      target.push((item as { audioUrl: string }).audioUrl)
    }
  }
}

function copyNarrationAudioFields(from: any, to: any): void {
  if (from?.narrationAudio !== undefined) to.narrationAudio = from.narrationAudio
  else delete to.narrationAudio
  if (from?.narrationAudioUrl !== undefined) to.narrationAudioUrl = from.narrationAudioUrl
  else delete to.narrationAudioUrl
  if (from?.narrationDuration !== undefined) to.narrationDuration = from.narrationDuration
  else delete to.narrationDuration
  if (from?.narrationAudioGeneratedAt !== undefined) {
    to.narrationAudioGeneratedAt = from.narrationAudioGeneratedAt
  } else {
    delete to.narrationAudioGeneratedAt
  }
}

function copyDescriptionAudioFields(from: any, to: any): void {
  if (from?.descriptionAudio !== undefined) to.descriptionAudio = from.descriptionAudio
  else delete to.descriptionAudio
  if (from?.descriptionAudioUrl !== undefined) to.descriptionAudioUrl = from.descriptionAudioUrl
  else delete to.descriptionAudioUrl
  if (from?.descriptionDuration !== undefined) to.descriptionDuration = from.descriptionDuration
  else delete to.descriptionDuration
  if (from?.descriptionAudioGeneratedAt !== undefined) {
    to.descriptionAudioGeneratedAt = from.descriptionAudioGeneratedAt
  } else {
    delete to.descriptionAudioGeneratedAt
  }
}

function copyMusicAudioFields(from: any, to: any): void {
  if (from?.musicAudio !== undefined) to.musicAudio = from.musicAudio
  else delete to.musicAudio
  if (from?.musicUrl !== undefined) to.musicUrl = from.musicUrl
  else delete to.musicUrl
  if (from?.musicDuration !== undefined) to.musicDuration = from.musicDuration
  else delete to.musicDuration
  if (from?.music && typeof from.music === 'object') {
    to.music = { ...(typeof to.music === 'object' && to.music ? to.music : {}), ...from.music }
  }
}

function copySfxAudioFields(from: any, to: any): void {
  for (const key of SFX_AUDIO_FIELD_KEYS) {
    if (from?.[key] !== undefined) to[key] = from[key]
    else delete to[key]
  }
  if (Array.isArray(from?.sfx) && Array.isArray(to?.sfx)) {
    to.sfx = to.sfx.map((item: any, idx: number) => {
      const originalItem = from.sfx[idx]
      if (!originalItem || typeof originalItem !== 'object') return item
      if (typeof item === 'string') {
        return originalItem.audioUrl
          ? { description: item, audioUrl: originalItem.audioUrl, ...(originalItem.audioDuration != null ? { audioDuration: originalItem.audioDuration } : {}) }
          : item
      }
      if (item && typeof item === 'object' && originalItem.audioUrl) {
        return { ...item, audioUrl: originalItem.audioUrl, ...(originalItem.audioDuration != null ? { audioDuration: originalItem.audioDuration } : {}) }
      }
      return item
    })
  }
}

function remapSfxAudioByDescription(originalScene: any, scene: any): void {
  const originalSpecs = normalizeSfxSpecsOrdered(originalScene?.sfx)
  const revisedSpecs = normalizeSfxSpecsOrdered(scene?.sfx)
  if (originalSpecs.join('\0') === revisedSpecs.join('\0')) {
    copySfxAudioFields(originalScene, scene)
    return
  }

  const originalItems = coerceSceneSfxFlatArray(originalScene?.sfx)
  const lookup = new Map<string, { url?: string; meta?: unknown; audioUrl?: string }>()
  const sfxAudio = Array.isArray(originalScene?.sfxAudio) ? originalScene.sfxAudio : []
  const sfxSourceMeta = Array.isArray(originalScene?.sfxSourceMeta) ? originalScene.sfxSourceMeta : []

  originalItems.forEach((item, idx) => {
    const description =
      typeof item === 'string'
        ? item.trim()
        : String((item as { description?: unknown; text?: unknown; name?: unknown }).description ?? (item as { text?: unknown }).text ?? (item as { name?: unknown }).name ?? '').trim()
    if (!description) return
    lookup.set(description, {
      url: typeof sfxAudio[idx] === 'string' ? sfxAudio[idx] : undefined,
      meta: sfxSourceMeta[idx],
      audioUrl: item && typeof item === 'object' ? (item as { audioUrl?: string }).audioUrl : undefined,
    })
  })

  const nextSfxAudio: Array<string | null> = []
  const nextSfxSourceMeta: unknown[] = []
  const nextSfx = coerceSceneSfxFlatArray(scene?.sfx).map((item, idx) => {
    const description =
      typeof item === 'string'
        ? item.trim()
        : String((item as { description?: unknown; text?: unknown; name?: unknown }).description ?? (item as { text?: unknown }).text ?? (item as { name?: unknown }).name ?? '').trim()
    const bundle = lookup.get(description)
    nextSfxAudio[idx] = bundle?.url ?? null
    nextSfxSourceMeta[idx] = bundle?.meta ?? null
    if (typeof item === 'string') {
      return bundle?.audioUrl ? { description: item, audioUrl: bundle.audioUrl } : item
    }
    if (item && typeof item === 'object' && bundle?.audioUrl) {
      return { ...item, audioUrl: bundle.audioUrl }
    }
    return item
  })

  scene.sfx = nextSfx
  scene.sfxAudio = nextSfxAudio
  scene.sfxSourceMeta = nextSfxSourceMeta
}

function clearNarrationAudioFields(scene: any): void {
  delete scene.narrationAudio
  delete scene.narrationAudioUrl
  delete scene.narrationDuration
  delete scene.narrationAudioGeneratedAt
}

function clearDescriptionAudioFields(scene: any): void {
  delete scene.descriptionAudio
  delete scene.descriptionAudioUrl
  delete scene.descriptionDuration
  delete scene.descriptionAudioGeneratedAt
}

function clearMusicAudioFields(scene: any): void {
  delete scene.musicAudio
  delete scene.musicUrl
  delete scene.musicDuration
  if (scene.music && typeof scene.music === 'object') {
    delete scene.music.url
  }
}

function clearSfxAudioFields(scene: any): void {
  for (const key of SFX_AUDIO_FIELD_KEYS) delete scene[key]
  if (Array.isArray(scene.sfx)) {
    scene.sfx = scene.sfx.map((item: any) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const { audioUrl, audioDuration, ...rest } = item
        return rest
      }
      return item
    })
  }
}

function copyDialogueAudioBundle(from: any, to: any): void {
  if (from?.dialogueAudio !== undefined) to.dialogueAudio = from.dialogueAudio
  else delete to.dialogueAudio
  if (from?.dialogueAudioGeneratedAt !== undefined) {
    to.dialogueAudioGeneratedAt = from.dialogueAudioGeneratedAt
  } else {
    delete to.dialogueAudioGeneratedAt
  }
  if (Array.isArray(from?.dialogue) && Array.isArray(to?.dialogue)) {
    to.dialogue = to.dialogue.map((line: any, idx: number) => {
      const originalLine = from.dialogue[idx]
      if (!originalLine) return line
      const next = { ...line }
      if (originalLine.audioUrl) next.audioUrl = originalLine.audioUrl
      else delete next.audioUrl
      if (originalLine.url) next.url = originalLine.url
      else delete next.url
      if (originalLine.audioDuration != null) next.audioDuration = originalLine.audioDuration
      else delete next.audioDuration
      return next
    })
  }
}

function filterStaleDialogueAudio(originalScene: any, scene: any, deletedUrls: string[]): void {
  const originalDialogueLines = (originalScene?.dialogue || []).map((d: any) => ({
    character: d.character,
    line: d.line || d.text || '',
  }))
  const revisedDialogueLines = (scene.dialogue || []).map((d: any) => ({
    character: d.character,
    line: d.line || d.text || '',
  }))

  if (!originalScene?.dialogueAudio) {
    if (Array.isArray(scene.dialogue)) {
      scene.dialogue = scene.dialogue.map((line: any) => {
        if (!line?.audioUrl && !line?.url) return line
        if (line.audioUrl) deletedUrls.push(line.audioUrl)
        if (line.url) deletedUrls.push(line.url)
        const { audioUrl, url, audioDuration, ...rest } = line
        return rest
      })
    }
    return
  }

  if (typeof originalScene.dialogueAudio === 'object' && !Array.isArray(originalScene.dialogueAudio)) {
    scene.dialogueAudio = {}
    for (const [language, audioArray] of Object.entries(originalScene.dialogueAudio)) {
      if (!Array.isArray(audioArray)) continue
      const keptAudio: any[] = []
      for (const audio of audioArray as any[]) {
        const dialogueIdx = audio.dialogueIndex
        const originalLine = originalDialogueLines[dialogueIdx]
        const revisedLine = revisedDialogueLines[dialogueIdx]
        const shouldKeep =
          revisedLine &&
          originalLine &&
          revisedLine.character === audio.character &&
          originalLine.line === revisedLine.line
        if (shouldKeep) {
          keptAudio.push(audio)
        } else if (audio.audioUrl) {
          deletedUrls.push(audio.audioUrl)
        }
      }
      if (keptAudio.length > 0) scene.dialogueAudio[language] = keptAudio
    }
    if (Object.keys(scene.dialogueAudio).length === 0) delete scene.dialogueAudio
  } else if (Array.isArray(originalScene.dialogueAudio)) {
    const keptAudio: any[] = []
    for (const audio of originalScene.dialogueAudio) {
      const dialogueIdx = audio.dialogueIndex
      const originalLine = originalDialogueLines[dialogueIdx]
      const revisedLine = revisedDialogueLines[dialogueIdx]
      const shouldKeep =
        revisedLine &&
        originalLine &&
        revisedLine.character === audio.character &&
        originalLine.line === revisedLine.line
      if (shouldKeep) keptAudio.push(audio)
      else if (audio.audioUrl) deletedUrls.push(audio.audioUrl)
    }
    if (keptAudio.length > 0) scene.dialogueAudio = keptAudio
    else delete scene.dialogueAudio
  }

  if (Array.isArray(scene.dialogue)) {
    scene.dialogue = scene.dialogue.map((line: any, idx: number) => {
      const originalLine = originalDialogueLines[idx]
      const revisedLine = revisedDialogueLines[idx]
      const shouldKeep =
        revisedLine &&
        originalLine &&
        revisedLine.character === originalLine.character &&
        revisedLine.line === originalLine.line
      if (shouldKeep && originalScene.dialogue?.[idx]) {
        const source = originalScene.dialogue[idx]
        return {
          ...line,
          ...(source.audioUrl ? { audioUrl: source.audioUrl } : {}),
          ...(source.url ? { url: source.url } : {}),
          ...(source.audioDuration != null ? { audioDuration: source.audioDuration } : {}),
        }
      }
      const next = { ...line }
      if (next.audioUrl) {
        if (!deletedUrls.includes(next.audioUrl)) deletedUrls.push(next.audioUrl)
        delete next.audioUrl
      }
      if (next.url) {
        if (!deletedUrls.includes(next.url)) deletedUrls.push(next.url)
        delete next.url
      }
      delete next.audioDuration
      return next
    })
  }
}

/** Copy generated audio fields from original when preserve flags are set (API belt-and-suspenders). */
export function copyPreservedSceneAudioFields(
  originalScene: any,
  scene: any,
  preserveElements: PreserveElementInput[] = []
): any {
  const preserve = new Set(normalizePreserveElements(preserveElements))
  const next = { ...scene }
  if (preservesLegacyNarration(preserveElements)) copyNarrationAudioFields(originalScene, next)
  if (preserve.has('dialogueBeats')) copyDialogueAudioBundle(originalScene, next)
  if (preserve.has('music')) copyMusicAudioFields(originalScene, next)
  if (preserve.has('actionBeats')) copySfxAudioFields(originalScene, next)
  return next
}

/**
 * Apply selective audio invalidation after a scene edit.
 * Keeps generated audio when the element spec is unchanged or explicitly preserved.
 */
export function applySceneEditAudioPolicy(
  originalScene: any,
  revisedScene: any,
  preserveElements: PreserveElementInput[] = []
): CleanupResult {
  const preserve = new Set(normalizePreserveElements(preserveElements))
  const scene = { ...originalScene, ...revisedScene }
  const deletedUrls: string[] = []

  if (preservesLegacyNarration(preserveElements)) scene.narration = originalScene?.narration
  if (preserve.has('dialogueBeats')) scene.dialogue = originalScene?.dialogue
  if (preserve.has('music')) scene.music = originalScene?.music
  if (preserve.has('actionBeats')) scene.sfx = originalScene?.sfx

  const narrationChanged =
    String(originalScene?.narration ?? '').trim() !== String(scene.narration ?? '').trim()
  if (preservesLegacyNarration(preserveElements) || !narrationChanged) {
    copyNarrationAudioFields(originalScene, scene)
  } else {
    collectNarrationAudioUrls(originalScene, deletedUrls)
    clearNarrationAudioFields(scene)
  }

  const originalDescription = originalScene?.description || originalScene?.action || ''
  const revisedDescription = scene.description || scene.action || ''
  const actionBeatsPreserved = preserve.has('actionBeats')
  if (actionBeatsPreserved) {
    scene.action = originalScene?.action
    scene.visualDescription = originalScene?.visualDescription
    if (originalScene?.description !== undefined) scene.description = originalScene.description
    copyDescriptionAudioFields(originalScene, scene)
  } else if (originalDescription !== revisedDescription) {
    collectDescriptionAudioUrls(originalScene, deletedUrls)
    clearDescriptionAudioFields(scene)
  } else {
    copyDescriptionAudioFields(originalScene, scene)
  }

  if (preserve.has('dialogueBeats')) {
    copyDialogueAudioBundle(originalScene, scene)
  } else {
    filterStaleDialogueAudio(originalScene, scene, deletedUrls)
  }

  const musicChanged = normalizeMusicSpec(originalScene?.music) !== normalizeMusicSpec(scene.music)
  if (preserve.has('music') || !musicChanged) {
    copyMusicAudioFields(originalScene, scene)
  } else {
    collectMusicAudioUrls(originalScene, deletedUrls)
    clearMusicAudioFields(scene)
  }

  const sfxSpecsChanged =
    normalizeSfxSpecs(originalScene?.sfx).join('\0') !== normalizeSfxSpecs(scene.sfx).join('\0')
  const sfxOrderChanged =
    normalizeSfxSpecsOrdered(originalScene?.sfx).join('\0') !==
    normalizeSfxSpecsOrdered(scene.sfx).join('\0')
  if (actionBeatsPreserved || !sfxSpecsChanged) {
    if (actionBeatsPreserved || !sfxOrderChanged) {
      copySfxAudioFields(originalScene, scene)
    } else {
      remapSfxAudioByDescription(originalScene, scene)
    }
  } else {
    collectSfxAudioUrls(originalScene, deletedUrls)
    clearSfxAudioFields(scene)
  }

  return { cleanedScene: scene, deletedUrls: dedupeUrls(deletedUrls) }
}

/**
 * Result type for cleanupStaleAudio with URLs for deletion
 */
export interface CleanupResult {
  cleanedScene: any
  deletedUrls: string[]
}

/** True when the scene object references any generated audio URL. */
export function sceneHasAudioRefs(scene: any): boolean {
  if (!scene || typeof scene !== 'object') return false
  if (scene.narrationAudioUrl || scene.descriptionAudioUrl || scene.musicAudio || scene.musicUrl) {
    return true
  }
  if (scene.narrationAudio && typeof scene.narrationAudio === 'object') {
    for (const v of Object.values(scene.narrationAudio)) {
      if ((v as any)?.url) return true
    }
  }
  if (scene.descriptionAudio && typeof scene.descriptionAudio === 'object') {
    for (const v of Object.values(scene.descriptionAudio)) {
      if ((v as any)?.url) return true
    }
  }
  const da = scene.dialogueAudio
  if (Array.isArray(da)) {
    return da.some((d: any) => d?.audioUrl || d?.url)
  }
  if (da && typeof da === 'object') {
    for (const arr of Object.values(da)) {
      if (Array.isArray(arr) && arr.some((d: any) => d?.audioUrl || d?.url)) return true
    }
  }
  if (Array.isArray(scene.dialogue)) {
    return scene.dialogue.some((d: any) => d?.audioUrl || d?.url)
  }
  return false
}

/**
 * Overlay incoming scene edits while keeping audio references from the canonical scene.
 */
export function mergeScenePreservingAudio(canonical: any, incoming: any): any {
  if (!canonical) return incoming
  if (!incoming) return canonical

  const merged: any = { ...incoming }
  for (const key of SCENE_AUDIO_FIELD_KEYS) {
    if (key in canonical) {
      merged[key] = canonical[key]
    } else {
      delete merged[key]
    }
  }

  if (Array.isArray(canonical.dialogue) && Array.isArray(incoming.dialogue)) {
    merged.dialogue = incoming.dialogue.map((line: any, i: number) => {
      const canonLine = canonical.dialogue[i]
      if (!canonLine) return line
      const next = { ...line }
      if (canonLine.audioUrl) next.audioUrl = canonLine.audioUrl
      else delete next.audioUrl
      if (canonLine.url) next.url = canonLine.url
      else delete next.url
      if (canonLine.audioDuration != null) next.audioDuration = canonLine.audioDuration
      else delete next.audioDuration
      return next
    })
  }

  return merged
}

/**
 * Merge incoming scenes onto canonical scenes for persistence.
 * Prevents stale client snapshots from restoring deleted audio URLs.
 */
export function mergeScenesForScriptSave(
  canonicalScenes: any[],
  incomingScenes: any[],
  options?: { preserveAudio?: boolean }
): any[] {
  const preserveAudio = options?.preserveAudio ?? false
  const maxLen = Math.max(canonicalScenes.length, incomingScenes.length)
  const merged: any[] = []

  for (let idx = 0; idx < maxLen; idx++) {
    const canonical = canonicalScenes[idx]
    const incoming = incomingScenes[idx]
    if (!incoming) {
      if (canonical) merged.push(canonical)
      continue
    }
    if (!canonical) {
      merged.push(incoming)
      continue
    }

    if (preserveAudio) {
      merged.push(mergeScenePreservingMedia(canonical, mergeScenePreservingAudio(canonical, incoming)))
      continue
    }

    // Reject audio reversion: canonical cleared but stale incoming still has URLs
    if (!sceneHasAudioRefs(canonical) && sceneHasAudioRefs(incoming)) {
      merged.push(
        mergeScenePreservingMedia(canonical, mergeScenePreservingAudio(canonical, incoming))
      )
      continue
    }

    merged.push(mergeScenePreservingMedia(canonical, incoming))
  }

  return merged
}

/**
 * Remove a stale audio URL from a single scene (404 recovery).
 */
export function removeStaleAudioUrlFromScene(scene: any, staleUrl: string): { cleanedScene: any; changed: boolean } {
  const updatedScene = JSON.parse(JSON.stringify(scene))
  let changed = false

  if (updatedScene.narrationAudioUrl === staleUrl) {
    delete updatedScene.narrationAudioUrl
    changed = true
  }
  if (updatedScene.narrationAudio && typeof updatedScene.narrationAudio === 'object') {
    for (const lang of Object.keys(updatedScene.narrationAudio)) {
      if (updatedScene.narrationAudio[lang]?.url === staleUrl) {
        delete updatedScene.narrationAudio[lang]
        changed = true
      }
    }
    if (Object.keys(updatedScene.narrationAudio).length === 0) {
      delete updatedScene.narrationAudio
    }
  }

  if (updatedScene.descriptionAudioUrl === staleUrl) {
    delete updatedScene.descriptionAudioUrl
    changed = true
  }
  if (updatedScene.descriptionAudio && typeof updatedScene.descriptionAudio === 'object') {
    for (const lang of Object.keys(updatedScene.descriptionAudio)) {
      if (updatedScene.descriptionAudio[lang]?.url === staleUrl) {
        delete updatedScene.descriptionAudio[lang]
        changed = true
      }
    }
    if (Object.keys(updatedScene.descriptionAudio).length === 0) {
      delete updatedScene.descriptionAudio
    }
  }

  if (updatedScene.dialogueAudio) {
    for (const lang of Object.keys(updatedScene.dialogueAudio)) {
      const dialogueArray = updatedScene.dialogueAudio[lang]
      if (Array.isArray(dialogueArray)) {
        const filtered = dialogueArray.filter(
          (d: any) => d?.audioUrl !== staleUrl && d?.url !== staleUrl
        )
        if (filtered.length !== dialogueArray.length) {
          updatedScene.dialogueAudio[lang] = filtered
          changed = true
        }
      }
    }
  }

  if (Array.isArray(updatedScene.sfx)) {
    const filtered = updatedScene.sfx.filter((s: any) => s?.url !== staleUrl)
    if (filtered.length !== updatedScene.sfx.length) {
      updatedScene.sfx = filtered
      changed = true
    }
  }

  if (updatedScene.musicUrl === staleUrl) {
    delete updatedScene.musicUrl
    changed = true
  }
  if (updatedScene.musicAudio === staleUrl) {
    delete updatedScene.musicAudio
    changed = true
  }

  return { cleanedScene: updatedScene, changed }
}

/**
 * Compare two scenes and clean up stale audio from the revised scene
 * 
 * Clears audio when:
 * - Dialogue text changes
 * - Dialogue is removed
 * - Character changes for a dialogue line
 * - Narration text changes
 * - Description text changes
 * 
 * @returns Object with cleanedScene and deletedUrls (URLs of audio blobs to delete)
 */
export function cleanupStaleAudio(originalScene: any, revisedScene: any): CleanupResult {
  const cleanedScene = { ...revisedScene }
  const deletedUrls: string[] = []
  
  // Get dialogue lines from both scenes for comparison
  const originalDialogueLines = (originalScene?.dialogue || []).map((d: any, idx: number) => ({
    character: d.character,
    line: d.line || d.text || '',
    index: idx
  }))
  
  const revisedDialogueLines = (revisedScene.dialogue || []).map((d: any, idx: number) => ({
    character: d.character,
    line: d.line || d.text || '',
    index: idx
  }))

  // Check if narration text changed - if so, clear narration audio
  const originalNarration = originalScene?.narration || ''
  const revisedNarration = revisedScene.narration || ''
  if (originalNarration !== revisedNarration && originalScene?.narrationAudio) {
    // Collect URLs from all languages before deleting
    if (typeof originalScene.narrationAudio === 'object') {
      for (const langAudio of Object.values(originalScene.narrationAudio)) {
        if ((langAudio as any)?.url) {
          deletedUrls.push((langAudio as any).url)
        }
      }
    }
    if (originalScene.narrationAudioUrl) {
      // Only add if not already in deletedUrls (avoid duplicates with .en.url)
      if (!deletedUrls.includes(originalScene.narrationAudioUrl)) {
        deletedUrls.push(originalScene.narrationAudioUrl)
      }
    }
    delete cleanedScene.narrationAudio
    delete cleanedScene.narrationAudioUrl
  }
  
  // Check if description text changed - if so, clear description audio
  const originalDescription = originalScene?.description || originalScene?.action || ''
  const revisedDescription = revisedScene.description || revisedScene.action || ''
  if (originalDescription !== revisedDescription && originalScene?.descriptionAudio) {
    // Collect URLs from all languages before deleting
    if (typeof originalScene.descriptionAudio === 'object') {
      for (const langAudio of Object.values(originalScene.descriptionAudio)) {
        if ((langAudio as any)?.url) {
          deletedUrls.push((langAudio as any).url)
        }
      }
    }
    if (originalScene.descriptionAudioUrl) {
      if (!deletedUrls.includes(originalScene.descriptionAudioUrl)) {
        deletedUrls.push(originalScene.descriptionAudioUrl)
      }
    }
    delete cleanedScene.descriptionAudio
    delete cleanedScene.descriptionAudioUrl
  }

  // If no dialogue audio exists, we're done
  if (!originalScene?.dialogueAudio) {
    return { cleanedScene, deletedUrls }
  }

  // Handle multi-language audio format (object with language keys)
  if (typeof originalScene.dialogueAudio === 'object' && !Array.isArray(originalScene.dialogueAudio)) {
    cleanedScene.dialogueAudio = {}
    
    // Process each language
    for (const [language, audioArray] of Object.entries(originalScene.dialogueAudio)) {
      if (Array.isArray(audioArray)) {
        const keptAudio: any[] = []
        
        // Filter audio: keep only if character+index exists AND text hasn't changed
        for (const audio of audioArray as any[]) {
          const dialogueIdx = audio.dialogueIndex
          const originalLine = originalDialogueLines[dialogueIdx]
          const revisedLine = revisedDialogueLines[dialogueIdx]
          
          // Remove if: dialogue was removed, character changed, or text changed
          const shouldKeep = (
            revisedLine && 
            originalLine &&
            revisedLine.character === audio.character &&
            originalLine.line === revisedLine.line  // Text must match
          )
          
          if (shouldKeep) {
            keptAudio.push(audio)
          } else {
            // Collect URL for deletion
            if (audio.audioUrl) {
              deletedUrls.push(audio.audioUrl)
            }
          }
        }
        
        if (keptAudio.length > 0) {
          cleanedScene.dialogueAudio[language] = keptAudio
        }
      }
    }
    
    // Clean up empty dialogueAudio object
    if (Object.keys(cleanedScene.dialogueAudio).length === 0) {
      delete cleanedScene.dialogueAudio
    }
  }
  // Handle legacy array format
  else if (Array.isArray(originalScene.dialogueAudio)) {
    const keptAudio: any[] = []
    
    for (const audio of originalScene.dialogueAudio) {
      const dialogueIdx = audio.dialogueIndex
      const originalLine = originalDialogueLines[dialogueIdx]
      const revisedLine = revisedDialogueLines[dialogueIdx]
      
      const shouldKeep = (
        revisedLine && 
        originalLine &&
        revisedLine.character === audio.character &&
        originalLine.line === revisedLine.line
      )
      
      if (shouldKeep) {
        keptAudio.push(audio)
      } else {
        if (audio.audioUrl) {
          deletedUrls.push(audio.audioUrl)
        }
      }
    }
    
    if (keptAudio.length > 0) {
      cleanedScene.dialogueAudio = keptAudio
    } else {
      delete cleanedScene.dialogueAudio
    }
  }

  return { cleanedScene, deletedUrls }
}

/**
 * Clear ALL audio from a scene and return URLs for deletion
 * Use when you want to force audio regeneration
 */
export function clearAllSceneAudio(scene: any): CleanupResult {
  const cleanedScene = { ...scene }
  const deletedUrls: string[] = []
  
  // Collect URLs before deleting
  // Narration audio
  if (scene.narrationAudio && typeof scene.narrationAudio === 'object') {
    for (const langAudio of Object.values(scene.narrationAudio)) {
      if ((langAudio as any)?.url) deletedUrls.push((langAudio as any).url)
    }
  }
  if (scene.narrationAudioUrl && !deletedUrls.includes(scene.narrationAudioUrl)) {
    deletedUrls.push(scene.narrationAudioUrl)
  }
  
  // Description audio
  if (scene.descriptionAudio && typeof scene.descriptionAudio === 'object') {
    for (const langAudio of Object.values(scene.descriptionAudio)) {
      if ((langAudio as any)?.url) deletedUrls.push((langAudio as any).url)
    }
  }
  if (scene.descriptionAudioUrl && !deletedUrls.includes(scene.descriptionAudioUrl)) {
    deletedUrls.push(scene.descriptionAudioUrl)
  }
  
  // Dialogue audio - from dialogueAudio object
  if (scene.dialogueAudio) {
    if (typeof scene.dialogueAudio === 'object' && !Array.isArray(scene.dialogueAudio)) {
      for (const audioArray of Object.values(scene.dialogueAudio)) {
        if (Array.isArray(audioArray)) {
          for (const audio of audioArray) {
            if ((audio as any).audioUrl) deletedUrls.push((audio as any).audioUrl)
            if ((audio as any).url) deletedUrls.push((audio as any).url)
          }
        }
      }
    } else if (Array.isArray(scene.dialogueAudio)) {
      for (const audio of scene.dialogueAudio) {
        if (audio.audioUrl) deletedUrls.push(audio.audioUrl)
        if (audio.url) deletedUrls.push(audio.url)
      }
    }
  }
  
  // Dialogue audio - from individual dialogue items (scene.dialogue[].audioUrl)
  // Also clear the audioUrl from each dialogue item
  if (scene.dialogue && Array.isArray(scene.dialogue)) {
    cleanedScene.dialogue = scene.dialogue.map((d: any) => {
      if (d.audioUrl) deletedUrls.push(d.audioUrl)
      if (d.url) deletedUrls.push(d.url)
      // Return dialogue item without audio properties
      const { audioUrl, url, audioDuration, ...dialogueWithoutAudio } = d
      return dialogueWithoutAudio
    })
  }
  
  // Music audio
  if (scene.musicAudio) {
    deletedUrls.push(scene.musicAudio)
  }
  if (scene.music?.url) {
    deletedUrls.push(scene.music.url)
  }
  if (scene.musicUrl) {
    deletedUrls.push(scene.musicUrl)
  }
  
  // SFX audio - from sfxAudio array
  if (Array.isArray(scene.sfxAudio)) {
    for (const sfxUrl of scene.sfxAudio) {
      if (sfxUrl) deletedUrls.push(sfxUrl)
    }
  }
  
  // SFX audio - from sfx objects (sfx[n].audioUrl)
  if (Array.isArray(scene.sfx)) {
    cleanedScene.sfx = scene.sfx.map((sfx: any) => {
      if (sfx.audioUrl) deletedUrls.push(sfx.audioUrl)
      // Return sfx without audio properties
      const { audioUrl, audioDuration, ...sfxWithoutAudio } = (typeof sfx === 'string' ? { description: sfx } : sfx)
      return sfxWithoutAudio
    })
  }
  
  // Clear all audio fields
  delete cleanedScene.dialogueAudio
  delete cleanedScene.narrationAudio
  delete cleanedScene.narrationAudioUrl
  delete cleanedScene.narrationDuration
  delete cleanedScene.descriptionAudio
  delete cleanedScene.descriptionAudioUrl
  delete cleanedScene.descriptionDuration
  delete cleanedScene.musicAudio
  delete cleanedScene.musicUrl
  delete cleanedScene.musicDuration
  if (cleanedScene.music) {
    delete cleanedScene.music.url
  }
  delete cleanedScene.sfxAudio
  delete cleanedScene.dialogueAudioGeneratedAt
  
  // Dedupe URLs
  const uniqueUrls = [...new Set(deletedUrls.filter(url => url && typeof url === 'string'))]
  
  return { cleanedScene, deletedUrls: uniqueUrls }
}

/**
 * Result type for cleanupScriptAudio
 */
export interface ScriptCleanupResult {
  cleanedScenes: any[]
  deletedUrls: string[]
}

/**
 * Clean up stale audio from all scenes in a script
 */
export function cleanupScriptAudio(originalScenes: any[], revisedScenes: any[]): ScriptCleanupResult {
  const allDeletedUrls: string[] = []
  
  const cleanedScenes = revisedScenes.map((revisedScene, idx) => {
    const originalScene = originalScenes[idx]
    if (originalScene) {
      const { cleanedScene, deletedUrls } = cleanupStaleAudio(originalScene, revisedScene)
      allDeletedUrls.push(...deletedUrls)
      return cleanedScene
    }
    return revisedScene
  })
  
  return { cleanedScenes, deletedUrls: allDeletedUrls }
}

/**
 * Validates the audio data for a single scene and removes stale references.
 *
 * Removes ghost standalone narration: orphan `narrationAudio` when narration is
 * empty, duplicates visual/action, or narrator lines live in `scene.dialogue`.
 *
 * @param {any} scene - The scene object to validate and clean.
 * @returns {CleanupResult} - Object with the cleaned scene and a list of URLs for any deleted audio files.
 */
export function validateAndCleanSceneAudio(scene: any): CleanupResult {
  const { cleanedScene, deletedUrls } = stripGhostStandaloneNarration(scene)
  return { cleanedScene, deletedUrls }
}
