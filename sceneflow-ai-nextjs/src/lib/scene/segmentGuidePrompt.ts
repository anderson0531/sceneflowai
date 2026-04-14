/**
 * Shared Veo guide prompt composition for segment dialogue + direction.
 * Used by GuidePromptEditor (full UI) and useSegmentConfig (batch / auto guide).
 */

import type { SceneSegment } from '@/components/vision/scene-production/types'

// ---------------------------------------------------------------------------
// Scene context (minimal fields; compatible with GuidePromptEditor SceneAudioData)
// ---------------------------------------------------------------------------

export type GuidePromptSceneContext = {
  dialogue?: Array<{
    id?: string
    character: string
    line?: string
    text?: string
    parenthetical?: string
  }>
  sceneDirection?: {
    action?: string
    visualStyle?: string
    cameraWork?: string
    lighting?: string
    mood?: string
  }
  visualDescription?: string
  action?: string
  narration?: string
  music?: string | { description: string }
  sfx?: Array<{ description: string; audioUrl?: string }>
}

export type GuideAudioElementType = 'narration' | 'dialogue' | 'music' | 'sfx' | 'direction'

/** Mirrors GuidePromptEditor AudioElement shape for composition only */
export interface GuideAudioElement {
  id: string
  type: GuideAudioElementType
  label: string
  content: string
  character?: string
  characterAge?: string
  characterGender?: string
  characterEthnicity?: string
  selected: boolean
  portionStart: number
  portionEnd: number
}

export type GuideCharacterDemographic = {
  name: string
  age?: string
  gender?: string
  ethnicity?: string
}

// ---------------------------------------------------------------------------
// Character voice (Veo-style descriptors)
// ---------------------------------------------------------------------------

const CHARACTER_VOICE_STYLES: Record<string, string> = {
  'young-male': 'a young man with a clear, energetic voice',
  'adult-male': 'an adult man with a measured, natural voice',
  'middle-aged-male': 'a middle-aged man with a resonant, authoritative voice',
  'elderly-male': 'an elderly man with a weathered, deliberate voice',
  'young-female': 'a young woman with a bright, expressive voice',
  'adult-female': 'an adult woman with a warm, articulate voice',
  'middle-aged-female': 'a middle-aged woman with a composed, confident voice',
  'elderly-female': 'an elderly woman with a gentle, knowing voice',
  male: 'a man speaking naturally',
  female: 'a woman speaking naturally',
  neutral: 'speaking clearly and naturally',
}

export function getCharacterVoiceStyle(age?: string, gender?: string): string {
  if (!gender) return CHARACTER_VOICE_STYLES.neutral

  const genderLower = gender.toLowerCase()
  const genderKey =
    genderLower === 'male' || genderLower === 'm'
      ? 'male'
      : genderLower === 'female' || genderLower === 'f'
        ? 'female'
        : 'neutral'

  if (!age) return CHARACTER_VOICE_STYLES[genderKey] || CHARACTER_VOICE_STYLES.neutral

  const ageNum = parseInt(age, 10)
  let ageKey = ''
  if (!Number.isNaN(ageNum)) {
    if (ageNum < 25) ageKey = 'young'
    else if (ageNum < 40) ageKey = 'adult'
    else if (ageNum < 60) ageKey = 'middle-aged'
    else ageKey = 'elderly'
  }

  const fullKey = ageKey ? `${ageKey}-${genderKey}` : genderKey
  return (
    CHARACTER_VOICE_STYLES[fullKey] ||
    CHARACTER_VOICE_STYLES[genderKey] ||
    CHARACTER_VOICE_STYLES.neutral
  )
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function getTextPortion(text: string, startPercent: number, endPercent: number): string {
  if (!text) return ''

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const totalSentences = sentences.length

  const startIdx = Math.floor((startPercent / 100) * totalSentences)
  const endIdx = Math.ceil((endPercent / 100) * totalSentences)

  return sentences.slice(startIdx, endIdx).join(' ').trim()
}

export function extractCoreVisualAction(text: string, maxLength: number = 250): string {
  if (!text) return ''

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10)

  const visualKeywords = [
    'camera',
    'cut',
    'close up',
    'wide shot',
    'pan',
    'zoom',
    'reveal',
    'tracking',
    'types',
    'looks',
    'turns',
    'walks',
    'runs',
    'sits',
    'stands',
    'enters',
    'exits',
    'gazes',
    'stares',
    'reaches',
    'grabs',
    'opens',
    'closes',
    'moves',
    'slowly',
    'suddenly',
    'quickly',
    'face',
    'eyes',
    'hands',
    'screen',
    'monitor',
    'light',
  ]

  const scored = sentences
    .map((s) => ({
      text: s.trim(),
      score: visualKeywords.filter((k) => s.toLowerCase().includes(k)).length,
    }))
    .sort((a, b) => b.score - a.score)

  let result = ''
  for (const item of scored) {
    if (result.length + item.text.length + 2 <= maxLength) {
      result += (result ? '. ' : '') + item.text
    } else if (!result) {
      result = item.text.slice(0, maxLength - 3) + '...'
      break
    } else {
      break
    }
  }

  return result
}

