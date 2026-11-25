import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { getLocaleDirection, getLocaleEnglishName } from '@/i18n/locale'
import { normalizeSpeechRecognitionLang } from '@/hooks/useSpeechRecognition'
import {
  CLIENT_PORTAL_COPY,
  SUPPORTED_CLIENT_PORTAL_LOCALES,
  formatPortalCopy,
  getPortalLocaleLabel,
  getSpeechLangForPortalLocale,
  resolveClientPortalLocale,
  toBlueprintReviewLanguageCode,
  type ClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import {
  buildClarifyIntakeVisionPrompt,
  buildIntakeBlueprintSynthesisPrompt,
  buildNextIntakeQuestionPrompt,
  buildVisionConfirmedKickoffPrompt,
  getLocalizedVisionFallbackQuestion,
  inferNarrativeModeFromVision,
  isValidIntakeVertical,
  parseRuntimeMinutesFromScope,
  type IntakeVisionProposal,
} from '@/lib/intake/intakePlaybooks'

const ALL_LOCALES: ClientPortalLocale[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh-CN',
  'ar',
  'th',
  'ja',
  'ko',
  'de',
  'fr',
  'it',
  'nl',
  'ru',
]

describe('Multilanguage Intake, Consent Form & Vision-Driven Interview (14 Global Languages)', () => {
  it('supports all 14 base UI languages with accurate speech recognition BCP-47 tags', () => {
    expect(SUPPORTED_CLIENT_PORTAL_LOCALES.map((l) => l.code)).toEqual(ALL_LOCALES)

    const expectedSpeech: Record<ClientPortalLocale, string> = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      hi: 'hi-IN',
      'zh-CN': 'zh-CN',
      ar: 'ar-SA',
      th: 'th-TH',
      ja: 'ja-JP',
      ko: 'ko-KR',
      de: 'de-DE',
      fr: 'fr-FR',
      it: 'it-IT',
      nl: 'nl-NL',
      ru: 'ru-RU',
    }

    for (const loc of ALL_LOCALES) {
      expect(getSpeechLangForPortalLocale(loc)).toBe(expectedSpeech[loc])
      expect(normalizeSpeechRecognitionLang(loc)).toBe(expectedSpeech[loc])
      expect(getPortalLocaleLabel(loc).length).toBeGreaterThan(0)
      expect(getLocaleDirection(loc)).toBe(loc === 'ar' ? 'rtl' : 'ltr')
    }

    expect(toBlueprintReviewLanguageCode('zh-CN')).toBe('zh')
    expect(toBlueprintReviewLanguageCode('ar')).toBe('ar')
    expect(resolveClientPortalLocale('zh')).toBe('zh-CN')
    expect(normalizeSpeechRecognitionLang('zh')).toBe('zh-CN')
  })

  it('provides complete multilanguage Consent Form, dictation, Blueprint review, Continuity, and Screening Room strings across all 7 languages', () => {
    const requiredKeys = [
      'consentTitle',
      'consentSubtitle',
      'yourName',
      'yourEmail',
      'mediaRightsLabel',
      'zeroPrivityLabel',
      'acceptAndBegin',
      'viewStudioTerms',
      'visionGenreLabel',
      'languageLabel',
      'listeningInLanguage',
      'wardrobesHeading',
      'cameraSnapLabel',
      'referencePhotoNeeded',
      'uploadedPhotosCount',
      'slotRevisionPlaceholder',
      'overallContinuityNoteLabel',
      'overallContinuityNotePlaceholder',
      'continuityApprovedBanner',
      'continuityChangesSentBanner',
      'blueprintReviewHeading',
      'blueprintListenOnlyHeading',
      'sectionCoreLabel',
      'sectionStoryLabel',
      'sectionCharactersLabel',
      'sectionBeatsLabel',
      'sectionToneLabel',
      'listenButtonLabel',
      'playNarratedStoryboard',
      'stopStoryboardPlayback',
      'joinToLeaveFeedbackTitle',
      'joinToLeaveFeedbackBody',
      'continueButton',
      'yourReviewTab',
      'teamChatTab',
      'overallRatingLabel',
      'sectionFeedbackHeading',
      'sectionNotesPlaceholder',
      'freeformNotesPlaceholder',
      'chatInputPlaceholder',
      'sendButton',
      'submitReviewButton',
      'feedbackSubmittedTitle',
      'blueprintApprovedNextSteps',
      'photoRequestedBadge',
      'photoOptionalBadge',
      'screeningNotesPlaceholder',
    ] as const

    for (const loc of ALL_LOCALES) {
      for (const key of requiredKeys) {
        const val = CLIENT_PORTAL_COPY[loc][key]
        expect(typeof val).toBe('string')
        expect(val.trim().length).toBeGreaterThan(0)
      }
      const terms = formatPortalCopy(loc, 'viewStudioTerms', { brand: 'Apex Studio' })
      expect(terms).toContain('Apex Studio')
      expect(terms).not.toContain('{brand}')

      const hint = formatPortalCopy(loc, 'listeningInLanguage', {
        lang: getPortalLocaleLabel(loc),
      })
      expect(hint).toContain(getPortalLocaleLabel(loc))
      expect(hint).not.toContain('{lang}')
    }
  })

  it('drives the interview and synthesis from the Confirmed Vision (Cinematic Drama vs Video Memoir) without memoir hardcoding', () => {
    expect(isValidIntakeVertical('custom_production')).toBe(true)
    expect(isValidIntakeVertical('video_memoir')).toBe(true)

    const cinematicDramaVision: IntakeVisionProposal = {
      rawInput: 'A tense 6-minute neo-noir cinematic drama about two estranged sisters.',
      clarifiedVision:
        'A tense 6-minute neo-noir cinematic drama following two estranged sisters reuniting aboard a deep-sea research station to uncover their mentor’s disappearance.',
      inferredGenre: 'Neo-Noir Cinematic Drama',
      intendedImpact: 'Leave audiences breathless with emotional suspense and moral catharsis.',
      targetAudience: 'Festival and streaming drama viewers',
      toneAndStyle: 'Anamorphic low-key lighting, rain-slick moody tension',
      deliverableScope: '~6 min short film',
      assistantMessage: 'Confirmed.',
      readyToConfirm: true,
      revisionCount: 1,
      maxRevisions: 3,
      confirmed: true,
      turns: [],
    }

    // Even if the studio link defaulted to video_memoir, Confirmed Vision overrides to fictional_narrative!
    expect(inferNarrativeModeFromVision(cinematicDramaVision, 'video_memoir')).toBe(
      'fictional_narrative'
    )
    expect(parseRuntimeMinutesFromScope(cinematicDramaVision.deliverableScope, 15)).toBe(6)

    const dramaKickoff = buildVisionConfirmedKickoffPrompt({
      vertical: 'video_memoir',
      locale: 'en',
      brandName: 'Global Studio',
      confirmedVision: cinematicDramaVision,
    })
    expect(dramaKickoff).toContain('SCRIPTED / FICTIONAL CINEMATIC PRODUCTION')
    expect(dramaKickoff).toContain('Neo-Noir Cinematic Drama')
    expect(dramaKickoff).not.toContain('family biographer')

    const dramaTurnPrompt = buildNextIntakeQuestionPrompt({
      vertical: 'video_memoir',
      locale: 'es',
      brandName: 'Global Studio',
      turns: [{ role: 'customer', content: 'Elena and Mara are the sisters.', createdAt: '2026-01-01T00:00:00Z' }],
      customerTurnNumber: 1,
      maxCustomerTurns: 10,
      confirmedVision: cinematicDramaVision,
    })
    expect(dramaTurnPrompt).toContain('Output Language: Spanish (es)')
    expect(dramaTurnPrompt).toContain('Neo-Noir Cinematic Drama')
    expect(dramaTurnPrompt).toContain('"deliveryFormatHint": "ai_reenactment"')
    expect(dramaTurnPrompt).not.toContain('family biographer')
    expect(dramaTurnPrompt).not.toContain('heirlooms')

    const dramaSynthPrompt = buildIntakeBlueprintSynthesisPrompt({
      vertical: 'video_memoir',
      locale: 'ar',
      customerName: 'Nadia',
      turns: [{ role: 'customer', content: 'Elena confronts Mara in the airlock.', createdAt: '2026-01-01T00:00:00Z' }],
      confirmedVision: cinematicDramaVision,
    })
    expect(dramaSynthPrompt).toContain('Target Output Language: Arabic (ar)')
    expect(dramaSynthPrompt).toContain('Neo-Noir Cinematic Drama (fictional_narrative)')
    expect(dramaSynthPrompt).toContain('Target Runtime: ~6 minutes')
    expect(dramaSynthPrompt).toContain('"needsClientPhoto": false')
    expect(dramaSynthPrompt).toContain('"deliveryFormat": "ai_reenactment"')

    // Conversely, a Biographical Video Memoir vision activates biographical_memoir discovery & photo collection
    const memoirVision: IntakeVisionProposal = {
      rawInput: 'A 15-minute celebration of life family memoir for Grandfather Arthur.',
      clarifiedVision:
        'A warm 15-minute biographical family memoir celebrating Grandfather Arthur’s 80th birthday.',
      inferredGenre: 'Biographical Video Memoir',
      intendedImpact: 'Move three generations of family to tears of gratitude.',
      targetAudience: 'Extended family reunion',
      toneAndStyle: 'Warm documentary realism',
      deliverableScope: '~15 minutes',
      assistantMessage: 'Confirmed.',
      readyToConfirm: true,
      revisionCount: 1,
      maxRevisions: 3,
      confirmed: true,
      turns: [],
    }
    expect(inferNarrativeModeFromVision(memoirVision, 'custom_production')).toBe(
      'biographical_memoir'
    )
    const memoirSynthPrompt = buildIntakeBlueprintSynthesisPrompt({
      vertical: 'custom_production',
      locale: 'th',
      customerName: 'Somchai',
      turns: [{ role: 'customer', content: 'Arthur grew up in Chiang Mai.', createdAt: '2026-01-01T00:00:00Z' }],
      confirmedVision: memoirVision,
    })
    expect(memoirSynthPrompt).toContain('Target Output Language: Thai (th)')
    expect(memoirSynthPrompt).toContain('Biographical Video Memoir (biographical_memoir)')
    expect(memoirSynthPrompt).toContain('"needsClientPhoto": true')

    // Localized fallback questions work across all 7 languages and narrative modes
    for (const loc of ALL_LOCALES) {
      expect(getLocalizedVisionFallbackQuestion(loc, 0, 'fictional_narrative').length).toBeGreaterThan(15)
      expect(getLocalizedVisionFallbackQuestion(loc, 0, 'biographical_memoir').length).toBeGreaterThan(15)
      expect(getLocalizedVisionFallbackQuestion(loc, 0, 'commercial_brand').length).toBeGreaterThan(15)

      const clarifyPrompt = buildClarifyIntakeVisionPrompt({
        vertical: 'custom_production',
        locale: loc,
        brandName: 'Global Studio',
        visionTurns: [{ role: 'customer', content: 'Test', createdAt: '2026-01-01T00:00:00Z' }],
        revisionNumber: 1,
        maxRevisions: 3,
      })
      expect(clarifyPrompt).toContain(`Output Language: ${getLocaleEnglishName(loc)} (${loc})`)
      expect(clarifyPrompt).toContain('NEVER FORCE A VIDEO MEMOIR')
    }
  })

  it('wires multilanguage Consent Forms, RTL direction, and voice dictation across Intake and all Customer Shared Links', () => {
    const readSrc = (relPath: string) =>
      fs.readFileSync(path.join(process.cwd(), relPath), 'utf8')

    const dictationSrc = readSrc('src/components/ui/DictationTextarea.tsx')
    expect(dictationSrc).toContain('useSpeechRecognition({ lang })')
    expect(dictationSrc).toContain("isRtl ? 'left-2' : 'right-2'")
    expect(dictationSrc).toContain("isRtl ? 'pl-10' : 'pr-10'")

    const intakeSrc = readSrc('src/components/intake/ClientIntakeExperience.tsx')
    expect(intakeSrc).toContain('getSpeechLangForPortalLocale(localeRef.current)')
    expect(intakeSrc).toContain("toggleDictation('consent_name')")
    expect(intakeSrc).toContain("'viewStudioTerms'")
    expect(intakeSrc).toContain('dir={getLocaleDirection(locale)}')
    expect(intakeSrc).toContain('listeningInLanguage')

    const intakeConsentRoute = readSrc('src/app/api/intake/[token]/consent/route.ts')
    expect(intakeConsentRoute).toContain('resolveClientPortalLocale(body.locale)')

    const bpShareSrc = readSrc('src/components/blueprint/BlueprintShareViewer.tsx')
    expect(bpShareSrc).toContain('dir={getLocaleDirection(portalLocale)}')
    expect(bpShareSrc).toContain('<DictationTextarea')
    expect(bpShareSrc).toContain('getSpeechLangForPortalLocale(portalLocale)')

    const bpLangSrc = readSrc('src/components/blueprint/BlueprintShareLanguageControls.tsx')
    expect(bpLangSrc).toContain('SUPPORTED_CLIENT_PORTAL_LOCALES')

    const bpSectionSrc = readSrc('src/components/blueprint/BlueprintReviewSection.tsx')
    expect(bpSectionSrc).toContain('<DictationTextarea')
    expect(bpSectionSrc).toContain('getSpeechLangForPortalLocale(locale)')

    const bpChatSrc = readSrc('src/components/blueprint/BlueprintCollabChat.tsx')
    expect(bpChatSrc).toContain('useSpeechRecognition({ lang: speechLang })')
    expect(bpChatSrc).toContain('getLocaleDirection(portalLocale)')

    const continuitySrc = readSrc('src/components/continuity/ContinuityClientPortal.tsx')
    expect(continuitySrc).toContain('<DictationTextarea')
    expect(continuitySrc).toContain('startNameDictation')
    expect(continuitySrc).toContain("'viewStudioTerms'")
    expect(continuitySrc).toContain('getSpeechLangForPortalLocale(locale)')
    expect(continuitySrc).toContain('dir={getLocaleDirection(locale)}')

    const screeningSrc = readSrc('src/app/share/screening-room/[shareToken]/page.tsx')
    expect(screeningSrc).toContain('SUPPORTED_CLIENT_PORTAL_LOCALES')
    expect(screeningSrc).toContain('<DictationTextarea')
    expect(screeningSrc).toContain('getSpeechLangForPortalLocale(portalLocale)')
  })
})
