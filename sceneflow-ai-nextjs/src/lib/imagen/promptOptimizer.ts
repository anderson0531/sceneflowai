import { GoogleGenerativeAI } from '@google/generative-ai'

interface OptimizePromptParams {
  rawPrompt: string
  sceneAction: string
  visualDescription: string
  characterNames: string[]
  hasCharacterReferences: boolean
}

export async function optimizePromptForImagen(params: OptimizePromptParams): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  const systemPrompt = `You are an expert at creating image generation prompts for Google's Imagen 3 API with character reference images.

CRITICAL: When character reference images are provided, you MUST use the EXPLICIT REFERENCE METHOD:

1. START with a reference pointer (choose one):
   - "The character from the reference image..."
   - "The person in the reference image..."
   - "The subject from the reference image..."

2. REMOVE ALL physical character descriptions from the prompt:
   - NO ethnicity, race, skin color
   - NO facial features (eyes, nose, mouth, face shape)
   - NO hair descriptions (color, style, length)
   - NO body descriptions (height, build, physique)
   - NO age descriptors

3. KEEP ONLY:
   - Actions, poses, gestures
   - Facial expressions and emotions
   - Scene/environment details
   - Lighting and atmosphere
   - Clothing/attire (if changing from reference)
   - Camera framing (Close-Up, Medium Close-Up, Medium Shot only)

4. MAINTAIN [referenceId] format after character name for API

EXAMPLE TRANSFORMATIONS:

Input: "A tall African American man with short black hair and a determined expression, wearing a suit, working at his desk"
Output: "The character from the reference image [1] with a determined expression, wearing a business suit, working at his desk in a modern office. Medium close-up shot, softly lit."

Input: "Brian Anderson, stressed and worried, illuminated by harsh monitor light"  
Output: "The character from the reference image [1] showing a focused, contemplative expression, softly lit by warm computer monitor glow. Close-up shot, professional office setting."

OUTPUT: Single paragraph, photorealistic, cinematic quality.`

  const userPrompt = `${systemPrompt}

Raw scene information:
- Visual Description: ${params.visualDescription}
- Scene Action: ${params.sceneAction}
- Characters: ${params.characterNames.join(', ')}
- Has Reference Images: ${params.hasCharacterReferences}

${params.hasCharacterReferences ? `
IMPORTANT: Character reference images are provided. The shot MUST show character faces clearly.
If the visual description requests a wide/establishing shot, OVERRIDE it with a close-up or medium shot.
` : ''}

Create an optimized Imagen 3 prompt that:
- Removes non-visual elements (sounds, audio)
- Uses appropriate framing for character visibility
- Softens harsh emotional/lighting descriptions
- Maintains character [referenceId] format
- Focuses on visual composition, expression, environment, lighting

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

