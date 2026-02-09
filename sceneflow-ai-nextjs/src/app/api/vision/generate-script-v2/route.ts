import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { v4 as uuidv4 } from 'uuid'
import { toCanonicalName, generateAliases } from '@/lib/character/canonical'
import { SubscriptionService } from '../../../../services/SubscriptionService'
import { runScriptQA, autoFixScript } from '@/lib/script/qualityAssurance'
import { generateText } from '@/lib/vertexai/gemini'
import { getSettingsForFormat, SCRIPT_SETTINGS_BY_FORMAT } from '@/lib/script/scriptGenerationRules'

export const runtime = 'nodejs'
export const maxDuration = 600  // 10 minutes for large script generation (requires Vercel Pro)

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
        const project = await Project.findByPk(projectId)
        
        if (!project) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'Project not found' 
          })}\n\n`))
          controller.close()
          return
        }

        const treatment = project.metadata?.filmTreatmentVariant
        if (!treatment) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'No film treatment found' 
          })}\n\n`))
          controller.close()
          return
        }

        // Simple duration-based safety cap (no scene-count prescriptions)
        const duration = project.duration || 300
        const projectFormat = treatment.format || 'short-film'
        
        // Extract story beats for context (NOT for scene-count calculation)
        const storyBeats = treatment.story_beats || treatment.storyBeats || []
        const beatCount = storyBeats.length || 7
        
        // Safety cap only - prevent runaway generation (max ~25 scenes for shorts)
        // Let the AI determine natural scene count based on story structure
        const maxSafetyScenes = Math.min(30, Math.ceil(duration / 30))  // Absolute max: 30s/scene
        
        // Validate: beat count should not exceed reasonable scene count to prevent fragmentation
        if (beatCount > 15) {
          console.warn(`[Script Gen V2] Warning: ${beatCount} beats may lead to fragmentation. Consider condensing story beats.`)
        }
        
        console.log(`[Script Gen V2] Format: ${projectFormat}, Duration: ${duration}s, Story beats: ${beatCount}`)
        console.log(`[Script Gen V2] Single-pass generation with safety cap of ${maxSafetyScenes} scenes`)
        
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
        // SINGLE-PASS GENERATION: Let the AI follow the Film Treatment
        // ============================================================
        const MAX_RETRIES = 3
        let allScenes: any[] = []
        
        // Time-based progress tracking
        const generationStartTime = Date.now()

        // Send initial progress
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: 'Analyzing story structure...',
          batch: 1,
          scenesGenerated: 0,
          totalScenes: beatCount, // Use beats as rough estimate
          elapsedSeconds: 0,
          estimatedRemainingSeconds: 60  // Conservative initial estimate
        })}\n\n`))

        console.log(`[Script Gen V2] Starting single-pass generation for ${duration}s film with ${beatCount} story beats...`)
        
        // Build the single-pass prompt
        const singlePassPrompt = buildSinglePassPrompt(treatment, duration, existingCharacters, storyBeats, maxSafetyScenes, subscriptionMaxScenes)
        
        let retryCount = 0
        let generationSuccessful = false
        
        while (!generationSuccessful && retryCount < MAX_RETRIES) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              status: retryCount > 0 ? `Regenerating script (attempt ${retryCount + 1})...` : 'Writing complete script...',
              batch: 1,
              scenesGenerated: 0,
              totalScenes: beatCount,
              elapsedSeconds: Math.floor((Date.now() - generationStartTime) / 1000),
              estimatedRemainingSeconds: 45,
              progress: 10  // Starting progress
            })}\n\n`))
            
            // Start a progress ticker to show activity during Gemini call
            const estimatedDuration = 45 // seconds
            let progressInterval: NodeJS.Timeout | null = null
            const progressStatuses = [
              'Analyzing narrative structure...',
              'Developing character arcs...',
              'Writing dialogue exchanges...',
              'Crafting scene transitions...',
              'Building dramatic tension...',
              'Polishing narrative flow...',
              'Finalizing script details...'
            ]
            let statusIndex = 0
            
            progressInterval = setInterval(() => {
              const elapsed = Math.floor((Date.now() - generationStartTime) / 1000)
              const estimatedProgress = Math.min(85, Math.floor((elapsed / estimatedDuration) * 100))
              const remaining = Math.max(5, estimatedDuration - elapsed)
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                status: progressStatuses[statusIndex % progressStatuses.length],
                batch: 1,
                scenesGenerated: 0,
                totalScenes: beatCount,
                elapsedSeconds: elapsed,
                estimatedRemainingSeconds: remaining,
                progress: estimatedProgress
              })}\n\n`))
              
              statusIndex++
            }, 5000) // Update every 5 seconds
            
            let response: string
            try {
              response = await callGemini(singlePassPrompt)
            } finally {
              // Always clear the interval
              if (progressInterval) {
                clearInterval(progressInterval)
              }
            }
            
            // Send parsing progress
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              status: 'Parsing generated script...',
              batch: 1,
              scenesGenerated: 0,
              totalScenes: beatCount,
              elapsedSeconds: Math.floor((Date.now() - generationStartTime) / 1000),
              estimatedRemainingSeconds: 5,
              progress: 90
            })}\n\n`))
            
            let parsedData = parseSinglePassResponse(response)
            
            // Release memory immediately
            response = ''
            
            if (parsedData.scenes && parsedData.scenes.length > 0) {
              allScenes = parsedData.scenes
              
              // Post-process: consolidate any fragmented scenes
              allScenes = consolidateFragmentedScenes(allScenes)
              
              // Validate against subscription limit
              if (subscriptionMaxScenes && allScenes.length > subscriptionMaxScenes) {
                console.warn(`[Script Gen V2] Generated ${allScenes.length} scenes, but user limit is ${subscriptionMaxScenes}. Truncating.`)
                allScenes = allScenes.slice(0, subscriptionMaxScenes)
              }
              
              // Validate against safety cap
              if (allScenes.length > maxSafetyScenes) {
                console.warn(`[Script Gen V2] Generated ${allScenes.length} scenes exceeds safety cap of ${maxSafetyScenes}. Consolidating.`)
                allScenes = consolidateToTargetCount(allScenes, maxSafetyScenes)
              }
              
              console.log(`[Script Gen V2] Single-pass generation complete: ${allScenes.length} scenes`)
              generationSuccessful = true
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'progress',
                status: `Generated ${allScenes.length} complete scenes`,
                batch: 1,
                scenesGenerated: allScenes.length,
                totalScenes: allScenes.length,
                elapsedSeconds: Math.floor((Date.now() - generationStartTime) / 1000),
                estimatedRemainingSeconds: 3,
                progress: 95  // Almost done, just processing characters
              })}\n\n`))
            } else {
              throw new Error('No scenes generated')
            }
          } catch (error: any) {
            retryCount++
            console.error(`[Script Gen V2] Generation attempt ${retryCount} failed:`, error.message)
            
            if (retryCount >= MAX_RETRIES) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: `Script generation failed after ${MAX_RETRIES} attempts: ${error.message}`
              })}\n\n`))
              controller.close()
              return
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
    
        // Process characters and embed IDs (existing logic)
        const dialogueChars = extractCharacters(allScenes)
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
        const aliasCache = new Map<string, string[]>()
        const getCachedAliases = (canonicalName: string): string[] => {
          if (!aliasCache.has(canonicalName)) {
            aliasCache.set(canonicalName, generateAliases(canonicalName))
          }
          return aliasCache.get(canonicalName)!
        }
        
        const scenesWithCharacterIds = allScenes.map((scene: any) => ({
          ...scene,
          dialogue: scene.dialogue?.map((d: any) => {
            if (!d.character) return d
            
            const normalizedDialogueName = toCanonicalName(d.character)
            
            // Try exact match first
            let character = allCharacters.find((c: any) => 
              toCanonicalName(c.name) === normalizedDialogueName
            )
            
            // Fallback: Use cached aliases for matching
            if (!character) {
              character = allCharacters.find((c: any) => {
                const aliases = getCachedAliases(toCanonicalName(c.name))
                return aliases.some(alias => 
                  toCanonicalName(alias) === normalizedDialogueName
                )
              })
            }
            
            return {
              ...d,
              character: character ? character.name : d.character,
              characterId: character?.id
            }
          })
        }))
        
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
          const qaResult = runScriptQA(scenesWithCharacterIds, mergedCharacters)
          
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
        
        await project.update({
          metadata: {
            ...project.metadata,
            visionPhase: {
              ...existingVisionPhase,
              script: finalScript,
              scriptGenerated: true,
              characters: mergedCharacters,
              scenes: finalScenes
            }
          }
        })

        // Send completion (single-pass is always complete, not partial)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          totalScenes: allScenes.length,
          totalDuration: totalEstimatedDuration,
          partial: false,
          expectedScenes: allScenes.length,
          projectId: projectId
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

