/**
 * ElevenLabs voice mapping for different languages
 * ElevenLabs voices support multiple languages, but some are optimized for specific languages
 */

export interface LanguageVoiceMapping {
  languageCode: string
  voiceId: string
  voiceName: string
  isMultilingual: boolean
}

/**
 * Default voice mappings for common languages
 * These are well-known ElevenLabs voices that work well for each language
 */
export const ELEVENLABS_LANGUAGE_VOICES: Record<string, LanguageVoiceMapping> = {
  'en': {
    languageCode: 'en',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - English (female)
    voiceName: 'Rachel',
    isMultilingual: false
  },
  'es': {
    languageCode: 'es',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Spanish)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'fr': {
    languageCode: 'fr',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for French)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'de': {
    languageCode: 'de',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for German)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'it': {
    languageCode: 'it',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Italian)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'pt': {
    languageCode: 'pt',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Portuguese)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'pl': {
    languageCode: 'pl',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Polish)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'tr': {
    languageCode: 'tr',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Turkish)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'ru': {
    languageCode: 'ru',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Russian)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'nl': {
    languageCode: 'nl',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Dutch)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'cs': {
    languageCode: 'cs',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Czech)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'ar': {
    languageCode: 'ar',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Arabic)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'zh': {
    languageCode: 'zh',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Chinese)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'ja': {
    languageCode: 'ja',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Japanese)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'hi': {
    languageCode: 'hi',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Hindi)
    voiceName: 'Bella',
    isMultilingual: true
  },
  'ko': {
    languageCode: 'ko',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Multilingual (works well for Korean)
    voiceName: 'Bella',
    isMultilingual: true
  }
}

/**
 * Get ElevenLabs voice ID for a language code
 * Falls back to default multilingual voice if language not found
 */
export function getElevenLabsVoiceForLanguage(languageCode: string, customVoiceId?: string): LanguageVoiceMapping {
  // If custom voice ID provided, use it
  if (customVoiceId) {
    return {
      languageCode,
      voiceId: customVoiceId,
      voiceName: 'Custom',
      isMultilingual: true
    }
  }
  
  // Return mapped voice or default multilingual voice
  return ELEVENLABS_LANGUAGE_VOICES[languageCode] || {
    languageCode,
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - Default multilingual voice
    voiceName: 'Bella',
    isMultilingual: true
  }
}

