import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { 
  DetailedSceneDirection, 
  PerformanceDirection, 
  VeoOptimization, 
  NarrativeLighting,
  DialogueTalentDirection 
} from '../../../../types/scene-direction'
import { generateSceneContentHash } from '../../../../lib/utils/contentHash'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 300
export const runtime = 'nodejs'

// ============================================================================
// Types
// ============================================================================

interface OptimizeDirectionRequest {
  projectId: string
  sceneIndex: number
  scene: {
    heading?: string | { text: string }
    action?: string
    visualDescription?: string
    narration?: string
    dialogue?: Array<{ character: string; text?: string; line?: string }>
    characters?: string[]
    sceneDirection?: DetailedSceneDirection
  }
  config: {
    selectedTemplates: string[]
    customInstruction: string
    propagateToSegments: boolean
    enableSubsurfaceScattering: boolean
    includeNegativePrompts: boolean
    negativePrompts: string[]
    targetGeneration: 'keyframe' | 'video' | 'both'
    // Dialogue-specific optimization
    dialogueTemplates: string[]
    dialogueLineSelections: Record<number, string[]> // Map dialogue index to template IDs
  }
}

// ============================================================================
// Template Instructions (matched to dialog templates)
// ============================================================================

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  'cinematic-performance': `Transform talent direction from generic acting to cinematic performance:
- Add specific micro-expressions (trembling lip, widening eyes, jaw tension, nostril flare)
- Define emotional transitions as sequences (e.g., Recognition → Grief → Comfort)
- Include subtext motivation (what the character is really feeling beneath the surface)
- Add physiological cues (breathing patterns, swallowing, pulse visible in neck)
- Focus on the HOW and WHY of the performance, not just WHAT happens
- Include body language subtleties that reveal inner state`,

  'physics-weight': `Enhance physical realism in talent and prop interactions:
- Add muscle tension descriptions (strain in neck tendons, fingers digging into material)
- Include implied weight and gravity (knees buckling slightly, doubled over under load)
- Describe physical texture interactions (sweat glistening, fabric catching)
- Add physiological responses to effort (grunting, labored breathing, veins prominent)
- Make objects feel real (thudding impact, resistance, material compression)
- Include environmental physics (dust disturbed, air displacement)`,

  'emotional-transitions': `Transform simple emotional states into transitional sequences:
- Replace binary emotions (sad/happy) with transition arcs
- Add progression: initial recognition → building emotion → peak → resolution
- Include micro-beats within the emotional journey
- Layer contradictory emotions where appropriate (grief mixed with relief)
- Show emotion through physical manifestation, not just facial expression
- Include emotional "echoes" - how the feeling reverberates after the peak`,

  'narrative-lighting': `Elevate lighting from technical to narrative:
- Define practical light sources that tell the story (single lamp = isolation)
- Add atmospheric elements visible in light (dust motes dancing, steam rising)
- Create color temperature contrast stories (cool screens vs warm lamp)
- Describe shadow narrative (what shadows reveal about psychology)
- Include light quality that matches emotional tone (harsh for conflict, soft for intimacy)
- Add motivated lighting changes that follow emotional beats`,

  'camera-choreography': `Transform camera direction into choreographed sequences:
- Add motivated camera movements that follow emotional beats
- Include pull-back reveals for establishing isolation or environment
- Add push-in moments for emotional emphasis and intimacy
- Describe camera behavior relative to character psychology
- Include specific frame composition motivations
- Add breathing room between shots and motivated cuts`,

  'veo3-optimization': `Add Veo-3 specific optimization keywords:
- Enable subsurface scattering for realistic skin rendering
- Add motion quality descriptors (fluid, weighted, deliberate movements)
- Include object interaction specifics (characters act WITH not just NEAR objects)
- Add texture and materiality hints (fabric weight, surface reflections)
- Include anti-mannequin negative prompts
- Add environment interaction details (air movement, sound implications)`,

  'continuity-consistency': `Optimize for segment and keyframe consistency:
- Lock in specific prop positions and states throughout the scene
- Define exact costume/wardrobe details with no variation
- Specify character positioning markers for continuity
- Include lighting setup persistence details across cuts
- Add environment state continuity notes (doors open/closed, items moved)
- Specify eyeline directions and spatial relationships`,

  'atmosphere-immersion': `Enhance atmospheric and sensory immersion:
- Add specific environmental textures and material qualities
- Include ambient sound implications in visual descriptions
- Describe air quality and particle effects (haze, dust, humidity)
- Add temperature and tactile suggestions through visual cues
- Include smell/taste implications through visual metaphors
- Add environmental "breathing" - subtle movements that make space feel alive`
}

// ============================================================================
// Dialogue Performance Template Instructions
// ============================================================================

