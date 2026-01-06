/**
 * NarrationBeatAnalyzer
 * 
 * Uses Vertex AI Gemini to split scene narration into visual beats for video generation.
 * Each beat represents a distinct visual concept that can be a separate video clip.
 */

import { generateText } from '@/lib/vertexai/gemini'

export interface NarrationBeat {
  beatNumber: number
  startPercent: number  // 0-100, relative position in narration
  endPercent: number
  narrationText: string // The text spoken during this beat
  visualFocus: string   // What the camera should focus on
  shotType: 'wide' | 'medium' | 'close-up' | 'detail' | 'tracking'
  cameraMotion: 'static' | 'slow-pan-left' | 'slow-pan-right' | 'slow-tilt-up' | 'slow-tilt-down' | 'slow-dolly-in' | 'slow-dolly-out' | 'slow-track'
  motionIntensity: 'ambient' | 'subtle' | 'moderate'
  videoPrompt: string   // Ready-to-use video generation prompt
}

export interface NarrationBeatAnalysis {
  totalBeats: number
  narrationDurationEstimate: number // Estimated seconds based on word count
  beats: NarrationBeat[]
  mode: 'single-shot' | 'beat-matched' | 'manual-cuts'
}

export interface AnalyzeNarrationInput {
  narrationText: string
  sceneHeading: string
  sceneDescription?: string
  sceneImageUrl?: string
  estimatedDuration?: number // Audio duration if known
  mode: 'single-shot' | 'beat-matched'
  characterDescriptions?: Record<string, string> // Character visual descriptions for reference
}

// Estimate narration duration based on word count (average 150 words per minute)
function estimateNarrationDuration(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length
  return Math.ceil((words / 150) * 60) // seconds
}

// Calculate how many segments needed based on duration (max 8 seconds each)
function calculateSegmentCount(durationSeconds: number): number {
  return Math.ceil(durationSeconds / 6) // Use 6 seconds as target to leave buffer
}

export async function analyzeNarrationBeats(input: AnalyzeNarrationInput): Promise<NarrationBeatAnalysis> {
  const { narrationText, sceneHeading, sceneDescription, mode, characterDescriptions } = input
  
  // Quick return for single-shot mode
  if (mode === 'single-shot') {
    const duration = input.estimatedDuration || estimateNarrationDuration(narrationText)
    return {
      totalBeats: 1,
      narrationDurationEstimate: duration,
      mode: 'single-shot',
      beats: [{
        beatNumber: 1,
        startPercent: 0,
        endPercent: 100,
        narrationText,
        visualFocus: sceneHeading,
        shotType: 'wide',
        cameraMotion: 'slow-dolly-in',
        motionIntensity: 'ambient',
        videoPrompt: generateSingleShotPrompt(sceneHeading, sceneDescription || '', narrationText),
      }]
    }
  }
  
  // For beat-matched mode, use Vertex AI Gemini to analyze
  const duration = input.estimatedDuration || estimateNarrationDuration(narrationText)
  const targetSegments = calculateSegmentCount(duration)
  
  const characterContext = characterDescriptions 
    ? Object.entries(characterDescriptions)
        .map(([name, desc]) => `- ${name}: ${desc}`)
        .join('\n')
    : 'No specific character references'
  
  const prompt = `You are a cinematographer breaking down narration into distinct visual beats for AI video generation.

## Scene Context
Location: ${sceneHeading}
${sceneDescription ? `Description: ${sceneDescription}` : ''}

## Character References (for visual consistency)
${characterContext}

## Narration Text (${duration} seconds estimated)
"${narrationText}"

## Task
Break this narration into ${targetSegments} distinct visual beats. Each beat should:
1. Represent a DIFFERENT visual focus (don't repeat the same shot)
2. Progress logically through the narration
3. Use cinematic variety (wide → detail → medium, etc.)
4. Have ambient, non-distracting motion

## Response Format (JSON only, no markdown)
{
  "beats": [
    {
      "beatNumber": 1,
      "startPercent": 0,
      "endPercent": 33,
      "narrationText": "portion of narration for this beat",
      "visualFocus": "what camera focuses on",
      "shotType": "wide|medium|close-up|detail|tracking",
      "cameraMotion": "static|slow-pan-left|slow-pan-right|slow-tilt-up|slow-tilt-down|slow-dolly-in|slow-dolly-out|slow-track",
      "motionIntensity": "ambient|subtle|moderate",
      "videoPrompt": "Complete video generation prompt for this beat. Include: shot type, visual focus, motion, atmosphere. NO character dialogue or audio descriptions. Purely visual."
    }
  ]
}

Important prompt rules:
- Video prompts must be purely VISUAL (no sound, dialogue, speech mentions)
- Keep motion subtle/ambient to avoid distracting from narration
- First beat should be establishing/wide
- Final beat can push in or hold on key detail
- Vary shot types to maintain visual interest`

  try {
    const result = await generateText(prompt, {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
      responseMimeType: 'application/json'
    })
    const responseText = result.text
    
    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = responseText
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0]
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0]
    }
    
    const parsed = JSON.parse(jsonStr.trim())
    
    return {
      totalBeats: parsed.beats.length,
      narrationDurationEstimate: duration,
      mode: 'beat-matched',
      beats: parsed.beats.map((beat: any, idx: number) => ({
        beatNumber: beat.beatNumber || idx + 1,
        startPercent: beat.startPercent || (idx * 100 / parsed.beats.length),
        endPercent: beat.endPercent || ((idx + 1) * 100 / parsed.beats.length),
        narrationText: beat.narrationText || '',
        visualFocus: beat.visualFocus || sceneHeading,
        shotType: beat.shotType || 'wide',
        cameraMotion: beat.cameraMotion || 'slow-dolly-in',
        motionIntensity: beat.motionIntensity || 'ambient',
        videoPrompt: beat.videoPrompt || generateSingleShotPrompt(sceneHeading, beat.visualFocus || '', beat.narrationText || ''),
      }))
    }
  } catch (error) {
    console.error('Failed to analyze narration beats:', error)
    // Fallback to simple splitting
    return fallbackBeatAnalysis(narrationText, sceneHeading, sceneDescription || '', duration, targetSegments)
  }
}

