/**
 * Vertex AI Adaptive Translation using Translation LLM
 * 
 * Uses the Vertex AI Translation LLM (TLLM) for high-quality, context-aware
 * translations. This is the preferred translation method over standard NMT.
 * 
 * Key differences from standard Cloud Translation:
 * - Endpoint: translate.googleapis.com/v3/projects/{id}/locations/{location}:translateText
 * - Model: projects/{id}/locations/{location}/models/general/translation-llm
 * - Location: us-central1 (required, NOT global)
 * - Quality: LLM-powered, better for creative/contextual content
 * 
 * Uses service account authentication (same as Imagen/Gemini).
 */

import { getVertexAIAuthToken } from './client'

export interface TranslateOptions {
  text: string
  targetLanguage: string
  sourceLanguage?: string
}

export interface TranslateResult {
  translatedText: string
  detectedSourceLanguage?: string
}

/**
 * Translate text using Vertex AI Adaptive Translation (Translation LLM)
 * 
 * @param options - Translation options (text, targetLanguage, sourceLanguage)
 * @returns Translated text and detected source language
 */
export async function translateWithVertexAI(options: TranslateOptions): Promise<TranslateResult> {
  const { text, targetLanguage, sourceLanguage = 'en' } = options
  
  const projectId = (process.env.GCP_PROJECT_ID || process.env.VERTEX_PROJECT_ID || '').trim() || undefined
  const location = (process.env.VERTEX_LOCATION || 'us-central1').trim()
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID or VERTEX_PROJECT_ID not configured')
  }
  
  // Skip translation if target is English or same as source
  if (targetLanguage === 'en' || targetLanguage === sourceLanguage) {
    console.log('[Vertex Translate] Skipping translation - target is same as source')
    return { translatedText: text }
  }
  
  console.log(`[Vertex Translate] Translating from ${sourceLanguage} to ${targetLanguage}`)
  console.log(`[Vertex Translate] Text length: ${text.length} characters`)
  console.log(`[Vertex Translate] Using Adaptive Translation LLM (location: ${location})`)
  
  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI Adaptive Translation endpoint (Translation LLM)
  // Format: https://translate.googleapis.com/v3/projects/{project}/locations/{location}:translateText
  // IMPORTANT: Must use locations/{location} (NOT global) for Translation LLM
  const endpoint = `https://translate.googleapis.com/v3/projects/${projectId}/locations/${location}:translateText`
  
  // Translation LLM model path
  // This selects the Adaptive Translation LLM instead of standard NMT
  const modelPath = `projects/${projectId}/locations/${location}/models/general/translation-llm`
  
  const requestBody = {
    contents: [text],
    targetLanguageCode: targetLanguage,
    sourceLanguageCode: sourceLanguage,
    mimeType: 'text/plain',
    model: modelPath
  }
  
  console.log(`[Vertex Translate] Endpoint: ${endpoint}`)
  console.log(`[Vertex Translate] Model: ${modelPath}`)
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Vertex Translate] ❌ API error:', response.status, errorText)
      console.error('[Vertex Translate] ❌ Endpoint was:', endpoint)
      console.error('[Vertex Translate] ❌ Model was:', modelPath)
      
      // If Translation LLM fails (e.g., 404), fall back to standard NMT (no model param, global location)
      console.warn('[Vertex Translate] ⚠️ Falling back to standard NMT translation...')
      return await translateWithStandardNMT(text, targetLanguage, sourceLanguage, projectId, accessToken)
    }
    
    const data = await response.json()
    
    if (!data.translations || data.translations.length === 0) {
      throw new Error('No translation returned from API')
    }
    
    const translation = data.translations[0]
    console.log(`[Vertex Translate] ✅ Success (Translation LLM) - translated ${text.length} chars to ${targetLanguage}`)
    console.log(`[Vertex Translate] Preview: "${translation.translatedText.substring(0, 80)}..."`)
    
    return {
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedLanguageCode
    }
  } catch (error: any) {
    console.error('[Vertex Translate] ❌ Error:', error.message)
    
    // Try standard NMT as fallback if we haven't already
    if (!error.message?.includes('NMT fallback')) {
      console.warn('[Vertex Translate] ⚠️ Attempting standard NMT fallback...')
      try {
        return await translateWithStandardNMT(text, targetLanguage, sourceLanguage, projectId, accessToken)
      } catch (fallbackError: any) {
        console.error('[Vertex Translate] ❌ NMT fallback also failed:', fallbackError.message)
        throw new Error(`Translation failed (both LLM and NMT): ${error.message}`)
      }
    }
    throw error
  }
}

/**
 * Standard NMT translation fallback
 * Uses the basic Cloud Translation v3 endpoint without Translation LLM model
 * This serves as a fallback if the Translation LLM is unavailable
 */
