import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { v4 as uuidv4 } from 'uuid'
import { toCanonicalName, generateAliases } from '@/lib/character/canonical'
import { buildCharacterDialogueExamples } from '@/lib/character/characterNamingPrompt'
import { SubscriptionService } from '../../../../services/SubscriptionService'
import { runScriptQA, autoFixScript } from '@/lib/script/qualityAssurance'
import { generateText } from '@/lib/vertexai/gemini'
import { getScriptGenerationModel } from '@/lib/config/modelConfig'
import { getSettingsForFormat, getScriptProgressStatuses, buildScriptConstraintPrompt } from '@/lib/script/scriptGenerationRules'
import {
  extractBlueprintBeats,
  formatBlueprintBeatsForPrompt,
  formatDecompositionPromptBlock,
  planSceneDecomposition,
  renumberScenes,
  splitOversizedScenes,
  MAX_BEATS_PER_SCENE,
  type SceneDecompositionPlan,
} from '@/lib/script/sceneDecomposition'
import {
  buildFallbackSceneChunks,
  buildSceneChunks,
  halveChunk,
  summarizeChunkYield,
  type SceneChunk,
} from '@/lib/script/sceneChunkPlan'
import {
  consolidateFragmentedScenes,
  consolidateToTargetCount,
} from '@/lib/script/sceneConsolidation'
import { runWithConcurrencyLimit } from '@/lib/utils/concurrency'
import { resolveContentIntentFromMetadata, buildPacingPhilosophyBlock } from '@/lib/content/contentIntent'
import { migrateProjectToSegmented } from '@/lib/script/migrateToSegmented'
import { normalizeDialogueToProductionLineTargets } from '@/lib/script/segmentScript'
import {
  ensureSceneBeats,
  embedCharacterIdsInSceneBeats,
  migrateProjectToBeats,
  migrateProjectBeatDirection,
  migrateProjectBeatsToStartFrameOnly,
} from '@/lib/script/beatMigration'
import {
  creditLinesJsonForPrompt,
  ensureCinematicBookends,
} from '@/lib/script/cinematicBookends'
import {
  attachSceneDirectionsToScript,
  readScenesFromVisionMetadata,
  writeScenesIntoVisionMetadata,
} from '@/lib/sceneGeneration/attachSceneDirectionsToScript'
import {
  buildBeatDirectionPromptBlock,
  buildBeatDirectionSchemaExample,
  buildBeatTimelineNarrationRules,
  buildNarrationPromptSection,
  buildNarrationSchemaExample,
  enforceNarrationPolicyOnScenes,
  resolveNarrationPolicy,
  type NarrationPolicy,
} from '@/lib/script/narrationPolicy'
import { adaptPromptForLyria, LYRIA_MUSIC_PROMPT_RULES } from '@/lib/audio/lyriaPromptAdapter'
import { loadContinuityContextForProject } from '@/lib/series/continuityContext'
import { resolveStoryLocale } from '@/i18n/server/storyLocale'
import { buildProperNounGlossary, localeDirective } from '@/lib/prompts/localeDirective'
import {
  buildFoundationPromptBlock,
  getArtStylePresetName,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'
import {
  buildLongformScriptLengthBlock,
  buildScriptCraftPromptBlock,
} from '@/lib/script/scriptCraftPrompt'
export const runtime = 'nodejs'
export const maxDuration = 600  // 10 minutes for large script generation (requires Vercel Pro)

/** Wall-clock budget for this route, mirroring `maxDuration` / vercel.json. */
const ROUTE_BUDGET_MS = maxDuration * 1000

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { projectId } = await request.json()
        
        if (!projectId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'projectId required' 
          })}\n\n`))
          controller.close()
          return
        }

        await sequelize.authenticate()
        let project = await Project.findByPk(projectId)
        
        if (!project) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'Project not found' 
          })}\n\n`))
          controller.close()
          return
        }

        // Retry logic for intermittent cold-start issues where metadata may not
        // be fully hydrated on first load (Vercel serverless connection pool timing)
        let treatment = project.metadata?.filmTreatmentVariant
        if (!treatment) {
          console.warn('[Script Gen V2] Film treatment not found on first load, retrying...', {
            projectId,
            hasMetadata: !!project.metadata,
            metadataKeys: project.metadata ? Object.keys(project.metadata) : [],
            hasVisionPhase: !!project.metadata?.visionPhase,
          })
          
          // Retry up to 2 times with increasing delay
          for (let retry = 1; retry <= 2; retry++) {
            await new Promise(resolve => setTimeout(resolve, retry * 1000))
            
            // Force fresh DB read
            project = await Project.findByPk(projectId, {
              rejectOnEmpty: false,
            })
            
            treatment = project?.metadata?.filmTreatmentVariant
            if (treatment) {
              console.log(`[Script Gen V2] Film treatment found on retry ${retry}`)
              break
            }
            console.warn(`[Script Gen V2] Retry ${retry}/2: still no film treatment`, {
              hasMetadata: !!project?.metadata,
              metadataKeys: project?.metadata ? Object.keys(project.metadata) : [],
            })
          }
          
          if (!treatment) {
            console.error('[Script Gen V2] Film treatment not found after 2 retries', {
              projectId,
              hasMetadata: !!project?.metadata,
              metadataKeys: project?.metadata ? Object.keys(project.metadata) : [],
              hasFilmTreatment: !!project?.metadata?.filmTreatment,
              hasVisionPhase: !!project?.metadata?.visionPhase,
            })
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'No film treatment found. Please go back to Blueprint and generate a Film Treatment first, then return to Production.' 
            })}\n\n`))
            controller.close()
            return
          }
        } else {
          console.log('[Script Gen V2] Film treatment found on first load', {
            projectId,
            treatmentTitle: treatment.title,
            hasSynopsis: !!treatment.synopsis,
            hasBeats: !!treatment.beats || !!treatment.story_beats,
          })
        }

        // Simple duration-based safety cap (no scene-count prescriptions)
        const rawDuration = project.duration || 300
        const projectFormat = treatment.format || project.metadata?.format || 'short-film'
        const contentIntent =
          project.metadata?.contentIntent ||
          resolveContentIntentFromMetadata({ format: projectFormat, genre: treatment.genre })
        
        // Duration validation: cap based on format to prevent unreasonable generation times
        // Short films: max 40 min (2400s), Features: max 180 min (10800s)
        const maxDurationByFormat: Record<string, number> = {
          'short-film': 2400,      // 40 minutes max
          'feature': 10800,        // 180 minutes max
          'pilot': 3600,           // 60 minutes max
          'series-episode': 3600,  // 60 minutes max
          'commercial': 180,       // 3 minutes max
          'music-video': 600,      // 10 minutes max
        }
        const maxAllowedDuration = maxDurationByFormat[projectFormat] || 2400
        const duration = Math.min(rawDuration, maxAllowedDuration)
        
        if (rawDuration > maxAllowedDuration) {
          console.warn(`[Script Gen V2] Duration ${rawDuration}s exceeds max for ${projectFormat} (${maxAllowedDuration}s). Capping to ${duration}s.`)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'warning', 
            message: `Duration capped from ${Math.round(rawDuration/60)} minutes to ${Math.round(duration/60)} minutes (max for ${projectFormat})` 
          })}\n\n`))
        }
        
        // Blueprint beats (canonical: treatment.beats)
        const storyBeats = extractBlueprintBeats(treatment)
        const beatCount = storyBeats.length || 7
        const decompositionPlan: SceneDecompositionPlan =
          storyBeats.length > 0 ? planSceneDecomposition(storyBeats) : planSceneDecomposition([])

        const ABSOLUTE_MAX_SCENES = 120
        const formatTargetScenes = getSettingsForFormat(projectFormat).targetSceneCount || 40

        // The chunk plan decides how many scenes each Blueprint beat gets, and
        // generation asks for that many per call. Leaving the count to prompt
        // prose let the model collapse a 10-minute beat into one scene, because
        // the full script never fit in a single response's token budget.
        const chunkPlan =
          decompositionPlan.entries.length > 0
            ? buildSceneChunks(decompositionPlan, storyBeats)
            : buildFallbackSceneChunks(Math.min(ABSOLUTE_MAX_SCENES, formatTargetScenes))
        const plannedScenes = chunkPlan.totalScenes
        const plannedScenesByBeatIndex: Record<number, number> = {}
        for (const entry of decompositionPlan.entries) {
          plannedScenesByBeatIndex[entry.index] = entry.targetScenes
        }

        console.log(
          `[Script Gen V2] Format: ${projectFormat}, Duration: ${duration}s, Blueprint beats: ${beatCount}, planned scenes: ${plannedScenes}`
        )
        console.log(
          `[Script Gen V2] Chunked generation: ${chunkPlan.chunks.length} call(s) — ${chunkPlan.chunks
            .map((c) => `beat ${c.blueprintBeatIndex === null ? '-' : c.blueprintBeatIndex + 1}:${c.sceneCount}`)
            .join(', ')}`
        )
        
        // Check scene limits for user's subscription tier
        let subscriptionMaxScenes: number | null = null
        try {
          const userId = (project as any).user_id
          if (userId) {
            const sceneLimits = await SubscriptionService.checkSceneLimits(userId, projectId)
            if (sceneLimits.maxScenes !== null) {
              subscriptionMaxScenes = sceneLimits.maxScenes
              console.log(`[Script Gen V2] User subscription scene limit: ${sceneLimits.maxScenes}`)
            }
          }
        } catch (error) {
          // If limit check fails, log but don't block generation (fail open)
          console.warn('[Script Gen V2] Scene limit check failed:', error)
        }

        // Load existing characters - defer alias generation for memory optimization
        let existingCharacters = (project.metadata?.visionPhase?.characters || []).map((c: any) => ({
          ...c,
          id: c.id || uuidv4(),
          name: toCanonicalName(c.name || c.displayName || '') // Normalize to canonical format
        }))
    
        if (existingCharacters.length === 0 && treatment.character_descriptions) {
          existingCharacters = treatment.character_descriptions.map((c: any) => ({
            ...c,
            id: c.id || uuidv4(),
            name: toCanonicalName(c.name || ''), // Normalize to canonical format
            version: 1,
            lastModified: new Date().toISOString(),
            referenceImage: c.referenceImage || null,
            generating: false,
          }))
          
          await project.update({
            metadata: {
              ...project.metadata,
              visionPhase: {
                ...(project.metadata?.visionPhase || {}),
                characters: existingCharacters,
              }
            }
          })
          
          console.log(`[Script Gen V2] Auto-synced ${existingCharacters.length} characters from Film Treatment`)
        }

        // ============================================================
        // CHUNKED GENERATION: one call per Blueprint beat slice
        // ============================================================
        let allScenes: any[] = []
        
        // Time-based progress tracking
        const generationStartTime = Date.now()
        // Bookends are appended after generation, so the client's total includes them.
        const expectedTotalScenes = plannedScenes + 2

        // Send initial progress
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: 'Analyzing story structure...',
          batch: 1,
          scenesGenerated: 0,
          totalScenes: expectedTotalScenes,
          elapsedSeconds: 0,
          estimatedRemainingSeconds: 60  // Conservative initial estimate
        })}\n\n`))

        console.log(
          `[Script Gen V2] Starting chunked generation for ${duration}s film: ${plannedScenes} planned scenes across ${beatCount} Blueprint beats`
        )

        const narrationPolicy = resolveNarrationPolicy({
          format: projectFormat,
          treatment,
          contentIntent,
        })
        console.log(`[Script Gen V2] Narration policy: mode=${narrationPolicy.mode}, allowPerScene=${narrationPolicy.allowPerSceneNarration}`)

        // Load series continuity context if this project belongs to a series
        let seriesContinuityBlock = ''
        let referenceCatalogBlock = ''
        if ((project as any).series_id) {
          try {
            const continuityCtx = await loadContinuityContextForProject(project)
            if (continuityCtx) {
              seriesContinuityBlock = continuityCtx.continuityPromptBlock
              console.log(
                `[Script Gen V2] Series continuity loaded: Ep ${continuityCtx.currentEpisodeNumber}/${continuityCtx.totalEpisodes}, ${continuityCtx.activeStoryThreads.length} active threads`
              )
            }
          } catch (err) {
            console.warn('[Script Gen V2] Failed to load series continuity context:', err)
          }
        }

        try {
          const userId = (project as any).user_id
          if (userId && projectId) {
            const { loadProjectReferenceCatalog } = await import('@/lib/referenceLibrary/catalogLoader')
            const { formatReferenceCatalogForPrompt } = await import('@/lib/referenceLibrary/projection')
            const catalog = await loadProjectReferenceCatalog(projectId, userId)
            if (
              catalog.characters.length + catalog.locations.length + catalog.props.length >
              0
            ) {
              referenceCatalogBlock = formatReferenceCatalogForPrompt(catalog)
            }
          }
        } catch (err) {
          console.warn('[Script Gen V2] Failed to load reference catalog:', err)
        }
        
        // Dialogue and narration are performed by TTS, so the script has to be
        // written in the language the treatment is in.
        const { storyLocale, properNouns } = await resolveStoryLocale({
          projectId,
          userIdOrEmail: (project as any).user_id,
        })

        // Story context is identical for every chunk, so build it once.
        const sharedContext = buildSharedScriptContext(
          treatment,
          duration,
          existingCharacters,
          storyBeats,
          projectFormat,
          contentIntent,
          narrationPolicy,
          seriesContinuityBlock,
          localeDirective(storyLocale, {
            properNouns: buildProperNounGlossary(
              { characters: existingCharacters ?? [] },
              properNouns
            ),
          }),
          referenceCatalogBlock,
          decompositionPlan
        )

        let sceneLimitWarning: { generated: number; allowed: number } | null = null
        let scenesGenerated = 0
        let chunksDone = 0

        const progressStatuses = getScriptProgressStatuses(projectFormat)
        let statusIndex = 0
        const emitGenerationProgress = (status: string) => {
          const elapsed = Math.floor((Date.now() - generationStartTime) / 1000)
          // 10–85% covers generation; the remainder is post-processing.
          const progress = Math.min(
            85,
            10 + Math.floor((chunksDone / Math.max(1, chunkPlan.chunks.length)) * 75)
          )
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              status,
              batch: chunksDone + 1,
              scenesGenerated,
              totalScenes: expectedTotalScenes,
              elapsedSeconds: elapsed,
              estimatedRemainingSeconds: Math.max(
                5,
                Math.round(
                  (elapsed / Math.max(1, chunksDone)) * (chunkPlan.chunks.length - chunksDone)
                ) || 45
              ),
              progress,
            })}\n\n`))
          } catch {
            // A disconnected client must not abort generation from a timer.
          }
        }

        emitGenerationProgress('Writing scenes...')
        const progressInterval = setInterval(() => {
          emitGenerationProgress(progressStatuses[statusIndex++ % progressStatuses.length])
        }, 5000)

        let chunkResults: any[][] = []
        try {
          chunkResults = await runWithConcurrencyLimit(
            chunkPlan.chunks,
            CHUNK_CONCURRENCY,
            (chunk) =>
              // One failed chunk must cost its own scenes, not the whole script.
              generateSceneChunk(sharedContext, chunk, {
                storyBeats,
                totalScenes: plannedScenes,
                onChunkScenes: (count) => {
                  scenesGenerated += count
                  chunksDone++
                },
              }).catch((err) => {
                chunksDone++
                console.error(`[Script Gen V2] Chunk failed entirely (${describeChunk(chunk)}):`, err)
                return [] as any[]
              })
          )
        } finally {
          clearInterval(progressInterval)
        }

        // Chunk order is script order; runWithConcurrencyLimit preserves it.
        allScenes = chunkResults.flat()

        const chunkYield = summarizeChunkYield(
          chunkPlan.chunks,
          chunkResults.map((scenes) => scenes.length)
        )
        console.log(
          '[Script Gen V2] Blueprint beat yield:',
          chunkYield
            .map((y) => `${y.blueprintBeatIndex === null ? '-' : y.blueprintBeatIndex + 1} "${y.title}" ${y.produced}/${y.planned}`)
            .join(' | ')
        )

        if (allScenes.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: 'Script generation failed: the model returned no usable scenes.',
          })}\n\n`))
          controller.close()
          return
        }

        const underDecomposed = chunkYield.filter((y) => y.produced < y.planned)
        if (allScenes.length < plannedScenes * 0.7) {
          console.warn(
            `[Script Gen V2] Under-decomposed: ${allScenes.length} scenes vs ${plannedScenes} planned`
          )
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'warning',
            message: `Generated ${allScenes.length} scenes for a ${plannedScenes}-scene plan. Some Blueprint beats may be thinner than intended.`,
            underDecomposedBeats: underDecomposed.map((y) => y.title),
          })}\n\n`))
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: 'Assembling script...',
          batch: chunkPlan.chunks.length,
          scenesGenerated: allScenes.length,
          totalScenes: expectedTotalScenes,
          elapsedSeconds: Math.floor((Date.now() - generationStartTime) / 1000),
          estimatedRemainingSeconds: 10,
          progress: 88,
        })}\n\n`))

        // Beats are the story payload; derive the legacy dialogue/action/narration
        // fields now so character extraction, consolidation, and QA all see them.
        allScenes = allScenes.map((scene: any) => ensureSceneBeats(scene as Record<string, unknown>))
        allScenes = allScenes.map((scene: any) => ({
          ...scene,
          dialogue: normalizeDialogueToProductionLineTargets(
            Array.isArray(scene?.dialogue) ? scene.dialogue : []
          ),
        }))

        // Consolidate first: merging after a split would undo it.
        allScenes = consolidateFragmentedScenes(allScenes)

        // Safety net for any scene that still exceeds the production beat cap.
        const splitResult = splitOversizedScenes(allScenes as Record<string, unknown>[])
        if (splitResult.splitCount > 0) {
          console.log(
            `[Script Gen V2] Split ${splitResult.splitCount} oversized scene(s) to enforce ${MAX_BEATS_PER_SCENE}-beat cap`
          )
        }
        allScenes = renumberScenes(splitResult.scenes)

        const bookendsResult = ensureCinematicBookends(allScenes, {
          title: treatment.title,
          logline: treatment.logline,
          genre: treatment.genre,
          tone: treatment.tone,
          author_writer: treatment.author_writer,
        })
        allScenes = bookendsResult.scenes
        if (bookendsResult.injectedTitle || bookendsResult.injectedOutro) {
          console.log('[Script Gen V2] Injected cinematic bookends:', {
            injectedTitle: bookendsResult.injectedTitle,
            injectedOutro: bookendsResult.injectedOutro,
          })
        }

        allScenes = enforceNarrationPolicyOnScenes(allScenes, narrationPolicy)

        // Business limit: warn but keep full script (do not silently truncate).
        if (subscriptionMaxScenes && allScenes.length > subscriptionMaxScenes) {
          console.warn(
            `[Script Gen V2] Generated ${allScenes.length} scenes, exceeds subscription limit ${subscriptionMaxScenes}. Keeping full script with warning.`
          )
          sceneLimitWarning = {
            generated: allScenes.length,
            allowed: subscriptionMaxScenes,
          }
        }

        // We no longer force-merge scenes down to a duration-derived count —
        // that used to cut creative scenes/beats to hit a runtime. Only guard
        // against true runaway output well beyond the absolute ceiling.
        if (allScenes.length > ABSOLUTE_MAX_SCENES) {
          console.warn(`[Script Gen V2] Generated ${allScenes.length} scenes exceeds absolute cap of ${ABSOLUTE_MAX_SCENES}. Consolidating runaway output.`)
          allScenes = consolidateToTargetCount(allScenes, ABSOLUTE_MAX_SCENES)
        }

        console.log(
          `[Script Gen V2] Chunked generation complete: ${allScenes.length} scenes (planned ${plannedScenes} + bookends)`
        )

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: `Generated ${allScenes.length} complete scenes`,
          batch: chunkPlan.chunks.length,
          scenesGenerated: allScenes.length,
          totalScenes: allScenes.length,
          elapsedSeconds: Math.floor((Date.now() - generationStartTime) / 1000),
          estimatedRemainingSeconds: 3,
          progress: 92,
        })}\n\n`))
    
        // Process characters and embed IDs (existing logic)
        const includeNarratorChars =
          narrationPolicy.allowNarration || narrationPolicy.blueprintHasNarrator
        const dialogueChars = extractCharacters(allScenes, includeNarratorChars)
        const existingCharNamesNormalized = existingCharacters.map((c: any) => 
          normalizeCharacterName(c.name || '')
        )
        const newChars = dialogueChars.filter((c: any) => 
          !existingCharNamesNormalized.includes(normalizeCharacterName(c.name || ''))
        )
        
        const allCharacters = [
          ...existingCharacters,
          ...newChars.map((c: any) => ({
            ...c,
            id: uuidv4(),
            name: toCanonicalName(c.name || ''), // Normalize to canonical format
            role: c.role || 'supporting',
            imagePrompt: `Professional character portrait: ${c.name}, ${c.description}, photorealistic, high detail, studio lighting, neutral background, character design, 8K quality`,
            referenceImage: null,
            generating: false
          }))
        ]

        // Character name validation is now handled during embedding step (below)
        // Removing separate validation to reduce memory overhead

        // Embed characterId in dialogue using canonical matching (with memory optimization)
        // Cache aliases per character to avoid regenerating repeatedly
        // Enhanced alias cache includes original name for comprehensive matching
        const aliasCache = new Map<string, string[]>()
        const getCachedAliases = (char: any): string[] => {
          const cacheKey = char.id || char.name
          if (!aliasCache.has(cacheKey)) {
            const aliases = generateAliases(toCanonicalName(char.name), char.name)
            aliasCache.set(cacheKey, aliases)
          }
          return aliasCache.get(cacheKey)!
        }
        
        // Track name normalizations for logging
        let normalizedCount = 0
        
        const scenesWithCharacterIds = allScenes.map((scene: any) => {
          const withDialogue = {
            ...scene,
            dialogue: scene.dialogue?.map((d: any) => {
            if (!d.character) return d
            
            const originalDialogueName = d.character
            const normalizedDialogueName = toCanonicalName(d.character)
            const dialogueNameUpper = d.character.toUpperCase().trim()
            
            // Try exact match first (case-insensitive after normalization)
            let character = allCharacters.find((c: any) => 
              toCanonicalName(c.name) === normalizedDialogueName
            )
            
            // Fallback 1: ALL CAPS match (common AI error: "BEN" should match "Ben")
            if (!character) {
              character = allCharacters.find((c: any) => 
                c.name.toUpperCase() === dialogueNameUpper
              )
            }
            
            // Fallback 2: Use cached aliases for matching (now includes ALL CAPS variants)
            if (!character) {
              character = allCharacters.find((c: any) => {
                const aliases = getCachedAliases(c)
                return aliases.some(alias => 
                  toCanonicalName(alias) === normalizedDialogueName ||
                  alias.toUpperCase() === dialogueNameUpper
                )
              })
            }
            
            // Log when we normalize a name
            if (character && character.name !== originalDialogueName) {
              normalizedCount++
              if (normalizedCount <= 5) { // Limit logging
                console.log(`[Script Gen V2] Character name normalized: "${originalDialogueName}" → "${character.name}"`)
              }
            }
            
            return {
              ...d,
              character: character ? character.name.toUpperCase() : d.character,
              characterId: character?.id
            }
          })
          }
          return embedCharacterIdsInSceneBeats(
            ensureSceneBeats(withDialogue as Record<string, unknown>),
            allCharacters
          )
        })
        
        if (normalizedCount > 0) {
          console.log(`[Script Gen V2] Total character names normalized: ${normalizedCount}`)
        }
        
        // Clear cache to free memory
        aliasCache.clear()

        const totalEstimatedDuration = allScenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
        
        const script = {
          title: treatment.title,
          logline: treatment.logline,
          script: { scenes: scenesWithCharacterIds },
          characters: allCharacters,
          totalDuration: totalEstimatedDuration
        }

        // Save to project - merge new characters with existing to preserve referenceImage
        const existingVisionPhase = project.metadata?.visionPhase || {}
        const savedCharacters = existingVisionPhase.characters || []
        
        // Create a map of existing characters by name for quick lookup
        const existingCharMap = new Map(savedCharacters.map((c: any) => [c.name?.toLowerCase(), c]))
        
        // Merge: use new character data but preserve referenceImage, voiceConfig, etc. from existing
        const mergedCharacters = allCharacters.map((newChar: any) => {
          const existingChar = existingCharMap.get(newChar.name?.toLowerCase())
          if (existingChar) {
            // Preserve generated data from existing character
            return {
              ...newChar,
              id: existingChar.id || newChar.id,
              referenceImage: existingChar.referenceImage || newChar.referenceImage,
              voiceConfig: existingChar.voiceConfig || newChar.voiceConfig,
              appearanceDescription: existingChar.appearanceDescription || newChar.appearanceDescription,
              visionDescription: existingChar.visionDescription || newChar.visionDescription,
              imageApproved: existingChar.imageApproved,
            }
          }
          return newChar
        })
        
        console.log('[Script Gen V2] Merged characters:', {
          existing: savedCharacters.length,
          new: allCharacters.length,
          merged: mergedCharacters.length,
          withReferenceImage: mergedCharacters.filter((c: any) => c.referenceImage).length
        })
        
        // Phase 3: Quality Assurance - Run QA and auto-fix
        let finalScenes = scenesWithCharacterIds
        try {
          const qaResult = runScriptQA(scenesWithCharacterIds, mergedCharacters, {
            plannedScenesByBeatIndex: plannedScenesByBeatIndex,
          })
          
          console.log('[Script Gen V2] QA Result:', {
            valid: qaResult.valid,
            errors: qaResult.issues.filter((i: any) => i.type === 'error').length,
            warnings: qaResult.issues.filter((i: any) => i.type === 'warning').length,
            unmatchedCharacters: qaResult.stats.unmatchedCharacters,
            missingEmotionTags: qaResult.stats.missingEmotionTags
          })
          
          // Auto-fix issues where possible
          if (qaResult.issues.some((i: any) => i.autoFixable)) {
            const { scenes: fixedScenes, fixedCount } = autoFixScript(
              scenesWithCharacterIds,
              mergedCharacters,
              qaResult
            )
            finalScenes = fixedScenes
            console.log(`[Script Gen V2] Auto-fixed ${fixedCount} issues`)
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'qa',
              status: 'Auto-fixed script quality issues',
              fixedCount,
              totalIssues: qaResult.issues.length
            })}\n\n`))
          }
          
          // Report QA warnings (but don't block)
          if (qaResult.stats.unmatchedCharacters.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'warning',
              message: `Found ${qaResult.stats.unmatchedCharacters.length} unmatched character names: ${qaResult.stats.unmatchedCharacters.join(', ')}`
            })}\n\n`))
          }
        } catch (qaError) {
          console.warn('[Script Gen V2] QA failed (non-blocking):', qaError)
        }
        
        // Update script with QA-fixed scenes
        const finalScript = {
          title: treatment.title,
          logline: treatment.logline,
          script: { scenes: finalScenes },
          characters: allCharacters,
          totalDuration: totalEstimatedDuration
        }

        // Build the metadata blob then run the segmented-script pass so newly
        // generated scenes land with `segments[]` populated. The pass also
        // mints stable lineIds/sfxIds and quantizes timing to Veo buckets.
        const interimMetadata = {
          ...project.metadata,
          visionPhase: {
            ...existingVisionPhase,
            script: finalScript,
            scriptGenerated: true,
            characters: mergedCharacters,
            scenes: finalScenes
          }
        }

        let metadataToPersist: any = interimMetadata
        try {
          const segmentResult = migrateProjectToSegmented(interimMetadata)
          const beatResult = migrateProjectToBeats(segmentResult.metadata)
          const startFrameResult = migrateProjectBeatsToStartFrameOnly(beatResult.metadata)
          metadataToPersist = startFrameResult.metadata
          if (segmentResult.changed) {
            console.log('[Script Gen V2] Segmented-script pass:', {
              migratedSceneCount: segmentResult.migratedSceneCount,
              alreadyMigratedSceneCount: segmentResult.alreadyMigratedSceneCount,
            })
          }
          if (beatResult.changed) {
            console.log('[Script Gen V2] Beat-first pass:', {
              migratedSceneCount: beatResult.migratedSceneCount,
            })
          }
          if (startFrameResult.changed) {
            console.log('[Script Gen V2] Start-frame-only pass:', {
              migratedSceneCount: startFrameResult.migratedSceneCount,
            })
          }
        } catch (segErr) {
          console.warn('[Script Gen V2] Segmented-script pass failed; persisting flat shape only', segErr)
        }

        // Attach detailed scene direction before the script is marked ready so
        // inception includes full DetailedSceneDirection (not a post-hoc client loop).
        let directionFailures: number[] = []
        let directionsAttached = false
        try {
          const scenesForDirection = readScenesFromVisionMetadata(metadataToPersist)
          if (scenesForDirection.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              status: 'Generating scene directions…',
              phase: 'direction',
              totalScenes: scenesForDirection.length,
            })}\n\n`))

            // Route budget is 600s (vercel.json). Leave ~90s for persistence and
            // the final migrations rather than letting direction consume it all.
            const directionDeadlineMs = Math.max(
              30_000,
              ROUTE_BUDGET_MS - (Date.now() - generationStartTime) - 90_000
            )

            const attachResult = await attachSceneDirectionsToScript(scenesForDirection, {
              deadlineMs: directionDeadlineMs,
              onProgress: (done, total) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'progress',
                  status: `Scene directions ${done}/${total}`,
                  phase: 'direction',
                  done,
                  total,
                })}\n\n`))
              },
            })
            metadataToPersist = writeScenesIntoVisionMetadata(
              metadataToPersist,
              attachResult.scenes
            )
            directionFailures = attachResult.directionFailures
            directionsAttached = attachResult.directionsAttached
            console.log('[Script Gen V2] Scene directions attached:', {
              attached: attachResult.attachedCount,
              skipped: attachResult.skippedCount,
              deferred: attachResult.deferredCount,
              failures: directionFailures,
            })
          }
        } catch (dirErr) {
          console.warn('[Script Gen V2] Direction attach failed (non-blocking):', dirErr)
        }

        try {
          const beatDirectionResult = migrateProjectBeatDirection(metadataToPersist)
          metadataToPersist = beatDirectionResult.metadata
          if (beatDirectionResult.changed) {
            console.log('[Script Gen V2] Beat-direction backfill:', {
              migratedSceneCount: beatDirectionResult.migratedSceneCount,
            })
          }
        } catch (bdErr) {
          console.warn('[Script Gen V2] Beat-direction backfill failed (non-blocking):', bdErr)
        }

        // Duration is now DERIVED from the script the model actually wrote,
        // rather than a target the content was forced to hit. Persist it so the
        // downstream video/cost/Veo budgeting reflects the real content length.
        const derivedDuration = Math.round(totalEstimatedDuration)
        await project.update({
          metadata: metadataToPersist,
          ...(derivedDuration > 0 ? { duration: derivedDuration } : {}),
        })
        if (derivedDuration > 0) {
          console.log(`[Script Gen V2] Derived project duration from script: ${derivedDuration}s (was ${project.duration || 'unset'}s)`)
        }

        // Send completion (single-pass is always complete, not partial)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          totalScenes: allScenes.length,
          totalDuration: totalEstimatedDuration,
          partial: false,
          expectedScenes: allScenes.length,
          projectId: projectId,
          directionsAttached,
          ...(directionFailures.length > 0 ? { directionFailures } : {}),
          ...(sceneLimitWarning ? { sceneLimitWarning } : {}),
        })}\n\n`))
        
        controller.close()
        
      } catch (error: any) {
        console.error('[Script Gen V2] Error:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/**
 * Story context every chunk call shares. Built once per request so per-chunk
 * prompts only append their own assignment block.
 */
interface SharedScriptContext {
  persona: string
  formatLabel: string
  sceneHeadingExample: string
  narrationSchemaLine: string
  beatDirectionSchema: string
  hasReferenceCatalog: boolean
  storyBlock: string
  craftBlock: string
  languageBlock: string
}

function buildSharedScriptContext(
  treatment: any,
  targetDuration: number,
  characters: any[],
  storyBeats: any[],
  format: string = 'narrative',
  contentIntent?: string,
  narrationPolicy?: NarrationPolicy,
  seriesContinuityBlock: string = '',
  languageBlock: string = '',
  referenceCatalogBlock: string = '',
  decompositionPlan?: SceneDecompositionPlan
): SharedScriptContext {
  const intent = contentIntent || resolveContentIntentFromMetadata({ format, genre: treatment.genre })
  const policy = narrationPolicy ?? resolveNarrationPolicy({ format, treatment, contentIntent })
  const scriptSettings = getSettingsForFormat(format)
  const constraintBlock = buildScriptConstraintPrompt(scriptSettings)
  const narrationSection = buildNarrationPromptSection(policy)
  // Catalog prop linkage only earns its output tokens when there is a catalog.
  const hasReferenceCatalog = Boolean(referenceCatalogBlock)
  const narrationSchemaLine = buildNarrationSchemaExample(policy, { compact: true })
  const beatTimelineNarrationRules = buildBeatTimelineNarrationRules(policy, { compact: true })
  const beatDirectionRules = buildBeatDirectionPromptBlock({
    compact: true,
    includeProps: hasReferenceCatalog,
  })
  const beatDirectionSchema = buildBeatDirectionSchemaExample({
    compact: true,
    includeProps: hasReferenceCatalog,
  })

  // Dynamically set persona based on format/intent
  let persona = 'You are a master screenwriter. Write a complete, production-ready script'
  let formatLabel = 'FILM'
  let sceneHeadingExample = '"heading": "INT. LOCATION - TIME"'
  let philosophyIntro = 'Your goal is to write an ENGAGING, CINEMATIC script optimized for audience connection and long-form storytelling.'

  if (format === 'educational' || format === 'education' || format === 'training') {
    persona = 'You are an expert curriculum designer and educational video producer. Write a complete, production-ready lesson script'
    formatLabel = 'EDUCATIONAL COURSE'
    sceneHeadingExample = '"heading": "LESSON SEGMENT: Topic"'
    philosophyIntro = 'Your goal is to write a CLEAR, ENGAGING instructional script optimized for learning outcomes. Do NOT invent fictional plot.'
  } else if (format === 'podcast' || format === 'interview') {
    persona = 'You are an expert podcast producer and showrunner. Write a complete, production-ready podcast script'
    formatLabel = 'PODCAST EPISODE'
    sceneHeadingExample = '"heading": "SEGMENT: Intro/Discussion/Outro"'
    philosophyIntro = 'Your goal is to write an AUTHENTIC conversational script. Do NOT invent fictional narrative plot.'
  } else if (format === 'documentary' || format === 'news') {
    persona = 'You are an expert documentary filmmaker and docuseries producer. Write a complete, production-ready docuseries script'
    formatLabel = 'DOCUMENTARY'
    philosophyIntro = 'Your goal is to write a COMPELLING factual script over real subjects. Do NOT fictionalize.'
  } else if (['product_demo', 'explainer', 'case_study', 'advertisement', 'demo', 'sales'].includes(format)) {
    persona = 'You are an expert commercial video producer. Write a complete, production-ready persuasive script'
    formatLabel = 'COMMERCIAL VIDEO'
    sceneHeadingExample = '"heading": "SEGMENT: Problem/Solution/Proof/CTA"'
    philosophyIntro = 'Your goal is to write a PERSUASIVE script with problem, solution, proof, and CTA. Do NOT convert into fictional screenplay.'
  } else if (intent !== 'fiction') {
    philosophyIntro = 'Your goal is to serve the user\'s content intent. Do NOT invent fictional characters or plot unless explicitly requested.'
  }

  // Build character list with strict name enforcement
  const characterNames = characters.map((c: any) => c.name)
  const characterList = characters.length > 0
    ? `\n\n=== CHARACTER NAME WHITELIST (MANDATORY) ===
