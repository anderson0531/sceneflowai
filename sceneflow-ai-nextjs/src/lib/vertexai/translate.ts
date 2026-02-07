/**
 * Vertex AI Translation using Google Cloud Translation API v3
 * 
 * Uses service account authentication (same as Imagen/Gemini) to avoid
 * API key rate limits that affect the v2 REST endpoint.
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
 * Translate text using Google Cloud Translation API v3 via Vertex AI auth
 * 
 * @param options - Translation options (text, targetLanguage, sourceLanguage)
 * @returns Translated text and detected source language
 */
export async function translateWithVertexAI(options: TranslateOptions): Promise<TranslateResult> {
  const { text, targetLanguage, sourceLanguage = 'en' } = options
  
  const projectId = process.env.GCP_PROJECT_ID || process.env.VERTEX_PROJECT_ID
  
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
  
  const accessToken = await getVertexAIAuthToken()
  
  // Use Translation API v3 endpoint with service account auth
  // Format: https://translation.googleapis.com/v3/projects/{project-id}:translateText
  const endpoint = `https://translation.googleapis.com/v3/projects/${projectId}:translateText`
  
  const requestBody = {
    contents: [text],
    targetLanguageCode: targetLanguage,
    sourceLanguageCode: sourceLanguage,
    mimeType: 'text/plain'
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
      console.error('[Vertex Translate] API error:', response.status, errorText)
      throw new Error(`Translation API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    if (!data.translations || data.translations.length === 0) {
      throw new Error('No translation returned from API')
    }
    
    const translation = data.translations[0]
    console.log(`[Vertex Translate] Success - translated ${text.length} chars to ${targetLanguage}`)
    
    return {
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedLanguageCode
    }
  } catch (error: any) {
    console.error('[Vertex Translate] Error:', error.message)
    throw error
  }
}

/**
 * Batch translate multiple texts
 * More efficient than individual calls for multiple texts
 */
export async function batchTranslateWithVertexAI(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<TranslateResult[]> {
  const projectId = process.env.GCP_PROJECT_ID || process.env.VERTEX_PROJECT_ID
  
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID or VERTEX_PROJECT_ID not configured')
  }
  
  // Skip translation if target is English or same as source
  if (targetLanguage === 'en' || targetLanguage === sourceLanguage) {
    console.log('[Vertex Translate] Skipping batch translation - target is same as source')
    return texts.map(text => ({ translatedText: text }))
  }
  
  console.log(`[Vertex Translate] Batch translating ${texts.length} texts to ${targetLanguage}`)
  
  const accessToken = await getVertexAIAuthToken()
  
  const endpoint = `https://translation.googleapis.com/v3/projects/${projectId}:translateText`
  
  const requestBody = {
    contents: texts,
    targetLanguageCode: targetLanguage,
    sourceLanguageCode: sourceLanguage,
    mimeType: 'text/plain'
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
      console.error('[Vertex Translate] Batch API error:', response.status, errorText)
      throw new Error(`Translation API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    if (!data.translations) {
      throw new Error('No translations returned from API')
    }
    
    console.log(`[Vertex Translate] Batch success - translated ${texts.length} texts`)
    
    return data.translations.map((t: any) => ({
      translatedText: t.translatedText,
      detectedSourceLanguage: t.detectedLanguageCode
    }))
  } catch (error: any) {
    console.error('[Vertex Translate] Batch error:', error.message)
    throw error
  }
}
