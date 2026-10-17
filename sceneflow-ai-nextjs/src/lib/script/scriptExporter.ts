/**
 * Script Export Utility
 *
 * Exports scripts from the Vision/Production Stage to industry-standard
 * screenplay and production formats including Final Draft (.fdx), Fountain (.fountain),
 * Markdown (.md), Plain Text (.txt), and JSON (.json), as well as structured data
 * for interactive preview and PDF/Print rendering.
 *
 * Includes:
 * - Characters & Wardrobe (cast descriptions, roles, default & scene/shot wardrobe looks)
 * - Chapter titles & descriptions (from Blueprint beats)
 * - Scene headings & scene descriptions
 * - Scene direction (location/set, atmosphere, props, camera, lighting, talent/blocking, audio)
 * - Shot direction (still/frozen moment, camera, cast in frame, blocking, emotion, lighting, audio, props)
 * - Shot dialogue, narration, and action
 */

import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import { formatSceneHeading } from '@/lib/script/formatSceneHeading'
import {
  chapterHeading,
  getBlueprintBeatGroup,
  resolveBlueprintBeatDescription,
  treatmentBeatsFromMetadata,
  type BlueprintBeatInput,
} from '@/lib/script/sceneDecomposition'

export type ExportScriptFormat =
  | 'pdf'
  | 'fdx'
  | 'fountain'
  | 'markdown'
  | 'text'
  | 'json'
  | 'direction'

export interface ExportScriptOptions {
  format: ExportScriptFormat
  includeTitle: boolean
  includeSceneNumbers: boolean
  includeCharacterList: boolean
  includeChapters: boolean
  includeSceneDescriptions: boolean
  includeSceneDirection: boolean
  includeShotDirection: boolean
  includeShotActionDialogue: boolean
  includeNotes: boolean
  includeDurations: boolean
}

export const DEFAULT_EXPORT_SCRIPT_OPTIONS: ExportScriptOptions = {
  format: 'fountain',
  includeTitle: true,
  includeSceneNumbers: true,
  includeCharacterList: true,
  includeChapters: true,
  includeSceneDescriptions: true,
  includeSceneDirection: true,
  includeShotDirection: true,
  includeShotActionDialogue: true,
  includeNotes: true,
  includeDurations: true,
}

export interface ExportWardrobeItem {
  id?: string
  name: string
  description?: string
  accessories?: string
  appearanceNotes?: string
  isDefault?: boolean
  sceneNumbers?: number[]
}

export interface ExportCharacterItem {
  id?: string
  name: string
  description?: string
  appearanceDescription?: string
  role?: string
  defaultWardrobe?: string
  wardrobes?: ExportWardrobeItem[]
}

export interface ExportChapterInfo {
  chapterIndex: number
  chapterHeading: string
  title?: string
  description?: string
  minutes?: number
  sceneNumbers: number[]
}

export interface ExportSceneDirectionSummary {
  sceneDescription?: string
  location?: string
  atmosphere?: string
  keyProps?: string[]
  camera?: string
  lighting?: string
  talent?: string
  audio?: string
}

export interface ExportShotDirectionSummary {
  shotType?: string
  cameraAngle?: string
  cameraMovement?: string
  lensEnergy?: string
  transition?: string
  cameraSummary?: string
  stillDescription?: string
  castInFrame?: string[]
  castWardrobes?: Array<{
    characterName: string
    wardrobeName: string
    description?: string
  }>
  blocking?: string
  spatialRelationship?: string
  emotion?: string
  gaze?: string
  lighting?: string
  props?: string[]
  propInteraction?: string
  audio?: string
}

export interface ExportShotData {
  shotNumber: number
  beatId?: string
  kind: 'action' | 'dialogue' | 'narration'
  durationSeconds?: number
  character?: string
  voiceDirection?: string
  line?: string
  actionDescription?: string
  shotDirection?: ExportShotDirectionSummary
}

export interface SceneData {
  sceneNumber: number
  heading?: string
  rawHeading?: string
  sceneDescription?: string
  action?: string
  narration?: string
  dialogue?: Array<{
    character: string
    line: string
    parenthetical?: string | null
    extension?: string | null
  }>
  characters?: string[]
  sceneWardrobes?: Array<{
    characterName: string
    wardrobeName: string
    description?: string
  }>
  duration?: number
  visualNotes?: string
  audioNotes?: string
  chapter?: {
    index: number
    heading: string
    title?: string
    description?: string
    minutes?: number
    isFirstSceneInChapter: boolean
    positionInChapter: number
    totalScenesInChapter: number
  }
  sceneDirection?: ExportSceneDirectionSummary
  shots?: ExportShotData[]
  transitionToNext?: string
}

export interface ScriptData {
  title: string
  logline?: string
  scenes: SceneData[]
  characters?: ExportCharacterItem[]
  chapters?: ExportChapterInfo[]
  metadata?: {
    author?: string
    draft?: string
    totalDuration?: number
    totalShots?: number
    createdAt?: string
    importedScript?: boolean
  }
}