You MUST use ONLY these EXACT character names in all dialogue attribution:
${characterNames.map(name => `• "${name}"`).join('\n')}

⚠️ CRITICAL: Do NOT modify these names in ANY way:
- Do NOT use ALL CAPS (wrong: "BEN", "DR. BEN ANDERSON")
- Do NOT abbreviate (wrong: "Ben" when full name is "Dr. Ben Anderson")
- Do NOT expand titles (wrong: "Doctor" when name uses "Dr.")
- Do NOT use first name only unless that IS the full character name

CHARACTER DETAILS:\n${characters.map((c: any) =>
        `• ${c.name}${c.role ? ` (${c.role})` : ''}: ${c.description || 'No description'}
        ${c.appearance ? `  Appearance: ${c.appearance}` : ''}
        ${c.demeanor ? `  Demeanor: ${c.demeanor}` : ''}`
      ).join('\n')}`
    : ''

  const storyBeatsText =
    storyBeats.length > 0 ? `\n\n${formatBlueprintBeatsForPrompt(storyBeats)}` : ''
  const decompositionBlock =
    decompositionPlan && decompositionPlan.entries.length > 0
      ? `\n\n${formatDecompositionPromptBlock(decompositionPlan)}`
      : ''

  const storyBlock = `${formatLabel} TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Genre: ${treatment.genre || 'Drama'}
