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
    hairStyle?: string
    hairColor?: string
    eyeColor?: string
    build?: string
    expression?: string
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
4. Build character descriptions from structured attributes: ethnicity, subject, hairStyle, hairColor, eyeColor, build
5. Format: "[Ethnicity] [Subject] with [hair details], [eye color] eyes, [build] build [referenceId], [NON-OCCLUSIVE ACTION]"
6. Remove ALL non-visual elements (sound, audio, dialogue)
7. Use gentle lighting ("softly lit", "warm glow")
8. Maintain photorealistic, cinematic quality

PROMPT STRUCTURE:
"[SHOT TYPE] of [Ethnicity] [Subject] with [hair color] [hair style], [eye color] eyes, [build] build [referenceId], [face-visible action] with [expression]. [Environment]. [Lighting]. Photorealistic, 8K resolution, sharp focus."

EXAMPLES:
✓ GOOD: "CLOSE UP of African American man with short black hair, dark brown eyes, athletic build [1], staring intently at the computer screen with a weary expression. Modern office cubicle, softly lit by monitor glow. Photorealistic, 8K resolution."

✗ BAD: "The character from the reference image [1] rubbing his temples" 
   (Missing description! Face occluded!)

OUTPUT: A single, clean prompt (one paragraph, no explanations).`

  const userPrompt = `${systemPrompt}

Raw scene information:
- Visual Description: ${params.visualDescription}
- Scene Action: ${params.sceneAction}
- Characters: ${params.characterNames.join(', ')}
- Character Structured Attributes: ${JSON.stringify(params.characterMetadata || [])}
- Has Reference Images: ${params.hasCharacterReferences}

CRITICAL INSTRUCTIONS:
1. For EACH character with a reference image, build description from structured attributes
2. If action involves facial occlusion, REPLACE with face-visible alternative:
   - "rubbing temples" → "staring intently"
   - "hands on face" → "looking focused"
   - "looking down" → "gazing at [object]"
3. Format: "[Ethnicity] [Subject] with [hair details], [eye details], [build] [referenceId], [action]"
4. Keep faces FULLY VISIBLE and PROMINENT

Example transformation:
Input: "Brian rubs his temples"
Character Data: {name: "Brian Anderson", ethnicity: "African American", subject: "man", hairColor: "black", hairStyle: "short", eyeColor: "dark brown", build: "athletic"}
Output: "African American man with short black hair, dark brown eyes, athletic build [1], staring intently with weary expression"

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

