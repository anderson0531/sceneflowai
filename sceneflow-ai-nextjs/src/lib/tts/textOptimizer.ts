/**
 * TTS Text Optimizer
 * 
 * Optimizes dialogue text for Text-to-Speech generation by:
 * - Removing stage directions in parentheses
 * - Extracting emotion cues
 * - Preserving natural punctuation
 * - Cleaning up whitespace
 */

export interface OptimizedText {
  text: string
  cues: string[]
  originalLength: number
  optimizedLength: number
  isSpeakable: boolean  // NEW: indicates if text contains speakable content
}

/**
 * Removes stage directions and audio tags from text
 * Removes [bracket] audio tags since eleven_turbo_v2_5 doesn't support them
 * and would read them aloud as text instead of interpreting them as instructions
 * Also removes traditional parentheses stage directions
 */
function removeStageDirections(text: string): string {
  let cleaned = text
  
  // Remove audio tags in square brackets [instruction]
  // ElevenLabs Turbo v2.5 doesn't support these, so remove to prevent them being spoken
  cleaned = cleaned.replace(/\[([^\]]+)\]/g, '')
  
  // Remove traditional stage directions in parentheses (instruction)
  cleaned = cleaned.replace(/\(([^)]+)\)/g, '')
  
  // Clean up extra whitespace from removed tags
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

/**
 * Extracts emotion and delivery cues from text
 */
function extractEmotionCues(text: string): string[] {
  const cues: string[] = []
  
  // Common emotion and delivery cues
  const cuePatterns = [
    /(?:voice|tone|delivery)[\s,]+(?:is\s+)?(hoarse|choked|whisper|shout|excited|sad|angry|happy|nervous|relief|grateful|surprised|shocked|worried|calm|urgent|desperate|firm|gentle)/gi,
    /\b(whispering|shouting|excitedly|sadly|angrily|happily|nervously|calmly|urgently|desperately|firmly|gently)\b/gi,
  ]
  
  for (const pattern of cuePatterns) {
    const matches = text.match(pattern)
    if (matches) {
      cues.push(...matches.map(m => m.toLowerCase().trim()))
    }
  }
  
  return [...new Set(cues)] // Remove duplicates
}

/**
 * Normalizes whitespace in text
 */
function normalizeWhitespace(text: string): string {
  // Replace multiple spaces with single space
  let normalized = text.replace(/\s+/g, ' ')
  
  // Trim whitespace
  normalized = normalized.trim()
  
  // Normalize line breaks - replace multiple newlines with single space
  normalized = normalized.replace(/\n\s*\n+/g, ' ')
  
  return normalized
}

/**
 * Optimizes text for TTS generation
 */
export function optimizeTextForTTS(input: string): OptimizedText {
  const originalLength = input.length
  
  // Extract emotion cues before removing stage directions
  const cues = extractEmotionCues(input)
  
  // Remove stage directions
  let optimized = removeStageDirections(input)
  
  // Normalize whitespace
  optimized = normalizeWhitespace(optimized)
  
  const optimizedLength = optimized.length
  
  // Check if result is speakable (has actual content)
  const isSpeakable = optimized.trim().length > 0
  
  // Log if significant changes were made
  if (originalLength !== optimizedLength || cues.length > 0) {
    console.log('[TTS Optimizer]', {
      originalLength,
      optimizedLength,
      reduction: originalLength - optimizedLength,
      cues: cues.length > 0 ? cues : 'none',
      isSpeakable
    })
  }
  
  return {
    text: isSpeakable ? optimized : input, // Fallback to original if empty
    cues,
    originalLength,
    optimizedLength,
    isSpeakable
  }
}

/**
 * Example transformations for testing
 */
export const EXAMPLE_TRANSFORMATIONS = {
  'stage direction at start': {
    input: '(His voice hoarse, almost a choked whisper) Mint. Thank you.',
    expected: 'Mint. Thank you.'
  },
  'multiple stage directions': {
    input: '(excitedly) I can\'t believe it! (voice getting louder) This is amazing!',
    expected: 'I can\'t believe it! This is amazing!'
  },
  'with hesitation': {
    input: '(thoughtfully) I... I\'m not sure about this.',
    expected: 'I... I\'m not sure about this.'
  },
  'with interruption': {
    input: '(urgently) Wait—I need to tell you something!',
    expected: 'Wait—I need to tell you something!'
  },
  'preserve emphasis': {
    input: '(whispering) This is IMPORTANT.',
    expected: 'This is IMPORTANT.'
  }
} as const

