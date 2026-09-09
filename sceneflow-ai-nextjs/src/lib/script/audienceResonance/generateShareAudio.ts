import { put } from '@vercel/blob'
import CollabSession from '@/models/CollabSession'
import {
  DEFAULT_BLUEPRINT_GEMINI_VOICE,
  isGeminiTtsConfigured,
  normalizeBlueprintGeminiVoiceId,
  synthesizeGeminiFlashMp3,
} from '@/lib/tts/geminiFlashTts'
import { resolveGeminiTtsLanguageCode } from '@/lib/tts/googleTtsLocale'
import { chunkNarrationText } from '@/lib/blueprint/narrationChunks'
import { translateBlueprintNarration } from '@/lib/blueprint/translateBlueprintNarration'
import {
  DEFAULT_SHARE_AUDIO_LANGUAGE,
  hashForLanguage,
} from '@/lib/blueprint/shareAudioPayload'
import { hashShareAudioContent } from '@/lib/blueprint/generateShareSectionAudio'
import { getScriptARPayload, isScriptARPayload } from './shareSession'
import {
  SCRIPT_AR_SECTION_ORDER,
  buildScriptARNarrationText,
} from './scriptARNarrationText'
import type {
  ScriptARSectionAudioMap,
  ScriptARSectionTranslationsMap,
  ScriptARSessionPayload,
} from './shareTypes'

async function synthesizeMp3(
  text: string,
  voiceId: string,
  language: string
): Promise<Buffer> {
  const chunks = chunkNarrationText(text)
  if (chunks.length === 0) return Buffer.alloc(0)
  const languageCode = resolveGeminiTtsLanguageCode(language)
  const buffers: Buffer[] = []
  for (const chunk of chunks) {
    buffers.push(
      await synthesizeGeminiFlashMp3({
        text: chunk,
        voiceId: normalizeBlueprintGeminiVoiceId(voiceId),
        languageCode,
      })
    )
  }
  return buffers.length === 1 ? buffers[0]! : Buffer.concat(buffers)
}

export async function runScriptARShareAudioGeneration(
  sessionId: string,
  options?: { language?: string; voiceId?: string }
) {
  if (!isGeminiTtsConfigured()) {
    return { skipped: true as const, status: 'skipped' as const }
  }

  const session = await CollabSession.findByPk(sessionId)
  if (!session || !isScriptARPayload(session.payload)) {
    return { skipped: true as const }
  }

  const payload = getScriptARPayload(session)!
  const language = options?.language || payload.sectionAudioLanguage || DEFAULT_SHARE_AUDIO_LANGUAGE
  const voiceId = normalizeBlueprintGeminiVoiceId(
    options?.voiceId || payload.sectionAudioVoiceId || DEFAULT_BLUEPRINT_GEMINI_VOICE
  )

  const sectionAudio: ScriptARSectionAudioMap = {
    ...(payload.sectionAudioByLanguage?.[language] || {}),
  }
  const sectionTranslations: ScriptARSectionTranslationsMap = {
    ...(payload.sectionTranslations?.[language] || {}),
  }

  for (const section of SCRIPT_AR_SECTION_ORDER) {
    const text = buildScriptARNarrationText(payload.review, section)
    if (!text.trim()) continue
    let speakable = text
    try {
      speakable = await translateBlueprintNarration(text, language)
    } catch {
      if (language !== DEFAULT_SHARE_AUDIO_LANGUAGE) continue
    }
    sectionTranslations[section] = speakable
    const textHash = hashForLanguage(hashShareAudioContent(speakable, voiceId), language)
    const existing = sectionAudio[section]
    if (existing?.url && existing.textHash === textHash) continue

    const buffer = await synthesizeMp3(speakable, voiceId, language)
    if (!buffer.length) continue
    const filename = `audio/script-resonance-share/${payload.projectId}/${sessionId}/${language}/${section}.mp3`
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
    })
    sectionAudio[section] = { url: blob.url, textHash }
  }

  const next: ScriptARSessionPayload = {
    ...payload,
    sectionAudioLanguage: language,
    sectionAudioVoiceId: voiceId,
    sectionAudioByLanguage: {
      ...(payload.sectionAudioByLanguage || {}),
      [language]: sectionAudio,
    },
    sectionTranslations: {
      ...(payload.sectionTranslations || {}),
      [language]: sectionTranslations,
    },
    sectionAudioStatus: 'ready',
    sectionAudioGeneratedAt: new Date().toISOString(),
  }
  await session.update({ payload: next })
  return { skipped: false as const, status: 'ready' as const, language }
}
