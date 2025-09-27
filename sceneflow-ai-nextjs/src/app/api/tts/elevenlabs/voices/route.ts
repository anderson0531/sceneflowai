import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
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

    // Prefer high-quality English voices; rank with heuristics and return top 10
    const preferredNames = [
      'Rachel','Bella','Antoni','Elli','Adam','Domi','Josh','Arnold','Matthew','Sam',
      'Charlotte','James','George','Callum','Brian','Emily','Joseph','Liam','Daniel','Sarah'
    ]

    const english = list.filter((v: any) => {
      const lang = (v?.labels?.language || v?.language || '').toString().toLowerCase()
      const accent = (v?.labels?.accent || '').toString().toLowerCase()
      const name = (v?.name || '').toString().toLowerCase()
      return lang.startsWith('en') || accent.includes('english') || /english/.test(name)
    })

    const scored = english.map((v: any) => {
      const id = v.voice_id || v.voiceID || v.id
      const name: string = v.name || 'Unknown'
      const previewUrl = v.preview_url || v?.samples?.[0]?.preview_url
      const category = (v?.category || '').toString().toLowerCase()
      const labels = v.labels || {}
      let score = 0
      if (preferredNames.some(p => name.toLowerCase().includes(p.toLowerCase()))) score += 10
      if (previewUrl) score += 2
      if (category === 'premade') score += 2
      if (labels?.quality === 'high') score += 2
      return { id, name, labels, category, previewUrl, score }
    })
    .sort((a: any, b: any) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 30)
    .map(({ id, name, labels, category, previewUrl }) => ({ id, name, labels, category, previewUrl }))

    return new Response(JSON.stringify({ enabled: true, voices: scored }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ enabled: false, error: e?.message || 'unknown' }), { status: 200 })
  }
}
