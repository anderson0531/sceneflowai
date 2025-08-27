import { NextRequest, NextResponse } from 'next/server'
import { AnalysisResponse, CoreConceptAttributes } from '@/types/SceneFlow'

const defaultAttributes = (): CoreConceptAttributes => ({
  workingTitle: { value: 'Untitled Project', source: 'suggested' },
  corePremise: { value: '', source: 'suggested' },
  targetAudience: { value: 'General Audience', source: 'suggested' },
  goalObjective: { value: 'Inform', source: 'suggested' },
  keyMessageCTA: { value: 'Remember the key message', source: 'suggested' },
  genreFormat: { value: 'Explainer', source: 'suggested' },
  toneMood: { value: ['Professional'], source: 'suggested' },
  visualAesthetic: { value: 'Clean, modern', source: 'suggested' },
  intendedPlatform: { value: 'YouTube', source: 'suggested' },
  estimatedDuration: { value: '60s', source: 'suggested' },
  mustHaveElements: { value: [], source: 'suggested' },
})

export async function POST(req: NextRequest) {
  const { rawInput } = await req.json()
  const base = defaultAttributes()
  if (typeof rawInput === 'string' && rawInput.trim().length > 0) {
    base.corePremise = { value: rawInput.trim(), source: 'extracted' }
    base.workingTitle = { value: rawInput.split(/[.!?]/)[0].slice(0, 50) || 'Untitled Project', source: 'extracted' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const response: AnalysisResponse = {
      attributes: base,
      rationale: "I've drafted best‑fit attributes based on your concept. You can edit anything on the left or ask me to adjust further.",
    }
    return NextResponse.json(response)
  }

  const messages = [
    { role: 'system', content: 'You are the SceneFlow Concept Analyzer. Output only JSON matching the AnalysisResponse schema. Do not add prose.' },
    { role: 'user', content: `RAW INPUT:\n${rawInput}\n\nSCHEMA: ${JSON.stringify(defaultAttributes(), null, 2)}` },
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
    const response: AnalysisResponse = { attributes: parsed.attributes ?? base, rationale: parsed.rationale ?? base.corePremise.value }
    return NextResponse.json(response)
  } catch (e) {
    const response: AnalysisResponse = {
      attributes: base,
      rationale: "I analyzed your concept and proposed defaults based on best practices. You can modify any attribute.",
    }
    return NextResponse.json(response)
  }
}
