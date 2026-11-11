import { getLanguageName } from '@/constants/languages'
import { SCENEFLOW_CTA, appendSceneFlowCta } from '@/lib/premiere/distributionMetadata'
import type { PublishUnitKind } from '@/lib/publish/publishUnits'
import {
  sanitizeYouTubeDescription,
  sanitizeYouTubeTags,
  sanitizeYouTubeTitle,
} from '@/lib/publish/youtubeClient'
import { generateText } from '@/lib/vertexai/gemini'
import { translateWithVertexAI } from '@/lib/vertexai/translate'

export interface LocalizedYouTubeMetadata {
  language: string
  title: string
  description: string
  tags: string[]
}

export interface GenerateYouTubeMetadataInput {
  projectTitle?: string
  synopsis?: string
  genre?: string
  unitKind?: PublishUnitKind | string
  unitLabel?: string
  sceneHeadings?: string[]
  locale?: string
  platform?: string
  includeSceneFlowCta?: boolean
  targetLanguages?: string[]
}

export interface TranslateYouTubeMetadataInput {
  sourceLanguage: string
  sourceTitle: string
  sourceDescription: string
  sourceTags?: string[]
  targetLanguages: string[]
  includeSceneFlowCta?: boolean
}

const KNOWN_CTA_LINES = Object.values(SCENEFLOW_CTA)

export function stripKnownSceneFlowCta(description: string): string {
  let cleaned = (description || '').trim()
  for (const cta of KNOWN_CTA_LINES) {
    if (cleaned.endsWith(cta)) {
      cleaned = cleaned.slice(0, cleaned.length - cta.length).trimEnd()
    }
  }
  return cleaned
}

function unitKindDisplayLabel(kind?: string): string {
  switch (kind) {
    case 'previs':
      return 'Pre-Vis Animatic'
    case 'scene':
      return 'Scene Clip'
    case 'chapter':
      return 'Chapter'
    case 'promo':
      return 'Official Promo Trailer'
    case 'master':
      return 'Full Film'
    default:
      return ''
  }
}

export function buildFallbackMetadata(input: {
  projectTitle?: string
  synopsis?: string
  genre?: string
  unitKind?: string
  unitLabel?: string
  locale?: string
  platform?: string
  includeSceneFlowCta?: boolean
}): LocalizedYouTubeMetadata {
  const locale = (input.locale || 'en').trim() || 'en'
  const platform = (input.platform || 'YouTube').trim() || 'YouTube'
  const baseTitle = (input.projectTitle || 'Untitled Project').trim()
  const kindLabel = unitKindDisplayLabel(input.unitKind)
  const suffix = input.unitLabel?.trim() || kindLabel || platform

  const rawTitle =
    suffix && !baseTitle.toLowerCase().includes(suffix.toLowerCase())
      ? `${baseTitle} — ${suffix}`
      : baseTitle

  const bodyLines: string[] = []
  if (input.synopsis?.trim()) {
    bodyLines.push(input.synopsis.trim())
  } else {
    bodyLines.push(`${baseTitle}${kindLabel ? ` (${kindLabel})` : ''}.`)
  }
  if (input.genre?.trim()) {
    bodyLines.push(`Genre: ${input.genre.trim()}`)
  }

  const withCta = appendSceneFlowCta(
    bodyLines.join('\n\n'),
    locale,
    input.includeSceneFlowCta !== false
  )

  const rawTags = [
    baseTitle,
    ...(input.genre ? input.genre.split(/[,/]/).map((g) => g.trim()) : []),
    ...(kindLabel ? [kindLabel] : []),
    'SceneFlow',
    'AI Filmmaking',
    platform,
    locale,
  ]

  return {
    language: locale,
    title: sanitizeYouTubeTitle(rawTitle, baseTitle),
    description: sanitizeYouTubeDescription(withCta),
    tags: sanitizeYouTubeTags(rawTags) || ['SceneFlow', locale],
  }
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(withoutFence) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    const firstBrace = withoutFence.indexOf('{')
    const lastBrace = withoutFence.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        const sliced = JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as unknown
        if (sliced && typeof sliced === 'object' && !Array.isArray(sliced)) {
          return sliced as Record<string, unknown>
        }
      } catch {
        return null
      }
    }
  }
  return null
}

function normalizeParsedMetadata(
  obj: Record<string, unknown>,
  language: string,
  fallbackTitle: string,
  includeSceneFlowCta: boolean
): LocalizedYouTubeMetadata {
  const rawTitle = typeof obj.title === 'string' ? obj.title : fallbackTitle
  const rawDesc = typeof obj.description === 'string' ? stripKnownSceneFlowCta(obj.description) : ''
  const rawTags = Array.isArray(obj.tags)
    ? obj.tags.filter((t): t is string => typeof t === 'string')
    : []

  const finalDesc = appendSceneFlowCta(rawDesc, language, includeSceneFlowCta)
  return {
    language,
    title: sanitizeYouTubeTitle(rawTitle, fallbackTitle),
    description: sanitizeYouTubeDescription(finalDesc),
    tags: sanitizeYouTubeTags([...rawTags, 'SceneFlow']) || ['SceneFlow', language],
  }
}

