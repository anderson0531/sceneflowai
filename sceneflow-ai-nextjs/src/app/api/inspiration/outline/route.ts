import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { attributes = {} } = await request.json().catch(() => ({ attributes: {} }))
    const core = attributes?.corePremise?.value || 'A compelling video concept'
    const duration = attributes?.estimatedDuration?.value || '60 seconds'
    const tone = Array.isArray(attributes?.toneMood?.value) ? attributes.toneMood.value[0] : (attributes?.toneMood?.value || 'Professional')

    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        const system = 'You write concise, production-ready video outlines. Return ONLY JSON.'
        const user = `Create 4 alternative, scene-based outlines for a ${duration} ${tone.toLowerCase()} video.
CORE PREMISE: ${core}
REQUIREMENTS:
- Use the premise details directly; avoid boilerplate labels like "Step 1" or generic templates.
- Each outline contains 6–8 scenes with concrete visuals, VO beats, and platform-aware CTA.
- Vary the angle across variants (story arc, how‑to demo, explainer with analogy, mini case study).
Respond strictly as {"variants": Array<{ title: string; outline: string[] }>} with no extra text.`
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.7, messages: [ { role: 'system', content: system }, { role: 'user', content: user } ] })
        })
        if (resp.ok) {
          const json = await resp.json()
          const content: string | undefined = json?.choices?.[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            if (Array.isArray(parsed?.variants) && parsed.variants.length > 0) {
              const variants = parsed.variants.slice(0, 4).map((v: any, idx: number) => ({
                title: v?.title || `Outline Option ${idx + 1}`,
                outline: Array.isArray(v?.outline) ? v.outline.slice(0, 10) : []
              }))
              return NextResponse.json({ success: true, variants })
            }
          }
        }
      } catch (_) {}
    }

    // Fallback: return 4 concrete, premise-aware outlines without using external APIs
    const make = (title: string, parts: string[]) => ({ title, outline: parts })
    const title = attributes?.workingTitle?.value || 'Your Video'
    const premise = attributes?.corePremise?.value || core
    const audience = attributes?.targetAudience?.value || 'your audience'
    const plat = attributes?.intendedPlatform?.value || 'your platform'
    const km = attributes?.keyMessageCTA?.value || 'key takeaway'

    const variants = [
      make(`Story Arc – ${title}`, [
        `Cold‑open hook: on‑screen line promises the payoff of “${km}” to ${audience}`,
        `Context: quick real‑life moment that shows the problem ${premise} tackles`,
        `Discovery: reveal the idea behind “${premise}” with a surprising visual`,
        `Demonstration: show the idea in action with one concrete example`,
        `Contrast: before/after split‑screen illustrating the change ${audience} will feel`,
        `Proof: stat/mini‑testimonial overlay confirming the benefit`,
        `CTA for ${plat}: on‑screen title and VO with the next action`
      ]),
      make(`How‑To – Apply “${title}”`, [
        `Outcome tease: start by flashing the end result viewers will get from ${premise}`,
        `Step 1: set up – tools/context you need to start (tight close‑ups)`,
        `Step 2: the key move – demonstrate the core action that unlocks “${km}”`,
        `Step 3: pro tip – nuance that avoids the most common mistake`,
        `Step 4: quick checklist – overlay the 3 moves you just did`,
        `Result: show the visible improvement tied to ${premise}`,
        `CTA on ${plat}: invite comment or next action connected to the tutorial`
      ]),
      make(`Explainer – Why “${title}” Works`, [
        `Pain opener: dramatize the exact frustration your ${audience} faces now`,
        `Why now: a trend/data point that makes ${premise} timely`,
        `Simple model: draw a one‑screen analogy that explains how the idea works`,
        `Application: show the model applied to a specific, relatable micro‑scenario`,
        `Outcome: highlight what changes for the viewer after adopting “${km}”`,
        `CTA for ${plat}: summarize the takeaway and invite the next step`
      ]),
      make('Narrative – Mini Case Study', [
        `Character intro: a persona from ${audience} with a clear goal`,
        `Obstacle: the pain point your premise addresses, shown in context`,
        `Turning point: they try “${premise}”`,
        `Result: measurable outcome on screen tied to “${km}”`,
        `Lesson: one‑sentence takeaway the viewer can copy`,
        `CTA for ${plat}: invite the viewer to replicate the steps`
      ]),
    ]
    return NextResponse.json({ success: true, variants })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to generate outline' }, { status: 500 })
  }
}


