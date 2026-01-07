import { generateText } from '@/lib/vertexai/gemini'

/**
 * Generate a rolling summary for narrative continuity between beats
 */
export async function generateRollingSummary(
  beatTitle: string,
  scenes: any[],
  _apiKey: string // No longer needed - Vertex AI uses service account credentials
): Promise<string> {
  const prompt = `Summarize this script segment in 2-3 sentences for continuity:

Beat: ${beatTitle}
Scenes: ${scenes.map(s => `${s.heading}: ${s.action?.substring(0, 100)}...`).join('\n')}

Focus on:
- Key narrative developments
- Emotional arc and stakes
- Where the story leaves off

Return ONLY the summary text (no JSON, no formatting, no explanations).`

  try {
    console.log('[Summary Gen] Calling Vertex AI Gemini...')
    const text = await generateText(prompt, { model: 'gemini-2.0-flash' })
    
    return text?.trim() || `${scenes.length} scenes completed. The story continues.`
  } catch (error) {
    console.warn('[Summary Gen] Failed to generate summary:', error)
    // Fallback: return a simple summary based on scene count
    return `${scenes.length} scenes completed. The story continues.`
  }
}