Tone: ${treatment.tone || 'Engaging'}
Format: ${format}
Full Blueprint runtime: ~${Math.floor(targetDuration / 60)} minutes across the whole script. Your assignment below covers only part of it.

Synopsis:
${treatment.synopsis || treatment.content}
${characterList}
${characters.length > 0 ? `\n${buildCharacterDialogueExamples(characters)}` : ''}
${storyBeatsText}
${decompositionBlock}
${seriesContinuityBlock ? `\n${seriesContinuityBlock}` : ''}
${referenceCatalogBlock ? `\n${referenceCatalogBlock}` : ''}
${referenceCatalogBlock ? `\nREFERENCE ASSET SELECTION (MANDATORY):
- Assign libraryAssetId from the catalog to each scene character when a catalog match exists.
- Assign locationAssetId per scene heading when the location matches the catalog.
- Assign propAssetIds on beats for keyProps that match catalog props.
- List genuinely new assets in newAssets[] with kind, name, and description; do NOT auto-create without marking isNew: true.\n` : ''}

${buildFoundationPromptBlock(resolveVariantArtStyle(treatment), resolveVariantAspectRatio(treatment))}
${buildScriptCraftPromptBlock(treatment)}

=== VISUAL FOUNDATION (MANDATORY) ===
Art Style: ${getArtStylePresetName(resolveVariantArtStyle(treatment))}
Aspect Ratio: ${resolveVariantAspectRatio(treatment)}
- Action beat descriptions MUST use shot language appropriate for ${resolveVariantAspectRatio(treatment)} framing.
- Dialogue and atmosphere MUST reflect the locked ${getArtStylePresetName(resolveVariantArtStyle(treatment))} aesthetic.`

  const craftBlock = `=== SCRIPT GENERATION PHILOSOPHY ===

