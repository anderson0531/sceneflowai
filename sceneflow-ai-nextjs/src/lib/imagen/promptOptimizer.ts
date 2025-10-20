import { GoogleGenerativeAI } from '@google/generative-ai'

interface OptimizePromptParams {
  rawPrompt: string
  sceneAction: string
  visualDescription: string
  characterNames: string[]
  hasCharacterReferences: boolean
  characterMetadata?: Array<{
    name: string
    ethnicity?: string
    subject?: string
    appearanceDescription?: string
  }>
}

export async function optimizePromptForImagen(params: OptimizePromptParams): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  const systemPrompt = `You are an expert at creating image generation prompts for Google's Imagen 3 API with character reference images.

CRITICAL REQUIREMENTS:
1. Shot framing MUST be Close-Up, Medium Close-Up, or Medium Shot for facial recognition
2. Character faces must be FULLY VISIBLE and PROMINENT - NO OCCLUSION
3. REMOVE/REPLACE facial occlusion actions:
   - "rubbing temples/eyes/face" → "staring intently"
   - "hands on face/head" → "looking focused"
   - "covering eyes/mouth" → "gazing"
   - "looking down" → "looking toward [object]"
4. EXPLICITLY use the full appearanceDescription provided for each character
5. Format: "[Appearance Description] [referenceId], [NON-OCCLUSIVE ACTION]"
6. Remove ALL non-visual elements (sound, audio, dialogue)
7. Use gentle lighting ("softly lit", "warm glow")
8. Maintain photorealistic, cinematic quality

PROMPT STRUCTURE:
"[SHOT TYPE] of [Full Appearance Description] [referenceId], [face-visible action] with [expression]. [Environment]. [Lighting]. Photorealistic, 8K resolution, sharp focus."

EXAMPLES:
✓ GOOD: "CLOSE UP of An African American man in his late 40s, with short black hair, dark brown skin, and a strong jawline [1], staring intently at the computer screen with a weary expression. Modern office cubicle, softly lit by monitor glow. Photorealistic, 8K resolution."

✗ BAD: "The character from the reference image [1] rubbing his temples" 
   (Missing appearance description! Face occluded!)

✗ BAD: "Brian Anderson [1] with stressed expression"
   (Name only - need full appearance description!)

OUTPUT: A single, clean prompt (one paragraph, no explanations).`

  const userPrompt = `${systemPrompt}

Raw scene information:
- Visual Description: ${params.visualDescription}
- Scene Action: ${params.sceneAction}
- Characters: ${params.characterNames.join(', ')}
- Character Appearance Data: ${JSON.stringify(params.characterMetadata || [])}
- Has Reference Images: ${params.hasCharacterReferences}

CRITICAL INSTRUCTIONS:
1. For EACH character with a reference image, use their FULL appearanceDescription
2. If action involves facial occlusion, REPLACE with face-visible alternative:
   - "rubbing temples" → "staring intently"
   - "hands on face" → "looking focused"
   - "looking down" → "gazing at [object]"
3. Format: "[Full Appearance Description] [referenceId], [action]"
4. Keep faces FULLY VISIBLE and PROMINENT

Example transformation:
Input: "Brian rubs his temples"
Character Data: {name: "Brian Anderson", appearanceDescription: "An African American man in his late 40s, short black hair, dark brown skin"}
Output: "An African American man in his late 40s, short black hair, dark brown skin [1], staring intently with weary expression"

Create an optimized Imagen 3 prompt following the structure above.

Output ONLY the optimized prompt, nothing else.`

  const result = await model.generateContent(userPrompt)
  const optimizedPrompt = result.response.text().trim()
  
  console.log('[Prompt Optimizer] Original:', params.rawPrompt.substring(0, 100))
  console.log('[Prompt Optimizer] Optimized:', optimizedPrompt.substring(0, 100))
  console.log('[Prompt Optimizer] Input contained character descriptions:', 
    /African American|white|black|tall|short|hair|eyes|skin|face|ethnicity/i.test(params.rawPrompt))
  console.log('[Prompt Optimizer] Output uses explicit reference:', 
    /character from the reference|person in the reference|subject from the reference/i.test(optimizedPrompt))
  
  return optimizedPrompt
}