async function translateWithStandardNMT(
  text: string,
  targetLanguage: string,
  sourceLanguage: string,
  projectId: string,
  accessToken: string
): Promise<TranslateResult> {
  const location = (process.env.VERTEX_LOCATION || 'us-central1').trim()
  
  // Standard v3 endpoint with location (not global, to use same auth scope)
  const endpoint = `https://translate.googleapis.com/v3/projects/${projectId}/locations/${location}:translateText`
  
  const requestBody = {
    contents: [text],
    targetLanguageCode: targetLanguage,
    sourceLanguageCode: sourceLanguage,
    mimeType: 'text/plain'
    // No model param = uses default NMT
  }
  
  console.log(`[Vertex Translate] NMT fallback endpoint: ${endpoint}`)
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex Translate] ❌ NMT fallback API error:', response.status, errorText)
    throw new Error(`NMT fallback translation error: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json()
  
  if (!data.translations || data.translations.length === 0) {
    throw new Error('NMT fallback: No translation returned from API')
  }
  
  const translation = data.translations[0]
  console.log(`[Vertex Translate] ✅ Success (NMT fallback) - translated ${text.length} chars to ${targetLanguage}`)
  console.log(`[Vertex Translate] Preview: "${translation.translatedText.substring(0, 80)}..."`)
  
  return {
    translatedText: translation.translatedText,
    detectedSourceLanguage: translation.detectedLanguageCode
  }
}

/**
 * Batch translate multiple texts using Vertex AI Adaptive Translation
 * More efficient than individual calls for multiple texts
 */
export async function batchTranslateWithVertexAI(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<TranslateResult[]> {
  const projectId = (process.env.GCP_PROJECT_ID || process.env.VERTEX_PROJECT_ID || '').trim() || undefined
  const location = (process.env.VERTEX_LOCATION || 'us-central1').trim()
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID or VERTEX_PROJECT_ID not configured')
  }
  
  // Skip translation if target is English or same as source
  if (targetLanguage === 'en' || targetLanguage === sourceLanguage) {
    console.log('[Vertex Translate] Skipping batch translation - target is same as source')
    return texts.map(text => ({ translatedText: text }))
  }
  
  console.log(`[Vertex Translate] Batch translating ${texts.length} texts to ${targetLanguage}`)
  console.log(`[Vertex Translate] Using Adaptive Translation LLM (location: ${location})`)
  
  const accessToken = await getVertexAIAuthToken()
  
  // Vertex AI Adaptive Translation endpoint with location
  const endpoint = `https://translate.googleapis.com/v3/projects/${projectId}/locations/${location}:translateText`
  const modelPath = `projects/${projectId}/locations/${location}/models/general/translation-llm`
  
  const requestBody = {
    contents: texts,
    targetLanguageCode: targetLanguage,
    sourceLanguageCode: sourceLanguage,
    mimeType: 'text/plain',
    model: modelPath
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Vertex Translate] ❌ Batch API error:', response.status, errorText)
      
      // Fallback to standard NMT for batch
      console.warn('[Vertex Translate] ⚠️ Batch falling back to standard NMT...')
      return await batchTranslateWithStandardNMT(texts, targetLanguage, sourceLanguage, projectId, accessToken)
    }
    
    const data = await response.json()
    
    if (!data.translations) {
      throw new Error('No translations returned from API')
    }
    
    console.log(`[Vertex Translate] ✅ Batch success (Translation LLM) - translated ${texts.length} texts`)
    
    return data.translations.map((t: any) => ({
      translatedText: t.translatedText,
      detectedSourceLanguage: t.detectedLanguageCode
    }))
  } catch (error: any) {
    console.error('[Vertex Translate] ❌ Batch error:', error.message)
    
    // Try NMT fallback
    if (!error.message?.includes('NMT fallback')) {
      try {
        return await batchTranslateWithStandardNMT(texts, targetLanguage, sourceLanguage, projectId, accessToken)
      } catch (fallbackError: any) {
        console.error('[Vertex Translate] ❌ Batch NMT fallback also failed:', fallbackError.message)
        throw new Error(`Batch translation failed (both LLM and NMT): ${error.message}`)
      }
    }
    throw error
  }
}

/**
 * Batch standard NMT translation fallback
 */
async function batchTranslateWithStandardNMT(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string,
  projectId: string,
  accessToken: string
): Promise<TranslateResult[]> {
  const location = (process.env.VERTEX_LOCATION || 'us-central1').trim()
  
  const endpoint = `https://translate.googleapis.com/v3/projects/${projectId}/locations/${location}:translateText`
  
  const requestBody = {
    contents: texts,
    targetLanguageCode: targetLanguage,
    sourceLanguageCode: sourceLanguage,
    mimeType: 'text/plain'
    // No model param = uses default NMT
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Vertex Translate] ❌ Batch NMT fallback error:', response.status, errorText)
    throw new Error(`NMT fallback batch error: ${response.status} - ${errorText}`)
  }
  
  const data = await response.json()
  
  if (!data.translations) {
    throw new Error('NMT fallback: No translations returned from API')
  }
  
  console.log(`[Vertex Translate] ✅ Batch success (NMT fallback) - translated ${texts.length} texts`)
  
  return data.translations.map((t: any) => ({
    translatedText: t.translatedText,
    detectedSourceLanguage: t.detectedLanguageCode
  }))
}
