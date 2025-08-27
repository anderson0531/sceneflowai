import { NextRequest, NextResponse } from 'next/server'

interface HooksRequest {
  attributes?: any
}

export async function POST(request: NextRequest) {
  try {
    const body: HooksRequest = await request.json().catch(() => ({}))
    const attributes = body?.attributes || {}

    const targetAudience = attributes?.targetAudience?.value || 'General Audience'
    const keyMessage = attributes?.keyMessageCTA?.value || 'your key message'
    const tone = Array.isArray(attributes?.toneMood?.value) ? attributes.toneMood.value[0] : (attributes?.toneMood?.value || 'Professional')
    const genre = attributes?.genreFormat?.value || 'Explainer'
    const platform = attributes?.intendedPlatform?.value || 'YouTube'

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        const system = 'You are a YouTube content strategist. Return ONLY valid JSON.'
        const user = `Generate 8 short, punchy hooks (max 12 words) tailored for ${platform}. 
Target Audience: ${targetAudience}
Tone: ${tone}
Genre: ${genre}
Key Message: ${keyMessage}
Requirements: Hooks must be specific, concrete, and scroll-stopping. Avoid hashtags and emojis.
Respond with: {"hooks": string[]}`
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.8, messages: [ { role: 'system', content: system }, { role: 'user', content: user } ] })
        })
        if (resp.ok) {
          const json = await resp.json()
          const content: string | undefined = json?.choices?.[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            if (Array.isArray(parsed?.hooks)) {
              return NextResponse.json({ success: true, hooks: parsed.hooks.slice(0, 12) })
            }
          }
        }
      } catch (_) {
        // fall through to fallback
      }
    }

    // Fallback: heuristic hooks
    const base = String(keyMessage)
    const ta = String(targetAudience)
    const tn = String(tone).toLowerCase()
    const ideas = [
      `What ${ta} get wrong about ${base}?`,
      `${base}: The 60‑second guide`,
      `Stop scrolling: ${base} explained fast`,
      `Before/After: ${base} in action`,
      `We tested ${base} so you don't have to`,
      `${base} myths, busted`,
      `The ${tn} way to nail ${base}`,
      `${base} for ${ta}: do this first`,
    ]

    return NextResponse.json({ success: true, hooks: ideas })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to generate hooks' }, { status: 500 })
  }
}