export function extractDialoguePerformance(dialogueText: string, parenthetical?: string): string {
  if (parenthetical) {
    return parenthetical.replace(/[()]/g, '').trim().toLowerCase()
  }

  const emotionPatterns: [RegExp, string][] = [
    [/tiredly|exhausted|weary/i, 'with exhaustion'],
    [/angrily|furious|rage/i, 'with anger'],
    [/softly|gently|tender/i, 'softly'],
    [/urgently|desperate/i, 'urgently'],
    [/quietly|hushed/i, 'quietly'],
    [/murmur|mumble/i, 'in a low murmur'],
    [/whisper/i, 'in a whisper'],
    [/shout|yell|scream/i, 'loudly'],
    [/sad|grief|mourn/i, 'with sadness'],
    [/laugh|chuckle|amused/i, 'with amusement'],
    [/fear|afraid|terror/i, 'fearfully'],
    [/cold|stern|firm/i, 'coldly'],
  ]

  for (const [pattern, emotion] of emotionPatterns) {
    if (pattern.test(dialogueText)) {
      return emotion
    }
  }

  return ''
}

// ---------------------------------------------------------------------------
// Segment dialogue resolution (dialogue-{i} = i-th scene dialogue line)
// ---------------------------------------------------------------------------

export function getSegmentDialogueLines(
  segment: SceneSegment,
  sceneDialogue: GuidePromptSceneContext['dialogue']
): Array<{ id: string; character: string; line: string; parenthetical?: string; index: number }> {
  if (!sceneDialogue || sceneDialogue.length === 0) return []

  const dialogueLineIds = segment.dialogueLineIds || []

  if (dialogueLineIds.length > 0) {
    const resolved = dialogueLineIds
      .map((id) => {
        const numericMatch = String(id).match(/(\d+)$/)
        const numericIndex = numericMatch ? Number(numericMatch[1]) : -1
        const dialogueItem = sceneDialogue.find(
          (d, i) =>
            d.id === id ||
            `dialogue-${i}` === id ||
            `scene-dialogue-${i}` === id ||
            i === numericIndex
        )
        if (!dialogueItem) return null
        return {
          id,
          character: dialogueItem.character || 'Unknown',
          line: dialogueItem.line || dialogueItem.text || '',
          parenthetical: dialogueItem.parenthetical,
          index: sceneDialogue.indexOf(dialogueItem),
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)

    if (resolved.length > 0) {
      return resolved
    }
  }

  if (segment.dialogueLines && segment.dialogueLines.length > 0) {
    return segment.dialogueLines.map((dl, idx) => ({
      id: dl.id,
      character: dl.character,
      line: dl.line,
      index: idx,
    }))
  }

  return []
}

const DEFAULT_NARRATOR_PRESET =
  'A professional neutral narrator speaking in documentary style'

export interface ComposeGuidePromptOptions {
  customAddition?: string
  /** Preset narrator phrase when not using custom voice */
  narratorVoicePromptText?: string
  narratorUseCustomVoice?: boolean
  narratorCustomDescription?: string
}

/**
 * Compose the unified Veo 3.1 guide string from selected elements.
 * `elements` should already be filtered to selected rows (or pass all with selected flags).
 */
export function composeGuidePromptFromElements(
  elements: GuideAudioElement[],
  options: ComposeGuidePromptOptions = {}
): string {
  const selectedElements = elements.filter((el) => el.selected)

  const customAddition = options.customAddition?.trim() || ''
  if (selectedElements.length === 0 && !customAddition) {
    return ''
  }

  const visualParts: string[] = []

  const directions = selectedElements.filter((el) => el.type === 'direction')
  if (directions.length > 0) {
    const directionText = directions
      .map((d) => getTextPortion(d.content, d.portionStart, d.portionEnd))
      .join(' ')

    const cameraMatch = directionText.match(
      /(?:camera|shot|angle|pan|zoom|tracking|dolly|close[- ]?up|wide|medium)[^.]*\./i
    )
    if (cameraMatch) {
      visualParts.push(cameraMatch[0].trim())
    }

    const visualAction = extractCoreVisualAction(directionText, 250)
    if (visualAction) {
      visualParts.push(visualAction)
    }
  }

  const dialogues = selectedElements.filter((el) => el.type === 'dialogue')
  if (dialogues.length > 0) {
    dialogues.forEach((d) => {
      const portion = getTextPortion(d.content, d.portionStart, d.portionEnd)
      const charName = d.character || 'The character'
      const emotion = extractDialoguePerformance(portion, undefined)

      let cleanDialogue = portion.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim()
      const words = cleanDialogue.split(/\s+/)
      const truncatedText =
        words.length > 60 ? words.slice(0, 60).join(' ') + '...' : cleanDialogue

      let emotionPhrase = ''
      if (emotion) {
        const e = emotion.toLowerCase()
        emotionPhrase = e.includes('whisper')
          ? 'in a whisper'
          : e.includes('shout')
            ? 'loudly'
            : e.includes('sad')
              ? 'with sadness'
              : e.includes('angry')
                ? 'angrily'
                : e.includes('happy')
                  ? 'happily'
                  : e.includes('fear')
                    ? 'fearfully'
                    : e.includes('tired')
                      ? 'wearily'
                      : emotion.toLowerCase()
      }

      const speakPhrase = emotionPhrase
        ? `${charName} speaks the following line ${emotionPhrase}:`
        : `${charName} speaks the following line:`

      visualParts.push(`${speakPhrase} '${truncatedText}'`)
    })
  }

  const narrations = selectedElements.filter((el) => el.type === 'narration')
  if (narrations.length > 0) {
    const narrationText = narrations
      .map((n) => getTextPortion(n.content, n.portionStart, n.portionEnd))
      .join(' ')

    const voiceAnchor =
      options.narratorUseCustomVoice && options.narratorCustomDescription?.trim()
        ? options.narratorCustomDescription.trim()
        : options.narratorVoicePromptText?.trim() || DEFAULT_NARRATOR_PRESET

    const words = narrationText.split(/\s+/)
    const truncatedNarration =
      words.length > 60 ? words.slice(0, 60).join(' ') + '...' : narrationText

    const narratorDesc = voiceAnchor
      ? `A narrator with ${voiceAnchor.toLowerCase()}`
      : 'A professional narrator'
    visualParts.push(`${narratorDesc} speaks the following voiceover: '${truncatedNarration}'`)
  }

  const sfxElements = selectedElements.filter((el) => el.type === 'sfx')
  if (sfxElements.length > 0) {
    const sfxDescriptions = sfxElements
      .map((s) => getTextPortion(s.content, s.portionStart, s.portionEnd).toLowerCase())
      .join(', ')
    visualParts.push(`Audio includes ${sfxDescriptions}`)
  }

  const musicElements = selectedElements.filter((el) => el.type === 'music')
  if (musicElements.length > 0) {
    const musicDescriptions = musicElements
      .map((m) => getTextPortion(m.content, m.portionStart, m.portionEnd).toLowerCase())
      .join(', ')
    visualParts.push(`Background music: ${musicDescriptions}`)
  }

  if (customAddition) {
    visualParts.push(customAddition)
  }

  return visualParts.join('. ').replace(/\.\./g, '.').replace(/\s+/g, ' ').trim()
}

function getMusicDescription(music: GuidePromptSceneContext['music']): string {
  if (!music) return ''
  if (typeof music === 'string') return music
  if (typeof music === 'object' && music.description) return music.description
  return ''
}

/**
 * Build elements for **batch / auto** guide: assigned dialogue + direction only
 * (no narration, music, SFX — smaller RAI surface; user can expand in DirectorDialog).
 */
export function buildBatchAutoGuideElements(
  segment: SceneSegment,
  scene: GuidePromptSceneContext,
  characters: GuideCharacterDemographic[] = []
): GuideAudioElement[] {
  const newElements: GuideAudioElement[] = []

  const segmentDialogue = getSegmentDialogueLines(segment, scene.dialogue)
  segmentDialogue.forEach((dl, idx) => {
    const charData = characters.find(
      (c) =>
        c.name.toLowerCase() === dl.character.toLowerCase() ||
        c.name.toLowerCase().includes(dl.character.toLowerCase()) ||
        dl.character.toLowerCase().includes(c.name.toLowerCase())
    )

    newElements.push({
      id: `dialogue-${dl.id || idx}`,
      type: 'dialogue',
      label: dl.character,
      content: dl.line,
      character: dl.character,
      characterAge: charData?.age,
      characterGender: charData?.gender,
      characterEthnicity: charData?.ethnicity,
      selected: true,
      portionStart: 0,
      portionEnd: 100,
    })
  })

  const directionParts: string[] = []
  if (segment.actionPrompt) {
    directionParts.push(segment.actionPrompt)
  } else if (segment.action) {
    directionParts.push(segment.action)
  }
  if (scene.sceneDirection?.action) {
    directionParts.push(scene.sceneDirection.action)
  }
  if (scene.action && !directionParts.includes(scene.action)) {
    directionParts.push(scene.action)
  }
  if (scene.visualDescription) {
    directionParts.push(scene.visualDescription)
  }

  if (directionParts.length > 0) {
    newElements.push({
      id: 'direction',
      type: 'direction',
      label: 'Scene Direction',
      content: directionParts.join('\n\n'),
      selected: true,
      portionStart: 0,
      portionEnd: 100,
    })
  }

  return newElements
}

/** Auto guide string for queue / useSegmentConfig when segment has assigned dialogue */
export function buildDefaultBatchGuidePrompt(
  segment: SceneSegment,
  scene: GuidePromptSceneContext,
  characters: GuideCharacterDemographic[] = []
): string {
  const elements = buildBatchAutoGuideElements(segment, scene, characters)
  const selected = elements.filter((e) => e.selected)
  if (selected.length === 0) return ''
  return composeGuidePromptFromElements(selected, {})
}
