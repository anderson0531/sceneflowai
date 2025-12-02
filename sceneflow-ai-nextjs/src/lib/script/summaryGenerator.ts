/**
 * Generate a rolling summary for narrative continuity between beats
 */
export async function generateRollingSummary(
  beatTitle: string,
  scenes: any[],
  apiKey: string
): Promise<string> {
  const prompt = `Summarize this script segment in 2-3 sentences for continuity:

Beat: ${beatTitle}
Scenes: ${scenes.map(s => `${s.heading}: ${s.action?.substring(0, 100)}...`).join('\n')}

Focus on:
- Key narrative developments
- Emotional arc and stakes
- Where the story leaves off

Return ONLY the summary text (no JSON, no formatting, no explanations).`

  // Call Gemini Flash (fast, cheap for summaries)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 256
        }
      })
    }
  )

  if (!response.ok) {
    console.warn('[Summary Gen] Failed to generate summary:', response.status)
    // Fallback: return a simple summary based on scene count
    return `${scenes.length} scenes completed. The story continues.`
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  return text.trim() || `${scenes.length} scenes completed. The story continues.`
}