function buildBatch1Prompt(treatment: any, start: number, end: number, min: number, max: number, suggested: number, targetDuration: number, prev: any[], characters: any[]) {
  // Build character list from Film Treatment
  const characterList = characters.length > 0
    ? `\n\nDEFINED CHARACTERS (USE ONLY THESE):\n${characters.map((c: any) => 
        `${c.name} (${c.role || 'character'}): ${c.description || ''}
        ${c.appearance ? `Appearance: ${c.appearance}` : ''}
        ${c.demeanor ? `Demeanor: ${c.demeanor}` : ''}
        ${c.clothing ? `Clothing: ${c.clothing}` : ''}`
      ).join('\n\n')}`
    : ''

  return `Generate the FIRST ${end} scenes of a script targeting ${targetDuration} seconds total.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
Genre: ${treatment.genre}
Tone: ${treatment.tone}
${characterList}

CRITICAL CHARACTER RULES:
- The character list below defines the ONLY approved characters
- Character names are formatted in Title Case (e.g., "Brian Anderson Sr", "Dr. Sarah Martinez")
- Use EXACT names in dialogue - NO variations, abbreviations, or nicknames
- "Brian Anderson Sr" ≠ "Brian" ≠ "BRIAN" ≠ "Anderson"
- Match names character-for-character (case-insensitive acceptable in JSON, but use Title Case)
- DO NOT invent new characters unless absolutely necessary (minor roles: waiter, passerby with 1 line)

CHARACTER NAME RULES (CRITICAL):
1. **In the "character" field**: Use EXACT full names from the character list
   - Example: {"character": "Brian Anderson Sr", "line": "..."}
   
2. **In the "line" field (dialogue text)**: Use NATURAL, CONTEXTUAL names
   - Characters address each other as they would in real conversation
   - Use first names, nicknames, titles, or relationship terms (Dad, Mom, Sir, etc.)
   - Example: {"character": "Brian Anderson Sr", "line": "[calmly] Eric, it's been a while."}
   - Example: {"character": "Eric Anderson", "line": "[dryly] What is this, Dad? Another attempt?"}
   
3. **Addressing characters naturally**:
   - Family: First names, "Dad", "Mom", "Son", nicknames
   - Professional: Titles (Dr., Mr./Mrs.) + last name
   - Friends/Peers: First names or nicknames
   - Strangers/Formal: Mr./Mrs./Ms. + last name or sir/ma'am
   
DO NOT force full character names into dialogue text unnaturally.

DIALOGUE AUDIO TAGS (CRITICAL FOR ELEVENLABS TTS):
EVERY dialogue line MUST include emotional/vocal direction tags to guide AI voice generation.

STYLE TAGS (In square brackets BEFORE text):
Emotions: [happy], [sad], [angry], [fearful], [surprised], [disgusted], [neutral]
Intensity: [very], [slightly], [extremely]
Vocal Quality: [whispering], [shouting], [mumbling], [singing], [laughing], [crying], [gasping]
Pace: [quickly], [slowly], [hesitantly], [confidently]
Combined: [very happy], [slightly angry], [extremely fearful], [confidently asserting]

PUNCTUATION & PACING:
- Use ellipses (...) for pauses, trailing off, or hesitation
- Use dashes (—) for interruptions or sudden stops  
- Use CAPS for EMPHASIS on specific words
- Use commas (,) for natural breathing pauses

EXAMPLES:
  * {"character": "BRIAN ANDERSON SR", "line": "[very excited] I can't believe it! This changes EVERYTHING!"}
  * {"character": "MINT", "line": "[whispering nervously] Don't tell anyone... It's our secret, okay?"}
  * {"character": "ERIC", "line": "[sadly, slowly] I wish things were different— but they're not."}

CRITICAL: Every single dialogue line must start with at least one emotion/style tag in [brackets].

IMPORTANT - DIALOGUE VS STAGE DIRECTION:
- Stage directions (actions, movements, descriptions) go in the "action" field, NOT in dialogue
- Dialogue lines must contain SPOKEN WORDS, not just bracketed directions
- WRONG: {"character": "ALEX", "line": "[shaky breath] [Alex retrieves the cufflink]"} ← This is a stage direction, not dialogue!
- CORRECT: {"character": "ALEX", "line": "[shaky breath, defeated] I found it... the cufflink."}
- If a character performs an action without speaking, put it in the "action" field, NOT as a dialogue line

SCENE PLANNING (CRITICAL - READ CAREFULLY):
- Total runtime: ${targetDuration}s (~${Math.floor(targetDuration / 60)} minutes)
- Target scene count: ${suggested} scenes (this is OPTIMAL based on your story beats)
- Generate first ${end} scenes now
- Average scene duration: ~${Math.ceil(targetDuration / suggested)}s (60-120s is ideal)

IMPORTANT SCENE STRUCTURE GUIDANCE:
- Each scene should cover a COMPLETE dramatic beat - don't fragment action into multiple tiny scenes
- A scene should have a clear beginning, middle, and end (mini arc)
- Combine related moments that happen in the same location/time into ONE scene
- Think like a film director: when would you naturally call "CUT"?

WHAT MAKES A GOOD SCENE:
- Substantial dialogue exchanges (4-8 lines minimum for dialogue-heavy scenes)
- Complete character interactions, not fragments
- Natural scene breaks at location changes, time jumps, or POV shifts
- Each scene advances the plot OR reveals character - preferably both

DURATION ESTIMATION:
- Estimate based on content density: dialogue, action, emotional beats
- A scene with 4-6 dialogue exchanges + narration typically runs 60-90s
- A scene with 8+ dialogue exchanges can run 90-120s
- Brief transitional scenes can be 30-45s
- Round to nearest 8s for video clip alignment

AVOID THESE COMMON MISTAKES:
❌ Creating separate scenes for each line of dialogue
❌ Splitting a single conversation across multiple scenes
❌ Scenes under 30s (too fragmented)
❌ Ending scenes mid-conversation
❌ Creating "reaction" scenes that should be part of the previous scene

Return JSON:
{
  "totalScenes": ${suggested},  // REQUIRED: Use ${suggested} scenes (±2 max) for ${targetDuration}s story
  "estimatedTotalDuration": 300,  // Sum of first ${end} scenes only
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "characters": ["Character Name 1", "Character Name 2"],  // CRITICAL: List all characters in this scene
      "action": "SOUND of gentle sizzling, a timer beeps. CLOSE UP on character's hands. They move across the room.\n\nSFX: Gentle kitchen sizzling with rhythmic timer beep creating anticipation\n\nMusic: Soft upbeat piano melody with warm, inviting tones suggesting morning optimism",
      "narration": "In the quiet hours before dawn, a dream takes shape in flour and fire.",  // NEW: Captivating voiceover narration
      "dialogue": [{"character": "NAME", "line": "..."}],
      "visualDescription": "Camera, lighting",
      "duration": 25,  // REALISTIC based on content (dialogue count + action time)
      "sfx": [{"time": 0, "description": "Gentle sizzling, timer beeps"}],
      "music": {"description": "Soft upbeat piano"}
    }
  ]
}

CRITICAL SCENE REQUIREMENTS:
- Write COMPLETE, SUBSTANTIVE scenes - not fragments
- Each scene should feel like a mini-movie with its own arc
- Include 4-8 dialogue exchanges per scene minimum (for dialogue scenes)
- A conversation between two characters should be ONE scene, not split into many
- Target ${suggested} total scenes for this ${Math.floor(targetDuration / 60)}-minute film
- If a story beat naturally spans multiple locations, that's multiple scenes
- If characters are in the same place having one conversation, that's ONE scene

NARRATION REQUIREMENTS (CRITICAL):
- Each scene MUST include a "narration" field with captivating voiceover narration (1-2 sentences)
- Use vivid, evocative language that engages the audience emotionally
- Focus on: internal thoughts/emotions, thematic significance, foreshadowing, poetic atmosphere
- DO NOT: repeat action description, use technical camera language, state obvious visuals, be generic
- Examples:
  ✓ GOOD: "In the dim glow of his monitor, Brian races against time. Each keystroke brings him closer to his dream—or his breaking point."
  ✓ GOOD: "She had learned that silence could be louder than words, and tonight, it was deafening."
  ✗ BAD: "Brian types on his computer." (Too literal)
  ✗ BAD: "The scene takes place in an office." (States the obvious)

SCRIPT FORMAT REQUIREMENTS (CRITICAL):
- Include sound effects naturally in action description using SOUND OF, HEAR, etc.
- After the main action, add separate labeled lines for audio:
  * "SFX: [description of sound effects]" on its own line
  * "Music: [description of background music]" on its own line
- Keep audio descriptions concise but emotionally evocative
- Example action format:
  "SOUND of gentle sizzling, a timer beeps. CLOSE UP on Mint's hands, deftly shaping dough, dusting flour.
  
  SFX: Gentle kitchen sizzling with rhythmic timer beep creating anticipation
  
  Music: Soft upbeat piano melody with warm, inviting tones suggesting morning optimism"

AUDIO FIELD REQUIREMENTS (CRITICAL FOR MOOD AND EMOTION):
- sfx: Array with timing - be specific about the sound quality and emotional impact
  * Examples: "Deep, resonant car horn echoing through empty streets", "Sharp glass breaking with cascading shards", "Distant thunder rumbling ominously"
- music: Object for advanced features - describe the mood, instrumentation, tempo, and emotional intent
  * Examples: "Melancholic piano with slow, deliberate notes building tension", "Upbeat acoustic guitar with hopeful undertones", "Dark orchestral strings creating a sense of foreboding"
- Think cinematically: music and SFX should enhance the emotional storytelling
- Descriptions should be 10-20 words, balancing specificity with creative interpretation

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON - no markdown, no explanations
- Property names MUST be double-quoted
- String values MUST be properly escaped
- NO control characters (tabs, newlines) except in escaped form (\\n, \\t)
- NO trailing commas
- Validate JSON structure before returning

CRITICAL:
1. Determine total scene count that best fits ${targetDuration}s story
2. Estimate accurate durations (don't use arbitrary numbers)
3. Quality writing over exact duration matching
4. MUST include "characters" array in EVERY scene - list all characters who appear (speaking or non-speaking)

Generate first ${end} scenes with realistic durations.`
}

