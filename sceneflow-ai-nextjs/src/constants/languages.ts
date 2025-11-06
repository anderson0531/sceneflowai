/**
 * Supported languages for multi-language TTS generation
 * Shared constants used across ScriptPanel and ScriptPlayer
 */

export interface SupportedLanguage {
  code: string
  name: string
  voice: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', voice: 'en-US-Studio-M' },  // Marcus (Studio)
  { code: 'es', name: 'Spanish', voice: 'es-ES-Neural2-B' },  // Male voice
  { code: 'fr', name: 'French', voice: 'fr-FR-Neural2-B' },   // Male voice
  { code: 'de', name: 'German', voice: 'de-DE-Neural2-B' },   // Male voice
  { code: 'it', name: 'Italian', voice: 'it-IT-Neural2-C' },  // Male voice
  { code: 'pt', name: 'Portuguese', voice: 'pt-BR-Neural2-B' }, // Male voice
  { code: 'zh', name: 'Chinese (Mandarin)', voice: 'cmn-CN-Wavenet-B' }, // Male voice
  { code: 'ja', name: 'Japanese', voice: 'ja-JP-Neural2-C' }, // Male voice
  { code: 'ko', name: 'Korean', voice: 'ko-KR-Neural2-C' },   // Male voice
  { code: 'th', name: 'Thai', voice: 'th-TH-Neural2-C' },     // Male voice
  { code: 'hi', name: 'Hindi', voice: 'hi-IN-Neural2-B' },    // Male voice
  { code: 'ar', name: 'Arabic', voice: 'ar-XA-Wavenet-B' },   // Male voice
  { code: 'ru', name: 'Russian', voice: 'ru-RU-Wavenet-B' }   // Male voice
]

