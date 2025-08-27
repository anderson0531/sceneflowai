import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { attributes = {} } = await request.json().catch(() => ({ attributes: {} }))
    const keyMessage = attributes?.keyMessageCTA?.value || 'your key message'
    const targetAudience = attributes?.targetAudience?.value || 'General Audience'
    const platform = attributes?.intendedPlatform?.value || 'YouTube'

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        const system = 'You write high CTR video titles. Return ONLY JSON.'
        const user = `Generate 10 compelling video titles for ${platform}.
Target: ${targetAudience}
Theme: ${keyMessage}
Style: Mix curiosity, specificity, and benefit.
Respond as {"titles": string[]}`
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.8, messages: [ { role: 'system', content: system }, { role: 'user', content: user } ] })
        })
        if (resp.ok) {
          const json = await resp.json()
          const content: string | undefined = json?.choices?.[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            if (Array.isArray(parsed?.titles)) return NextResponse.json({ success: true, titles: parsed.titles.slice(0, 12) })
          }
        }
      } catch (_) {}
    }

    const base = String(keyMessage)
    const variants = [
      `${base}: The Truth No One Told You`,
      `We Tried ${base} — Here’s What Happened`,
      `Stop Doing This With ${base}`,
      `${base} in 60 Seconds`,
      `The Beginner’s Guide to ${base}`,
      `${base} for ${targetAudience}`,
      `Top 5 Mistakes with ${base}`,
      `How to Master ${base}`,
      `${base} vs. Alternatives: What Works?`,
      `Before You Start: ${base}`,
    ]
    return NextResponse.json({ success: true, titles: variants })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to generate titles' }, { status: 500 })
  }
}