function buildBatch2Prompt(treatment: any, start: number, end: number, total: number, targetDuration: number, prevScenes: any[], totalPrevScenes: number, prevDuration: number, characters: any[]) {
  const batchSize = end - start + 1
  const remainingDuration = targetDuration - prevDuration
  const avgNeeded = Math.floor(remainingDuration / (total - totalPrevScenes))
  
  const characterList = characters.length > 0
    ? `\n\nDEFINED CHARACTERS (USE ONLY THESE):\n${characters.map((c: any) => `${c.name} (${c.role || 'character'}): ${c.description || ''}`).join('\n')}`
    : ''
  
  return `Generate scenes ${start}-${end} (batch of ${batchSize} scenes) for a ${total}-scene script.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
${characterList}

CRITICAL CHARACTER RULES:
- Use ONLY these approved characters: ${characters.map((c: any) => c.name).join(', ')}
- Names are in Title Case - use them EXACTLY
- NO abbreviations: "Brian Anderson Sr" not "Brian"
- Match character names exactly as listed in the character list
- DO NOT invent new dialogue speakers

CHARACTER NAME RULES (CRITICAL):
1. **In the "character" field**: Use EXACT full names from the character list
   - Example: {"character": "Brian Anderson Sr", "line": "..."}
   
2. **In the "line" field (dialogue text)**: Use NATURAL, CONTEXTUAL names
   - Characters address each other as they would in real conversation
   - Use first names, nicknames, titles, or relationship terms (Dad, Mom, Sir, etc.)
   - Example: {"character": "Brian Anderson Sr", "line": "[calmly] Eric, it's been a while."}
   - Example: {"character": "Eric Anderson", "line": "[dryly] What is this, Dad? Another attempt?"}
   
DO NOT force full character names into dialogue text unnaturally.

DIALOGUE AUDIO TAGS (CRITICAL FOR ELEVENLABS TTS):
EVERY dialogue line MUST include emotional/vocal direction tags to guide AI voice generation.

STYLE TAGS (In square brackets BEFORE text):
Emotions: [happy], [sad], [angry], [fearful], [surprised], [disgusted], [neutral]
Intensity: [very], [slightly], [extremely]
Vocal Quality: [whispering], [shouting], [mumbling], [singing], [laughing], [crying], [gasping]
Pace: [quickly], [slowly], [hesitantly], [confidently]

PUNCTUATION & PACING:
- Use ellipses (...) for pauses, trailing off, or hesitation
- Use dashes (—) for interruptions or sudden stops
- Use CAPS for EMPHASIS on specific words

EXAMPLES:
  * {"character": "NAME", "line": "[sadly] ...I can't believe it."}
  * {"character": "NAME", "line": "[very excited, quickly] This is AMAZING!"}

CRITICAL: Every single dialogue line must start with at least one emotion/style tag in [brackets].

PREVIOUS SCENES (${totalPrevScenes} scenes generated so far, ${prevDuration}s total):
${prevScenes.slice(-3).map((s: any) => `Scene ${s.sceneNumber}. ${s.heading} (${s.duration}s): ${s.action.substring(0, 100)}...`).join('\n')}

CONTINUATION GUIDANCE:
- Remaining scenes: ${total - totalPrevScenes} more scenes needed (scenes ${start}-${total})
- Remaining duration: ~${remainingDuration}s
- Average per remaining scene: ~${avgNeeded}s (60-120s is ideal)
- Total target: ${targetDuration}s

IMPORTANT - SCENE STRUCTURE:
- Each scene should be a COMPLETE dramatic beat
- Don't fragment conversations across multiple scenes
- A scene with dialogue should have 4-8+ exchanges minimum
- Include beginning, middle, end within each scene
- Natural scene breaks: location change, time jump, POV shift

DURATION ESTIMATION:
- Based on content density: dialogue exchanges, action, emotional beats
- 4-6 dialogue exchanges + narration → typically 60-90s
- 8+ dialogue exchanges → 90-120s  
- Brief transitional scenes → 30-45s
- Round to nearest 8s for video alignment

AVOID FRAGMENTATION:
❌ Don't split one conversation into multiple scenes
❌ Don't create scenes under 30s
❌ Don't end scenes mid-interaction
✓ Combine related moments in same location/time

Return JSON array:
[
  {
    "sceneNumber": ${start},
    "heading": "INT. LOCATION - TIME",
    "characters": ["Character Name 1", "Character Name 2"],  // CRITICAL: List all characters in this scene
    "action": "SOUND of footsteps approaching. Character enters.\n\nSFX: Footsteps on hardwood\n\nMusic: Suspenseful strings",
    "narration": "Every step echoes with the weight of decisions unmade.",  // CRITICAL: Captivating voiceover
    "dialogue": [{"character": "NAME", "line": "..."}],
    "visualDescription": "Camera, lighting",
    "duration": 45,  // REALISTIC estimate
    "sfx": [{"time": 0, "description": "Footsteps on hardwood"}],
    "music": {"description": "Suspenseful strings"}
  }
]

NARRATION REQUIREMENTS (CRITICAL):
- MUST include captivating "narration" field in EVERY scene (1-2 sentences)
- Write engaging, emotionally resonant voiceover narration
- Focus on storytelling, not technical description

SCRIPT FORMAT REQUIREMENTS (CRITICAL):
- Include sound effects naturally in action using SOUND OF, HEAR, etc.
- Add separate "SFX: [description]" line after main action
- Add separate "Music: [description]" line for background music
- Keep audio descriptions concise

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON - no markdown, no explanations
- Property names MUST be double-quoted
- String values MUST be properly escaped
- NO control characters (tabs, newlines) except in escaped form (\\n, \\t)
- NO trailing commas
- Validate JSON structure before returning

FOCUS ON:
1. Quality, engaging writing
2. Natural dialogue
3. Realistic duration estimates
4. Smooth conclusion to story
5. MUST include "characters" array in EVERY scene - list all characters who appear

Complete the script with accurate duration estimates.`
}

