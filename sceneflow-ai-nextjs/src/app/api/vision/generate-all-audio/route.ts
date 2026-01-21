import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { optimizeTextForTTS } from '../../../../lib/tts/textOptimizer'
import { put } from '@vercel/blob'
import { toCanonicalName, generateAliases } from '../../../../lib/character/canonical'

export const maxDuration = 300 // 5 minutes for batch generation
export const runtime = 'nodejs'

// Helper function to generate and save music for a scene
async function generateAndSaveMusicForScene(scene: any, projectId: string, sceneIdx: number, baseUrl: string): Promise<string | null> {
  try {
    const description = typeof scene.music === 'string' ? scene.music : scene.music?.description
    if (!description) return null
    
    console.log(`[Batch Audio] Generating music for scene ${sceneIdx + 1}: ${description.substring(0, 50)}...`)
    
    // Generate music via our API endpoint
    const musicResponse = await fetch(`${baseUrl}/api/tts/elevenlabs/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: description, duration: 30 })
    })
    
    if (!musicResponse.ok) {
      const errorText = await musicResponse.text().catch(() => 'Unknown error')
      console.error(`[Batch Audio] Music generation failed for scene ${sceneIdx + 1}:`, errorText)
      return null
    }
    
    const arrayBuffer = await musicResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to Vercel Blob
    const timestamp = Date.now()
    const filename = `audio/music/${projectId}/scene${sceneIdx}-music-${timestamp}.mp3`
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    })
    
    console.log(`[Batch Audio] Music saved for scene ${sceneIdx + 1}: ${blob.url}`)
    return blob.url
  } catch (error: any) {
    console.error(`[Batch Audio] Music generation failed for scene ${sceneIdx + 1}:`, error?.message || String(error))
    return null
  }
}

// Helper function to generate and save SFX for a scene
async function generateAndSaveSFXForScene(scene: any, projectId: string, sceneIdx: number, sfxIdx: number, baseUrl: string): Promise<string | null> {
  try {
    const sfxItem = scene.sfx[sfxIdx]
    const description = typeof sfxItem === 'string' ? sfxItem : sfxItem?.description
    if (!description) return null
    
    console.log(`[Batch Audio] Generating SFX ${sfxIdx + 1} for scene ${sceneIdx + 1}: ${description.substring(0, 50)}...`)
    
    // Generate SFX via our API endpoint
    const sfxResponse = await fetch(`${baseUrl}/api/tts/elevenlabs/sound-effects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: description, duration: 2.0 })
    })
    
    if (!sfxResponse.ok) {
      const errorText = await sfxResponse.text().catch(() => 'Unknown error')
      console.error(`[Batch Audio] SFX generation failed for scene ${sceneIdx + 1}, SFX ${sfxIdx + 1}:`, errorText)
      return null
    }
    
    const arrayBuffer = await sfxResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to Vercel Blob
    const timestamp = Date.now()
    const filename = `audio/sfx/${projectId}/scene${sceneIdx}-sfx-${sfxIdx}-${timestamp}.mp3`
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    })
    
    console.log(`[Batch Audio] SFX ${sfxIdx + 1} saved for scene ${sceneIdx + 1}: ${blob.url}`)
    return blob.url
  } catch (error: any) {
    console.error(`[Batch Audio] SFX generation failed for scene ${sceneIdx + 1}, SFX ${sfxIdx + 1}:`, error?.message || String(error))
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, includeMusic = false, includeSFX = false } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })                                                                            
    }

    // Get the base URL from the request headers
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const host = req.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    console.log(`[Batch Audio] Using base URL: ${baseUrl}`)

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const narrationVoice = visionPhase.narrationVoice
    const characters = visionPhase.characters || []
    const scenes = visionPhase.script?.script?.scenes || []

    if (!narrationVoice) {
      return NextResponse.json({ error: 'Narration voice not configured' }, { status: 400 })                                                                    
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
          let descriptionCount = 0
          let dialogueCount = 0
          let musicCount = 0
          let sfxCount = 0
          const skippedDialogue = []
          
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i]
            
            // Send progress update
            sendProgress({
              type: 'progress',
              scene: i + 1,
              total: scenes.length,
              status: 'generating_narration'
            })
            
            // Generate narration
            if (scene.narration) {
              console.log(`[Batch Audio] Generating narration for scene ${i + 1}`)                                                                              
              
              // Optimize narration text
              const optimizedNarration = optimizeTextForTTS(scene.narration)
              
              const narrationResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {                                                               
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  sceneIndex: i,
                  audioType: 'narration',
                  text: optimizedNarration.text,
                  voiceConfig: narrationVoice,
                }),
              })
              const narrationData = await narrationResult.json()
              if (narrationData.success) narrationCount++
              results.push(narrationData)
            }

            // Generate scene description audio if text is available
            const sceneDescriptionText = scene.visualDescription || scene.action || scene.summary || scene.heading
            if (sceneDescriptionText) {
              console.log(`[Batch Audio] Generating description audio for scene ${i + 1}`)
              const optimizedDescription = optimizeTextForTTS(sceneDescriptionText)
              const descriptionResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  sceneIndex: i,
                  audioType: 'description',
                  text: optimizedDescription.text,
                  voiceConfig: narrationVoice,
                }),
              })
              const descriptionData = await descriptionResult.json()
              if (descriptionData.success) descriptionCount++
              results.push(descriptionData)
            }
            
            // Generate dialogue
            if (scene.dialogue && scene.dialogue.length > 0) {
              sendProgress({
                type: 'progress',
                scene: i + 1,
                total: scenes.length,
                status: 'generating_dialogue',
                dialogueCount: scene.dialogue.length
              })
              
              for (let dialogueIndex = 0; dialogueIndex < scene.dialogue.length; dialogueIndex++) {                                                             
                const dialogueLine = scene.dialogue[dialogueIndex]
                console.log(`[Batch Audio] Processing dialogue ${dialogueIndex + 1}/${scene.dialogue.length} for character: "${dialogueLine.character}"`)       
                
                // Primary: Match by ID (most reliable)
                let character = dialogueLine.characterId
                  ? characters.find((c: any) => c.id === dialogueLine.characterId)
                  : null
                
                // Enhanced fallback matching using canonical names
                // This handles screenplay annotations like (V.O.), (O.S.), (CONT'D) and name variations
                if (!character && dialogueLine.character) {
                  const canonicalSearchName = toCanonicalName(dialogueLine.character)
                  console.log(`[Batch Audio] Using canonical name matching: "${dialogueLine.character}" → "${canonicalSearchName}"`)
                  
                  // Try exact canonical match first
                  const exactMatch = characters.find((c: any) => 
                    toCanonicalName(c.name) === canonicalSearchName
                  )
                  
                  if (exactMatch) {
                    character = exactMatch
                    console.log(`[Batch Audio] Matched via exact canonical name: ${exactMatch.name}`)
                  } else {
                    // Try alias matching (first name, last name, nickname variations)
                    character = characters.find((c: any) => {
                      const aliases = generateAliases(toCanonicalName(c.name), c.name)
                      return aliases.some(alias => 
                        toCanonicalName(alias) === canonicalSearchName
                      )
                    })
                    if (character) {
                      console.log(`[Batch Audio] Matched via alias: ${character.name}`)
                    }
                  }
                }
                
                console.log(`[Batch Audio] Found character:`, character ? {
                  id: character.id,
                  name: character.name,
                  matchedWith: dialogueLine.character,
                  matchedBy: dialogueLine.characterId ? 'ID' : 'name',
                  hasVoiceConfig: !!character.voiceConfig,
                  voiceConfig: character.voiceConfig
                } : 'NOT FOUND')
                
                if (!character?.voiceConfig) {
                  console.warn(`[Batch Audio] No voice for ${dialogueLine.character} - skipping dialogue`)                                                      
                  skippedDialogue.push({
                    scene: i + 1,
                    character: dialogueLine.character,
                    reason: character ? 'No voice assigned' : 'Character not found'                                                                             
                  })
                  continue
                }
                
                // CRITICAL: Use character.voiceConfig, NOT narrationVoice
                console.log(`[Batch Audio] Generating dialogue with voice:`, character.voiceConfig)                                                             
                
                // Optimize dialogue text for TTS
                const optimizedDialogue = optimizeTextForTTS(dialogueLine.line)
                
                const dialogueResult = await fetch(`${baseUrl}/api/vision/generate-scene-audio`, {                                                              
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    sceneIndex: i,
                    audioType: 'dialogue',
                    text: optimizedDialogue.text,
                    voiceConfig: character.voiceConfig,
                    characterName: dialogueLine.character,
                    dialogueIndex,
                  }),
                })
                const dialogueData = await dialogueResult.json()
                console.log(`[Batch Audio] Dialogue result:`, dialogueData.success ? 'SUCCESS' : `FAILED: ${dialogueData.error}`)                               
                if (dialogueData.success) dialogueCount++
                results.push(dialogueData)
              }
            }
            
            // Generate music if enabled
            if (includeMusic && scene.music) {
              sendProgress({
                type: 'progress',
                scene: i + 1,
                total: scenes.length,
                status: 'generating_music'
              })
              
              const musicUrl = await generateAndSaveMusicForScene(scene, projectId, i, baseUrl)
              if (musicUrl) {
                // Update scene in database
                const updatedScenes = [...scenes]
                if (!updatedScenes[i].musicAudio) {
                  updatedScenes[i].musicAudio = musicUrl
                  musicCount++
                  
                  // Save to database
                  await Project.update(
                    {
                      metadata: {
                        ...metadata,
                        visionPhase: {
                          ...visionPhase,
                          script: {
                            ...visionPhase.script,
                            script: {
                              ...visionPhase.script?.script,
                              scenes: updatedScenes
                            }
                          }
                        }
                      }
                    },
                    { where: { id: projectId } }
                  )
                }
              }
            }
            
            // Generate SFX if enabled
            if (includeSFX && scene.sfx && scene.sfx.length > 0) {
              sendProgress({
                type: 'progress',
                scene: i + 1,
                total: scenes.length,
                status: 'generating_sfx',
                sfxCount: scene.sfx.length
              })
              
              const sfxUrls: string[] = []
              for (let sfxIdx = 0; sfxIdx < scene.sfx.length; sfxIdx++) {
                const sfxUrl = await generateAndSaveSFXForScene(scene, projectId, i, sfxIdx, baseUrl)
                if (sfxUrl) {
                  sfxUrls[sfxIdx] = sfxUrl
                  sfxCount++
                }
              }
              
              if (sfxUrls.length > 0) {
                // Update scene in database
                const updatedScenes = [...scenes]
                updatedScenes[i].sfxAudio = sfxUrls
                
                // Save to database
                await Project.update(
                  {
                    metadata: {
                      ...metadata,
                      visionPhase: {
                        ...visionPhase,
                        script: {
                          ...visionPhase.script,
                          script: {
                            ...visionPhase.script?.script,
                            scenes: updatedScenes
                          }
                        }
                      }
                    }
                  },
                  { where: { id: projectId } }
                )
              }
            }
          }
          
          // Send completion
          sendProgress({
            type: 'complete',
            narrationCount,
            descriptionCount,
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
