import { NextRequest, NextResponse } from 'next/server'
import { AnalysisResponse, CoreConceptAttributes } from '@/types/SceneFlow'

export async function POST(req: NextRequest) {
  const { message, currentAttributes } = await req.json()
  const apiKey = process.env.OPENAI_API_KEY

  function generateMustHaves(attrs: CoreConceptAttributes): string[] {
    const title = String(attrs?.workingTitle?.value || 'Your video')
    const premise = String(attrs?.corePremise?.value || '').slice(0, 120)
    const audience = String(attrs?.targetAudience?.value || 'target audience')
    const platform = String(attrs?.intendedPlatform?.value || 'chosen platform')
    const tone = Array.isArray(attrs?.toneMood?.value) ? attrs.toneMood.value[0] : String(attrs?.toneMood?.value || 'Professional')
    const key = String(attrs?.keyMessageCTA?.value || 'key takeaway')

    return [
      `Open strong: 3–5 sec hook that states the payoff for ${audience}`,
      `Visual plan: on-screen examples/b-roll that demonstrate "${key}"`,
      `Structure: 5–7 concise scenes with clear transitions (${tone.toLowerCase()} tone)`,
      `Proof point: 1 stat, quote, or mini-case to validate the promise`,
      `On-screen text: show the key takeaway and chapter labels`,
      `CTA: clear next step tailored to ${platform}`,
    ]
  }

  const wantsMustHaves = typeof message === 'string' && /must[- ]?have/i.test(message)

  if (!apiKey) {
    // Fallback: generate useful content locally (no external API)
    const attrs: CoreConceptAttributes = { ...currentAttributes }
    if (wantsMustHaves) {
      attrs.mustHaveElements = { value: generateMustHaves(attrs), source: 'suggested' }
      const response: AnalysisResponse = { attributes: attrs, rationale: 'Added tailored must-have elements based on your current concept.' }
      return NextResponse.json(response)
    }
    const rationale = `I noted your request: "${message}". Update applied where possible without external AI.`
    const response: AnalysisResponse = { attributes: attrs, rationale }
    return NextResponse.json(response)
  }

  const messages = [
    { role: 'system', content: 'You are the SceneFlow Concept Analyzer. Update the provided attributes based on the user request. Output pure JSON matching the AnalysisResponse schema. Mark changed fields as user_modified in their source.' },
    { role: 'user', content: `CURRENT ATTRIBUTES:\n${JSON.stringify(currentAttributes, null, 2)}\n\nUSER REQUEST:\n${message}` },
  ]

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.5 }),
    })
    if (!resp.ok) throw new Error(await resp.text())
    const json = await resp.json()
    const content: string = json?.choices?.[0]?.message?.content
    const parsed = JSON.parse(content)
    const response: AnalysisResponse = parsed
    return NextResponse.json(response)
  } catch (e) {
    // Robust fallback: still provide must-have elements when requested
    const attrs: CoreConceptAttributes = { ...currentAttributes }
    if (wantsMustHaves) {
      attrs.mustHaveElements = { value: generateMustHaves(attrs), source: 'suggested' }
      const response: AnalysisResponse = { attributes: attrs, rationale: 'Added must-have elements using a local generator.' }
      return NextResponse.json(response)
    }
    const response: AnalysisResponse = { attributes: attrs, rationale: 'Temporary issue updating via AI. You can try again or continue editing manually.' }
    return NextResponse.json(response)
  }
}