/**
 * SINGLE-PASS PROMPT: Generates complete script following Film Treatment naturally
 * Key changes from batch approach:
 * - NO scene count targets or constraints
 * - Focus on entertainment value and engagement
 * - Let story structure drive scene breaks
 * - Minimum 60s per scene to prevent fragmentation
 */
function buildSinglePassPrompt(
  treatment: any,
  targetDuration: number,
  characters: any[],
  storyBeats: any[],
  maxSafetyScenes: number,
  subscriptionMaxScenes: number | null
): string {
  // Build character list
  const characterList = characters.length > 0
    ? `\n\nCHARACTERS (USE EXACT NAMES):\n${characters.map((c: any) => 
        `• ${c.name}${c.role ? ` (${c.role})` : ''}: ${c.description || 'No description'}
        ${c.appearance ? `  Appearance: ${c.appearance}` : ''}
        ${c.demeanor ? `  Demeanor: ${c.demeanor}` : ''}`
      ).join('\n')}`
    : ''

  // Format story beats if available
  const storyBeatsText = storyBeats.length > 0
    ? `\n\nSTORY BEATS TO FOLLOW:\n${storyBeats.map((beat: any, idx: number) => 
        `${idx + 1}. ${typeof beat === 'string' ? beat : beat.description || beat.title || JSON.stringify(beat)}`
      ).join('\n')}`
    : ''

  const sceneLimit = subscriptionMaxScenes 
    ? Math.min(maxSafetyScenes, subscriptionMaxScenes)
    : maxSafetyScenes

  return `You are a master screenwriter. Write a complete, production-ready script for the following film.

FILM TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Genre: ${treatment.genre || 'Drama'}
Tone: ${treatment.tone || 'Engaging'}
Target Duration: ~${Math.floor(targetDuration / 60)} minutes (${targetDuration} seconds)

Synopsis:
${treatment.synopsis || treatment.content}
${characterList}
${storyBeatsText}

=== SCRIPT GENERATION PHILOSOPHY ===

Your goal is to write an ENGAGING, ENTERTAINING script optimized for audience connection.
Do NOT fragment the story into tiny scenes. Each scene should be a COMPLETE dramatic unit.

SCENE STRUCTURE PRINCIPLES:
• Each scene = ONE complete dramatic beat with beginning, middle, end
• Natural scene breaks occur at: location changes, time jumps, POV shifts
• A conversation between characters = ONE scene (not multiple)
• Minimum 4-8 dialogue exchanges per dialogue-heavy scene
• Target 60-120 seconds per scene (based on content density)

WHAT TO AVOID:
❌ Splitting conversations across multiple scenes
❌ Creating scenes under 45 seconds
❌ One scene per line of dialogue (this is a script, not a shot list)
❌ Fragmented "reaction" scenes that belong in the previous scene
❌ Arbitrary scene breaks that disrupt narrative flow

WHAT TO CREATE:
✓ Rich, substantive scenes with complete dramatic arcs
✓ Natural dialogue that sounds like real conversation
✓ Scenes that advance BOTH plot AND character
✓ Emotional beats that resonate with the audience
✓ A cohesive narrative following the story beats

DIALOGUE REQUIREMENTS:
• Every dialogue line MUST start with emotion tags: [emotion, delivery]
• Examples: [sadly, slowly], [excited, quickly], [whispering nervously]
• Use ellipses (...) for pauses, dashes (—) for interruptions
• Use CAPS for EMPHASIS on specific words

TECHNICAL REQUIREMENTS:
• Use character names EXACTLY as listed (Title Case)
• Include "narration" field with captivating voiceover (1-2 sentences)
• Include "sfx" and "music" for atmosphere
• Estimate realistic durations based on content

OUTPUT FORMAT (JSON):
{
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "characters": ["Character Name 1", "Character Name 2"],
      "action": "Detailed scene action with atmosphere...\\n\\nSFX: Sound description\\n\\nMusic: Music description",
      "narration": "Captivating voiceover narration...",
      "dialogue": [
        {"character": "Character Name", "line": "[emotion] Dialogue text..."}
      ],
      "visualDescription": "Camera and lighting notes",
      "duration": 75,
      "sfx": [{"time": 0, "description": "Sound effect"}],
      "music": {"description": "Background music mood"}
    }
  ]
}

IMPORTANT CONSTRAINTS:
• Maximum ${sceneLimit} scenes total (consolidate if needed)
• Each scene MINIMUM 45 seconds
• Write the COMPLETE story from beginning to end
• Return ONLY valid JSON - no markdown, no explanations

Now write the complete script, following the Film Treatment's story beats naturally. Focus on entertainment value and audience engagement over hitting any specific scene count.`
}

