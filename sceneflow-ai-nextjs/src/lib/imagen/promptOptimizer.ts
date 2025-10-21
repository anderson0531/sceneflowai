import { GoogleGenerativeAI } from '@google/generative-ai'

interface OptimizePromptParams {
  rawPrompt: string
  sceneAction: string
  visualDescription: string
  characterNames: string[]
  hasCharacterReferences: boolean
  characterMetadata?: Array<{
    name: string
    referenceImageGCS?: string  // GCS URL for embedding in prompt
    appearanceDescription?: string  // Brief physical description
  }>
}

/**
 * Optimize prompt for Imagen 3 using GCS reference URLs embedded in text
 * Follows best practice format: [Image Reference: gs://bucket/path]
 */
export async function optimizePromptForImagen(params: OptimizePromptParams): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  const systemPrompt = `You are an expert at creating image generation prompts for Google's Imagen 3 API with character reference images.

CRITICAL REQUIREMENTS:
1. Use GCS URL format for character references: [Image Reference: gs://bucket/path]
2. Add brief physical descriptor AFTER the reference (e.g., "African American man in his late 40s")
3. Shot framing MUST be Close-Up, Medium Close-Up, or Medium Shot for facial recognition
4. Character faces must be FULLY VISIBLE and PROMINENT - NO OCCLUSION
5. REMOVE/REPLACE facial occlusion actions:
   - "rubbing temples/eyes/face" → "staring intently"
   - "hands on face/head" → "looking focused"
   - "covering eyes/mouth" → "gazing"
   - "looking down" → "looking toward [object]"
   - "head bowed" → "head raised, looking at [object]"
   - "face turned away" → "facing camera"
6. DO NOT include expressions, emotions, or mood descriptors
7. Remove ALL non-visual elements (sound, audio, dialogue)
8. Use objective physical attributes only

PROMPT STRUCTURE (follow exactly):
"[SHOT TYPE] of [Image Reference: gs://bucket/path], [brief physical descriptor], [NON-OCCLUSIVE ACTION] in [environment]. Character modifiers: cinematic lighting, photo-realistic, detailed facial features, focused intensity. Scene modifiers: [lighting], [color scheme], [atmosphere], 8K resolution."

EXAMPLES:

✓ GOOD: "CLOSE UP of [Image Reference: gs://sceneflow-refs/brian-anderson.jpg], African American man in his late 40s, staring intently at computer screen in modern office cubicle at night. Character modifiers: cinematic lighting, photo-realistic, detailed facial features, sharp focus. Scene modifiers: volumetric light from monitor, cool blue tones, dramatic shadows, 8K resolution."

✓ GOOD: "MEDIUM SHOT of [Image Reference: gs://sceneflow-refs/kavita-patel.jpg], South Asian woman in her early 30s, looking toward sunset from rooftop garden. Character modifiers: cinematic lighting, photo-realistic, natural skin texture. Scene modifiers: warm golden hour light, soft bokeh background, warm orange and pink tones."

✗ BAD: "The character from the reference image rubbing his temples with a weary expression" 
   (Missing GCS URL! Face occluded! Emotion descriptor!)

✗ BAD: "[Image Reference: gs://bucket/image.jpg] looking stressed"
   (Missing physical descriptor! Emotion!)

OUTPUT: A single, clean prompt following the structure above (one paragraph, no explanations).`

  const characterContext = params.characterMetadata && params.characterMetadata.length > 0
    ? params.characterMetadata.map(char => {
        return `Character: ${char.name}
  - GCS URL: ${char.referenceImageGCS || 'NOT AVAILABLE'}
  - Physical Description: ${char.appearanceDescription || 'NOT AVAILABLE'}`
      }).join('\n\n')
    : 'No character references available'

  const userPrompt = `${systemPrompt}

Raw scene information:
- Visual Description: ${params.visualDescription}
- Scene Action: ${params.sceneAction}
- Characters in Scene: ${params.characterNames.join(', ')}

${characterContext}

CRITICAL INSTRUCTIONS:
1. For EACH character with a reference image, use this format:
   [Image Reference: <GCS_URL>], <Physical Description>
2. If action involves facial occlusion, REPLACE with face-visible alternative
3. NO emotions or expressions - only objective physical attributes
4. Keep faces FULLY VISIBLE and PROMINENT

Example transformation:
Input: "Brian rubs his temples in the office"
Character: Brian Anderson
GCS URL: gs://sceneflow-refs/brian-anderson-123.jpg
Physical: African American man in his late 40s
Output: "CLOSE UP of [Image Reference: gs://sceneflow-refs/brian-anderson-123.jpg], African American man in his late 40s, staring intently at computer screen in modern office. Character modifiers: cinematic lighting, photo-realistic, detailed facial features. Scene modifiers: soft office lighting, neutral tones, 8K resolution."

Create an optimized Imagen 3 prompt following the structure above.

Output ONLY the optimized prompt, nothing else.`

  const result = await model.generateContent(userPrompt)
  const optimizedPrompt = result.response.text().trim()
  
  console.log('[Prompt Optimizer] Original:', params.rawPrompt.substring(0, 100))
  console.log('[Prompt Optimizer] Optimized:', optimizedPrompt.substring(0, 150))
  console.log('[Prompt Optimizer] Uses GCS references:', /\[Image Reference: gs:\/\//i.test(optimizedPrompt))
  console.log('[Prompt Optimizer] Has physical descriptors:', params.characterMetadata?.some(c => c.appearanceDescription))
  
  return optimizedPrompt
}