const DIALOGUE_TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  'subtle-reveal': `Transform this dialogue delivery into a cinematic subtle reveal:
- Add specific micro-expressions (eyes widening with recognition, jaw tension, lip trembling)
- Describe the exact moment of realization through facial transitions
- Include physiological responses (breath catching, swallowing hard, pulse visible in neck)
- Build the emotional arc through subtle physical cues
- Make the camera feel intimate with the character's inner experience
Example: "As she pulls the faded photograph into the light, her eyes widen with recognition. A shiver of grief passes through her jawline; her lower lip trembles almost imperceptibly before she closes her eyes and presses the photo against her chest, breathing becoming shallow and heavy."`,

  'physical-burden': `Transform this dialogue delivery to emphasize physical weight and realism:
- Add muscle tension descriptions (strain in neck tendons, fingers digging into material)
- Include implied weight and gravity (knees buckling, doubled over)
- Describe physical texture interactions (sweat glistening, dust disturbed, fabric pulling)
- Add physiological responses to effort (grunting, heavy breathing, veins visible)
- Make objects feel real (thudding impact, material resistance, weight transfer)
Example: "He staggers across the room, doubled over, fingers digging into the cardboard. You can see the strain in his neck tendons and the sweat glistening on his forehead. His knees buckle slightly as he heaves the box downward, letting it hit the concrete with a visible thud and a puff of dust."`,

  'emotional-transition': `Transform this dialogue into a clear emotional transition arc:
- Define the starting emotional state before the line
- Map the progression through the dialogue (Recognition → Denial → Acceptance)
- Include physical manifestations of each emotional beat
- Layer contradictory emotions where appropriate
- Show emotion through body language, not just facial expression
Example: "Hope rises in her eyes as she begins to speak, but mid-sentence doubt creeps into her voice—her shoulders tense, hands grip the table edge—before resignation settles in her final words, head bowing slightly."`,

  'subtext-revelation': `Enhance this dialogue with subtext revelation—what the character is really saying:
- Identify the gap between words spoken and meaning intended
- Add physical tells that reveal the true emotion beneath the words
- Include micro-pauses or breath catches that betray inner conflict
- Layer the performance with what they're hiding
- Show the mask and what's beneath it
Example: "She says 'I'm fine' but her voice catches on the word, fingers unconsciously touching the locket. Her smile doesn't reach her eyes, which dart briefly to the empty chair before she forces her gaze back, the practiced composure betrayed by a slight tremor in her hands."`
}

// ============================================================================
// AI Generation
// ============================================================================

async function callGemini(prompt: string): Promise<string> {
  console.log('[Optimize Direction] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 12000,
    responseMimeType: 'application/json'
  })
  return result.text
}