export interface BuildProductionScriptInput {
  script?: any
  scenes?: any[]
  characters?: any[]
  projectTitle?: string
  projectLogline?: string
  projectMetadata?: Record<string, unknown> | null
  blueprintBeats?: BlueprintBeatInput[]
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function extractRawHeading(heading: unknown): string | undefined {
  if (typeof heading === 'string') return cleanText(heading)
  if (heading && typeof heading === 'object' && 'text' in heading) {
    return cleanText((heading as { text?: unknown }).text)
  }
  return undefined
}

function compileSceneDirectionSummary(rawDir: any): ExportSceneDirectionSummary | undefined {
  if (!rawDir || typeof rawDir !== 'object') return undefined

  const sceneDescription = cleanText(rawDir.sceneDescription)
  const location = cleanText(rawDir.scene?.location)
  const atmosphere = cleanText(rawDir.scene?.atmosphere)
  const keyProps = Array.isArray(rawDir.scene?.keyProps)
    ? rawDir.scene.keyProps.map((p: unknown) => cleanText(p)).filter(Boolean) as string[]
    : undefined

  const cameraParts: string[] = []
  if (Array.isArray(rawDir.camera?.shots) && rawDir.camera.shots.length > 0) {
    const shots = rawDir.camera.shots.map((s: unknown) => cleanText(s)).filter(Boolean)
    if (shots.length > 0) cameraParts.push(`Shots: ${shots.join(', ')}`)
  }
  if (cleanText(rawDir.camera?.angle)) cameraParts.push(`Angle: ${cleanText(rawDir.camera.angle)}`)
  if (cleanText(rawDir.camera?.movement)) cameraParts.push(`Movement: ${cleanText(rawDir.camera.movement)}`)
  if (cleanText(rawDir.camera?.lensChoice)) cameraParts.push(`Lens: ${cleanText(rawDir.camera.lensChoice)}`)
  if (cleanText(rawDir.camera?.focus)) cameraParts.push(`Focus: ${cleanText(rawDir.camera.focus)}`)
  if (cleanText(rawDir.camera?.coveragePhilosophy)) {
    cameraParts.push(`Coverage: ${cleanText(rawDir.camera.coveragePhilosophy)}`)
  }

  const lightingParts: string[] = []
  if (cleanText(rawDir.lighting?.overallMood)) lightingParts.push(`Mood: ${cleanText(rawDir.lighting.overallMood)}`)
  if (cleanText(rawDir.lighting?.timeOfDay)) lightingParts.push(`Time: ${cleanText(rawDir.lighting.timeOfDay)}`)
  if (cleanText(rawDir.lighting?.keyLight)) lightingParts.push(`Key: ${cleanText(rawDir.lighting.keyLight)}`)
  if (cleanText(rawDir.lighting?.fillLight)) lightingParts.push(`Fill: ${cleanText(rawDir.lighting.fillLight)}`)
  if (cleanText(rawDir.lighting?.backlight)) lightingParts.push(`Backlight: ${cleanText(rawDir.lighting.backlight)}`)
  if (cleanText(rawDir.lighting?.practicals)) lightingParts.push(`Practicals: ${cleanText(rawDir.lighting.practicals)}`)
  if (cleanText(rawDir.lighting?.colorTemperature)) {
    lightingParts.push(`Color Temp: ${cleanText(rawDir.lighting.colorTemperature)}`)
  }

  const talentParts: string[] = []
  if (cleanText(rawDir.talent?.blocking)) talentParts.push(`Blocking: ${cleanText(rawDir.talent.blocking)}`)
  if (Array.isArray(rawDir.talent?.keyActions) && rawDir.talent.keyActions.length > 0) {
    const actions = rawDir.talent.keyActions.map((a: unknown) => cleanText(a)).filter(Boolean)
    if (actions.length > 0) talentParts.push(`Key Actions: ${actions.join('; ')}`)
  }
  if (cleanText(rawDir.talent?.emotionalBeat)) {
    talentParts.push(`Emotional Beat: ${cleanText(rawDir.talent.emotionalBeat)}`)
  }

  const audioParts: string[] = []
  if (cleanText(rawDir.audio?.priorities)) audioParts.push(`Priorities: ${cleanText(rawDir.audio.priorities)}`)
  if (cleanText(rawDir.audio?.considerations)) {
    audioParts.push(`Considerations: ${cleanText(rawDir.audio.considerations)}`)
  }

  const summary: ExportSceneDirectionSummary = {
    ...(sceneDescription ? { sceneDescription } : {}),
    ...(location ? { location } : {}),
    ...(atmosphere ? { atmosphere } : {}),
    ...(keyProps && keyProps.length > 0 ? { keyProps } : {}),
    ...(cameraParts.length > 0 ? { camera: cameraParts.join(' | ') } : {}),
    ...(lightingParts.length > 0 ? { lighting: lightingParts.join(' | ') } : {}),
    ...(talentParts.length > 0 ? { talent: talentParts.join(' | ') } : {}),
    ...(audioParts.length > 0 ? { audio: audioParts.join(' | ') } : {}),
  }

  return Object.keys(summary).length > 0 ? summary : undefined
}

function hasAnySceneDirectionFields(dir?: ExportSceneDirectionSummary): boolean {
  if (!dir) return false
  return Boolean(
    dir.location ||
      dir.atmosphere ||
      (dir.keyProps && dir.keyProps.length > 0) ||
      dir.camera ||
      dir.lighting ||
      dir.talent ||
      dir.audio
  )
}

function hasAnyShotDirectionFields(dir?: ExportShotDirectionSummary): boolean {
  if (!dir) return false
  return Boolean(
    dir.cameraSummary ||
      dir.stillDescription ||
      (dir.castInFrame && dir.castInFrame.length > 0) ||
      dir.blocking ||
      dir.spatialRelationship ||
      dir.emotion ||
      dir.gaze ||
      dir.lighting ||
      (dir.props && dir.props.length > 0) ||
      dir.propInteraction ||
      dir.audio
  )
}

function resolveWardrobeLookup(characters: ExportCharacterItem[]) {
  const byCharId = new Map<string, ExportCharacterItem>()
  const byCharName = new Map<string, ExportCharacterItem>()
  for (const c of characters) {
    if (c.id) byCharId.set(c.id, c)
    if (c.name) byCharName.set(c.name.toLowerCase(), c)
  }

  const resolveForAssignment = (
    characterId?: string,
    wardrobeId?: string,
    characterNameFallback?: string
  ): { characterName: string; wardrobeName: string; description?: string } | null => {
    const char =
      (characterId && byCharId.get(characterId)) ||
      (characterNameFallback && byCharName.get(characterNameFallback.toLowerCase()))
    if (!char) return null
    const wardrobes = char.wardrobes || []
    const matched =
      (wardrobeId && wardrobes.find((w) => w.id === wardrobeId)) ||
      wardrobes.find((w) => w.isDefault) ||
      wardrobes[0]
    if (!matched) {
      if (char.defaultWardrobe) {
        return {
          characterName: char.name,
          wardrobeName: 'Default',
          description: char.defaultWardrobe,
        }
      }
      return null
    }
    return {
      characterName: char.name,
      wardrobeName: matched.name,
      description: matched.description,
    }
  }

  const resolveForScene = (
    scene: any,
    sceneNumber: number
  ): Array<{ characterName: string; wardrobeName: string; description?: string }> => {
    const results: Array<{ characterName: string; wardrobeName: string; description?: string }> = []
    const seenChars = new Set<string>()

    if (Array.isArray(scene?.characterWardrobes)) {
      for (const cw of scene.characterWardrobes) {
        const resolved = resolveForAssignment(cw?.characterId, cw?.wardrobeId)
        if (resolved && !seenChars.has(resolved.characterName.toLowerCase())) {
          seenChars.add(resolved.characterName.toLowerCase())
          results.push(resolved)
        }
      }
    }

    for (const char of characters) {
      const key = char.name.toLowerCase()
      if (seenChars.has(key)) continue
      const sceneSpecific = char.wardrobes?.find(
        (w) => Array.isArray(w.sceneNumbers) && w.sceneNumbers.includes(sceneNumber)
      )
      if (sceneSpecific) {
        seenChars.add(key)
        results.push({
          characterName: char.name,
          wardrobeName: sceneSpecific.name,
          description: sceneSpecific.description,
        })
      }
    }

    return results
  }

  return { resolveForAssignment, resolveForScene }
}

/**
 * Build rich Production Stage ScriptData from script, scenes, characters, and metadata.
 */
export function buildProductionScriptData(input: BuildProductionScriptInput): ScriptData {
  const scriptObj = input.script?.script || input.script || {}
  const rawScenes: any[] =
    input.scenes ||
    (Array.isArray(scriptObj?.scenes) ? scriptObj.scenes : undefined) ||
    (Array.isArray(input.script?.scenes) ? input.script.scenes : undefined) ||
    []

  const visionPhase = (input.projectMetadata as { visionPhase?: any } | null)?.visionPhase
  const rawCharacters: any[] =
    (Array.isArray(input.characters) && input.characters.length > 0
      ? input.characters
      : undefined) ||
    (Array.isArray(visionPhase?.characters) ? visionPhase.characters : undefined) ||
    (Array.isArray(input.script?.characters) ? input.script.characters : undefined) ||
    []

  const blueprintBeats: BlueprintBeatInput[] =
    (Array.isArray(input.blueprintBeats) && input.blueprintBeats.length > 0
      ? input.blueprintBeats
      : undefined) ||
    treatmentBeatsFromMetadata(input.projectMetadata) ||
    []

  const characters: ExportCharacterItem[] = rawCharacters
    .filter((c: any) => c && c.type !== 'narrator' && c.type !== 'description' && cleanText(c.name))
    .map((c: any) => {
      const wardrobes: ExportWardrobeItem[] = Array.isArray(c.wardrobes)
        ? c.wardrobes
            .filter((w: any) => w && cleanText(w.name || w.description))
            .map((w: any) => ({
              id: cleanText(w.id),
              name: cleanText(w.name) || 'Standard Look',
              description: cleanText(w.description),
              accessories: cleanText(w.accessories),
              appearanceNotes: cleanText(w.appearanceNotes),
              isDefault: Boolean(w.isDefault),
              sceneNumbers: Array.isArray(w.sceneNumbers) ? w.sceneNumbers : undefined,
            }))
        : []

      return {
        id: cleanText(c.id),
        name: cleanText(c.name) || 'Character',
        description: cleanText(c.description),
        appearanceDescription: cleanText(c.appearanceDescription),
        role: cleanText(c.role),
        defaultWardrobe: cleanText(c.defaultWardrobe),
        ...(wardrobes.length > 0 ? { wardrobes } : {}),
      }
    })

  const wardrobeHelper = resolveWardrobeLookup(characters)
  const chapterMap = new Map<number, ExportChapterInfo>()
  let totalShotsCount = 0

  const scenes: SceneData[] = rawScenes.map((s: any, idx: number) => {
    const sceneNumber = typeof s?.sceneNumber === 'number' ? s.sceneNumber : idx + 1
    const rawHeadingStr = extractRawHeading(s?.heading) || cleanText(s?.title)
    const formattedHeading = rawHeadingStr ? formatSceneHeading(rawHeadingStr) : `SCENE ${sceneNumber}`

    const rawDir = s?.sceneDirection || s?.detailedDirection
    const sceneDirection = compileSceneDirectionSummary(rawDir)

    const sceneDescription =
      cleanText(rawDir?.sceneDescription) ||
      cleanText(s?.visualDescription) ||
      cleanText(s?.description) ||
      cleanText(s?.summary) ||
      cleanText(s?.action)

    // Chapter resolution
    const group = getBlueprintBeatGroup(rawScenes as Array<Record<string, unknown>>, idx)
    let chapterField: SceneData['chapter'] | undefined
    if (group) {
      const beat = blueprintBeats[group.beatIndex]
      const chapHead = chapterHeading(group.beatIndex)
      const chapTitle = cleanText(beat?.title) || cleanText(s?.blueprintBeatTitle) || group.beatTitle
      const chapDesc = resolveBlueprintBeatDescription(beat)
      const minutes = typeof beat?.minutes === 'number' ? beat.minutes : undefined

      chapterField = {
        index: group.beatIndex,
        heading: chapHead,
        title: chapTitle,
        description: chapDesc,
        minutes,
        isFirstSceneInChapter: group.positionInGroup === 1,
        positionInChapter: group.positionInGroup,
        totalScenesInChapter: group.sceneIndices.length,
      }

      const existingChap = chapterMap.get(group.beatIndex)
      if (existingChap) {
        existingChap.sceneNumbers.push(sceneNumber)
      } else {
        chapterMap.set(group.beatIndex, {
          chapterIndex: group.beatIndex,
          chapterHeading: chapHead,
          title: chapTitle,
          description: chapDesc,
          minutes,
          sceneNumbers: [sceneNumber],
        })
      }
    } else if (blueprintBeats[idx] && rawScenes.length === blueprintBeats.length) {
      const beat = blueprintBeats[idx]
      const chapHead = chapterHeading(idx)
      const chapTitle = cleanText(beat?.title)
      const chapDesc = resolveBlueprintBeatDescription(beat)
      const minutes = typeof beat?.minutes === 'number' ? beat.minutes : undefined

      chapterField = {
        index: idx,
        heading: chapHead,
        title: chapTitle,
        description: chapDesc,
        minutes,
        isFirstSceneInChapter: true,
        positionInChapter: 1,
        totalScenesInChapter: 1,
      }
      chapterMap.set(idx, {
        chapterIndex: idx,
        chapterHeading: chapHead,
        title: chapTitle,
        description: chapDesc,
        minutes,
        sceneNumbers: [sceneNumber],
      })
    }

    // Extract shots from beats[] (or derive from scene content)
    const rawBeats = getSceneBeats((s || {}) as Record<string, unknown>).filter(
      (b) => !isBeatExcluded(b)
    )

    const shots: ExportShotData[] = rawBeats.map((beat, beatIdx) => {
      const bd = beat.beatDirection
      const cameraSummaryParts = [
        cleanText(bd?.shotType),
        cleanText(bd?.cameraAngle),
        cleanText(bd?.cameraMovement),
        cleanText(bd?.transition),
      ].filter(Boolean)

      const castWardrobes: Array<{
        characterName: string
        wardrobeName: string
        description?: string
      }> = []

      if (Array.isArray(beat.referenceSelection?.characterWardrobes)) {
        for (const cw of beat.referenceSelection.characterWardrobes) {
          const resolved = wardrobeHelper.resolveForAssignment(cw.characterId, cw.wardrobeId)
          if (resolved) castWardrobes.push(resolved)
        }
      }

      const shotDirection: ExportShotDirectionSummary | undefined = bd
        ? {
            ...(cleanText(bd.shotType) ? { shotType: cleanText(bd.shotType) } : {}),
            ...(cleanText(bd.cameraAngle) ? { cameraAngle: cleanText(bd.cameraAngle) } : {}),
            ...(cleanText(bd.cameraMovement) ? { cameraMovement: cleanText(bd.cameraMovement) } : {}),
            ...(cleanText(bd.lensEnergy) ? { lensEnergy: cleanText(bd.lensEnergy) } : {}),
            ...(cleanText(bd.transition) ? { transition: cleanText(bd.transition) } : {}),
            ...(cameraSummaryParts.length > 0 ? { cameraSummary: cameraSummaryParts.join(' • ') } : {}),
            ...(cleanText(bd.frozenMoment) ? { stillDescription: cleanText(bd.frozenMoment) } : {}),
            ...(Array.isArray(bd.castInFrame) ? { castInFrame: bd.castInFrame.filter(Boolean) } : {}),
            ...(castWardrobes.length > 0 ? { castWardrobes } : {}),
            ...(cleanText(bd.blocking) ? { blocking: cleanText(bd.blocking) } : {}),
            ...(cleanText(bd.spatialRelationship)
              ? { spatialRelationship: cleanText(bd.spatialRelationship) }
              : {}),
            ...(cleanText(bd.emotion) ? { emotion: cleanText(bd.emotion) } : {}),
            ...(cleanText(bd.gaze) ? { gaze: cleanText(bd.gaze) } : {}),
            ...(cleanText(bd.lightingAccent) ? { lighting: cleanText(bd.lightingAccent) } : {}),
            ...(Array.isArray(bd.keyProps) && bd.keyProps.filter(Boolean).length > 0
              ? { props: bd.keyProps.filter(Boolean) }
              : {}),
            ...(cleanText(bd.propInteraction)
              ? { propInteraction: cleanText(bd.propInteraction) }
              : {}),
            ...(cleanText(bd.audioCue) ? { audio: cleanText(bd.audioCue) } : {}),
          }
        : castWardrobes.length > 0
          ? { castWardrobes }
          : undefined

      return {
        shotNumber: beatIdx + 1,
        beatId: beat.beatId,
        kind: beat.kind,
        durationSeconds: beat.durationSeconds,
        character: cleanText(beat.character),
        voiceDirection: cleanText(beat.voiceDirection),
        line: cleanText(beat.line),
        actionDescription: cleanText(beat.actionDescription),
        ...(shotDirection && Object.keys(shotDirection).length > 0 ? { shotDirection } : {}),
      }
    })

    totalShotsCount += shots.length

    const sceneWardrobes = wardrobeHelper.resolveForScene(s, sceneNumber)

    // Maintain legacy dialogue array for backward compatibility
    const legacyDialogue =
      Array.isArray(s?.dialogue) && s.dialogue.length > 0
        ? s.dialogue.map((d: any) => ({
            character: d.character || 'CHARACTER',
            line: d.line || d.text || '',
            parenthetical: d.parenthetical || d.voiceDirection || null,
            extension: d.extension || null,
          }))
        : shots
            .filter((shot) => shot.kind === 'dialogue' && shot.line)
            .map((shot) => ({
              character: shot.character || 'CHARACTER',
              line: shot.line || '',
              parenthetical: shot.voiceDirection || null,
              extension: null,
            }))

    return {
      sceneNumber,
      heading: formattedHeading,
      rawHeading: rawHeadingStr,
      sceneDescription,
      action: cleanText(s?.action) || cleanText(s?.visualDescription) || cleanText(s?.description),
      narration: cleanText(s?.narration),
      dialogue: legacyDialogue,
      characters: Array.isArray(s?.characters) ? s.characters : [],
      ...(sceneWardrobes.length > 0 ? { sceneWardrobes } : {}),
      duration: typeof s?.duration === 'number' ? s.duration : undefined,
      visualNotes: cleanText(s?.visualNotes) || sceneDirection?.camera || sceneDirection?.lighting,
      audioNotes: cleanText(s?.audioNotes) || sceneDirection?.audio,
      ...(chapterField ? { chapter: chapterField } : {}),
      ...(sceneDirection ? { sceneDirection } : {}),
      ...(shots.length > 0 ? { shots } : {}),
      ...(cleanText(s?.transitionToNext) ? { transitionToNext: cleanText(s.transitionToNext) } : {}),
    }
  })

  const chapters = Array.from(chapterMap.values()).sort((a, b) => a.chapterIndex - b.chapterIndex)

  const title =
    cleanText(input.projectTitle) ||
    cleanText(scriptObj?.title) ||
    cleanText(input.script?.title) ||
    cleanText((input.projectMetadata as any)?.filmTreatmentVariant?.title) ||
    'Untitled Script'

  const logline =
    cleanText(input.projectLogline) ||
    cleanText(scriptObj?.logline) ||
    cleanText(input.script?.logline) ||
    cleanText((input.projectMetadata as any)?.filmTreatmentVariant?.logline)

  const author =
    cleanText(input.script?.metadata?.author) ||
    cleanText(visionPhase?.metadata?.author) ||
    cleanText((input.projectMetadata as any)?.filmTreatmentVariant?.author_writer)

  return {
    title,
    ...(logline ? { logline } : {}),
    scenes,
    characters,
    ...(chapters.length > 0 ? { chapters } : {}),
    metadata: {
      author,
      draft: cleanText(input.script?.metadata?.draft) || cleanText(visionPhase?.metadata?.draft),
      totalDuration: scenes.reduce((sum, s) => sum + (s.duration || 0), 0),
      totalShots: totalShotsCount,
      createdAt:
        cleanText(visionPhase?.metadata?.importedAt) ||
        cleanText(input.script?.metadata?.createdAt) ||
        new Date().toISOString(),
      importedScript: visionPhase?.importSource === 'script-import',
    },
  }
}

/**
 * Convert vision phase data to ScriptData format
 */
export function visionPhaseToScriptData(visionPhase: any, projectTitle?: string): ScriptData {
  const script = visionPhase?.script || {}
  const scenes = script?.script?.scenes || script?.scenes || visionPhase?.scenes || []
  const characters = visionPhase?.characters || script?.characters || []

  return buildProductionScriptData({
    script,
    scenes,
    characters,
    projectTitle: projectTitle || script?.title,
    projectLogline: script?.logline || visionPhase?.logline,
    projectMetadata: visionPhase?.projectMetadata || { visionPhase },
    blueprintBeats: visionPhase?.blueprintBeats,
  })
}

/**
 * Export script to Fountain format (industry-standard screenplay format)
 */
export function exportToFountain(
  script: ScriptData,
  options: Partial<ExportScriptOptions> = {}
): string {
  const opts: ExportScriptOptions = {
    ...DEFAULT_EXPORT_SCRIPT_OPTIONS,
    format: 'fountain',
    ...options,
  }

  const lines: string[] = []

  // Title page
  if (opts.includeTitle) {
    lines.push(`Title: ${script.title}`)
    lines.push('Credit: Written with')
    lines.push(`Author: ${script.metadata?.author || 'SceneFlow Studio'}`)
    if (script.metadata?.draft) {
      lines.push(`Draft date: ${script.metadata.draft}`)
    } else {
      lines.push(
        `Draft date: ${new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}`
      )
    }
    if (script.logline) {
      lines.push(`Notes: ${script.logline}`)
    }
    lines.push('')
    lines.push('')
  }

  // Characters & Wardrobe section
  if (opts.includeCharacterList && script.characters?.length) {
    lines.push('# CAST & WARDROBE')
    lines.push('')
    for (const char of script.characters) {
      const roleLabel = char.role ? ` (${char.role.toUpperCase()})` : ''
      lines.push(`**${char.name.toUpperCase()}**${roleLabel}`)
      if (char.description) {
        lines.push(wrapText(char.description, 65))
      }
      if (char.appearanceDescription && char.appearanceDescription !== char.description) {
        lines.push(`Appearance: ${wrapText(char.appearanceDescription, 65)}`)
      }
      if (char.wardrobes?.length) {
        for (const w of char.wardrobes) {
          const defTag = w.isDefault ? ' [Default]' : ''
          const sceneTag =
            w.sceneNumbers && w.sceneNumbers.length > 0
              ? ` (Scenes: ${w.sceneNumbers.join(', ')})`
              : ''
          const parts = [w.description, w.accessories ? `Accessories: ${w.accessories}` : undefined]
            .filter(Boolean)
            .join(' — ')
          lines.push(`  • Wardrobe — ${w.name}${defTag}${sceneTag}${parts ? `: ${parts}` : ''}`)
        }
      } else if (char.defaultWardrobe) {
        lines.push(`  • Wardrobe — Default: ${char.defaultWardrobe}`)
      }
      lines.push('')
    }
    lines.push('===')
    lines.push('')
  }

  // Scenes
  for (const scene of script.scenes) {
    // Chapter header & description
    if (opts.includeChapters && scene.chapter?.isFirstSceneInChapter) {
      const chapterTitle = scene.chapter.title
        ? `${scene.chapter.heading.toUpperCase()}: ${scene.chapter.title.toUpperCase()}`
        : scene.chapter.heading.toUpperCase()
      lines.push(`# ${chapterTitle}`)
      if (scene.chapter.description) {
        lines.push(`= ${scene.chapter.description}`)
      }
      lines.push('')
    }

    // Scene heading
    const heading = (scene.heading || `INT. SCENE ${scene.sceneNumber} - DAY`).toUpperCase()
    const numberedHeading = opts.includeSceneNumbers
      ? `${scene.sceneNumber}. ${heading} #${scene.sceneNumber}#`
      : heading
    lines.push(numberedHeading)
    lines.push('')

    if (opts.includeDurations && scene.duration) {
      lines.push(`/* Scene Duration: ${formatDuration(scene.duration)} */`)
      lines.push('')
    }

    // Scene-level wardrobe assignments
    if (opts.includeCharacterList && scene.sceneWardrobes?.length) {
      const wardrobeNotes = scene.sceneWardrobes
        .map(
          (sw) =>
            `${sw.characterName}: ${sw.wardrobeName}${sw.description ? ` (${sw.description})` : ''}`
        )
        .join(' | ')
      lines.push(`/* Scene Wardrobe: ${wardrobeNotes} */`)
      lines.push('')
    }

    // Scene description
    if (opts.includeSceneDescriptions && scene.sceneDescription) {
      lines.push(wrapText(scene.sceneDescription, 62))
      lines.push('')
    }

    // Scene direction
    if (opts.includeSceneDirection && hasAnySceneDirectionFields(scene.sceneDirection)) {
      const sd = scene.sceneDirection!
      lines.push('/* SCENE DIRECTION')
      if (sd.location) lines.push(`   Location & Set: ${sd.location}`)
      if (sd.atmosphere) lines.push(`   Atmosphere: ${sd.atmosphere}`)
      if (sd.keyProps?.length) lines.push(`   Key Props: ${sd.keyProps.join(', ')}`)
      if (sd.camera) lines.push(`   Camera: ${sd.camera}`)
      if (sd.lighting) lines.push(`   Lighting: ${sd.lighting}`)
      if (sd.talent) lines.push(`   Talent & Blocking: ${sd.talent}`)
      if (sd.audio) lines.push(`   Audio: ${sd.audio}`)
      lines.push('*/')
      lines.push('')
    }

    // Shots (if present)
    if (scene.shots && scene.shots.length > 0) {
      for (const shot of scene.shots) {
        const showShotDir = opts.includeShotDirection && hasAnyShotDirectionFields(shot.shotDirection)
        const showActionDialogue = opts.includeShotActionDialogue

        if (!showShotDir && !showActionDialogue) continue

        const camLabel = shot.shotDirection?.cameraSummary
          ? ` — ${shot.shotDirection.cameraSummary}`
          : ''
        const durLabel =
          opts.includeDurations && shot.durationSeconds ? ` (${shot.durationSeconds}s)` : ''

        if (showShotDir) {
          lines.push(`## SHOT ${shot.shotNumber} [${shot.kind.toUpperCase()}]${camLabel}${durLabel}`)
          const sd = shot.shotDirection
          if (sd) {
            if (sd.stillDescription) lines.push(`/* Still: ${sd.stillDescription} */`)
            if (sd.castInFrame !== undefined) {
              const castStr =
                sd.castInFrame.length > 0 ? sd.castInFrame.join(', ') : 'No one on camera'
              lines.push(`/* Cast: ${castStr} */`)
            }
            if (sd.castWardrobes?.length) {
              lines.push(
                `/* Shot Wardrobe: ${sd.castWardrobes
                  .map((cw) => `${cw.characterName} (${cw.wardrobeName})`)
                  .join(', ')} */`
              )
            }
            if (sd.blocking) lines.push(`/* Blocking: ${sd.blocking} */`)
            if (sd.emotion || sd.gaze) {
              const emoParts = [
                sd.emotion ? `Emotion: ${sd.emotion}` : undefined,
                sd.gaze ? `Gaze: ${sd.gaze}` : undefined,
              ].filter(Boolean)
              lines.push(`/* ${emoParts.join(' | ')} */`)
            }
            if (sd.lighting) lines.push(`/* Lighting: ${sd.lighting} */`)
            if (sd.props?.length || sd.propInteraction) {
              const propParts = [
                sd.props?.length ? `Props: ${sd.props.join(', ')}` : undefined,
                sd.propInteraction ? `Interaction: ${sd.propInteraction}` : undefined,
              ].filter(Boolean)
              lines.push(`/* ${propParts.join(' | ')} */`)
            }
            if (sd.audio) lines.push(`/* Audio Cue: ${sd.audio} */`)
          }
          lines.push('')
        }

        if (showActionDialogue) {
          if (shot.kind === 'action') {
            const actionText = shot.actionDescription || shot.line
            if (actionText && actionText !== scene.sceneDescription) {
              lines.push(wrapText(actionText, 60))
              lines.push('')
            } else if (actionText && !opts.includeSceneDescriptions) {
              lines.push(wrapText(actionText, 60))
              lines.push('')
            }
          } else if (shot.kind === 'narration') {
            if (shot.actionDescription) {
              lines.push(wrapText(shot.actionDescription, 60))
              lines.push('')
            }
            const speaker = (shot.character || 'NARRATOR').toUpperCase()
            const cue = speaker.includes('V.O.') ? speaker : `${speaker} (V.O.)`
            lines.push(cue)
            if (shot.voiceDirection) {
              const paren = shot.voiceDirection.startsWith('(')
                ? shot.voiceDirection
                : `(${shot.voiceDirection})`
              lines.push(paren)
            }
            if (shot.line) {
              lines.push(
                wrapText(shot.line, 38)
                  .split('\n')
                  .map((l) => `    ${l}`)
                  .join('\n')
              )
            }
            lines.push('')
          } else {
            if (shot.actionDescription) {
              lines.push(wrapText(shot.actionDescription, 60))
              lines.push('')
            }
            const speaker = (shot.character || 'CHARACTER').toUpperCase()
            lines.push(speaker)
            if (shot.voiceDirection) {
              const paren = shot.voiceDirection.startsWith('(')
                ? shot.voiceDirection
                : `(${shot.voiceDirection})`
              lines.push(paren)
            }
            if (shot.line) {
              lines.push(
                wrapText(shot.line, 38)
                  .split('\n')
                  .map((l) => `    ${l}`)
                  .join('\n')
              )
            }
            lines.push('')
          }
        }
      }
    } else if (opts.includeShotActionDialogue) {
      // Legacy fallback when no shots array is present
      if (scene.action && (!opts.includeSceneDescriptions || scene.action !== scene.sceneDescription)) {
        lines.push(wrapText(scene.action, 60))
        lines.push('')
      }
      if (scene.narration) {
        lines.push('NARRATOR (V.O.)')
        lines.push(
          wrapText(scene.narration, 38)
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n')
        )
        lines.push('')
      }
      if (scene.dialogue?.length) {
        for (const d of scene.dialogue) {
          const ext = d.extension ? ` (${d.extension})` : ''
          lines.push(`${d.character.toUpperCase()}${ext}`)
          if (d.parenthetical) {
            const paren = d.parenthetical.startsWith('(') ? d.parenthetical : `(${d.parenthetical})`
            lines.push(paren)
          }
          lines.push(
            wrapText(d.line, 38)
              .split('\n')
              .map((l) => `    ${l}`)
              .join('\n')
          )
          lines.push('')
        }
      }
    }

    if (opts.includeNotes && !opts.includeSceneDirection) {
      if (scene.visualNotes) lines.push(`/* Visual: ${scene.visualNotes} */`)
      if (scene.audioNotes) lines.push(`/* Audio: ${scene.audioNotes} */`)
      if (scene.visualNotes || scene.audioNotes) lines.push('')
    }

    lines.push('')
  }

  lines.push('THE END')
  return lines.join('\n')
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Export script to Final Draft (.fdx) XML format (industry standard)
 */
export function exportToFDX(
  script: ScriptData,
  options: Partial<ExportScriptOptions> = {}
): string {
  const opts: ExportScriptOptions = {
    ...DEFAULT_EXPORT_SCRIPT_OPTIONS,
    format: 'fdx',
    ...options,
  }

  const paragraphs: string[] = []
  const pushParagraph = (type: string, text: string, attrs = '') => {
    if (!text.trim()) return
    paragraphs.push(
      `    <Paragraph Type="${type}"${attrs ? ` ${attrs}` : ''}>\n      <Text>${escapeXml(
        text.trim()
      )}</Text>\n    </Paragraph>`
    )
  }

  // Characters & Wardrobe block
  if (opts.includeCharacterList && script.characters?.length) {
    pushParagraph('Scene Heading', 'CAST & WARDROBE BIBLE')
    for (const char of script.characters) {
      const role = char.role ? ` (${char.role.toUpperCase()})` : ''
      const desc = char.description ? ` — ${char.description}` : ''
      pushParagraph('Action', `${char.name.toUpperCase()}${role}${desc}`)
      if (char.wardrobes?.length) {
        for (const w of char.wardrobes) {
          const defTag = w.isDefault ? ' [Default]' : ''
          const sceneTag =
            w.sceneNumbers && w.sceneNumbers.length > 0
              ? ` (Scenes: ${w.sceneNumbers.join(', ')})`
              : ''
          const details = [w.description, w.accessories ? `Accessories: ${w.accessories}` : undefined]
            .filter(Boolean)
            .join(' — ')
          pushParagraph(
            'Action',
            `Wardrobe (${w.name}${defTag}${sceneTag}): ${details || 'Standard look'}`
          )
        }
      } else if (char.defaultWardrobe) {
        pushParagraph('Action', `Wardrobe (Default): ${char.defaultWardrobe}`)
      }
    }
  }

  for (const scene of script.scenes) {
    if (opts.includeChapters && scene.chapter?.isFirstSceneInChapter) {
      const chapHeader = scene.chapter.title
        ? `${scene.chapter.heading.toUpperCase()}: ${scene.chapter.title.toUpperCase()}`
        : scene.chapter.heading.toUpperCase()
      pushParagraph('Scene Heading', chapHeader)
      if (scene.chapter.description) {
        pushParagraph('Action', `[Chapter Description] ${scene.chapter.description}`)
      }
    }

    const heading = (scene.heading || `INT. SCENE ${scene.sceneNumber} - DAY`).toUpperCase()
    const numAttr = opts.includeSceneNumbers ? `Number="${scene.sceneNumber}"` : ''
    pushParagraph('Scene Heading', heading, numAttr)

    if (opts.includeCharacterList && scene.sceneWardrobes?.length) {
      pushParagraph(
        'Action',
        `[Scene Wardrobe] ${scene.sceneWardrobes
          .map(
            (sw) =>
              `${sw.characterName}: ${sw.wardrobeName}${sw.description ? ` (${sw.description})` : ''}`
          )
          .join(' | ')}`
      )
    }

    if (opts.includeSceneDescriptions && scene.sceneDescription) {
      pushParagraph('Action', scene.sceneDescription)
    }

    if (opts.includeSceneDirection && hasAnySceneDirectionFields(scene.sceneDirection)) {
      const sd = scene.sceneDirection!
      const dirParts = [
        sd.location ? `Location/Set: ${sd.location}` : undefined,
        sd.atmosphere ? `Atmosphere: ${sd.atmosphere}` : undefined,
        sd.keyProps?.length ? `Key Props: ${sd.keyProps.join(', ')}` : undefined,
        sd.camera ? `Camera: ${sd.camera}` : undefined,
        sd.lighting ? `Lighting: ${sd.lighting}` : undefined,
        sd.talent ? `Talent: ${sd.talent}` : undefined,
        sd.audio ? `Audio: ${sd.audio}` : undefined,
      ].filter(Boolean)
      if (dirParts.length > 0) {
        pushParagraph('Action', `[Scene Direction] ${dirParts.join(' • ')}`)
      }
    }

    if (scene.shots && scene.shots.length > 0) {
      for (const shot of scene.shots) {
        if (opts.includeShotDirection && hasAnyShotDirectionFields(shot.shotDirection)) {
          const sd = shot.shotDirection!
          const headerParts = [
            `SHOT ${shot.shotNumber} (${shot.kind.toUpperCase()})`,
            sd.cameraSummary,
            opts.includeDurations && shot.durationSeconds ? `${shot.durationSeconds}s` : undefined,
          ].filter(Boolean)
          pushParagraph('Shot', headerParts.join(' — '))

          const details = [
            sd.stillDescription ? `Still: ${sd.stillDescription}` : undefined,
            sd.castInFrame !== undefined
              ? `Cast: ${sd.castInFrame.length > 0 ? sd.castInFrame.join(', ') : 'No one on camera'}`
              : undefined,
            sd.blocking ? `Blocking: ${sd.blocking}` : undefined,
            sd.emotion ? `Emotion: ${sd.emotion}` : undefined,
            sd.lighting ? `Lighting: ${sd.lighting}` : undefined,
            sd.audio ? `Audio: ${sd.audio}` : undefined,
            sd.props?.length ? `Props: ${sd.props.join(', ')}` : undefined,
          ].filter(Boolean)
          if (details.length > 0) {
            pushParagraph('Action', `[Shot ${shot.shotNumber} Direction] ${details.join(' | ')}`)
          }
        }

        if (opts.includeShotActionDialogue) {
          if (shot.kind === 'action') {
            const act = shot.actionDescription || shot.line
            if (act && act !== scene.sceneDescription) {
              pushParagraph('Action', act)
            } else if (act && !opts.includeSceneDescriptions) {
              pushParagraph('Action', act)
            }
          } else {
            if (shot.actionDescription) {
              pushParagraph('Action', shot.actionDescription)
            }
            const speaker = (
              shot.character || (shot.kind === 'narration' ? 'NARRATOR (V.O.)' : 'CHARACTER')
            ).toUpperCase()
            const cue =
              shot.kind === 'narration' && !speaker.includes('V.O.')
                ? `${speaker} (V.O.)`
                : speaker
            pushParagraph('Character', cue)
            if (shot.voiceDirection) {
              const cleanParen = shot.voiceDirection.replace(/^\(|\)$/g, '').trim()
              pushParagraph('Parenthetical', `(${cleanParen})`)
            }
            if (shot.line) {
              pushParagraph('Dialogue', shot.line)
            }
          }
        }
      }
    } else if (opts.includeShotActionDialogue) {
      if (scene.action && (!opts.includeSceneDescriptions || scene.action !== scene.sceneDescription)) {
        pushParagraph('Action', scene.action)
      }
      if (scene.narration) {
        pushParagraph('Character', 'NARRATOR (V.O.)')
        pushParagraph('Dialogue', scene.narration)
      }
      if (scene.dialogue?.length) {
        for (const d of scene.dialogue) {
          const ext = d.extension ? ` (${d.extension})` : ''
          pushParagraph('Character', `${d.character.toUpperCase()}${ext}`)
          if (d.parenthetical) {
            const cleanParen = d.parenthetical.replace(/^\(|\)$/g, '').trim()
            pushParagraph('Parenthetical', `(${cleanParen})`)
          }
          pushParagraph('Dialogue', d.line)
        }
      }
    }

    if (scene.transitionToNext) {
      pushParagraph('Transition', `${scene.transitionToNext.toUpperCase()}:`)
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>',
    '<FinalDraft DocumentType="Script" Template="No" Version="5">',
    '  <Content>',
    ...paragraphs,
    '  </Content>',
    '</FinalDraft>',
  ].join('\n')
}

/**
 * Export script to readable Markdown format (.md)
 */
export function exportToMarkdown(
  script: ScriptData,
  options: Partial<ExportScriptOptions> = {}
): string {
  const opts: ExportScriptOptions = {
    ...DEFAULT_EXPORT_SCRIPT_OPTIONS,
    format: 'markdown',
    ...options,
  }

  const lines: string[] = []

  if (opts.includeTitle) {
    lines.push(`# ${script.title}`)
    lines.push('')
    if (script.logline) {
      lines.push(`> ${script.logline}`)
      lines.push('')
    }
    const metaItems: string[] = []
    if (script.metadata?.author) metaItems.push(`**Author:** ${script.metadata.author}`)
    metaItems.push(`**Scenes:** ${script.scenes.length}`)
    if (script.metadata?.totalShots) metaItems.push(`**Shots:** ${script.metadata.totalShots}`)
    if (opts.includeDurations && script.metadata?.totalDuration) {
      metaItems.push(`**Runtime:** ${formatDuration(script.metadata.totalDuration)}`)
    }
    lines.push(metaItems.join(' • '))
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  if (opts.includeCharacterList && script.characters?.length) {
    lines.push('## Characters & Wardrobe')
    lines.push('')
    for (const char of script.characters) {
      const role = char.role ? ` *(${char.role})*` : ''
      lines.push(`### ${char.name}${role}`)
      if (char.description) {
        lines.push(char.description)
        lines.push('')
      }
      if (char.appearanceDescription && char.appearanceDescription !== char.description) {
        lines.push(`- **Appearance:** ${char.appearanceDescription}`)
      }
      if (char.wardrobes?.length) {
        lines.push('- **Wardrobe Looks:**')
        for (const w of char.wardrobes) {
          const def = w.isDefault ? ' *(Default)*' : ''
          const sc =
            w.sceneNumbers && w.sceneNumbers.length > 0
              ? ` [Scenes: ${w.sceneNumbers.join(', ')}]`
              : ''
          const desc = [w.description, w.accessories ? `Accessories: ${w.accessories}` : undefined]
            .filter(Boolean)
            .join(' — ')
          lines.push(`  - **${w.name}**${def}${sc}${desc ? `: ${desc}` : ''}`)
        }
        lines.push('')
      } else if (char.defaultWardrobe) {
        lines.push(`- **Default Wardrobe:** ${char.defaultWardrobe}`)
        lines.push('')
      }
    }
    lines.push('---')
    lines.push('')
  }

  for (const scene of script.scenes) {
    if (opts.includeChapters && scene.chapter?.isFirstSceneInChapter) {
      const chapTitle = scene.chapter.title
        ? `${scene.chapter.heading}: ${scene.chapter.title}`
        : scene.chapter.heading
      lines.push(`## ${chapTitle}`)
      if (scene.chapter.description) {
        lines.push(`*${scene.chapter.description}*`)
      }
      lines.push('')
    }

    const heading = scene.heading || `Scene ${scene.sceneNumber}`
    const durSuffix =
      opts.includeDurations && scene.duration ? ` *(${formatDuration(scene.duration)})*` : ''
    lines.push(
      `### ${opts.includeSceneNumbers ? `Scene ${scene.sceneNumber}: ` : ''}${heading}${durSuffix}`
    )
    lines.push('')

    if (opts.includeCharacterList && scene.sceneWardrobes?.length) {
      lines.push(
        `**Scene Wardrobe:** ${scene.sceneWardrobes
          .map(
            (sw) =>
              `${sw.characterName} — *${sw.wardrobeName}*${
                sw.description ? ` (${sw.description})` : ''
              }`
          )
          .join(' | ')}`
      )
      lines.push('')
    }

    if (opts.includeSceneDescriptions && scene.sceneDescription) {
      lines.push('#### Scene Description')
      lines.push(scene.sceneDescription)
      lines.push('')
    }

    if (opts.includeSceneDirection && hasAnySceneDirectionFields(scene.sceneDirection)) {
      const sd = scene.sceneDirection!
      lines.push('#### Scene Direction')
      if (sd.location) lines.push(`- **Location & Set:** ${sd.location}`)
      if (sd.atmosphere) lines.push(`- **Atmosphere:** ${sd.atmosphere}`)
      if (sd.keyProps?.length) lines.push(`- **Key Objects:** ${sd.keyProps.join(', ')}`)
      if (sd.camera) lines.push(`- **Camera:** ${sd.camera}`)
      if (sd.lighting) lines.push(`- **Lighting:** ${sd.lighting}`)
      if (sd.talent) lines.push(`- **Talent & Blocking:** ${sd.talent}`)
      if (sd.audio) lines.push(`- **Audio:** ${sd.audio}`)
      lines.push('')
    }

    if (scene.shots && scene.shots.length > 0) {
      lines.push('#### Shots')
      lines.push('')
      for (const shot of scene.shots) {
        const showDir = opts.includeShotDirection && hasAnyShotDirectionFields(shot.shotDirection)
        const showProse = opts.includeShotActionDialogue
        if (!showDir && !showProse) continue

        const camBadge = shot.shotDirection?.cameraSummary
          ? ` — ${shot.shotDirection.cameraSummary}`
          : ''
        const durBadge =
          opts.includeDurations && shot.durationSeconds ? ` (${shot.durationSeconds}s)` : ''
        lines.push(`##### Shot ${shot.shotNumber} [${shot.kind.toUpperCase()}]${camBadge}${durBadge}`)
        lines.push('')

        if (showProse) {
          if (shot.kind === 'action') {
            const act = shot.actionDescription || shot.line
            if (act) {
              lines.push(act)
              lines.push('')
            }
          } else {
            if (shot.actionDescription) {
              lines.push(`*Action:* ${shot.actionDescription}`)
              lines.push('')
            }
            const speaker = (
              shot.character || (shot.kind === 'narration' ? 'NARRATOR (V.O.)' : 'CHARACTER')
            ).toUpperCase()
            const paren = shot.voiceDirection ? ` *(${shot.voiceDirection.replace(/^\(|\)$/g, '')})*` : ''
            if (shot.line) {
              lines.push(`**${speaker}**${paren}: "${shot.line}"`)
              lines.push('')
            }
          }
        }

        if (showDir && shot.shotDirection) {
          const sd = shot.shotDirection
          if (sd.stillDescription) lines.push(`- **Still:** ${sd.stillDescription}`)
          if (sd.cameraSummary) lines.push(`- **Camera:** ${sd.cameraSummary}`)
          if (sd.castInFrame !== undefined) {
            lines.push(
              `- **Cast:** ${
                sd.castInFrame.length > 0 ? sd.castInFrame.join(', ') : 'No one on camera.'
              }`
            )
          }
          if (sd.castWardrobes?.length) {
            lines.push(
              `- **Wardrobe:** ${sd.castWardrobes
                .map((cw) => `${cw.characterName} (${cw.wardrobeName})`)
                .join(', ')}`
            )
          }
          if (sd.blocking) lines.push(`- **Blocking:** ${sd.blocking}`)
          if (sd.emotion) lines.push(`- **Emotion:** ${sd.emotion}`)
          if (sd.lighting) lines.push(`- **Lighting:** ${sd.lighting}`)
          if (sd.audio) lines.push(`- **Audio:** ${sd.audio}`)
          if (sd.props?.length) lines.push(`- **Props:** ${sd.props.join(', ')}`)
          lines.push('')
        }
      }
    }

    lines.push('---')
    lines.push('')
  }

  return lines.join('\n').trim() + '\n'
}

/**
 * Export script to plain text format (.txt)
 */
export function exportToText(
  script: ScriptData,
  options: Partial<ExportScriptOptions> = {}
): string {
  const opts: ExportScriptOptions = {
    ...DEFAULT_EXPORT_SCRIPT_OPTIONS,
    format: 'text',
    ...options,
  }

  const lines: string[] = []

  // Title
  if (opts.includeTitle) {
    lines.push('='.repeat(72))
    lines.push(script.title.toUpperCase())
    lines.push('='.repeat(72))
    if (script.logline) {
      lines.push(script.logline)
    }
    lines.push('')
    if (script.metadata?.author) {
      lines.push(`Author: ${script.metadata.author}`)
    }
    if (opts.includeDurations && script.metadata?.totalDuration) {
      lines.push(`Total Duration: ${formatDuration(script.metadata.totalDuration)}`)
    }
    lines.push(`Scenes: ${script.scenes.length}`)
    if (script.metadata?.totalShots) {
      lines.push(`Total Shots: ${script.metadata.totalShots}`)
    }
    lines.push('')
  }

  // Characters & Wardrobe
  if (opts.includeCharacterList && script.characters?.length) {
    lines.push('-'.repeat(72))
    lines.push('CHARACTERS & WARDROBE')
    lines.push('-'.repeat(72))
    for (const char of script.characters) {
      const role = char.role ? ` (${char.role})` : ''
      const desc = char.description ? `: ${char.description}` : ''
      lines.push(`• ${char.name}${role}${desc}`)
      if (char.appearanceDescription && char.appearanceDescription !== char.description) {
        lines.push(`  Appearance: ${char.appearanceDescription}`)
      }
      if (char.wardrobes?.length) {
        for (const w of char.wardrobes) {
          const def = w.isDefault ? ' [Default]' : ''
          const sc =
            w.sceneNumbers && w.sceneNumbers.length > 0
              ? ` (Scenes: ${w.sceneNumbers.join(', ')})`
              : ''
          const details = [w.description, w.accessories ? `Accessories: ${w.accessories}` : undefined]
            .filter(Boolean)
            .join(' — ')
          lines.push(`  - Wardrobe [${w.name}${def}${sc}]${details ? `: ${details}` : ''}`)
        }
      } else if (char.defaultWardrobe) {
        lines.push(`  - Wardrobe [Default]: ${char.defaultWardrobe}`)
      }
    }
    lines.push('')
  }

  // Scenes
  for (const scene of script.scenes) {
    if (opts.includeChapters && scene.chapter?.isFirstSceneInChapter) {
      lines.push('='.repeat(72))
      const chapTitle = scene.chapter.title
        ? `${scene.chapter.heading.toUpperCase()} — ${scene.chapter.title.toUpperCase()}`
        : scene.chapter.heading.toUpperCase()
      lines.push(chapTitle)
      if (scene.chapter.description) {
        lines.push(scene.chapter.description)
      }
      lines.push('='.repeat(72))
      lines.push('')
    }

    lines.push('-'.repeat(72))
    const heading = scene.heading || `Scene ${scene.sceneNumber}`
    lines.push(opts.includeSceneNumbers ? `SCENE ${scene.sceneNumber}: ${heading}` : heading)
    if (opts.includeDurations && scene.duration) {
      lines.push(`Duration: ${formatDuration(scene.duration)}`)
    }
    if (opts.includeCharacterList && scene.sceneWardrobes?.length) {
      lines.push(
        `Scene Wardrobe: ${scene.sceneWardrobes
          .map(
            (sw) =>
              `${sw.characterName} (${sw.wardrobeName}${
                sw.description ? ` — ${sw.description}` : ''
              })`
          )
          .join(' | ')}`
      )
    }
    lines.push('-'.repeat(72))
    lines.push('')

    if (opts.includeSceneDescriptions && scene.sceneDescription) {
      lines.push('SCENE DESCRIPTION:')
      lines.push(scene.sceneDescription)
      lines.push('')
    } else if (opts.includeShotActionDialogue && scene.action && !scene.shots?.length) {
      lines.push(scene.action)
      lines.push('')
    }

    if (opts.includeSceneDirection && hasAnySceneDirectionFields(scene.sceneDirection)) {
      const sd = scene.sceneDirection!
      lines.push('SCENE DIRECTION:')
      if (sd.location) lines.push(`  Location & Set: ${sd.location}`)
      if (sd.atmosphere) lines.push(`  Atmosphere: ${sd.atmosphere}`)
      if (sd.keyProps?.length) lines.push(`  Key Objects: ${sd.keyProps.join(', ')}`)
      if (sd.camera) lines.push(`  Camera: ${sd.camera}`)
      if (sd.lighting) lines.push(`  Lighting: ${sd.lighting}`)
      if (sd.talent) lines.push(`  Talent & Blocking: ${sd.talent}`)
      if (sd.audio) lines.push(`  Audio: ${sd.audio}`)
      lines.push('')
    }

    if (scene.shots && scene.shots.length > 0) {
      for (const shot of scene.shots) {
        const showDir = opts.includeShotDirection && hasAnyShotDirectionFields(shot.shotDirection)
        const showProse = opts.includeShotActionDialogue
        if (!showDir && !showProse) continue

        const cam = shot.shotDirection?.cameraSummary ? ` | ${shot.shotDirection.cameraSummary}` : ''
        const dur =
          opts.includeDurations && shot.durationSeconds ? ` | ${shot.durationSeconds}s` : ''
        lines.push(`  [SHOT ${shot.shotNumber} • ${shot.kind.toUpperCase()}${cam}${dur}]`)

        if (showProse) {
          if (shot.kind === 'action') {
            const act = shot.actionDescription || shot.line
            if (act) lines.push(`  Action: ${act}`)
          } else {
            if (shot.actionDescription) {
              lines.push(`  Action: ${shot.actionDescription}`)
            }
            const speaker =
              shot.character || (shot.kind === 'narration' ? 'NARRATOR (V.O.)' : 'CHARACTER')
            const paren = shot.voiceDirection ? ` (${shot.voiceDirection.replace(/^\(|\)$/g, '')})` : ''
            if (shot.line) {
              lines.push(`  ${speaker}${paren}: "${shot.line}"`)
            }
          }
        }

        if (showDir && shot.shotDirection) {
          const sd = shot.shotDirection
          if (sd.stillDescription) lines.push(`  Still: ${sd.stillDescription}`)
          if (sd.castInFrame !== undefined) {
            lines.push(
              `  Cast: ${
                sd.castInFrame.length > 0 ? sd.castInFrame.join(', ') : 'No one on camera.'
              }`
            )
          }
          if (sd.blocking) lines.push(`  Blocking: ${sd.blocking}`)
          if (sd.emotion) lines.push(`  Emotion: ${sd.emotion}`)
          if (sd.lighting) lines.push(`  Lighting: ${sd.lighting}`)
          if (sd.audio) lines.push(`  Audio: ${sd.audio}`)
          if (sd.props?.length) lines.push(`  Props: ${sd.props.join(', ')}`)
        }
        lines.push('')
      }
    } else if (opts.includeShotActionDialogue) {
      if (scene.narration) {
        lines.push(`[NARRATION] ${scene.narration}`)
        lines.push('')
      }
      if (scene.dialogue?.length) {
        for (const d of scene.dialogue) {
          const paren = d.parenthetical ? ` (${d.parenthetical.replace(/^\(|\)$/g, '')})` : ''
          lines.push(`${d.character}${paren}: "${d.line}"`)
        }
        lines.push('')
      }
    }

    if (opts.includeNotes && !opts.includeSceneDirection) {
      if (scene.visualNotes) lines.push(`[Visual Notes] ${scene.visualNotes}`)
      if (scene.audioNotes) lines.push(`[Audio Notes] ${scene.audioNotes}`)
    }

    lines.push('')
  }

  lines.push('='.repeat(72))
  lines.push('END')
  lines.push('='.repeat(72))

  return lines.join('\n')
}

/**
 * Export script to JSON format (for backup/transfer)
 */
export function exportToJSON(
  script: ScriptData,
  _options: Partial<ExportScriptOptions> = {}
): string {
  return JSON.stringify(
    {
      ...script,
      exportedAt: new Date().toISOString(),
      version: '2.0',
    },
    null,
    2
  )
}

/**
 * Export scene direction notes
 */
export function exportSceneDirection(script: ScriptData): string {
  const lines: string[] = []

  lines.push('='.repeat(60))
  lines.push('SCENE & SHOT DIRECTION NOTES')
  lines.push(`Project: ${script.title}`)
  lines.push('='.repeat(60))
  lines.push('')

  for (const scene of script.scenes) {
    lines.push(`SCENE ${scene.sceneNumber}: ${scene.heading || 'Untitled'}`)
    lines.push('-'.repeat(40))

    if (scene.characters?.length) {
      lines.push(`Characters: ${scene.characters.join(', ')}`)
    }

    if (scene.duration) {
      lines.push(`Duration: ${formatDuration(scene.duration)}`)
    }

    lines.push('')

    if (scene.sceneDescription) {
      lines.push('SCENE DESCRIPTION:')
      lines.push(scene.sceneDescription)
      lines.push('')
    }

    if (scene.sceneDirection && hasAnySceneDirectionFields(scene.sceneDirection)) {
      lines.push('SCENE DIRECTION:')
      const sd = scene.sceneDirection
      if (sd.location) lines.push(`  Location & Set: ${sd.location}`)
      if (sd.atmosphere) lines.push(`  Atmosphere: ${sd.atmosphere}`)
      if (sd.keyProps?.length) lines.push(`  Key Objects: ${sd.keyProps.join(', ')}`)
      if (sd.camera) lines.push(`  Camera: ${sd.camera}`)
      if (sd.lighting) lines.push(`  Lighting: ${sd.lighting}`)
      if (sd.talent) lines.push(`  Talent & Blocking: ${sd.talent}`)
      if (sd.audio) lines.push(`  Audio: ${sd.audio}`)
      lines.push('')
    } else {
      if (scene.visualNotes) {
        lines.push('VISUAL DIRECTION:')
        lines.push(scene.visualNotes)
        lines.push('')
      }
      if (scene.audioNotes) {
        lines.push('AUDIO DIRECTION:')
        lines.push(scene.audioNotes)
        lines.push('')
      }
    }

    if (scene.shots?.length) {
      lines.push('SHOT DIRECTION:')
      for (const shot of scene.shots) {
        const cam = shot.shotDirection?.cameraSummary ? ` — ${shot.shotDirection.cameraSummary}` : ''
        lines.push(`  Shot ${shot.shotNumber} [${shot.kind.toUpperCase()}]${cam}`)
        if (shot.shotDirection?.stillDescription) {
          lines.push(`    Still: ${shot.shotDirection.stillDescription}`)
        }
        if (shot.shotDirection?.blocking) {
          lines.push(`    Blocking: ${shot.shotDirection.blocking}`)
        }
        if (shot.shotDirection?.lighting) {
          lines.push(`    Lighting: ${shot.shotDirection.lighting}`)
        }
        if (shot.shotDirection?.audio) {
          lines.push(`    Audio: ${shot.shotDirection.audio}`)
        }
      }
      lines.push('')
    }

    lines.push('')
  }

  return lines.join('\n')
}

export function safeScriptExportFilename(title: string): string {
  const base = (title || 'Untitled_Script').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
  return base || 'Untitled_Script'
}

export function exportScriptByFormat(
  script: ScriptData,
  format: ExportScriptFormat,
  options: Partial<ExportScriptOptions> = {}
): { content: string; filename: string; mimeType: string; extension: string } {
  const safeTitle = safeScriptExportFilename(script.title)
  switch (format) {
    case 'fdx':
      return {
        content: exportToFDX(script, options),
        filename: `${safeTitle}.fdx`,
        mimeType: 'application/xml',
        extension: 'fdx',
      }
    case 'fountain':
      return {
        content: exportToFountain(script, options),
        filename: `${safeTitle}.fountain`,
        mimeType: 'text/plain',
        extension: 'fountain',
      }
    case 'markdown':
      return {
        content: exportToMarkdown(script, options),
        filename: `${safeTitle}.md`,
        mimeType: 'text/markdown',
        extension: 'md',
      }
    case 'text':
      return {
        content: exportToText(script, options),
        filename: `${safeTitle}.txt`,
        mimeType: 'text/plain',
        extension: 'txt',
      }
    case 'direction':
      return {
        content: exportSceneDirection(script),
        filename: `${safeTitle}_scene_direction.txt`,
        mimeType: 'text/plain',
        extension: 'txt',
      }
    case 'json':
    default:
      return {
        content: exportToJSON(script, options),
        filename: `${safeTitle}.json`,
        mimeType: 'application/json',
        extension: 'json',
      }
  }
}

/**
 * Trigger browser download of exported content
 */
export function downloadExport(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper functions

export function formatDuration(seconds: number): string {
  if (!seconds) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function wrapText(text: string, maxWidth: number): string {
  if (!text) return ''

  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) lines.push(currentLine)

  return lines.join('\n')
}