${philosophyIntro}

${buildPacingPhilosophyBlock(intent as any)}
${buildLongformScriptLengthBlock({ chunked: true })}
${constraintBlock}

STRUCTURE PRINCIPLES:
• Each scene = ONE complete dramatic unit with beginning, middle, end
• Natural breaks occur at: location changes, time jumps, act turns, POV shifts
• Dialogue-driven scenes: 4–8+ exchanges when speech carries the scene
• Visual/action-driven scenes: may be mostly action beats with little or no dialogue
• Do NOT create duplicate scenes for the same dialogue line.

VISUAL STORYTELLING (CRITICAL):
• Prefer ACTION beats for: reveals, reactions, geography, tension, montage, silent character moments
• Prefer DIALOGUE beats when speech advances conflict, relationship, or information that cannot be shown
• Do NOT fill scenes with talk when a visual beat tells it better — use silence and action as storytelling tools
• Show emotion through behavior, blocking, and camera before defaulting to exposition dialogue

WHAT TO AVOID:
❌ Fragmenting one discussion across multiple scenes
❌ One scene per line of dialogue
❌ Arbitrary breaks that disrupt flow
❌ Duplicate scenes containing the exact same dialogue

WHAT TO CREATE:
✓ Rich, substantive scenes with complete arcs
✓ Natural dialogue/monologues that sound like real conversation
✓ Content that advances BOTH the topic AND audience engagement
✓ Emotional beats that resonate with the audience
✓ A cohesive narrative following the story/lesson beats

