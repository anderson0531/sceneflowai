/**
 * Heuristic analysis of keyframe images for Vertex AI / Veo video safety false positives.
 * Does not query Vertex RAI — uses Gemini vision to suggest what visuals may be misclassified.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateWithVision, type VisionPart } from '@/lib/vertexai/gemini'

async function urlToInlinePart(url: string, label: string): Promise<VisionPart[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status})`)
  }
  const buf = await res.arrayBuffer()
  const base64 = Buffer.from(buf).toString('base64')
  const ct = res.headers.get('content-type') || ''
  const mimeType =
    ct.startsWith('image/') ? ct.split(';')[0].trim() :
    url.includes('.jpg') || url.includes('.jpeg') ? 'image/jpeg' : 'image/png'
  return [
    { text: label },
    { inlineData: { mimeType, data: base64 } },
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const startFrameUrl = typeof body.startFrameUrl === 'string' ? body.startFrameUrl.trim() : ''
    const endFrameUrl = typeof body.endFrameUrl === 'string' ? body.endFrameUrl.trim() : ''
    const promptExcerpt =
      typeof body.promptExcerpt === 'string' ? body.promptExcerpt.slice(0, 2000) : ''

    if (!startFrameUrl && !endFrameUrl) {
      return NextResponse.json(
        { error: 'Provide startFrameUrl and/or endFrameUrl' },
        { status: 400 }
      )
    }

    const parts: VisionPart[] = [
      {
        text: `You are helping a filmmaker debug Google Vertex AI Veo "content policy" blocks on Frame-to-Video (two keyframes + prompt).

The filmmaker's TEXT PROMPT (may be empty) is only context — Vertex does not tell us the official block reason. Your job is VISION ANALYSIS ONLY.

For each image, note elements that *often* correlate with stricter multimodal safety filters when combined with interpolation:
- photorealistic identifiable adults, news/broadcast cues ("ON AIR"), medical/anatomical graphics (brains, organs), red alert UI, weapons, fire/explosions, distress poses, blood, text on screen, etc.

Respond with VALID JSON ONLY (no markdown), shape:
{
  "summary": "2-4 sentences",
  "suspectedVisualTriggers": ["short bullet", "..."],
  "perFrame": { "start": "optional string", "end": "optional string" },
  "suggestedImageEdits": ["concrete edit instruction 1", "..."]
}

Be practical and conservative. State clearly these are heuristics, not Google's verdict.`,
      },
    ]

    if (promptExcerpt) {
      parts.push({ text: `Prompt excerpt for context:\n${promptExcerpt}` })
    }

    if (startFrameUrl) {
      parts.push(...(await urlToInlinePart(startFrameUrl, 'Image labeled START FRAME:')))
    }
    if (endFrameUrl) {
      parts.push(...(await urlToInlinePart(endFrameUrl, 'Image labeled END FRAME:')))
    }

    const { text } = await generateWithVision(parts, {
      temperature: 0.2,
      maxOutputTokens: 2048,
    })

    let parsed: Record<string, unknown> | null = null
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(cleaned) as Record<string, unknown>
    } catch {
      parsed = { summary: text, suspectedVisualTriggers: [], perFrame: {}, suggestedImageEdits: [] }
    }

    return NextResponse.json({
      ok: true,
      analysis: parsed,
      rawText: text,
      disclaimer:
        'Heuristic only — not an official Vertex AI ruling. Use edits + retry; quote Vertex support codes in feedback.',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Analysis failed'
    console.error('[analyze-vertex-risk]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