function generateSingleShotPrompt(heading: string, description: string, narration: string): string {
  // Extract key visual elements from narration (strip dialogue/sound references)
  const cleanNarration = narration
    .replace(/["'].*?["']/g, '') // Remove quoted speech
    .replace(/\bsay(s|ing)?\b|\bspeak(s|ing)?\b|\btell(s|ing)?\b/gi, '') // Remove speech verbs
    .trim()
  
  return `Cinematic establishing shot of ${heading}. ${description ? description + '. ' : ''}Slow, ambient camera motion revealing the environment. Atmospheric lighting, film grain, shallow depth of field. ${cleanNarration.substring(0, 150)}`
}

function fallbackBeatAnalysis(
  narrationText: string, 
  sceneHeading: string, 
  sceneDescription: string,
  duration: number,
  targetSegments: number
): NarrationBeatAnalysis {
  // Simple sentence-based splitting
  const sentences = narrationText.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentencesPerBeat = Math.ceil(sentences.length / targetSegments)
  
  const beats: NarrationBeat[] = []
  const shotTypes: Array<'wide' | 'medium' | 'close-up' | 'detail'> = ['wide', 'medium', 'close-up', 'detail']
  const cameraMotions: Array<'slow-dolly-in' | 'slow-pan-right' | 'static' | 'slow-tilt-up'> = ['slow-dolly-in', 'slow-pan-right', 'static', 'slow-tilt-up']
  
  for (let i = 0; i < targetSegments; i++) {
    const startIdx = i * sentencesPerBeat
    const endIdx = Math.min(startIdx + sentencesPerBeat, sentences.length)
    const beatText = sentences.slice(startIdx, endIdx).join('. ').trim() + '.'
    
    beats.push({
      beatNumber: i + 1,
      startPercent: (i / targetSegments) * 100,
      endPercent: ((i + 1) / targetSegments) * 100,
      narrationText: beatText,
      visualFocus: i === 0 ? sceneHeading : `Detail of ${sceneHeading}`,
      shotType: shotTypes[i % shotTypes.length],
      cameraMotion: cameraMotions[i % cameraMotions.length],
      motionIntensity: 'ambient',
      videoPrompt: generateSingleShotPrompt(sceneHeading, sceneDescription, beatText),
    })
  }
  
  return {
    totalBeats: beats.length,
    narrationDurationEstimate: duration,
    mode: 'beat-matched',
    beats,
  }
}

/**
 * Calculate segment timings from beats and known audio duration
 */
export function calculateBeatTimings(
  beats: NarrationBeat[], 
  totalDurationSeconds: number
): Array<{ startTime: number; endTime: number; duration: number }> {
  return beats.map(beat => {
    const startTime = (beat.startPercent / 100) * totalDurationSeconds
    const endTime = (beat.endPercent / 100) * totalDurationSeconds
    return {
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      duration: Math.round((endTime - startTime) * 10) / 10,
    }
  })
}
