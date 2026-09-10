import { describe, it, expect } from 'vitest'
import {
  finalizeTextForGeminiTts,
  finalizeTextForGoogleTts,
  isGeminiMarkupTag,
  normalizePacingPunctuation,
  optimizeTextForGeminiTTS,
  optimizeTextForTTS,
  pauseTagForCue,
  stripDialogueTags,
} from '@/lib/tts/textOptimizer'
import { audioSourceFingerprintForSpoken, isBeatAudioStale } from '@/lib/audio/beatAudioStale'

describe('stripDialogueTags', () => {
  it('removes a trailing tag from a quoted line and keeps the quotes balanced', () => {
    const result = stripDialogueTags('"The containment breach is regrettable," he said coldly.')
    expect(result.text).toBe('"The containment breach is regrettable."')
    expect(result.tags).toEqual(['coldly'])
  })

  it('removes a trailing tag from an unquoted line', () => {
    const result = stripDialogueTags('The breach is regrettable, he said coldly.')
    expect(result.text).toBe('The breach is regrettable.')
    expect(result.tags).toEqual(['coldly'])
  })

  it('removes a leading tag', () => {
    const result = stripDialogueTags('She muttered, "It was never about the money."')
    expect(result.text).toBe('"It was never about the money."')
    expect(result.tags).toEqual(['muttered'])
  })

  it('joins the halves around an interposed tag', () => {
    const result = stripDialogueTags('"Enough," he said coldly, "we are done here."')
    expect(result.text).toBe('"Enough, we are done here."')
    expect(result.tags).toEqual(['coldly'])
  })

  it('reduces the tag to its manner, discarding bare attribution', () => {
    expect(stripDialogueTags('"Fine," he said.').tags).toEqual([])
    expect(stripDialogueTags('"Fine," he whispered.').tags).toEqual(['whispered'])
    expect(stripDialogueTags('"Fine," Julian said, his voice flat.').tags).toEqual([
      'his voice flat',
    ])
  })

  it('leaves ordinary narration alone', () => {
    for (const line of [
      'He said the vault was empty.',
      'Do what the man said.',
      'The report says the numbers are wrong.',
      'I asked for the file this morning.',
    ]) {
      expect(stripDialogueTags(line), line).toEqual({ text: line, tags: [] })
    }
  })
})

describe('markup tag allowlist', () => {
  it('recognizes only Google\u2019s documented tags', () => {
    for (const tag of [
      'short pause',
      'medium pause',
      'long pause',
      'sigh',
      'uhm',
      'whispering',
      'shouting',
      'extremely fast',
      'sarcasm',
      'laughing',
    ]) {
      expect(isGeminiMarkupTag(tag), tag).toBe(true)
    }

    for (const notATag of ['exhausted', 'tired, muttering', 'smoothly confident', 'cold']) {
      expect(isGeminiMarkupTag(notATag), notATag).toBe(false)
    }
  })

  it('is case and whitespace insensitive', () => {
    expect(isGeminiMarkupTag('  Long   Pause ')).toBe(true)
  })

  it('keeps documented tags inline for Gemini', () => {
    const result = optimizeTextForGeminiTTS('[sigh] Fine. [short pause] Have it your way.')
    expect(result.text).toBe('[sigh] Fine. [short pause] Have it your way.')
  })

  /**
   * The blanket bracket deletion existed because multi-word stage directions
   * were read verbatim. That fix has to survive the allowlist.
   */
  it('still strips stage directions the model would read aloud', () => {
    const result = optimizeTextForGeminiTTS('[exhausted, whispering] I cannot do this again.')
    expect(result.text).toBe('I cannot do this again.')
    expect(result.cues).toEqual(['exhausted', 'whispering'])
  })

  it('does not repeat an inline tag as a prompt cue', () => {
    const result = optimizeTextForGeminiTTS('[whispering] Do not move.')
    expect(result.text).toBe('[whispering] Do not move.')
    expect(result.cues).toEqual([])
  })

  it('rewrites a pause-only bracket as the documented tag, in place', () => {
    expect(optimizeTextForGeminiTTS('[a long pause] The board has already voted.').text).toBe(
      '[long pause] The board has already voted.'
    )
    expect(optimizeTextForGeminiTTS('Sit down. [brief pause] Now.').text).toBe(
      'Sit down. [short pause] Now.'
    )
  })

  it('treats a bracket mixing pause and manner as direction, not markup', () => {
    const result = optimizeTextForGeminiTTS('[a long pause, then coldly] Sit down.')
    expect(result.text).toBe('Sit down.')
    expect(result.cues).toEqual(['then coldly'])
  })

  it('reports a line of nothing but markup as unspeakable', () => {
    expect(optimizeTextForGeminiTTS('[medium pause]').isSpeakable).toBe(false)
    expect(optimizeTextForGeminiTTS('[sigh] Fine.').isSpeakable).toBe(true)
  })

  it('strips every bracket for legacy Google voices, which have no markup', () => {
    expect(finalizeTextForGoogleTts('[long pause] The board has voted.')).toBe(
      'The board has voted.'
    )
  })

  it('keeps documented tags in the Gemini last pass', () => {
    expect(finalizeTextForGeminiTts('[long pause] The board has voted.')).toBe(
      '[long pause] The board has voted.'
    )
  })

  it('is idempotent, since the last pass runs over already-optimized text', () => {
    const once = finalizeTextForGeminiTts('"Enough," he said coldly, "we are done -- now."')
    expect(finalizeTextForGeminiTts(once)).toBe(once)
  })
})