/**
 * Parse single-pass response into scenes array
 */
function parseSinglePassResponse(response: string): { scenes: any[] } {
  let parsedScenes: any[] = []
  
  try {
    const cleaned = sanitizeJsonString(response)
    const parsed = JSON.parse(cleaned)
    parsedScenes = parsed.scenes || []
  } catch (parseError: any) {
    console.warn('[Parse Single-Pass] Full parse failed, attempting extraction...', parseError.message.substring(0, 100))
    
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
        console.log(`[Parse Single-Pass] Recovered ${parsedScenes.length} scenes via extraction`)
      }
    } catch (extractError) {
      console.error('[Parse Single-Pass] Extraction failed:', extractError)
    }
  }
  
  // Process and normalize scenes
  return {
    scenes: parsedScenes.map((s: any, idx: number) => ({
      sceneNumber: s.sceneNumber || idx + 1,
      heading: s.heading || `SCENE ${idx + 1}`,
      characters: s.characters || [],
      action: s.action || '',
      narration: s.narration || '',
      dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
      visualDescription: s.visualDescription || s.action || '',
      duration: Math.max(45, s.duration || 60), // Enforce minimum 45s
      sfx: Array.isArray(s.sfx) ? s.sfx : [],
      music: s.music || undefined,
      isExpanded: true
    }))
  }
}