export async function generateYouTubeMetadata(
  input: GenerateYouTubeMetadataInput
): Promise<{
  primary: LocalizedYouTubeMetadata
  translations: Record<string, LocalizedYouTubeMetadata>
  usedAi: boolean
}> {
  const locale = (input.locale || 'en').trim() || 'en'
  const includeCta = input.includeSceneFlowCta !== false
  const fallback = buildFallbackMetadata({ ...input, locale, includeSceneFlowCta: includeCta })

  const extraTargets = Array.from(
    new Set((input.targetLanguages || []).map((l) => l.trim()).filter((l) => l && l !== locale))
  )

  const languageLabel = getLanguageName(locale)
  const kindLabel = unitKindDisplayLabel(input.unitKind)
  const headingsSnippet = (input.sceneHeadings || []).slice(0, 8).join('; ')

  const prompt = [
    `You are an expert YouTube creative strategist and film distributor.`,
    `Generate compelling, high-CTR, SEO-optimized ${input.platform || 'YouTube'} publishing metadata in ${languageLabel} (${locale}).`,
    ``,
    `PROJECT CONTEXT:`,
    `- Project Title: ${input.projectTitle || 'Untitled Project'}`,
    kindLabel ? `- Deliverable Type: ${kindLabel}` : '',
    input.unitLabel ? `- Specific Unit: ${input.unitLabel}` : '',
    input.genre ? `- Genre: ${input.genre}` : '',
    input.synopsis ? `- Synopsis / Logline: ${input.synopsis}` : '',
    headingsSnippet ? `- Featured Scenes: ${headingsSnippet}` : '',
    ``,
    `RULES:`,
    `1. Title MUST be <= 92 characters, natural in ${languageLabel}, compelling, and MUST NOT contain '<' or '>' characters.`,
    `2. Description MUST be 2 to 4 concise paragraphs in ${languageLabel} (hook sentence first for search preview, brief story summary, and subtle engagement prompt). Do NOT include '<' or '>' characters, and do NOT append a SceneFlow footer (it is added automatically).`,
    `3. Tags MUST be an array of 8 to 12 relevant discovery keywords in ${languageLabel} (without '#' prefixes or '<'/'>' characters).`,
    extraTargets.length > 0
      ? `4. Also localize the metadata natively into these additional languages: ${extraTargets
          .map((code) => `${getLanguageName(code)} (${code})`)
          .join(', ')}.`
      : '',
    ``,
    `Return ONLY valid JSON matching this exact structure:`,
    extraTargets.length > 0
      ? `{"title":"...","description":"...","tags":["..."],"translations":{"es":{"title":"...","description":"...","tags":["..."]}}}`
      : `{"title":"...","description":"...","tags":["..."]}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const llmResult = await generateText(prompt, {
      temperature: 0.6,
      maxOutputTokens: 4096,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
    })
    const parsed = extractJsonObject(llmResult.text)
    if (!parsed || typeof parsed.title !== 'string') {
      throw new Error('Structured metadata JSON missing title')
    }

    const primary = normalizeParsedMetadata(
      parsed,
      locale,
      fallback.title,
      includeCta
    )

    const translations: Record<string, LocalizedYouTubeMetadata> = {
      [locale]: primary,
    }

    const rawTranslations =
      parsed.translations && typeof parsed.translations === 'object'
        ? (parsed.translations as Record<string, unknown>)
        : {}

    const missingTargets: string[] = []
    for (const target of extraTargets) {
      const entry = rawTranslations[target]
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        translations[target] = normalizeParsedMetadata(
          entry as Record<string, unknown>,
          target,
          primary.title,
          includeCta
        )
      } else {
        missingTargets.push(target)
      }
    }

    if (missingTargets.length > 0) {
      const backfilled = await translateYouTubeMetadata({
        sourceLanguage: locale,
        sourceTitle: primary.title,
        sourceDescription: primary.description,
        sourceTags: primary.tags,
        targetLanguages: missingTargets,
        includeSceneFlowCta: includeCta,
      })
      Object.assign(translations, backfilled.translations)
    }

    return { primary, translations, usedAi: true }
  } catch (err) {
    console.warn('[YouTube Metadata] Falling back from Gemini generation:', err)
    const translations: Record<string, LocalizedYouTubeMetadata> = {
      [locale]: fallback,
    }
    if (extraTargets.length > 0) {
      const translated = await translateYouTubeMetadata({
        sourceLanguage: locale,
        sourceTitle: fallback.title,
        sourceDescription: fallback.description,
        sourceTags: fallback.tags,
        targetLanguages: extraTargets,
        includeSceneFlowCta: includeCta,
      })
      Object.assign(translations, translated.translations)
    }
    return { primary: fallback, translations, usedAi: false }
  }
}

export async function translateYouTubeMetadata(
  input: TranslateYouTubeMetadataInput
): Promise<{
  translations: Record<string, LocalizedYouTubeMetadata>
  usedAi: boolean
}> {
  const sourceLang = (input.sourceLanguage || 'en').trim() || 'en'
  const includeCta = input.includeSceneFlowCta !== false
  const cleanSourceTitle = sanitizeYouTubeTitle(input.sourceTitle)
  const cleanSourceBody = stripKnownSceneFlowCta(input.sourceDescription || '')
  const cleanSourceTags = sanitizeYouTubeTags(input.sourceTags) || ['SceneFlow']

  const uniqueTargets = Array.from(
    new Set((input.targetLanguages || []).map((l) => l.trim()).filter(Boolean))
  )

  const translations: Record<string, LocalizedYouTubeMetadata> = {
    [sourceLang]: {
      language: sourceLang,
      title: cleanSourceTitle,
      description: sanitizeYouTubeDescription(
        appendSceneFlowCta(cleanSourceBody, sourceLang, includeCta)
      ),
      tags: cleanSourceTags,
    },
  }

  const targetsToTranslate = uniqueTargets.filter((lang) => lang !== sourceLang)
  if (targetsToTranslate.length === 0) {
    return { translations, usedAi: false }
  }

  const prompt = [
    `Translate and culturally adapt the following YouTube video publishing metadata from ${getLanguageName(sourceLang)} (${sourceLang}) into: ${targetsToTranslate
      .map((code) => `${getLanguageName(code)} (${code})`)
      .join(', ')}.`,
    ``,
    `SOURCE METADATA:`,
    `- Title: ${JSON.stringify(cleanSourceTitle)}`,
    `- Description: ${JSON.stringify(cleanSourceBody)}`,
    `- Tags: ${JSON.stringify(cleanSourceTags)}`,
    ``,
    `RULES:`,
    `1. Preserve character names, proper nouns, and brand names ('SceneFlow').`,
    `2. Each translated title MUST be <= 95 characters and MUST NOT contain '<' or '>'.`,
    `3. Each translated description MUST preserve paragraph breaks and MUST NOT contain '<' or '>'.`,
    `4. Localize tags into natural search keywords for viewers in each target language.`,
    `5. Return ONLY valid JSON in the shape: {"translations":{"<langCode>":{"title":"...","description":"...","tags":["..."]}}}`,
  ].join('\n')

  try {
    const llmResult = await generateText(prompt, {
      temperature: 0.3,
      maxOutputTokens: 6144,
      thinkingLevel: 'low',
      responseMimeType: 'application/json',
    })
    const parsed = extractJsonObject(llmResult.text)
    const rawMap =
      parsed?.translations && typeof parsed.translations === 'object'
        ? (parsed.translations as Record<string, unknown>)
        : parsed || {}

    let anySucceeded = false
    for (const lang of targetsToTranslate) {
      const item = rawMap[lang]
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        translations[lang] = normalizeParsedMetadata(
          item as Record<string, unknown>,
          lang,
          cleanSourceTitle,
          includeCta
        )
        anySucceeded = true
      }
    }

    const stillMissing = targetsToTranslate.filter((lang) => !translations[lang])
    if (stillMissing.length > 0) {
      await Promise.all(
        stillMissing.map(async (lang) => {
          translations[lang] = await fallbackTranslateSingleLanguage({
            sourceLang,
            targetLang: lang,
            title: cleanSourceTitle,
            body: cleanSourceBody,
            tags: cleanSourceTags,
            includeCta,
          })
        })
      )
    }

    return { translations, usedAi: anySucceeded }
  } catch (err) {
    console.warn('[YouTube Metadata Translate] Gemini batch failed, trying Vertex NMT:', err)
    await Promise.all(
      targetsToTranslate.map(async (lang) => {
        translations[lang] = await fallbackTranslateSingleLanguage({
          sourceLang,
          targetLang: lang,
          title: cleanSourceTitle,
          body: cleanSourceBody,
          tags: cleanSourceTags,
          includeCta,
        })
      })
    )
    return { translations, usedAi: false }
  }
}

async function fallbackTranslateSingleLanguage(args: {
  sourceLang: string
  targetLang: string
  title: string
  body: string
  tags: string[]
  includeCta: boolean
}): Promise<LocalizedYouTubeMetadata> {
  const { sourceLang, targetLang, title, body, tags, includeCta } = args
  try {
    const [tTitle, tBody] = await Promise.all([
      translateWithVertexAI({
        text: title,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      }),
      body
        ? translateWithVertexAI({
            text: body,
            sourceLanguage: sourceLang,
            targetLanguage: targetLang,
          })
        : Promise.resolve({ translatedText: '' }),
    ])

    const finalDesc = appendSceneFlowCta(tBody.translatedText, targetLang, includeCta)
    return {
      language: targetLang,
      title: sanitizeYouTubeTitle(tTitle.translatedText, title),
      description: sanitizeYouTubeDescription(finalDesc),
      tags: sanitizeYouTubeTags([...tags, targetLang]) || ['SceneFlow', targetLang],
    }
  } catch {
    const finalDesc = appendSceneFlowCta(body, targetLang, includeCta)
    return {
      language: targetLang,
      title: sanitizeYouTubeTitle(title),
      description: sanitizeYouTubeDescription(finalDesc),
      tags: sanitizeYouTubeTags([...tags, targetLang]) || ['SceneFlow', targetLang],
    }
  }
}