describe('pauseTagForCue', () => {
  it('maps whole pause phrases and nothing else', () => {
    expect(pauseTagForCue('a long pause')).toBe('[long pause]')
    expect(pauseTagForCue('brief pause')).toBe('[short pause]')
    expect(pauseTagForCue('pause')).toBe('[medium pause]')
    expect(pauseTagForCue('beat')).toBe('[medium pause]')

    expect(pauseTagForCue('beat the drum slowly')).toBeNull()
    expect(pauseTagForCue('coldly')).toBeNull()
    expect(pauseTagForCue('pauses to consider')).toBeNull()
  })
})

describe('normalizePacingPunctuation', () => {
  it('collapses typed pacing onto the characters the model reads', () => {
    expect(normalizePacingPunctuation('I . . . I am not sure.')).toBe('I\u2026 I am not sure.')
    expect(normalizePacingPunctuation('I... I am not sure.')).toBe('I\u2026 I am not sure.')
    expect(normalizePacingPunctuation('Wait -- listen.')).toBe('Wait\u2014listen.')
    expect(normalizePacingPunctuation('Wait --- listen.')).toBe('Wait\u2014listen.')
  })

  it('leaves single periods and existing em-dashes intact', () => {
    expect(normalizePacingPunctuation('Stop. Now.')).toBe('Stop. Now.')
    expect(normalizePacingPunctuation('Wait\u2014listen.')).toBe('Wait\u2014listen.')
  })

  it('is idempotent', () => {
    for (const input of ['I . . . I am not sure.', 'Wait -- listen.', 'Stop. Now.']) {
      const once = normalizePacingPunctuation(input)
      expect(normalizePacingPunctuation(once)).toBe(once)
    }
  })
})

describe('optimizeTextForGeminiTTS end to end', () => {
  it('cleans a novelized line into spoken text plus delivery cues', () => {
    const result = optimizeTextForGeminiTTS(
      '"The containment breach is regrettable," he said coldly.'
    )
    expect(result.text).toBe('The containment breach is regrettable.')
    expect(result.cues).toEqual(['coldly'])
    expect(result.isSpeakable).toBe(true)
  })

  it('routes bracket direction to cues while normalizing pacing in the text', () => {
    const result = optimizeTextForGeminiTTS('[tired, muttering] I... I am not sure -- about this.')
    expect(result.text).toBe('I\u2026 I am not sure\u2014about this.')
    expect(result.cues).toEqual(['tired', 'muttering'])
  })
})

describe('optimizeTextForTTS', () => {
  it('strips dialogue tags for non-Gemini providers too', () => {
    const result = optimizeTextForTTS('"We will absorb the loss," Julian said, his voice flat.')
    expect(result.text).toContain('We will absorb the loss')
    expect(result.text).not.toMatch(/Julian said/)
  })
})

describe('audioSourceFingerprintForSpoken', () => {
  const spoken = { kind: 'dialogue' as const, character: 'JULIAN', line: 'It is done.' }

  it('is byte-identical to the content-only fingerprint when no voice state is given', () => {
    expect(audioSourceFingerprintForSpoken({ ...spoken, voiceStateHash: undefined })).toBe(
      audioSourceFingerprintForSpoken(spoken)
    )
    expect(audioSourceFingerprintForSpoken({ ...spoken, voiceStateHash: '' })).toBe(
      audioSourceFingerprintForSpoken(spoken)
    )
  })

  it('appends the voice state as a suffix on the content fingerprint', () => {
    const withVoice = audioSourceFingerprintForSpoken({ ...spoken, voiceStateHash: 'abc123' })
    expect(withVoice).toBe(`${audioSourceFingerprintForSpoken(spoken)}||voice:abc123`)
  })

  /**
   * Most call sites know the script text but not the voice configuration. If a
   * content-only fingerprint counted as a mismatch, every clip would show stale.
   */
  it('does not mark a clip stale for a reader that tracks no voice state', () => {
    const stored = audioSourceFingerprintForSpoken({ ...spoken, voiceStateHash: 'abc123' })
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: stored,
        currentFingerprint: audioSourceFingerprintForSpoken(spoken),
      })
    ).toBe(false)
  })

  it('marks a clip stale when the text changed', () => {
    const stored = audioSourceFingerprintForSpoken({ ...spoken, voiceStateHash: 'abc123' })
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: stored,
        currentFingerprint: audioSourceFingerprintForSpoken({
          ...spoken,
          line: 'It is not done.',
        }),
      })
    ).toBe(true)
  })

  it('marks a clip stale when both sides track voice state and it changed', () => {
    expect(
      isBeatAudioStale({
        hasAudio: true,
        sourceFingerprint: audioSourceFingerprintForSpoken({ ...spoken, voiceStateHash: 'abc123' }),
        currentFingerprint: audioSourceFingerprintForSpoken({
          ...spoken,
          voiceStateHash: 'def456',
        }),
      })
    ).toBe(true)
  })
})