/**
 * Consolidate fragmented scenes (under 45s) by merging with adjacent scenes
 */
function consolidateFragmentedScenes(scenes: any[]): any[] {
  if (scenes.length <= 1) return scenes
  
  const consolidated: any[] = []
  let currentScene: any = null
  
  for (const scene of scenes) {
    if (!currentScene) {
      currentScene = { ...scene }
      continue
    }
    
    // If current scene is too short (<45s), merge with next
    if (currentScene.duration < 45) {
      console.log(`[Consolidate] Merging short scene ${currentScene.sceneNumber} (${currentScene.duration}s) with scene ${scene.sceneNumber}`)
      currentScene = mergeScenes(currentScene, scene)
    } else {
      consolidated.push(currentScene)
      currentScene = { ...scene }
    }
  }
  
  // Don't forget the last scene
  if (currentScene) {
    consolidated.push(currentScene)
  }
  
  // Renumber scenes
  return consolidated.map((s, idx) => ({
    ...s,
    sceneNumber: idx + 1
  }))
}

/**
 * Force consolidation to target count by merging adjacent scenes
 */
function consolidateToTargetCount(scenes: any[], targetCount: number): any[] {
  if (scenes.length <= targetCount) return scenes
  
  let result = [...scenes]
  
  while (result.length > targetCount) {
    // Find the shortest scene to merge
    let shortestIdx = 0
    let shortestDuration = Infinity
    
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].duration < shortestDuration) {
        shortestDuration = result[i].duration
        shortestIdx = i
      }
    }
    
    // Merge with next scene
    const merged = mergeScenes(result[shortestIdx], result[shortestIdx + 1])
    result = [
      ...result.slice(0, shortestIdx),
      merged,
      ...result.slice(shortestIdx + 2)
    ]
    
    console.log(`[Consolidate] Merged scenes ${shortestIdx + 1} and ${shortestIdx + 2}, now have ${result.length} scenes`)
  }
  
  // Renumber
  return result.map((s, idx) => ({
    ...s,
    sceneNumber: idx + 1
  }))
}

/**
 * Merge two scenes into one
 */
function mergeScenes(scene1: any, scene2: any): any {
  return {
    sceneNumber: scene1.sceneNumber,
    heading: scene1.heading, // Keep first scene's heading
    characters: [...new Set([...(scene1.characters || []), ...(scene2.characters || [])])],
    action: `${scene1.action}\\n\\n${scene2.action}`.trim(),
    narration: scene1.narration || scene2.narration, // Keep first non-empty
    dialogue: [...(scene1.dialogue || []), ...(scene2.dialogue || [])],
    visualDescription: `${scene1.visualDescription} ${scene2.visualDescription}`.trim(),
    duration: (scene1.duration || 0) + (scene2.duration || 0),
    sfx: [...(scene1.sfx || []), ...(scene2.sfx || [])],
    music: scene1.music || scene2.music,
    isExpanded: true
  }
}

async function callGemini(prompt: string): Promise<string> {
  console.log('[Generate Script V2] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 16384  // Reduced from 32768 to lower memory footprint
  })
  
  const text = result.text || ''
  
  // Debug logging - first 500 chars
  console.log('[Gemini Response] First 500 chars:', text.substring(0, 500))
  console.log('[Gemini Response] Last 500 chars:', text.substring(Math.max(0, text.length - 500)))
  console.log('[Gemini Response] Total length:', text.length)
  
  return text
}

