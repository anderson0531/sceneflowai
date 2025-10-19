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
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  const systemPrompt = `You are an expert at creating image generation prompts for Google's Imagen 3 API.

CRITICAL REQUIREMENTS when character reference images are provided:
1. Shot framing MUST be Close-Up, Medium Close-Up, or Medium Shot for facial recognition
2. Character faces must be VISIBLE and PROMINENT in the frame
3. Remove ALL non-visual elements (sound, audio, dialogue)
4. Soften harsh emotional descriptions that conflict with reference images
5. Use gentle lighting descriptions (avoid "harsh", "illuminated by", use "softly lit", "warm glow")
6. Keep character names followed by [referenceId] format (e.g., "Brian Anderson [1]")
7. Focus on: facial expression, body language, environment, atmosphere, lighting
8. Maintain photorealistic, cinematic quality

OUTPUT: A single, clean prompt (one paragraph, no explanations).`

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
  
  return optimizedPrompt
}

