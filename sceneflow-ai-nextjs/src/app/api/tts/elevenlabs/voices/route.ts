import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    // TODO: BYOK - Accept API key from request header when BYOK is implemented
    // const userApiKey = _req.headers.get('x-elevenlabs-api-key')
    const apiKey = process.env.ELEVENLABS_API_KEY // Use platform key for now
    
    if (!apiKey) {
      return new Response(JSON.stringify({ enabled: false, voices: [] }), { status: 200 })
    }

    const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store'
    })
    
    if (!resp.ok) {
      const err = await resp.text().catch(() => 'error')
      return new Response(JSON.stringify({ enabled: false, error: err }), { status: 200 })
    }
    
    const json = await resp.json().catch(() => ({ voices: [] }))
    const list: any[] = Array.isArray(json?.voices) ? json.voices : []

    // Return ALL voices (not just filtered/curated subset)
    const allVoices = list.map((v: any) => ({
      id: v.voice_id || v.voiceID || v.id,
      name: v.name || 'Unknown',
      previewUrl: v.preview_url || v?.samples?.[0]?.preview_url,
      category: v?.category || '',
      labels: v.labels || {},
      description: v?.description || '',
      // Include metadata for frontend filtering
      language: v?.labels?.language || '',
      accent: v?.labels?.accent || '',
      gender: v?.labels?.gender || '',
      age: v?.labels?.age || '',
      useCase: v?.labels?.use_case || ''
    }))
    .sort((a, b) => a.name.localeCompare(b.name)) // Alphabetical order

    return new Response(JSON.stringify({ 
      enabled: true, 
      voices: allVoices,
      count: allVoices.length 
    }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ enabled: false, error: e?.message || 'unknown' }), { status: 200 })
  }
}