function* streamParseScenes(jsonText: string): Generator<any[], void, unknown> {
  // Try to extract complete scenes from partial JSON
  // Look for "scenes" array patterns in the JSON
  const scenePattern = /"scenes":\s*\[\s*((?:"[^"]+"|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\d+|true|false|null)(?:,\s*(?:"[^"]+"|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\d+|true|false|null))*)\s*\]/
  
  let lastIndex = 0
  while (lastIndex < jsonText.length) {
    const match = jsonText.slice(lastIndex).match(scenePattern)
    if (!match) break
    
    try {
      const scenesJson = `[${match[1]}]`
      const scenes = JSON.parse(scenesJson)
      if (Array.isArray(scenes) && scenes.length > 0) {
        yield scenes
      }
    } catch {
      // Partial match or invalid JSON, continue
    }
    lastIndex += (match.index || 0) + match[0].length
  }
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

/**
 * Detects and extracts SFX entries that were incorrectly placed in dialogue array
 * 
 * Detection criteria:
 * - Entire line wrapped in parentheses: (text)
 * - Contains sound-related keywords
 * - Does NOT contain conversational dialogue patterns
 */
function extractSFXFromDialogue(scene: any): any {
  if (!scene.dialogue || !Array.isArray(scene.dialogue) || scene.dialogue.length === 0) {
    return scene
  }
  
  // Keywords that indicate sound effects (not dialogue)
  const sfxKeywords = [
    'HUM', 'SOUND', 'NOISE', 'BEEP', 'BUZZ', 'CLICK', 'RING', 'BANG', 
    'CRASH', 'THUD', 'WHOOSH', 'RUSTLE', 'CREAK', 'SLAM', 'WHISTLE', 
    'ECHO', 'RUMBLE', 'DISTANT', 'APPROACHING', 'FADING', 'HISSING',
    'DRIPPING', 'SCRAPING', 'FOOTSTEPS', 'KNOCKING', 'TAPPING'
  ]
  
  const extractedSFX: Array<{time: number, description: string}> = []
  const cleanedDialogue: Array<any> = []
  
  scene.dialogue.forEach((d: any) => {
    const line = (d.line || '').trim()
    
    // Check 1: Is the entire line wrapped in parentheses?
    const isWrappedInParens = /^\(.*\)$/.test(line)
    
    if (!isWrappedInParens) {
      // Not wrapped in parens -> keep as dialogue
      cleanedDialogue.push(d)
      return
    }
    
    // Check 2: Contains SFX keywords?
    const upperLine = line.toUpperCase()
    const containsSFXKeyword = sfxKeywords.some(keyword => upperLine.includes(keyword))
    
    // Check 3: Does NOT look like actual dialogue
    const hasQuotationMarks = line.includes('"') || line.includes("'")
    const hasConversationalWords = /\b(I|you|we|they|my|your|our|their|yes|no|okay|please|thank|sorry|hello|hi|hey|what|when|where|why|how)\b/i.test(line)
    
    // If it's wrapped in parens, has SFX keywords, and doesn't look like dialogue -> it's SFX
    if (containsSFXKeyword && !hasQuotationMarks && !hasConversationalWords) {
      const description = line.replace(/^\(|\)$/g, '').trim()
      extractedSFX.push({
        time: 0,  // Default to start of scene
        description
      })
      console.log(`[SFX Extraction] Moved from dialogue (${d.character}) to SFX: "${description}"`)
    } else {
      // Keep as dialogue
      cleanedDialogue.push(d)
    }
  })
  
  // Only update if we actually extracted something
  if (extractedSFX.length > 0) {
    return {
      ...scene,
      dialogue: cleanedDialogue,
      sfx: [...(scene.sfx || []), ...extractedSFX]
    }
  }
  
  return scene
}

function parseBatch1(response: string, start: number, end: number): any {
  let parsed: any
  let parsedScenes: any[] = []
  
  try {
    // Try full parse first
    const cleaned = sanitizeJsonString(response)
    parsed = JSON.parse(cleaned)
    parsedScenes = parsed.scenes || []
  } catch (parseError: any) {
    console.warn('[Parse Batch 1] Full parse failed, attempting incremental extraction...', parseError.message.substring(0, 100))
    
    // Extract as many complete scenes as possible
    for (const sceneChunk of streamParseScenes(response)) {
      parsedScenes.push(...sceneChunk)
    }
    
    if (parsedScenes.length === 0) {
      console.error('[Parse Batch 1] No scenes recovered via incremental parsing')
      return {
        totalScenes: null,
        estimatedTotalDuration: 0,
        scenes: []
      }
    }
    
    console.log(`[Parse Batch 1] Recovered ${parsedScenes.length} scenes via incremental parsing`)
    parsed = { scenes: parsedScenes }
  }
    
    // Batch 1 returns object with totalScenes and scenes
        return {
          totalScenes: parsed.totalScenes || null,
          estimatedTotalDuration: parsed.estimatedTotalDuration || 0,
    scenes: (parsedScenes || []).map((s: any, idx: number) => {
            const scene = {
              sceneNumber: start + idx,
              heading: s.heading || `SCENE ${start + idx}`,
              action: s.action || 'Scene content',
              narration: s.narration || '',  // NEW: Preserve captivating narration
              dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
              visualDescription: s.visualDescription || s.action || 'Cinematic shot',
              duration: s.duration || 30,  // Use AI's realistic estimate
              sfx: Array.isArray(s.sfx) ? s.sfx.map((sfx: any) => ({
                time: sfx.time || 0,
                description: sfx.description || ''
              })) : [],
              music: s.music ? {
                description: s.music.description || '',
                duration: s.music.duration
              } : undefined,
              isExpanded: true
            }
            
            // Extract SFX from dialogue (post-processing fix)
            return extractSFXFromDialogue(scene)
          })
  }
}

