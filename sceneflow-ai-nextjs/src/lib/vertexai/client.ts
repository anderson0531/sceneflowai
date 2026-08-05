import { GoogleAuth } from 'google-auth-library'
import { type ModelQuality } from '@/lib/config/modelConfig'

let authClient: any = null

function parseGoogleServiceAccountJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    // .env often stores private_key with literal newlines — escape them for JSON.parse
    const fixed = raw.replace(
      /("private_key"\s*:\s*")([\s\S]*?)("\s*,\s*"client_email")/,
      (_match, start: string, keyBody: string, end: string) =>
        `${start}${keyBody.replace(/\r?\n/g, '\\n')}${end}`
    )
    return JSON.parse(fixed) as Record<string, unknown>
  }
}

/**
 * Get OAuth2 access token for Vertex AI API
 * Uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON
 */
export async function getVertexAIAuthToken(): Promise<string> {
  console.log('[Vertex AI Auth] Getting access token...')
  console.log('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON configured:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  console.log('[Vertex AI Auth] VERTEX_PROJECT_ID:', process.env.VERTEX_PROJECT_ID || 'NOT SET')
  console.log('[Vertex AI Auth] VERTEX_LOCATION:', process.env.VERTEX_LOCATION || 'NOT SET')
  
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.error('[Vertex AI Auth] GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured - check Vercel environment variables')
  }

  try {
    if (!authClient) {
      console.log('[Vertex AI Auth] Creating new auth client...')
      const credentials = parseGoogleServiceAccountJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      console.log('[Vertex AI Auth] Parsed credentials for project:', credentials.project_id)
      
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })
      
      authClient = await auth.getClient()
      console.log('[Vertex AI Auth] Auth client created successfully')
    }

    const accessToken = await authClient.getAccessToken()
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token')
    }
    
    console.log('[Vertex AI Auth] Access token obtained successfully')
    return accessToken.token
  } catch (error: any) {
    console.error('[Vertex AI Auth] Error:', error.message)
    console.error('[Vertex AI Auth] Stack:', error.stack)
    throw new Error(`Vertex AI authentication failed: ${error.message}`)
  }
}

export class ImagenRetiredError extends Error {
  constructor(modelId?: string) {
    super(
      `Vertex AI Imagen endpoints were retired on 2026-06-30${
        modelId ? ` (requested ${modelId})` : ''
      } and now return 404. Use generateVertexImage / generateVertexGeminiImage from @/lib/vertexai/vertexImageClient instead.`
    )
    this.name = 'ImagenRetiredError'
  }
}

/**
 * @deprecated Imagen `:predict` endpoints were retired on 2026-06-30.
 * Call `generateVertexImage` from `@/lib/vertexai/vertexImageClient` instead — it uses
 * Gemini Image (`generateContent`) and supports reference images.
 *
 * This shim throws immediately rather than issuing a request that would 404.
 */
export async function callVertexAIImagen(
  _prompt: string,
  options: {
    aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
    numberOfImages?: number
    negativePrompt?: string
    quality?: 'max' | 'auto'
    modelQuality?: ModelQuality
    modelId?: string
    personGeneration?: 'allow_adult' | 'allow_all' | 'dont_allow'
    referenceImages?: Array<{
      referenceId: number
      base64Image?: string
      imageUrl?: string
      gcsUri?: string
      referenceType?: 'REFERENCE_TYPE_SUBJECT'
      subjectDescription?: string
      subjectType?: 'SUBJECT_TYPE_PERSON' | 'SUBJECT_TYPE_PRODUCT'
    }>
  } = {}
): Promise<string> {
  throw new ImagenRetiredError(options.modelId)
}
