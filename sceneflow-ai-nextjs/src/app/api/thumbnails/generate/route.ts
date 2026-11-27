import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import { GoogleAuth } from 'google-auth-library'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { executeMeteredProviderCall } from '@/lib/credits/meteredGateway'
import { GEMINI_IMAGE_MODELS } from '@/lib/config/modelConfig'
import { resolveVertexGeminiImageEndpoint } from '@/lib/vertexai/vertexImageClient'

export const runtime = 'nodejs'
export const maxDuration = 300

export interface ThumbnailGenerationRequest {
  userId?: string
  ideas: Array<{
    id: string
    thumbnail_prompt: string
  }>
}

export interface ThumbnailGenerationResponse {
  success: boolean
  thumbnails?: Record<string, {
    success: boolean
    imageUrl?: string
    error?: string
  }>
  error?: string
}

function placeholderDataUrl(): string {
          const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='675' viewBox='0 0 1200 675' fill='none'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#0f172a'/>
      <stop offset='100%' stop-color='#1e293b'/>
    </linearGradient>
  </defs>
  <rect width='1200' height='675' fill='url(#g)'/>
  <g fill='#64748b'>
    <rect x='80' y='120' width='1040' height='435' rx='16' ry='16' fill-opacity='0.25' stroke='#334155' stroke-width='2'/>
    <text x='600' y='350' font-family='Inter, system-ui, -apple-system' font-size='28' text-anchor='middle' fill='#cbd5e1'>Thumbnail Preview</text>
  </g>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email || null
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const { ideas }: ThumbnailGenerationRequest = await request.json()
    const url = new URL(request.url)
    const byok = url.searchParams.get('byok') === '1'
    const forceOpenAI = url.searchParams.get('forceOpenAI') === '1'
    const forceGoogle = url.searchParams.get('forceGoogle') === '1'
    const debug = url.searchParams.get('debug') === '1'
    const hq = url.searchParams.get('hq') === '1'

    if (!ideas || !Array.isArray(ideas)) {
      return NextResponse.json({ success: false, error: 'Invalid request data' }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    const client = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null

    // Google Vertex configuration (correct Imagen route)
    const pickEnv = (...keys: string[]) => {
      for (const k of keys) {
        const v = process.env[k]
        if (typeof v === 'string' && v.length > 0) return v
      }
      return undefined
    }
    const gProject = pickEnv('GOOGLE_VERTEX_PROJECT', 'GOOGLE_PROJECT_ID', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GOOGLE_PROJECT')
    const gLocation = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1'
    const hasGoogleCreds = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS)

    async function generateWithGoogleVertex(prompt: string): Promise<{ url?: string; err?: { status: number; body: string } }> {
      if (!gProject || !hasGoogleCreds) {
        return { err: { status: 0, body: `config_missing: GOOGLE_VERTEX_PROJECT=${Boolean(gProject)} (accepted: GOOGLE_VERTEX_PROJECT|GOOGLE_PROJECT_ID|GCLOUD_PROJECT|GOOGLE_CLOUD_PROJECT|GOOGLE_PROJECT), GOOGLE_SERVICE_ACCOUNT_KEY=${Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)}, GOOGLE_APPLICATION_CREDENTIALS=${Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)}` } }
      }
      // Acquire access token via service account
      // Parse service account JSON (supports raw JSON or base64-encoded)
      let saJson: any | undefined = undefined
      const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
      if (saRaw) {
        try {
          const text = saRaw.trim().startsWith('{') ? saRaw : Buffer.from(saRaw, 'base64').toString('utf8')
          saJson = JSON.parse(text)
        } catch {}
      }
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        credentials: saJson,
      })
      const googleClient = await auth.getClient()
      const rawToken: any = await (googleClient as any).getAccessToken?.() || await (auth as any).getAccessToken?.()
      const accessToken = typeof rawToken === 'string' ? rawToken : (rawToken?.token || rawToken?.access_token || '')
      if (!accessToken) {
        try { console.error('Vertex auth error: empty access token') } catch {}
        return { err: { status: 0, body: 'auth: empty access token' } }
      }
      // Imagen endpoints were retired 2026-06-30; use Gemini Image generateContent
      const { endpoint } = resolveVertexGeminiImageEndpoint({
        model: GEMINI_IMAGE_MODELS.flash,
        projectId: gProject,
        regionalLocation: gLocation,
      })
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '16:9' },
        },
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        try {
          const t = await res.text()
          console.error('Vertex image error:', res.status, t)
          return { err: { status: res.status, body: t } }
        } catch {
          return { err: { status: res.status, body: 'unknown' } }
        }
      }
      const json = await res.json().catch(() => ({}))
      const parts = json?.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        const inline = part?.inlineData || part?.inline_data
        if (inline?.data) {
          const mimeType = inline.mimeType || inline.mime_type || 'image/png'
          return { url: `data:${mimeType};base64,${inline.data}` }
        }
      }
      return { err: { status: 200, body: 'no_bytes' } }
    }

    const thumbnails: Record<string, { success: boolean; imageUrl?: string; error?: string }> = {}

    // If BYOK is requested, do not auto-generate using platform keys.
    if (byok) {
      for (const idea of ideas.slice(0, 5)) {
        thumbnails[idea.id] = { success: true, imageUrl: placeholderDataUrl() }
      }
      return NextResponse.json({ success: true, thumbnails })
    }

    // Lightweight prompt hashing cache (memory per lambda instance)
    // Note: ephemeral per instance; adequate to cut duplicate cost in bursts
    const cache: Map<string, string> = (globalThis as any).__thumbCache || new Map()
    ;(globalThis as any).__thumbCache = cache

    // Pricing for image generation (OpenAI only for non-BYOK)
    const model = 'gpt-image-1'
    const primarySize = hq ? '1536x1024' : '1024x1024'
    const variant = hq ? 'hd_1536x1024' : 'standard_1024x1024'
    let priceUsd = hq ? 0.08 : 0.04
    try {
      const price = await CreditService.getPricing('openai', 'images', model, variant)
      priceUsd = Number(price.price_usd)
    } catch {
      // Fallback to baseline OpenAI image pricing if AIPricing seed is absent
    }
    const estCredits = Math.max(IMAGE_CREDITS.IMAGEN_4, CreditService.usdToCredits(priceUsd))

    // Strip any caller-provided size/aspect directives to avoid provider overrides
    const sanitizePrompt = (p: string): string => {
      if (!p) return ''
      let s = p
      s = s.replace(/\b(16\s*[:x]\s*9|9\s*[:x]\s*16)\b/gi, '')
      s = s.replace(/\b(1024|1536|1792)\s*x\s*(1024|1536|1792)\b/gi, '')
      s = s.replace(/aspect\s*ratio\s*:?\s*[^\n]+/gi, '')
      s = s.replace(/resolution\s*:?\s*[^\n]+/gi, '')
      return s.trim()
    }

    // simple per-user in-flight guard (process only first 5 ideas)
    const slice = ideas.slice(0, 5)
    for (const idea of slice) {
      const userPrompt = idea.thumbnail_prompt || ''
      const cleaned = sanitizePrompt(userPrompt)
      const cacheKey = `v1|${cleaned}`
      const cached = cache.get(cacheKey)
      const youtubePrompt = `Generate a YouTube-style thumbnail image (no text) for the concept below.

Requirements:
- Bold, clear focal subject with strong silhouette and rule-of-thirds placement
- High contrast lighting, cinematic color separation, subtle bloom, soft background bokeh
- Cinematic, professional grade image; no logos, no watermarks, no borders, no text
- Maintain negative space on the right third for potential title overlay (do not render text)
- Sharp subject edges, minimal motion blur, detailed textures

Concept: ${cleaned}`

      try {
        // If cached, atomically reserve & capture (no external provider call)
        if (cached) {
          const hold = await CreditService.reserveCredits({
            userId,
            amount: estCredits,
            reason: 'ai_usage',
            provider: 'openai',
            operation: 'thumbnail_cached',
            meta: { provider: 'openai', model, category: 'images', variant, cached: true },
          })
          await CreditService.captureHold({
            holdId: hold.holdId,
            finalAmount: estCredits,
            reason: 'ai_usage',
            meta: { provider: 'openai', model, category: 'images', variant, cached: true },
          })
          thumbnails[idea.id] = { success: true, imageUrl: cached }
          continue
        }

        if (!client || !openaiKey) {
          thumbnails[idea.id] = { success: false, error: 'OpenAI not configured' }
          continue
        }

        // Reserve credits before OpenAI call, record provider_api_runs, capture on success, release on error
        const metered = await executeMeteredProviderCall({
          userId,
          route: '/api/thumbnails/generate',
          provider: 'openai',
          model,
          operation: 'thumbnail_generate',
          flatCredits: estCredits,
          estimatedCogsUsd: priceUsd,
          meta: { category: 'images', variant, ideaId: idea.id },
          execute: async () => {
            const resp = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
              },
              body: JSON.stringify({
                model,
                prompt: youtubePrompt,
                size: primarySize,
                quality: 'high',
                n: 1
              })
            })
            if (!resp.ok) {
              let body = ''
              try { body = await resp.text() } catch {}
              throw new Error(`OpenAI error: ${body || resp.status}`)
            }
            const json = await resp.json().catch(() => ({} as any))
            const b64 = json?.data?.[0]?.b64_json
            if (!b64) {
              throw new Error('No image returned from OpenAI')
            }
            return {
              dataUrl: `data:image/png;base64,${b64}`,
              requestId: json?.created?.toString?.() || undefined,
            }
          },
          resolveSettlement: (res) => ({
            finalCredits: estCredits,
            estimatedCogsUsd: priceUsd,
            providerRequestId: res.requestId,
          }),
        })

        thumbnails[idea.id] = { success: true, imageUrl: metered.result.dataUrl }
        cache.set(cacheKey, metered.result.dataUrl)
        await new Promise(r => setTimeout(r, 80))
      } catch (err: any) {
        const msg = err?.message || 'Generation failed'
        thumbnails[idea.id] = { success: false, error: msg }
      }
    }

    const entries = Object.values(thumbnails)
    if (entries.length > 0 && entries.every((e) => !e.success && e.error === 'INSUFFICIENT_CREDITS')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS', thumbnails },
        { status: 402 }
      )
    }

    return NextResponse.json({ success: true, thumbnails })
  } catch (error) {
    console.error('Thumbnail generation error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