function parseScenes(response: string, start: number, end: number): any {
  let parsed: any
  let parsedScenes: any[] = []
  
  try {
    // Try full parse first
    const cleaned = sanitizeJsonString(response)
    parsed = JSON.parse(cleaned)
    parsedScenes = Array.isArray(parsed) ? parsed : (parsed.scenes || [])
  } catch (parseError: any) {
    console.warn('[Parse Scenes] Full parse failed, attempting incremental extraction...', parseError.message.substring(0, 100))
    
    // Extract scenes using brace counting for proper nesting
    try {
      const extractedScenes: any[] = []
      
      // Find all positions where scenes start
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
        
        if (openBracePos < 0 || response[openBracePos] !== '{') {
          continue // No opening brace found
        }
        
        // Count braces to find the matching closing brace
        let braceCount = 0
        let inString = false
        let escaped = false
        let endPos = openBracePos
        
        for (let i = openBracePos; i < response.length; i++) {
          const char = response[i]
          
          // Handle escape sequences
          if (escaped) {
            escaped = false
            continue
          }
          
          if (char === '\\') {
            escaped = true
            continue
          }
          
          // Handle string delimiters
          if (char === '"') {
            inString = !inString
            continue
          }
          
          // Only count braces outside of strings
          if (!inString) {
            if (char === '{') {
              braceCount++
            } else if (char === '}') {
              braceCount--
              
              // Found the matching closing brace
              if (braceCount === 0) {
                endPos = i + 1
                break
              }
            }
          }
        }
        
        // Extract the complete scene object
        if (braceCount === 0 && endPos > openBracePos) {
          const sceneText = response.substring(openBracePos, endPos)
          
          try {
            const scene = JSON.parse(sceneText)
            
            // Validate scene has required fields
            if (scene.sceneNumber && scene.sceneNumber >= start && scene.sceneNumber <= end) {
              extractedScenes.push(scene)
              console.log(`[Parse Scenes] Extracted scene ${scene.sceneNumber} (${sceneText.length} chars)`)
            }
          } catch (parseErr) {
            console.warn(`[Parse Scenes] Failed to parse scene at position ${openBracePos}:`, parseErr)
            // Try to sanitize this specific scene
            try {
              const sanitized = sanitizeJsonString(sceneText)
              const scene = JSON.parse(sanitized)
              if (scene.sceneNumber && scene.sceneNumber >= start && scene.sceneNumber <= end) {
                extractedScenes.push(scene)
                console.log(`[Parse Scenes] Extracted scene ${scene.sceneNumber} after sanitization`)
              }
            } catch {
              // Skip invalid scenes
              continue
            }
          }
        }
      }
      
      if (extractedScenes.length > 0) {
        // Sort by sceneNumber and remove duplicates
        const uniqueScenes = Array.from(
          new Map(extractedScenes.map(s => [s.sceneNumber, s])).values()
        ).sort((a, b) => a.sceneNumber - b.sceneNumber)
        
        parsedScenes = uniqueScenes
        console.log(`[Parse Scenes] Recovered ${uniqueScenes.length} scenes via brace-counting extraction`)
      } else {
        // Fallback to original streamParseScenes
        console.warn('[Parse Scenes] Brace-counting extraction found nothing, trying stream parse')
        for (const sceneChunk of streamParseScenes(response)) {
          parsedScenes.push(...sceneChunk)
        }
      }
    } catch (extractError) {
      console.error('[Parse Scenes] Brace-counting extraction failed, trying stream parse:', extractError)
      // Fallback to stream parse
      for (const sceneChunk of streamParseScenes(response)) {
        parsedScenes.push(...sceneChunk)
      }
    }
    
    if (parsedScenes.length === 0) {
      console.error('[Parse Scenes] No scenes recovered via incremental parsing')
      return { scenes: [] }
    }
    
    console.log(`[Parse Scenes] Recovered ${parsedScenes.length} scenes via incremental parsing`)
  }
    
    // Batch 2+ returns just scenes array
      return {
    scenes: parsedScenes.map((s: any, idx: number) => {
          const scene = {
            sceneNumber: start + idx,
            heading: s.heading || `SCENE ${start + idx}`,
            characters: s.characters || [],  // CRITICAL: Preserve characters array from AI
            action: s.action || 'Scene content',
            narration: s.narration || '',  // NEW: Preserve captivating narration
            dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
            visualDescription: s.visualDescription || s.action || 'Cinematic shot',
            duration: s.duration || 30,  // Use AI's realistic estimate
            sfx: Array.isArray(s.sfx) ? s.sfx.map((sfx: any) => ({
              time: sfx.time || 0,
              description: sfx.description || ''
            })) : [],
            music: s.music ? {
              description: s.music.description || '',
              duration: s.music.duration
            } : undefined,
            isExpanded: true
          }
          
          // Extract SFX from dialogue (post-processing fix)
          return extractSFXFromDialogue(scene)
        })
  }
}

// Normalize character names for deduplication
function normalizeCharacterName(name: string): string {
  if (!name) return ''
  
  // Use canonical normalization
  return toCanonicalName(name).toUpperCase()
}

function extractCharacters(scenes: any[]): any[] {
  const charMap = new Map()
  scenes.forEach((scene: any) => {
    scene.dialogue?.forEach((d: any) => {
      if (!d.character) return
      
      const normalizedName = normalizeCharacterName(d.character)
      
      // Use normalized name as key, but keep original (cleaned) name for display
      if (!charMap.has(normalizedName)) {
        // Clean the display name (remove V.O., etc. but keep proper case)
        const cleanName = d.character.replace(/\s*\([^)]*\)\s*/g, '').trim()
        
        charMap.set(normalizedName, {
          name: cleanName,  // Use cleaned version (e.g., "Brian Anderson" not "BRIAN ANDERSON (V.O.)")
          role: 'character',
          description: `Character from script`
        })
      }
    })
  })
  return Array.from(charMap.values())
}