DIALOGUE REQUIREMENTS:
• Every dialogue line MUST start with emotion tags: [emotion, delivery]
• Examples: [sadly, slowly], [excited, quickly], [whispering nervously], [teaching clearly, passionately]
• Use ellipses (...) for pauses, dashes (—) for interruptions
• Use CAPS for EMPHASIS on specific words

TECHNICAL REQUIREMENTS:
• CHARACTER NAMES: Copy-paste EXACTLY from the whitelist above - no variations!
  ✓ Correct: "Dr. Ben Anderson" (if that's the listed name)
  ✗ Wrong: "BEN", "Ben", "DR. BEN ANDERSON", "Doctor Ben Anderson"
• Include "sfx" and "music" for atmosphere
• Estimate realistic durations based on content

${LYRIA_MUSIC_PROMPT_RULES}

${narrationSection}

BEAT TIMELINE (CRITICAL — PRIMARY PRODUCTION SOURCE):
${beatTimelineNarrationRules}
• Action beats are MANDATORY for visuals without spoken lines: reactions, inserts, B-roll, camera moves, environment changes, blocking without speech
• Use action beats to carry story when dialogue would be redundant or expositional
• NEVER put stage directions in "line" — they belong in actionDescription
• Rhythm rule: intervening action only when that action adds NEW visual information — never to pad runtime or to break up speech on a clock
• Intervening action beats MUST be a new shot: insert, cutaway, geography/establishing, camera move, consequence, or a silent reaction on a NON-SPEAKER
• Do NOT insert an action beat that restates the speaker's blocking, gesture, or posture already implied by an adjacent dialogue beat — merge that physical business into the dialogue beat's staging instead of cloning it as a separate action frame
• actionDescription format: shot type + subject + motion/mood (e.g., "Close-up: hands trembling on keyboard, shallow DOF, cool blue light")
• One beat = one storyboard frame = one video segment — each action beat must be visually distinct from adjacent spoken beats (different subject, framing, or story information)
• "action" beats use actionDescription only — NO spoken line, NO character field
• "dialogue" beats must contain SPOKEN words with [emotion] tags — NO stage directions in line
• beats[] order is the storyboard frame order (one frame per beat)

${beatDirectionRules}`

  return {
    persona,
    formatLabel,
    sceneHeadingExample,
    narrationSchemaLine,
    beatDirectionSchema,
    hasReferenceCatalog,
    storyBlock,
    craftBlock,
    languageBlock,
  }
}

/** One-line context for a neighbouring Blueprint beat, so chunks join up. */
function formatNeighborBeat(
  beats: any[],
  index: number,
  label: string
): string {
  const beat = beats[index]
  if (!beat) return ''
  const title =
    (typeof beat.title === 'string' && beat.title.trim()) ||
    (typeof beat.intent === 'string' && beat.intent.trim()) ||
    `Beat ${index + 1}`
  const synopsis =
    (typeof beat.synopsis === 'string' && beat.synopsis.trim()) ||
    (typeof beat.description === 'string' && beat.description.trim()) ||
    ''
  const summary = synopsis ? ` — ${synopsis.slice(0, 300)}${synopsis.length > 300 ? '…' : ''}` : ''
  return `${label}: "${title}"${summary}`
}

/**
 * Prompt for one chunk of scenes.
 *
 * The scene count and numbering are handed to the model rather than negotiated:
 * a single call cannot hold a longform script inside the output token budget, so
 * asking for the whole thing made the model silently compress a Blueprint beat
 * into one scene.
 */
function buildSceneChunkPrompt(
  shared: SharedScriptContext,
  chunk: SceneChunk,
  opts: {
    storyBeats: any[]
    totalScenes: number
    shortfallNote?: string
  }
): string {
  const sceneNumberEnd = chunk.sceneNumberStart + chunk.sceneCount - 1
  const sceneNumbers = Array.from(
    { length: chunk.sceneCount },
    (_, i) => chunk.sceneNumberStart + i
  )
  const beatIndex = chunk.blueprintBeatIndex
  const isBeatScoped = typeof beatIndex === 'number'

  const beatIdentityLines = isBeatScoped
    ? `• Every scene you return MUST set "blueprintBeatIndex": ${beatIndex} and "blueprintBeatTitle": ${JSON.stringify(chunk.blueprintBeatTitle)}
• Write ONLY what happens inside this Blueprint beat. Do NOT cover material from earlier or later beats.`
    : `• Every scene you return MUST omit "blueprintBeatIndex" (this treatment has no Blueprint beat sheet).`

  const partLine =
    chunk.partCount > 1
      ? `\n• This is part ${chunk.partIndex + 1} of ${chunk.partCount} for this Blueprint beat. Cover the ${
          chunk.partIndex === 0
            ? 'OPENING'
            : chunk.partIndex === chunk.partCount - 1
              ? 'CLOSING'
              : 'MIDDLE'
        } portion of the beat and leave the rest to the other parts.`
      : ''

  const neighborLines = isBeatScoped
    ? [
        formatNeighborBeat(opts.storyBeats, beatIndex - 1, 'Immediately BEFORE your slice'),
        formatNeighborBeat(opts.storyBeats, beatIndex + 1, 'Immediately AFTER your slice'),
      ].filter(Boolean)
    : []

  const beatSynopsisBlock = chunk.beatSynopsis
    ? `\nYOUR BLUEPRINT BEAT IN FULL:\n${chunk.beatSynopsis}\n`
    : ''

  const assignment = `=== YOUR ASSIGNMENT (MANDATORY) ===
You are writing ONE SLICE of a ${opts.totalScenes}-scene script, not the whole script.

• Return EXACTLY ${chunk.sceneCount} scene${chunk.sceneCount === 1 ? '' : 's'}, numbered ${sceneNumbers.join(', ')}.
• Blueprint beat ${isBeatScoped ? beatIndex + 1 : '—'}: ${JSON.stringify(chunk.blueprintBeatTitle)}
${beatIdentityLines}${partLine}
• Aim for ~${chunk.targetBeatsPerScene} beats in each scene; never exceed ${MAX_BEATS_PER_SCENE} beats in one scene.
• Returning fewer than ${chunk.sceneCount} scenes, or scenes with far fewer than ${chunk.targetBeatsPerScene} beats, is a FAILED response. Break the beat at location changes, time jumps, and dramatic turns to reach the count honestly — do not pad.
• Do NOT write a title sequence or closing credits. Those are added separately.
${beatSynopsisBlock}${neighborLines.length > 0 ? `\nADJACENT CONTEXT (do not write these — just hand off cleanly):\n${neighborLines.join('\n')}\n` : ''}`

  const schema = `OUTPUT FORMAT (JSON — main content scenes only):
{
  "scenes": [
    {
      "sceneNumber": ${chunk.sceneNumberStart},${
        isBeatScoped
          ? `
      "blueprintBeatIndex": ${beatIndex},
      "blueprintBeatTitle": ${JSON.stringify(chunk.blueprintBeatTitle)},`
          : ''
      }
      ${shared.sceneHeadingExample},
      "locationAssetId": "catalog-location-id-or-null",
      "characters": ["Character Name 1", "Character Name 2"],
      "sceneCharacters": [{"name": "Character Name 1", "libraryAssetId": "catalog-id-or-null"}],
      "beats": [
        {
          "kind": "action",
          "actionDescription": "Wide establishing shot of the location, golden hour light...",
          ${shared.beatDirectionSchema}
        },
${shared.narrationSchemaLine}
        {
          "kind": "dialogue",
          "character": "Character Name",
          "line": "[emotion] Dialogue...",
          "beatDirection": {"shotType": "Medium Close-Up", "frozenMoment": "Speaker mid-word, eyes locked on the listener.", "transition": "CUT"}
        },
        {
          "kind": "action",
          "actionDescription": "Reaction shot: character turns toward window, concern on face...",
          "beatDirection": {"shotType": "Medium Close-Up", "frozenMoment": "Listener's profile against the window light, brow furrowed.", "transition": "CUT"}
        }
      ],
      "visualDescription": "Camera and lighting notes (or audio focus if podcast)",
      "duration": 120,
      "sfx": [{"time": 0, "description": "Sound effect"}],
      "music": {"description": "Background music mood"}
    }
  ]${
    shared.hasReferenceCatalog
      ? `,
  "newAssets": [
    {"tempId": "new-1", "kind": "prop", "name": "New Prop Name", "description": "Only if not in catalog", "isNew": true}
  ]`
      : ''
  }
}

SCHEMA RULES:
• "beats" is the ONLY place story content goes. Do NOT emit "action", "dialogue", or "narration" fields on a scene — they are derived from beats automatically and duplicating them wastes your budget.
• Scene numbers MUST be exactly ${sceneNumbers.join(', ')} — in that order, no gaps, no extras.
• Return ONLY valid JSON - no markdown, no explanations.`

  return `${shared.persona} for the following production.

${shared.storyBlock}

${assignment}
${shared.craftBlock}

${schema}
${opts.shortfallNote ? `\n${opts.shortfallNote}\n` : ''}
Now write scenes ${chunk.sceneNumberStart}–${sceneNumberEnd}.
${shared.languageBlock}`
}

/** Concurrent chunk calls. Two keeps the 600s route budget while halving wall time. */
const CHUNK_CONCURRENCY = 2

/** One corrective retry per chunk when the model returns fewer scenes than assigned. */
const MAX_CHUNK_ATTEMPTS = 2

function describeChunk(chunk: SceneChunk): string {
  const beat = chunk.blueprintBeatIndex === null ? '-' : chunk.blueprintBeatIndex + 1
  const end = chunk.sceneNumberStart + chunk.sceneCount - 1
  return `beat ${beat} scenes ${chunk.sceneNumberStart}-${end}`
}

/** Stamp the assignment onto returned scenes so provenance never depends on the model. */
function stampChunkProvenance(scenes: any[], chunk: SceneChunk): any[] {
  return scenes.map((scene) => ({
    ...scene,
    ...(chunk.blueprintBeatIndex === null
      ? {}
      : {
          blueprintBeatIndex: chunk.blueprintBeatIndex,
          blueprintBeatTitle: chunk.blueprintBeatTitle,
        }),
  }))
}

/**
 * Generate the scenes for one chunk.
 *
 * Two recoveries matter here: a MAX_TOKENS stop means the slice was too big to
 * emit, so it is halved and each half asked for separately; a short return means
 * the model ignored the count, so it is asked again with the shortfall named.
 */
async function generateSceneChunk(
  shared: SharedScriptContext,
  chunk: SceneChunk,
  ctx: {
    storyBeats: any[]
    totalScenes: number
    onChunkScenes?: (count: number) => void
    depth?: number
  }
): Promise<any[]> {
  const depth = ctx.depth ?? 0
  let best: any[] = []

  for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS; attempt++) {
    const label = `${describeChunk(chunk)}${attempt > 1 ? ` (retry ${attempt - 1})` : ''}`
    const shortfallNote =
      attempt > 1
        ? `PREVIOUS ATTEMPT FAILED: you returned ${best.length} scene(s) instead of ${chunk.sceneCount}. Return all ${chunk.sceneCount} scenes this time. Find the ${chunk.sceneCount} distinct dramatic units inside this Blueprint beat — separate locations, time jumps, or turns — and write each as its own scene.`
        : undefined

    const prompt = buildSceneChunkPrompt(shared, chunk, {
      storyBeats: ctx.storyBeats,
      totalScenes: ctx.totalScenes,
      shortfallNote,
    })

    let text = ''
    let truncated = false
    try {
      const result = await callGemini(prompt, label)
      text = result.text
      truncated = result.truncated
    } catch (err: any) {
      console.error(`[Script Gen V2] Chunk call failed (${label}):`, err?.message || err)
      continue
    }

    const parsed = parseChunkResponse(text)
    text = ''
    const scenes = parsed.scenes.slice().sort((a, b) => (a.sceneNumber || 0) - (b.sceneNumber || 0))

    if (scenes.length > best.length) best = scenes

    // A truncated response cannot be fixed by asking again — the slice is too
    // large for one response. Split it instead.
    if (truncated && depth < 1) {
      const halves = halveChunk(chunk)
      if (halves) {
        console.warn(
          `[Script Gen V2] ${label} truncated; splitting into ${halves[0].sceneCount}+${halves[1].sceneCount} scenes`
        )
        const recovered: any[] = []
        for (const half of halves) {
          recovered.push(
            ...(await generateSceneChunk(shared, half, { ...ctx, depth: depth + 1 }))
          )
        }
        if (recovered.length > best.length) best = recovered
        break
      }
    }

    if (best.length >= chunk.sceneCount) break

    if (attempt < MAX_CHUNK_ATTEMPTS) {
      console.warn(
        `[Script Gen V2] ${label} returned ${scenes.length}/${chunk.sceneCount} scenes; retrying`
      )
    }
  }

  if (best.length < chunk.sceneCount) {
    console.warn(
      `[Script Gen V2] ${describeChunk(chunk)} short after retries: ${best.length}/${chunk.sceneCount} scenes`
    )
  }

  const stamped = stampChunkProvenance(best, chunk)
  ctx.onChunkScenes?.(stamped.length)
  return stamped
}

/**
 * Parse one chunk response into a scenes array.
 *
 * Beats are the only story payload the model returns now; legacy `action` /
 * `dialogue` / `narration` are derived downstream by `applyBeatsToScene`.
 */
function parseChunkResponse(response: string): { scenes: any[] } {
  let parsedScenes: any[] = []
  
  try {
    const cleaned = sanitizeJsonString(response)
    const parsed = JSON.parse(cleaned)
    parsedScenes = parsed.scenes || []
  } catch (parseError: any) {
    console.warn('[Parse Chunk] Full parse failed, attempting extraction...', parseError.message.substring(0, 100))
    
    // Try to extract scenes using brace-counting
    try {
      const extractedScenes: any[] = []
      const sceneStartPattern = /"sceneNumber"\s*:\s*(\d+)/g
      let match: RegExpExecArray | null
      
      while ((match = sceneStartPattern.exec(response)) !== null) {
        const sceneNumber = parseInt(match[1])
        const startPos = match.index
        
        // Find the opening brace before "sceneNumber"
        let openBracePos = startPos
        while (openBracePos > 0 && response[openBracePos] !== '{') {
          openBracePos--
        }
        
        if (response[openBracePos] !== '{') continue
        
        // Count braces to find matching close
        let braceCount = 0
        let inString = false
        let escaped = false
        let endPos = openBracePos
        
        for (let i = openBracePos; i < response.length; i++) {
          const char = response[i]
          
          if (escaped) { escaped = false; continue }
          if (char === '\\') { escaped = true; continue }
          if (char === '"') { inString = !inString; continue }
          
          if (!inString) {
            if (char === '{') braceCount++
            else if (char === '}') {
              braceCount--
              if (braceCount === 0) { endPos = i + 1; break }
            }
          }
        }
        
        if (braceCount === 0 && endPos > openBracePos) {
          const sceneText = response.substring(openBracePos, endPos)
          try {
            const scene = JSON.parse(sceneText)
            if (scene.sceneNumber) {
              extractedScenes.push(scene)
            }
          } catch {
            // Try sanitizing
            try {
              const sanitized = sanitizeJsonString(sceneText)
              const scene = JSON.parse(sanitized)
              if (scene.sceneNumber) extractedScenes.push(scene)
            } catch { /* skip */ }
          }
        }
      }
      
      if (extractedScenes.length > 0) {
        parsedScenes = extractedScenes.sort((a, b) => a.sceneNumber - b.sceneNumber)
        console.log(`[Parse Chunk] Recovered ${parsedScenes.length} scenes via extraction`)
      }
    } catch (extractError) {
      console.error('[Parse Chunk] Extraction failed:', extractError)
    }
  }
  
  // Process and normalize scenes
  return {
    scenes: parsedScenes.map((s: any, idx: number) => ({
      sceneNumber: s.sceneNumber || idx + 1,
      heading: s.heading || `SCENE ${idx + 1}`,
      cinematicType: s.cinematicType,
      // Blueprint provenance drives beat grouping in the UI and the
      // decomposition audit — it must survive parsing.
      ...(typeof s.blueprintBeatIndex === 'number'
        ? { blueprintBeatIndex: s.blueprintBeatIndex }
        : {}),
      ...(typeof s.blueprintBeatTitle === 'string'
        ? { blueprintBeatTitle: s.blueprintBeatTitle }
        : {}),
      characters: s.characters || [],
      ...(Array.isArray(s.sceneCharacters) ? { sceneCharacters: s.sceneCharacters } : {}),
      ...(typeof s.locationAssetId === 'string' && s.locationAssetId
        ? { locationAssetId: s.locationAssetId }
        : {}),
      action: s.action || '',
      narration: s.narration || '',
      beats: Array.isArray(s.beats) ? s.beats : undefined,
      dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
      creditLines: Array.isArray(s.creditLines) ? s.creditLines : undefined,
      visualDescription: s.visualDescription || s.action || '',
      // Preserve the model's own pacing. Keep a small 4s video-sanity floor for
      // provided values (smallest Veo bucket), and only default to 60s when the
      // model gave no usable duration. We no longer force every scene up to 45s.
      duration: (typeof s.duration === 'number' && s.duration > 0) ? Math.max(4, s.duration) : 60,
      sfx: Array.isArray(s.sfx) ? s.sfx : [],
      music: s.music?.description
        ? { ...s.music, description: adaptPromptForLyria(s.music.description) }
        : s.music || undefined,
      isExpanded: true
    }))
  }
}

/**
 * `finishReason` is returned alongside the text: a MAX_TOKENS stop means the
 * chunk was too large to emit, which the caller recovers from by halving it.
 * Swallowing it made truncated scripts look like successful ones.
 */
async function callGemini(
  prompt: string,
  label: string
): Promise<{ text: string; truncated: boolean }> {
  console.log(`[Generate Script V2] Calling Vertex AI Gemini (${label})...`)
  const result = await generateText(prompt, {
    model: getScriptGenerationModel(),
    temperature: 0.7,
    // On Gemini 3 the thinking budget shares maxOutputTokens, and thinkingLevel
    // 'high' on a writing task takes a real slice of it. A chunk emits roughly
    // 6k tokens, so the headroom costs no memory — the response stays a fraction
    // of the old single-pass one — but it keeps thinking from truncating scenes.
    maxOutputTokens: 32768,
    timeoutMs: 180000,       // 180s timeout for large script generation (increased from default 90s)
    thinkingLevel: 'high',
  })

  const text = result.text || ''
  const truncated = result.finishReason === 'MAX_TOKENS'

  console.log(
    `[Gemini Response] ${label}: ${text.length} chars, finishReason=${result.finishReason ?? 'unknown'}`
  )
  if (truncated) {
    console.warn(`[Gemini Response] ${label} hit the output token ceiling — response is incomplete`)
  }

  return { text, truncated }
}

function sanitizeJsonString(jsonStr: string): string {
  // Memory safety: reject extremely large responses that would cause OOM
  const MAX_SAFE_SIZE = 150000 // 150KB max - prevents OOM during sanitization
  if (jsonStr.length > MAX_SAFE_SIZE) {
    console.error(`[Sanitize] Response too large (${jsonStr.length} chars > ${MAX_SAFE_SIZE}), truncating`)
    jsonStr = jsonStr.substring(0, MAX_SAFE_SIZE)
  }
  
  // Remove markdown code fences
  let cleaned = jsonStr.replace(/```json\n?|```/g, '').trim()
  
  // First attempt: try to parse as-is (FAST PATH)
  try {
    JSON.parse(cleaned)
    return cleaned  // Success - return immediately without heavy processing
  } catch (firstError: any) {
    // Only proceed with heavy sanitization if parse failed
    console.warn('[Sanitize] Initial parse failed, applying fixes:', firstError.message.substring(0, 100))
  }
  
  // SLOW PATH: Only run if needed
  try {
    // Debug what we're working with
    console.log('[Sanitize] Raw first 200 chars:', cleaned.substring(0, 200))
    console.log('[Sanitize] Starts with:', cleaned.charAt(0), 'Code:', cleaned.charCodeAt(0))
    
    // STEP 1: Fix control characters in strings using state machine (most critical)
    // Use array.push instead of string concat for memory efficiency
    const resultChars: string[] = []
    let inString = false
    let escaped = false
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i]
      const code = cleaned.charCodeAt(i)
      
      // Handle escape sequences
      if (escaped) {
        resultChars.push(char)
        escaped = false
        continue
      }
      
      // Check for backslash (escape character)
      if (char === '\\' && inString) {
        resultChars.push(char)
        escaped = true
        continue
      }
      
      // Check for quotes (string delimiters)
      if (char === '"') {
        inString = !inString
        resultChars.push(char)
        continue
      }
      
      // Inside a string: escape control characters
      if (inString) {
        if (char === '\n') {
          resultChars.push('\\', 'n')
        } else if (char === '\r') {
          resultChars.push('\\', 'r')
        } else if (char === '\t') {
          resultChars.push('\\', 't')
        } else if (code >= 0x00 && code <= 0x1F && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
          // Skip other control characters (don't include them)
          continue
        } else {
          resultChars.push(char)
        }
      } else {
        // Outside strings: keep everything as-is (including formatting newlines)
        resultChars.push(char)
      }
    }
    
    // Join array once at the end (more memory efficient than string concat in loop)
    cleaned = resultChars.join('')
    
    // STEP 2: Remove trailing commas (lightweight fix)
    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .trim()
    
    // Try parse after these two critical fixes
    console.log('[Sanitize] After control char fix, first 200:', cleaned.substring(0, 200))
    try {
      JSON.parse(cleaned)
      console.log('[Sanitize] SUCCESS after control char fix')
      return cleaned
    } catch (err: any) {
      console.warn('[Sanitize] Still failed after control char fix:', err.message.substring(0, 100))
    }
    
    // Check if response looks truncated (ends mid-structure)
    const endsWithComma = /,\s*$/.test(cleaned)
    const endsWithColon = /:\s*$/.test(cleaned)
    const endsWithOpenBrace = /[{\[]\s*$/.test(cleaned)

    if (endsWithComma || endsWithColon || endsWithOpenBrace) {
      console.warn('[Sanitize] Response appears truncated, removing incomplete structure')
      // Remove the incomplete trailing structure
      cleaned = cleaned.replace(/,\s*$/, '')
      cleaned = cleaned.replace(/:\s*$/, ': ""')
      cleaned = cleaned.replace(/[{\[]\s*$/, '')
      
      // Count unclosed braces/brackets to close them properly
      let openBraces = 0
      let openBrackets = 0
      let inString = false
      let escaped = false
      
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i]
        
        if (escaped) {
          escaped = false
          continue
        }
        
        if (char === '\\') {
          escaped = true
          continue
        }
        
        if (char === '"') {
          inString = !inString
          continue
        }
        
        if (!inString) {
          if (char === '{') openBraces++
          if (char === '}') openBraces--
          if (char === '[') openBrackets++
          if (char === ']') openBrackets--
        }
      }
      
      // Remove any trailing incomplete object/array
      let lastCompleteIdx = cleaned.lastIndexOf('}')
      if (lastCompleteIdx > 0) {
        const beforeClose = cleaned.substring(0, lastCompleteIdx + 1)
        const afterClose = cleaned.substring(lastCompleteIdx + 1).trim()
        
        // If there's incomplete data after last }, remove it
        if (afterClose && afterClose !== ',' && !afterClose.match(/^[\s,]*[\]}]$/)) {
          console.log('[Sanitize] Removing incomplete data after last complete object')
          cleaned = beforeClose
          
          // Recalculate braces/brackets after truncation
          openBraces = 0
          openBrackets = 0
          inString = false
          escaped = false
          
          for (let i = 0; i < cleaned.length; i++) {
            const char = cleaned[i]
            
            if (escaped) {
              escaped = false
              continue
            }
            
            if (char === '\\') {
              escaped = true
              continue
            }
            
            if (char === '"') {
              inString = !inString
              continue
            }
            
            if (!inString) {
              if (char === '{') openBraces++
              if (char === '}') openBraces--
              if (char === '[') openBrackets++
              if (char === ']') openBrackets--
            }
          }
        }
      }
      
      // Close unclosed structures
      console.log('[Sanitize] Unclosed braces:', openBraces, 'brackets:', openBrackets)
      for (let i = 0; i < openBrackets; i++) {
        cleaned += ']'
      }
      for (let i = 0; i < openBraces; i++) {
        cleaned += '}'
      }
    }
    
    // Try again after truncation fix
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // Handle unterminated strings (common with truncated responses)
    const lastQuoteIndex = cleaned.lastIndexOf('"')
    const hasUnclosedString = lastQuoteIndex !== -1 && (cleaned.match(/"/g) || []).length % 2 !== 0

    if (hasUnclosedString) {
      // Find the last properly closed structure before the unterminated string
      let truncateAt = lastQuoteIndex
      
      // Look backwards for the last comma or opening brace before this quote
      for (let i = lastQuoteIndex - 1; i >= 0; i--) {
        if (cleaned[i] === ',' || cleaned[i] === '{' || cleaned[i] === '[') {
          truncateAt = i
          break
        }
      }
      
      // Truncate at that point
      cleaned = cleaned.substring(0, truncateAt)
      console.warn('[Sanitize] Truncated unterminated string at position', lastQuoteIndex)
    }
    
    // Try again after unterminated string fix
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // Fix unescaped newlines in strings (lightweight, targeted approach)
    // This regex is much simpler and won't cause memory issues
    cleaned = cleaned.replace(/"([^"]*?)(\r?\n)([^"]*?)"/g, (match, before, newline, after) => {
      // Only process if this looks like an error (newline in middle of string content)
      if (before && after) {
        return `"${before}\\n${after}"`
      }
      return match
    })
    
    // Try again after newline fix
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // FINAL STEP: Balance all braces/brackets
    // This runs after all truncation/string fixes
    const finalOpenBraces = (cleaned.match(/{/g) || []).length
    const finalCloseBraces = (cleaned.match(/}/g) || []).length
    const finalOpenBrackets = (cleaned.match(/\[/g) || []).length
    const finalCloseBrackets = (cleaned.match(/\]/g) || []).length
    
    if (finalOpenBraces > finalCloseBraces) cleaned += '}'.repeat(finalOpenBraces - finalCloseBraces)
    if (finalOpenBrackets > finalCloseBrackets) cleaned += ']'.repeat(finalOpenBrackets - finalCloseBrackets)
    
    // Try final parse before heavy fixes
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // HEAVY FIX: Only if lightweight fixes didn't work
    // Process control characters in strings
      cleaned = cleaned.replace(
      /"((?:[^"\\]|\\.){0,5000})"/g,  // Add length limit to prevent catastrophic backtracking
        (match, stringContent) => {
        if (stringContent.length > 5000) {
          // Truncate extremely long strings to prevent memory issues
          stringContent = stringContent.substring(0, 5000) + '...'
        }
        
          const fixed = stringContent
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, (char: string) => {
              const code = char.charCodeAt(0)
            if (code === 9) return '\\t'
            if (code === 10) return '\\n'
            if (code === 13) return '\\r'
            return ' '
          })
        
          return `"${fixed}"`
        }
      )
      
    // Final balance after heavy fixes
    const heavyOpenBraces = (cleaned.match(/{/g) || []).length
    const heavyCloseBraces = (cleaned.match(/}/g) || []).length
    const heavyOpenBrackets = (cleaned.match(/\[/g) || []).length
    const heavyCloseBrackets = (cleaned.match(/\]/g) || []).length
    
    if (heavyOpenBraces > heavyCloseBraces) cleaned += '}'.repeat(heavyOpenBraces - heavyCloseBraces)
    if (heavyOpenBrackets > heavyCloseBrackets) cleaned += ']'.repeat(heavyOpenBrackets - heavyCloseBrackets)
    
      JSON.parse(cleaned)
      return cleaned
      
    } catch (secondError: any) {
    console.error('[Sanitize] Failed after all attempts')
    throw secondError
  }
}

// Normalize character names for deduplication
function normalizeCharacterName(name: string): string {
  if (!name) return ''
  
  // Use canonical normalization
  return toCanonicalName(name).toUpperCase()
}

function extractCharacters(scenes: any[], includeNarrator = true): any[] {
  const charMap = new Map()
  scenes.forEach((scene: any) => {
    scene.dialogue?.forEach((d: any) => {
      if (!d.character) return
      
      const normalizedName = normalizeCharacterName(d.character)
      
      // Use normalized name as key, but keep original (cleaned) name for display
      if (!charMap.has(normalizedName)) {
        // Clean the display name (remove V.O., etc. but keep proper case)
        const cleanName = d.character.replace(/\s*\([^)]*\)\s*/g, '').trim()
        
        const isNarrator = cleanName.toUpperCase().includes('NARRATOR')
        if (isNarrator && !includeNarrator) return

        const dialogueSample = d.line ? d.line.substring(0, 100) + (d.line.length > 100 ? '...' : '') : ''
        
        charMap.set(normalizedName, {
          name: cleanName,  // Use cleaned version (e.g., "Brian Anderson" not "BRIAN ANDERSON (V.O.)")
          role: isNarrator ? 'narrator' : 'character',
          description: isNarrator ? `Narrator for the scene. Tone reference: "${dialogueSample}"` : `Character from script`
        })
      }
    })
  })
  return Array.from(charMap.values())
}

