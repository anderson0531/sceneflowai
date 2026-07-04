import {
  migrateProjectToBeats,
  migrateProjectBeatsToStartFrameOnly,
  embedCharacterIdsInSceneBeats,
  ensureSceneBeats,
} from '@/lib/script/beatMigration'
import { migrateProjectToSegmented } from '@/lib/script/migrateToSegmented'
import {
  parseScript,
  toTreatmentVariant,
  toVisionPhaseFormat,
  type ParsedScript,
} from '@/lib/script/scriptParser'
import type { ValidationResult } from '@/lib/script/scriptValidator'

export interface BuildImportedMetadataOptions {
  parsedScript: ParsedScript
  importCompletenessScore?: number
  importGapsResolved?: boolean
  genre?: string
}

export interface BuildImportedMetadataResult {
  metadata: Record<string, unknown>
  projectTitle: string
  totalDuration: number
  genre: string
  sceneCount: number
  characterCount: number
}

function inferGenreFromScript(parsedScript: ParsedScript): string {
  const content = [
    parsedScript.title || '',
    ...(parsedScript.scenes?.map((s) => s.action || s.heading || '') || []),
    ...(parsedScript.scenes?.flatMap((s) => s.dialogue?.map((d) => d.text) || []) || []),
  ]
    .join(' ')
    .toLowerCase()

  const genreKeywords: Record<string, string[]> = {
    comedy: ['funny', 'laugh', 'joke', 'hilarious', 'comedy'],
    drama: ['emotional', 'tears', 'heartbreak', 'drama', 'conflict'],
    thriller: ['suspense', 'tension', 'danger', 'thriller', 'chase'],
    horror: ['scary', 'terrifying', 'monster', 'horror', 'scream'],
    romance: ['love', 'romantic', 'kiss', 'heart', 'romance'],
    documentary: ['documentary', 'interview', 'narrator explains', 'real world'],
  }

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some((kw) => content.includes(kw))) return genre
  }
  return 'drama'
}

/** Build full project metadata for script import bypass (no generate-script-v2). */
export function buildImportedVisionMetadata(
  options: BuildImportedMetadataOptions
): BuildImportedMetadataResult {
  const { parsedScript, importCompletenessScore, importGapsResolved = false, genre } = options
  const visionPhaseRaw = toVisionPhaseFormat(parsedScript)
  const treatmentVariant = toTreatmentVariant(parsedScript)

  const charactersWithIds = (visionPhaseRaw.characters || []).map((c: Record<string, unknown>, index: number) => ({
    ...c,
    id: `char-${index + 1}`,
    approved: false,
    portraitUrl: null,
    voiceId: null,
    voiceSettings: null,
  }))

  const flatScenes = (visionPhaseRaw.script?.scenes || []).map((scene: Record<string, unknown>, index: number) => {
    const withBeats = ensureSceneBeats(scene as Record<string, unknown>)
    return embedCharacterIdsInSceneBeats(withBeats, charactersWithIds)
  })

  const totalDuration = parsedScript.metadata?.totalDuration || flatScenes.reduce(
    (sum: number, s: Record<string, unknown>) => sum + (Number(s.duration) || 0),
    0
  )

  const projectTitle = (parsedScript.title || 'Imported Script').slice(0, 255)
  const resolvedGenre = (genre || inferGenreFromScript(parsedScript)).slice(0, 100)
  const validatedDuration = Math.max(300, Math.min(totalDuration || 300, 14400))

  const scriptBlob = {
    title: parsedScript.title,
    logline: treatmentVariant.synopsis?.slice(0, 200) || '',
    script: { scenes: flatScenes },
    characters: charactersWithIds,
    totalDuration: totalDuration || validatedDuration,
  }

  const interimMetadata: Record<string, unknown> = {
    importedScript: true,
    importedAt: new Date().toISOString(),
    importSource: 'script-import',
    originalFormat: parsedScript.metadata?.format || 'unknown',
    importCompletenessScore: importCompletenessScore ?? null,
    importGapsResolved,
    parsedScriptData: {
      title: parsedScript.title,
      author: parsedScript.metadata?.author,
      draft: parsedScript.metadata?.draft,
      totalDuration: parsedScript.metadata?.totalDuration,
      sceneCount: parsedScript.scenes?.length || 0,
      characterCount: parsedScript.characters?.length || 0,
    },
    filmTreatmentVariant: {
      ...treatmentVariant,
      id: treatmentVariant.id || `imported-${Date.now()}`,
      label: 'Imported Script',
      source: 'script-import',
    },
    visionPhase: {
      scriptGenerated: true,
      charactersGenerated: true,
      scenesGenerated: true,
      script: scriptBlob,
      characters: charactersWithIds,
      scenes: flatScenes,
      production: {},
      importSource: 'script-import',
      importOnboardingDismissed: false,
    },
  }

  let metadataToPersist = interimMetadata
  try {
    const segmentResult = migrateProjectToSegmented(interimMetadata)
    const beatResult = migrateProjectToBeats(segmentResult.metadata)
    const startFrameResult = migrateProjectBeatsToStartFrameOnly(beatResult.metadata)
    metadataToPersist = startFrameResult.metadata as Record<string, unknown>
  } catch (err) {
    console.warn('[buildImportedVisionMetadata] Migration failed; using flat shape', err)
  }

  return {
    metadata: metadataToPersist,
    projectTitle,
    totalDuration: validatedDuration,
    genre: resolvedGenre,
    sceneCount: flatScenes.length,
    characterCount: charactersWithIds.length,
  }
}

/** Re-parse raw text into ParsedScript (server-side convenience). */
export function parseScriptForImport(text: string, validation?: ValidationResult): ParsedScript {
  return parseScript(text, validation)
}
