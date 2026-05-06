import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { optimizeTextForTTS } from '../../../../lib/tts/textOptimizer'
import { put } from '@vercel/blob'
import { toCanonicalName, generateAliases } from '../../../../lib/character/canonical'
import { resolveSfxDuration } from '../../../../lib/elevenlabs/sfxDuration'

export const maxDuration = 300 // 5 minutes for batch generation
export const runtime = 'nodejs'

// Helper function to generate and save music for a scene
async function generateAndSaveMusicForScene(scene: any, projectId: string, sceneIdx: number, baseUrl: string): Promise<string | null> {
  try {
    const description = typeof scene.music === 'string' ? scene.music : scene.music?.description
    if (!description) return null
    
    console.log(`[Batch Audio] Generating music for scene ${sceneIdx + 1}: ${description.substring(0, 50)}...`)
    
    // Generate music via our API endpoint, using saveToBlob to avoid payload limits
    const musicResponse = await fetch(`${baseUrl}/api/tts/google/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: description, 
        duration: 30,
        saveToBlob: true,
        projectId,
        sceneId: `scene-${sceneIdx}`
      })
    })
    
    if (!musicResponse.ok) {
      const errorText = await musicResponse.text().catch(() => 'Unknown error')
      console.error(`[Batch Audio] Music generation failed for scene ${sceneIdx + 1}:`, errorText)
      return null
    }
    
    const result = await musicResponse.json()
    if (result.url) {
      console.log(`[Batch Audio] Music saved for scene ${sceneIdx + 1}: ${result.url}`)
      return result.url
    }
    
    return null
  } catch (error: any) {
    console.error(`[Batch Audio] Music generation failed for scene ${sceneIdx + 1}:`, error?.message || String(error))
    return null
  }
}

/**
 * Walk the scene's segmented script (if present) to find the duration of the
 * parent segment for a given legacy SFX cue index. Returns `undefined` when
 * the scene has not been migrated to segments yet, in which case the resolver
 * falls back to its 8s default.
 */
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

// Helper function to generate and save SFX for a scene cue via ElevenLabs
async function generateAndSaveSFXForScene(
  scene: any,
  projectId: string,
  sceneIdx: number,
  sfxIdx: number,
  baseUrl: string,
  authCookie: string
): Promise<string | null> {
  try {
    const cue = Array.isArray(scene?.sfx) ? scene.sfx[sfxIdx] : null
    const description: string =
      typeof cue === 'string'
        ? cue
        : (cue?.description || cue?.label || cue?.tag || '').toString()
    if (!description.trim()) {
      console.warn(
        `[Batch Audio] Skipping SFX scene ${sceneIdx + 1} cue ${sfxIdx + 1}: empty description`
      )
      return null
    }

    const sfxId: string | undefined =
      typeof cue === 'object' && cue && typeof cue.sfxId === 'string' ? cue.sfxId : undefined
    const segmentDurationSeconds = findParentSegmentDurationSeconds(scene, sfxIdx, sfxId)
    const durationSeconds = resolveSfxDuration({ segmentDurationSeconds, override: 'auto' })

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

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(
        `[Batch Audio] SFX generation failed for scene ${sceneIdx + 1} cue ${sfxIdx + 1}: HTTP ${response.status} ${errText.slice(0, 200)}`
      )
      return null
    }
    const data = await response.json()
    if (!data?.url) {
      console.error(
        `[Batch Audio] SFX response missing URL for scene ${sceneIdx + 1} cue ${sfxIdx + 1}`
      )
      return null
    }
    return data.url as string
  } catch (error: any) {
    console.error(
      `[Batch Audio] SFX generation error for scene ${sceneIdx + 1} cue ${sfxIdx + 1}:`,
      error?.message || String(error)
    )
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, includeMusic = false, includeSFX = false, deleteAllAudioFirst = false, language = 'en' } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })                                                                            
    }

    // Get the base URL from the request headers
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    // Forward the inbound auth cookie so internal SFX calls preserve the user session
    const authCookie = req.headers.get('cookie') || ''
    console.log(`[Batch Audio] Using base URL: ${baseUrl}, language: ${language}`)

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const narrationVoice = visionPhase.narrationVoice
    const characters = visionPhase.characters || []
    
    // Get scenes - check both possible locations
    const hasNestedStructure = !!visionPhase.script?.script?.scenes?.length
    let scenes = visionPhase.script?.script?.scenes || visionPhase.script?.scenes || []

    // Load stored translations for non-English audio generation
    // User-imported translations take priority over machine translation
    const storedTranslations = (language !== 'en' && visionPhase.translations?.[language]) || {} as Record<number, { narration?: string; dialogue?: string[] }>
    if (language !== 'en' && Object.keys(storedTranslations).length > 0) {
      console.log(`[Batch Audio] Found stored ${language} translations for ${Object.keys(storedTranslations).length} scenes`)
    }

    if (!narrationVoice) {
      return NextResponse.json({ error: 'Narration voice not configured' }, { status: 400 })                                                                    
    }

    // ALWAYS DELETE EXISTING AUDIO TO PREVENT STALE DURATION VALUES


    // This is critical: legacy narrationDuration/descriptionDuration fields must be cleared


    // even during incremental regeneration to prevent timeline alignment issues


    if (scenes.length > 0) {
      console.log(`[Batch Audio] Deleting all existing audio before generation...`)
      
      // STEP 1: Collect all existing audio URLs for blob deletion
      const urlsToDelete: string[] = []
      
      scenes.forEach((scene: any) => {
        // Collect narration audio URLs (multi-language object or direct URL)
        // IMPORTANT: narrationAudio[language] is { url, duration, generatedAt, voiceId }, NOT a string
        if (scene.narrationAudio && typeof scene.narrationAudio === 'object' && !Array.isArray(scene.narrationAudio)) {
          Object.values(scene.narrationAudio).forEach((audioData: any) => {
            // Handle nested object format { url, duration, ... }
            if (typeof audioData === 'object' && audioData?.url && audioData.url.includes('blob')) {
              urlsToDelete.push(audioData.url)
            }
            // Handle legacy direct URL format
            else if (typeof audioData === 'string' && audioData.includes('blob')) {
              urlsToDelete.push(audioData)
            }
          })
        } else if (typeof scene.narrationAudio === 'string' && scene.narrationAudio.includes('blob')) {
          urlsToDelete.push(scene.narrationAudio)
        }
        if (scene.narrationAudioUrl && typeof scene.narrationAudioUrl === 'string' && scene.narrationAudioUrl.includes('blob')) {
          urlsToDelete.push(scene.narrationAudioUrl)
        }
        
        // Collect description audio URLs (multi-language object or direct URL)
        // IMPORTANT: descriptionAudio[language] is { url, duration, generatedAt, voiceId }, NOT a string
        if (scene.descriptionAudio && typeof scene.descriptionAudio === 'object' && !Array.isArray(scene.descriptionAudio)) {
          Object.values(scene.descriptionAudio).forEach((audioData: any) => {
            // Handle nested object format { url, duration, ... }
            if (typeof audioData === 'object' && audioData?.url && audioData.url.includes('blob')) {
              urlsToDelete.push(audioData.url)
            }
            // Handle legacy direct URL format
            else if (typeof audioData === 'string' && audioData.includes('blob')) {
              urlsToDelete.push(audioData)
            }
          })
        } else if (typeof scene.descriptionAudio === 'string' && scene.descriptionAudio.includes('blob')) {
          urlsToDelete.push(scene.descriptionAudio)
        }
        if (scene.descriptionAudioUrl && typeof scene.descriptionAudioUrl === 'string' && scene.descriptionAudioUrl.includes('blob')) {
          urlsToDelete.push(scene.descriptionAudioUrl)
        }
        
        // Collect dialogue audio URLs
        // IMPORTANT: dialogueAudio[language] is an array of { audioUrl, duration, character, ... }
        if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object' && !Array.isArray(scene.dialogueAudio)) {
          // Multi-language structure: { en: [...], th: [...], es: [...] }
          Object.values(scene.dialogueAudio).forEach((dialogueArray: any) => {
            if (Array.isArray(dialogueArray)) {
              dialogueArray.forEach((dialogue: any) => {
                if (dialogue?.audioUrl && typeof dialogue.audioUrl === 'string' && dialogue.audioUrl.includes('blob')) {
                  urlsToDelete.push(dialogue.audioUrl)
                }
              })
            }
          })
        } else if (Array.isArray(scene.dialogueAudio)) {
          // Legacy flat array structure
          scene.dialogueAudio.forEach((dialogue: any) => {
            if (dialogue?.audioUrl && typeof dialogue.audioUrl === 'string' && dialogue.audioUrl.includes('blob')) {
              urlsToDelete.push(dialogue.audioUrl)
            }
          })
        }
        
        // Legacy dialogue audioUrl fields
        if (scene.dialogue && Array.isArray(scene.dialogue)) {
          scene.dialogue.forEach((d: any) => {
            if (d.audioUrl && typeof d.audioUrl === 'string' && d.audioUrl.includes('blob')) {
              urlsToDelete.push(d.audioUrl)
            }
          })
        }
        
        // Collect music audio URL
        if (includeMusic && (!scene.musicAudio)) {
          if (scene.musicAudio && typeof scene.musicAudio === 'string' && scene.musicAudio.includes('blob')) {
            urlsToDelete.push(scene.musicAudio)
          }
          if (scene.music && typeof scene.music === 'object' && scene.music.url && scene.music.url.includes('blob')) {
            urlsToDelete.push(scene.music.url)
          }
        }
        
        // Collect SFX audio URLs (only when SFX regeneration is actually requested)
        if (includeSFX) {
          if (scene.sfxAudio && typeof scene.sfxAudio === 'object') {
            Object.values(scene.sfxAudio).forEach((url: any) => {
              if (typeof url === 'string' && url.includes('blob')) urlsToDelete.push(url)
            })
          }
          if (scene.sfx && Array.isArray(scene.sfx)) {
            scene.sfx.forEach((s: any) => {
              if (typeof s === 'object' && s) {
                if (typeof s.url === 'string' && s.url.includes('blob')) urlsToDelete.push(s.url)
                if (typeof s.audioUrl === 'string' && s.audioUrl.includes('blob')) urlsToDelete.push(s.audioUrl)
              }
            })
          }
        }
      })
      
      // Deduplicate URLs
      const uniqueUrlsToDelete = [...new Set(urlsToDelete)]
      console.log(`[Batch Audio] Collected ${uniqueUrlsToDelete.length} blob URLs to delete`)
      
      // STEP 2: Clear audio references from scenes
      const cleanedScenes = scenes.map((scene: any) => {
        const cleanedScene = { ...scene }
        
        // Clear narration audio (multi-language object structure)
        delete cleanedScene.narrationAudio
        delete cleanedScene.narrationAudioUrl
        delete cleanedScene.narrationAudioGeneratedAt
        // CRITICAL: Also clear legacy duration fields to prevent timeline alignment issues
        delete cleanedScene.narrationDuration
        delete cleanedScene.narrationAudioDuration
        
        // Clear description audio (multi-language object structure)
        delete cleanedScene.descriptionAudio
        delete cleanedScene.descriptionAudioUrl
        delete cleanedScene.descriptionAudioGeneratedAt
        // CRITICAL: Also clear legacy duration field
        delete cleanedScene.descriptionDuration
        
        // Clear dialogue audio - CRITICAL: Must clear dialogueAudio object (where updateSceneAudio saves)
        // NOT just scene.dialogue[].audioUrl (which is legacy/unused)
        delete cleanedScene.dialogueAudio
        delete cleanedScene.dialogueAudioGeneratedAt
        
        // Also clear any legacy dialogue audioUrl fields for completeness
        if (cleanedScene.dialogue && Array.isArray(cleanedScene.dialogue)) {
          cleanedScene.dialogue = cleanedScene.dialogue.map((d: any) => {
            const cleanedDialogue = { ...d }
            delete cleanedDialogue.audioUrl
            return cleanedDialogue
          })
        }
        
        // Clear music audio
        delete cleanedScene.musicAudio
        if (cleanedScene.music && typeof cleanedScene.music === 'object') {
          const cleanedMusic = { ...cleanedScene.music }
          delete cleanedMusic.url
          cleanedScene.music = cleanedMusic
        }
        
        // Validate narration completeness - remove ghost narration with missing/null URLs
        // This prevents "phantom narration" objects from persisting across regenerations
        if (cleanedScene.narrationAudio && typeof cleanedScene.narrationAudio === 'object') {
          Object.keys(cleanedScene.narrationAudio).forEach(lang => {
            const narrationEntry = cleanedScene.narrationAudio[lang]
            // Remove entries that don't have a URL or have invalid URLs
            if (!narrationEntry?.url || !narrationEntry.url.includes('blob')) {
              delete cleanedScene.narrationAudio[lang]
            }
          })
          // If narrationAudio object is now empty, remove it completely
          if (Object.keys(cleanedScene.narrationAudio).length === 0) {
            delete cleanedScene.narrationAudio
          }
        }

        // Clear SFX audio only when SFX regeneration is requested. This prevents
        // wiping user-imported SFX during narration/dialogue/music regen.
        if (includeSFX) {
          delete cleanedScene.sfxAudio
          if (cleanedScene.sfx && Array.isArray(cleanedScene.sfx)) {
            cleanedScene.sfx = cleanedScene.sfx.map((s: any) => {
              if (typeof s === 'object' && s) {
                const cleanedSfx = { ...s }
                delete cleanedSfx.url
                delete cleanedSfx.audioUrl
                return cleanedSfx
              }
              return s
            })
          }
        }
        
        return cleanedScene
      })
      
      // STEP 3: Save cleaned scenes to database BEFORE any generation
      await project.update({
        metadata: {
          ...metadata,
          visionPhase: {
            ...visionPhase,
            script: hasNestedStructure
              ? {
                  ...visionPhase.script,
                  script: {
                    ...visionPhase.script?.script,
                    scenes: cleanedScenes
                  }
                }
              : {
                  ...visionPhase.script,
                  scenes: cleanedScenes
                }
          }
        }
      })
      
      console.log(`[Batch Audio] Deleted all existing audio from ${scenes.length} scenes`)
      
      // STEP 4: Delete blob files from storage in background (non-blocking)
      // This matches the pattern used in handleUpdateSceneAudio (page.tsx)
      if (uniqueUrlsToDelete.length > 0) {
        console.log(`[Batch Audio] Deleting ${uniqueUrlsToDelete.length} blob(s) from storage (background)...`)
        fetch(`${baseUrl}/api/blobs/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: uniqueUrlsToDelete })
        }).then(res => res.json()).then(result => {
          if (result.success) {
            console.log(`[Batch Audio] Background blob deletion complete: ${result.deleted} blob(s) deleted`)
          } else {
            console.warn(`[Batch Audio] Background blob deletion had issues:`, result)
          }
        }).catch(err => {
          console.warn('[Batch Audio] Background blob deletion error (non-fatal):', err)
        })
      }
      
      // Update scenes reference to use cleaned version
      scenes = cleanedScenes
    }

    // ADD DETAILED LOGGING
    console.log(`[Batch Audio] Loaded ${characters.length} characters from project`)                                                                            
    console.log(`[Batch Audio] Characters:`, characters.map((c: any) => ({
      name: c.name,
      hasVoiceConfig: !!c.voiceConfig,
      voiceConfig: c.voiceConfig
    })))

    // Log all unique dialogue characters
    const allDialogueCharacters = new Set()
    scenes.forEach((scene: any) => {
      scene.dialogue?.forEach((d: any) => {
        allDialogueCharacters.add(d.character)
      })
    })
    console.log(`[Batch Audio] Unique dialogue characters in script:`, Array.from(allDialogueCharacters))                                                       

    console.log(`[Batch Audio] Generating audio for ${scenes.length} scenes (includeMusic: ${includeMusic}, includeSFX: ${includeSFX})`)

    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))                                                                               
        }
        
        try {
          const results = []
          let narrationCount = 0
          let dialogueCount = 0
          let musicCount = 0
          let sfxCount = 0
          const skippedDialogue: { scene: number, character: string, reason: string }[] = []
          
          // Chunk scenes for parallel processing
          const CHUNK_SIZE = 3;
          for (let i = 0; i < scenes.length; i += CHUNK_SIZE) {
            const chunk = scenes.slice(i, i + CHUNK_SIZE);
            const chunkIndices = Array.from({ length: chunk.length }, (_, idx) => i + idx);
            
            // Send progress update
            sendProgress({
              type: 'progress',
              scene: i + 1,
              total: scenes.length,
              status: 'generating_audio'
            });

            await Promise.all(chunkIndices.map(async (sceneIndex) => {
              const scene = scenes[sceneIndex];
              
              // Generate narration
              if (scene.narration) {
                console.log(`[Batch Audio] Generating narration for scene ${sceneIndex + 1}`);
                
                // Check stored translations first (user imports > machine translation)
                const sceneTranslation = (storedTranslations as any)[sceneIndex] as { narration?: string; dialogue?: string[] } | undefined;
                const storedNarration = sceneTranslation?.narration;
                const narrationText = storedNarration || scene.narration;
                const narrationIsPreTranslated = !!storedNarration;
                if (storedNarration) {
                  console.log(`[Batch Audio] Using stored ${language} translation for narration in scene ${sceneIndex + 1}`);
                }
                
                // Optimize narration text
                const optimizedNarration = optimizeTextForTTS(narrationText);
                
                const narrationResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {                                                               
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    sceneIndex: sceneIndex,
                    audioType: 'narration',
                    text: optimizedNarration.text,
                    voiceConfig: narrationVoice,
                    language, // Pass language for translation support
                    skipTranslation: narrationIsPreTranslated, skipDbUpdate: true }),
                });
                const narrationData = await narrationResult.json();
                if (narrationData.success) {
                  narrationCount++;
                  scenes[sceneIndex].narrationAudio = scenes[sceneIndex].narrationAudio || {};
                  scenes[sceneIndex].narrationAudio[language] = {
                    url: narrationData.audioUrl,
                    duration: narrationData.duration || 0,
                    generatedAt: new Date().toISOString(),
                    voiceId: narrationVoice.voiceId
                  };
                }
                results.push(narrationData);
              }
              
              // Generate dialogue
              if (scene.dialogue && scene.dialogue.length > 0) {
                const dialogueTasks = scene.dialogue.map(async (dialogueLine: any, dialogueIndex: number) => {
                  let character = dialogueLine.characterId
                    ? characters.find((c: any) => c.id === dialogueLine.characterId)
                    : null;
                    
                  if (!character && dialogueLine.character) {
                    const canonicalSearchName = toCanonicalName(dialogueLine.character);
                    character = characters.find((c: any) => 
                      c.id === dialogueLine.characterId || 
                      toCanonicalName(c.name) === canonicalSearchName ||
                      generateAliases(c.name).includes(canonicalSearchName)
                    );
                  }
                  
                  if (!character || !character.voiceConfig) {
                    skippedDialogue.push({ scene: sceneIndex + 1, character: dialogueLine.character, reason: character ? 'No voice assigned' : 'Character not found' });
                    return null;
                  }
                  
                  const sceneTranslation = (storedTranslations as any)[sceneIndex] as { narration?: string; dialogue?: string[] } | undefined;
                  const storedDialogueLine = sceneTranslation?.dialogue?.[dialogueIndex];
                  const dialogueText = storedDialogueLine || dialogueLine.line;
                  
                  const optimizedDialogue = optimizeTextForTTS(dialogueText);
                  
                  const dialogueResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      projectId,
                      sceneIndex: sceneIndex,
                      audioType: 'dialogue',
                      text: optimizedDialogue.text,
                      voiceConfig: character.voiceConfig,
                      characterName: character.name,
                      dialogueIndex,
                      language,
                      skipTranslation: !!storedDialogueLine,
                      skipDbUpdate: true
                    }),
                  });
                  
                  const dialogueData = await dialogueResult.json();
                  return { dialogueData, character, dialogueIndex, dialogueLine };
                });
                
                const dialogueResultsArray = await Promise.all(dialogueTasks);
                scenes[sceneIndex].dialogueAudio = scenes[sceneIndex].dialogueAudio || {};
                scenes[sceneIndex].dialogueAudio[language] = scenes[sceneIndex].dialogueAudio[language] || [];
                
                for (const res of dialogueResultsArray) {
                  if (res && res.dialogueData.success) {
                    dialogueCount++;
                    results.push(res.dialogueData);
                    while (scenes[sceneIndex].dialogueAudio[language].length <= res.dialogueIndex) {
                       scenes[sceneIndex].dialogueAudio[language].push(null);
                    }
                    scenes[sceneIndex].dialogueAudio[language][res.dialogueIndex] = {
                      audioUrl: res.dialogueData.audioUrl,
                      duration: res.dialogueData.duration || 0,
                      character: res.dialogueLine.character,
                      generatedAt: new Date().toISOString(),
                      voiceId: res.character.voiceConfig.voiceId
                    };
                  }
                }
              }
              
              // Generate music if enabled
              if (includeMusic && scene.music && !scene.musicAudio) {
                const musicUrl = await generateAndSaveMusicForScene(scene, projectId, sceneIndex, baseUrl);
                if (musicUrl) {
                  scenes[sceneIndex].musicAudio = musicUrl;
                  musicCount++;
                }
              }
              
              // Generate SFX if enabled (regenerate fills missing slots; existing slots are
              // preserved unless the cleanup pass already cleared them).
              if (includeSFX && scene.sfx && scene.sfx.length > 0) {
                const existingSfxAudio: string[] = Array.isArray(scenes[sceneIndex].sfxAudio)
                  ? [...scenes[sceneIndex].sfxAudio]
                  : []
                for (let sfxIdx = 0; sfxIdx < scene.sfx.length; sfxIdx++) {
                  if (existingSfxAudio[sfxIdx]) {
                    continue
                  }
                  const sfxUrl = await generateAndSaveSFXForScene(
                    scene,
                    projectId,
                    sceneIndex,
                    sfxIdx,
                    baseUrl,
                    authCookie
                  )
                  if (sfxUrl) {
                    existingSfxAudio[sfxIdx] = sfxUrl
                    sfxCount++
                    // Mirror the URL onto the structured cue so legacy consumers also see it
                    if (
                      Array.isArray(scenes[sceneIndex].sfx) &&
                      typeof scenes[sceneIndex].sfx[sfxIdx] === 'object' &&
                      scenes[sceneIndex].sfx[sfxIdx]
                    ) {
                      scenes[sceneIndex].sfx[sfxIdx].audioUrl = sfxUrl
                    }
                  }
                }
                if (existingSfxAudio.length > 0) {
                  scenes[sceneIndex].sfxAudio = existingSfxAudio
                }
              }
            })); // End of chunk Promise.all
          } // End of outer chunk loop
          
          // FINAL ATOMIC DB UPDATE
          const freshProject = await Project.findByPk(projectId);
          if (freshProject) {
            const freshMetadata = freshProject.metadata || {};
            const freshVisionPhase = freshMetadata.visionPhase || {};
            const hasNestedStructure = !!freshVisionPhase.script?.script?.scenes?.length;
            
            await freshProject.update({
              metadata: {
                ...freshMetadata,
                visionPhase: {
                  ...freshVisionPhase,
                  script: hasNestedStructure
                    ? {
                        ...freshVisionPhase.script,
                        script: {
                          ...freshVisionPhase.script?.script,
                          scenes: scenes
                        }
                      }
                    : {
                        ...freshVisionPhase.script,
                        scenes: scenes
                      }
                }
              }
            });
            console.log('[Batch Audio] Final DB update complete.');
          }
          
          // Send completion
          sendProgress({
            type: 'complete',
            narrationCount,
            dialogueCount,
            musicCount,
            sfxCount,
            totalScenes: scenes.length,
            skipped: skippedDialogue
          })
          
          controller.close()
        } catch (error: any) {
          console.error('[Batch Audio] Error:', error)
          sendProgress({
            type: 'error',
            message: error.message
          })
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
  } catch (error: any) {
    console.error('[Batch Audio] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