function buildOptimizationPrompt(
  scene: OptimizeDirectionRequest['scene'],
  existingDirection: DetailedSceneDirection | undefined,
  selectedTemplates: string[],
  customInstruction: string,
  config: OptimizeDirectionRequest['config']
): string {
  const heading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || ''
  const action = scene.action || ''
  const visualDescription = scene.visualDescription || ''
  const narration = scene.narration || ''
  const dialogue = scene.dialogue || []
  
  const dialogueText = dialogue.map((d, i) => `[Line ${i + 1}] ${d.character}: ${d.line || d.text || ''}`).join('\n')
  
  // Build optimization instructions from templates
  const templateInstructions = selectedTemplates
    .map(id => TEMPLATE_INSTRUCTIONS[id])
    .filter(Boolean)
    .join('\n\n')
  
  // Build dialogue-specific instructions
  const dialogueTemplateInstructions = (config.dialogueTemplates || [])
    .map(id => DIALOGUE_TEMPLATE_INSTRUCTIONS[id])
    .filter(Boolean)
    .join('\n\n')
  
  // Build per-line dialogue instructions
  let perLineInstructions = ''
  if (config.dialogueLineSelections && Object.keys(config.dialogueLineSelections).length > 0) {
    const lineInstructions: string[] = []
    Object.entries(config.dialogueLineSelections).forEach(([indexStr, templateIds]) => {
      const lineIndex = parseInt(indexStr)
      const line = dialogue[lineIndex]
      if (line && templateIds.length > 0) {
        const lineText = line.text || line.line || ''
        const templates = templateIds
          .map(id => DIALOGUE_TEMPLATE_INSTRUCTIONS[id])
          .filter(Boolean)
        if (templates.length > 0) {
          lineInstructions.push(`
FOR DIALOGUE LINE ${lineIndex + 1} ("${line.character}: ${lineText.slice(0, 50)}..."):
${templates.join('\n')}`)
        }
      }
    })
    if (lineInstructions.length > 0) {
      perLineInstructions = `

=== PER-LINE DIALOGUE DIRECTION ===
The following specific instructions should be applied to individual dialogue lines:
${lineInstructions.join('\n')}`
    }
  }
  
  const allInstructions = [templateInstructions, dialogueTemplateInstructions, customInstruction].filter(Boolean).join('\n\n')
  
  // Build existing direction context
  const existingContext = existingDirection ? `
EXISTING SCENE DIRECTION (enhance and expand, don't replace unless improving):
${JSON.stringify(existingDirection, null, 2)}
` : ''

  // Determine if we need to generate dialogue talent directions
  const generateDialogueTalentDirections = dialogue.length > 0 && 
    ((config.dialogueTemplates && config.dialogueTemplates.length > 0) || 
     (config.dialogueLineSelections && Object.keys(config.dialogueLineSelections).length > 0))

  return `You are a world-class film director and cinematographer specializing in optimizing scene direction for AI video generation (Veo-3).

Your task is to OPTIMIZE and ENHANCE the scene direction to produce professional, cinematic results. Focus on transforming generic direction into specific, actionable, emotionally-rich instructions that will produce natural, human-like performances.

SCENE INFORMATION:
${heading ? `Heading: ${heading}\n` : ''}${action ? `Action: ${action}\n` : ''}${visualDescription ? `Visual Description: ${visualDescription}\n` : ''}${narration ? `Narration: ${narration}\n` : ''}${dialogueText ? `Dialogue:\n${dialogueText}\n` : ''}
${existingContext}

OPTIMIZATION FOCUS: ${config.targetGeneration === 'keyframe' ? 'Keyframe/Image Generation' : config.targetGeneration === 'video' ? 'Video Generation (Veo-3)' : 'Both Keyframe and Video Generation'}

OPTIMIZATION INSTRUCTIONS:
${allInstructions}
${perLineInstructions}

CRITICAL QUALITY GUIDELINES:
1. Replace generic emotions (sad, happy) with transitional sequences showing the journey
2. Add micro-expressions and physiological cues (trembling lip, shallow breathing)
3. Include physical weight and gravity in all movement descriptions
4. Make characters interact WITH objects, not just NEAR them
5. Add narrative purpose to lighting choices
6. Include subtext and motivation for all talent direction
${config.enableSubsurfaceScattering ? '7. Add "subsurface scattering" keyword for realistic skin rendering' : ''}
${config.includeNegativePrompts ? `8. Include these negative prompts to prevent stiff renders: ${config.negativePrompts.slice(0, 5).join(', ')}` : ''}
${generateDialogueTalentDirections ? `9. Generate detailed per-dialogue-line talent directions in the dialogueTalentDirections array` : ''}

Return ONLY valid JSON with this enhanced structure:

{
  "camera": {
    "shots": ["array of shot types with specific motivation"],
    "angle": "camera angle with narrative reason",
    "movement": "camera movement with emotional connection",
    "lensChoice": "lens with visual storytelling purpose",
    "focus": "focus technique with dramatic intent"
  },
  "lighting": {
    "overallMood": "lighting mood that serves the emotion",
    "timeOfDay": "time of day",
    "keyLight": "key light with story motivation",
    "fillLight": "fill light setup",
    "backlight": "backlight/rim light purpose",
    "practicals": "practical lights that tell the story",
    "colorTemperature": "color temperature with emotional meaning"
  },
  "scene": {
    "location": "specific location with atmosphere",
    "keyProps": ["props with story significance"],
    "atmosphere": "atmospheric description with sensory detail"
  },
  "talent": {
    "blocking": "actor blocking with motivation",
    "keyActions": ["specific, physical actions with weight and intention"],
    "emotionalBeat": "emotional journey, not just state"
  },
  "audio": {
    "priorities": "audio priorities",
    "considerations": "audio considerations"
  },
  "performanceDirection": {
    "microExpressions": ["specific micro-expressions: 'lower lip trembles almost imperceptibly', 'eyes widen with recognition'"],
    "physicalWeight": "description of physical weight and physics in movement",
    "emotionalTransitions": ["emotional arc: 'Recognition → Grief → Acceptance'"],
    "subtextMotivation": "what the character is really feeling beneath the surface",
    "physiologicalCues": "breathing, pulse, tension visible in the body"
  },
  "veoOptimization": {
    "subsurfaceScattering": ${config.enableSubsurfaceScattering},
    "negativePrompts": ${JSON.stringify(config.includeNegativePrompts ? config.negativePrompts : [])},
    "motionQuality": "one of: fluid, weighted, deliberate, dynamic",
    "objectInteraction": "how character interacts WITH objects",
    "textureHints": ["texture and material hints for realism"]
  },
  "narrativeLighting": {
    "keyPracticals": ["practical lights that tell the story"],
    "atmosphericElements": ["visible atmospheric effects in light"],
    "colorTemperatureStory": "how color temperature tells the emotion",
    "shadowNarrative": "what the shadows reveal"
  },${generateDialogueTalentDirections ? `
  "dialogueTalentDirections": [
    // One entry for each dialogue line in the scene
    {
      "character": "Character name speaking this line",
      "lineText": "The actual dialogue text",
      "cinematicSetup": "Camera/framing setup for this specific line delivery",
      "microExpression": "Specific facial micro-expression during the line",
      "physicalAction": "Physical action/gesture accompanying the dialogue",
      "emotionalTransition": "Emotional arc/transition during the line (e.g., 'Doubt → Hope')",
      "subtextMotivation": "What the character is really feeling beneath the words",
      "physiologicalCues": "Physical tells: breathing, pulse, tension"
    }
  ],` : ''}
  "productionOptimized": true
}

IMPORTANT:
- Be extremely specific - avoid generic terms
- Every direction should serve the emotional story
- Include physical details that make performances feel human
- Think like a director coaching actors for their best take
${generateDialogueTalentDirections ? `- For dialogueTalentDirections, create ONE entry for EACH dialogue line in the scene
- Make each entry specific to that character and that moment in the scene` : ''}
- Return ONLY valid JSON, no markdown, no explanations`
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, scene, config }: OptimizeDirectionRequest = await req.json()

    if (!projectId || sceneIndex === undefined || !scene || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, sceneIndex, scene, or config' },
        { status: 400 }
      )
    }

    const hasSceneTemplates = config.selectedTemplates.length > 0
    const hasDialogueTemplates = (config.dialogueTemplates && config.dialogueTemplates.length > 0) ||
      (config.dialogueLineSelections && Object.keys(config.dialogueLineSelections).length > 0)
    const hasCustomInstruction = !!config.customInstruction

    if (!hasSceneTemplates && !hasDialogueTemplates && !hasCustomInstruction) {
      return NextResponse.json(
        { success: false, error: 'No optimization templates or custom instructions provided' },
        { status: 400 }
      )
    }

    // Ensure database connection
    await sequelize.authenticate()

    // Get project
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Build prompt
    const prompt = buildOptimizationPrompt(
      scene,
      scene.sceneDirection,
      config.selectedTemplates,
      config.customInstruction,
      config
    )
    
    console.log('[Optimize Direction] Optimizing direction for scene', sceneIndex, 'with templates:', config.selectedTemplates)

    // Call Vertex AI Gemini
    const responseText = await callGemini(prompt)
    
    // Parse JSON response
    let optimizedDirection: DetailedSceneDirection
    try {
      // Clean up response if it has markdown code blocks
      let cleanedText = responseText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      
      optimizedDirection = JSON.parse(cleanedText)
      
      // Validate required structure
      if (!optimizedDirection.camera || !optimizedDirection.lighting || !optimizedDirection.scene || 
          !optimizedDirection.talent || !optimizedDirection.audio) {
        throw new Error('Invalid scene direction structure - missing required fields')
      }
    } catch (parseError) {
      console.error('[Optimize Direction] JSON parse error:', parseError)
      console.error('[Optimize Direction] Response text:', responseText.substring(0, 1000))
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Add metadata
    optimizedDirection.generatedAt = new Date().toISOString()
    optimizedDirection.optimizedAt = new Date().toISOString()
    optimizedDirection.productionOptimized = true
    optimizedDirection.basedOnContentHash = generateSceneContentHash(scene)

    // Update project metadata
    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const script = visionPhase.script || {}
    const scriptScenes = script.script?.scenes || script.scenes || []
    
    if (sceneIndex < 0 || sceneIndex >= scriptScenes.length) {
      return NextResponse.json(
        { success: false, error: `Invalid scene index: ${sceneIndex}` },
        { status: 400 }
      )
    }

    // Update the specific scene with optimized direction
    const updatedScenes = scriptScenes.map((s: any, idx: number) =>
      idx === sceneIndex
        ? { ...s, sceneDirection: optimizedDirection }
        : s
    )

    // Update script structure
    const updatedScript = script.script
      ? { ...script, script: { ...script.script, scenes: updatedScenes } }
      : { ...script, scenes: updatedScenes }

    // Update project
    await project.update({
      metadata: {
        ...metadata,
        visionPhase: {
          ...visionPhase,
          script: updatedScript,
        },
      },
    })

    console.log('[Optimize Direction] Successfully optimized and saved direction for scene', sceneIndex)

    return NextResponse.json({
      success: true,
      sceneDirection: optimizedDirection,
      optimizationsApplied: config.selectedTemplates,
      propagatedToSegments: config.propagateToSegments
    })
  } catch (error: any) {
    console.error('[Optimize Direction] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to optimize scene direction' },
      { status: 500 }
    )
  }
}
