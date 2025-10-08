import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'

function buildContext(meta: any, beatSheet: any[]) {
  const idea = meta?.selectedIdea || {}
  const theme = idea?.details?.keyThemes || meta?.theme || ''
  const tone = meta?.tone || idea?.details?.tone || ''
  const chars = Array.isArray(idea?.characters) ? idea.characters : []
  const characters = chars.map((c: any) => `- ${c.name || c.role || 'Character'}: ${c.description || c.role || ''}`).join('\n') || '- HOST: Knowledgeable, reflective, observant'
  const scenes = beatSheet.map((b: any, i: number) => {
    const obj = b.objective ? `\n- SCENE OBJECTIVE: ${b.objective}` : ''
    const emo = b.emotionalTone ? `\n- EMOTIONAL TONE: ${b.emotionalTone}` : ''
    const key = b.keyAction ? `\n- KEY ACTION: ${b.keyAction}` : ''
    return [
      `SCENE ${i+1}: ${b.slugline || ''}`,
      `- SUMMARY: ${b.summary || ''}${obj}${emo}${key}`
    ].join('\n')
  }).join('\n\n')
  return { theme, tone, characters, scenes }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { beatSheet, metadata } = await req.json()
    if (!Array.isArray(beatSheet) || beatSheet.length === 0) {
      return NextResponse.json({ success: false, error: 'Valid beatSheet is required' }, { status: 400 })
    }

    const { theme, tone, characters, scenes } = buildContext(metadata || {}, beatSheet)

    const prompt = [
      'You are an award-winning screenwriter. Write a complete film script from the outline below.',
      'Requirements:',
      '- Maintain coherent character voices and motivations.',
      '- Use VISUAL and AUDIO sections within each scene where helpful.',
      '- Include SCENE START/SCENE END around each scene.',
      '- Include a clear slugline.',
      '- Add an Estimated Duration line for each scene (video duration, not reading time).',
      '- Use crisp, cinematic prose and specific sensory detail; avoid generic filler.',
      '',
      theme ? `OVERALL THEME: ${theme}` : '',
      tone ? `GLOBAL TONE: ${tone}` : '',
      '',
      'CHARACTERS:',
      characters,
      '',
      'SCENES:',
      scenes,
      '',
      'Now produce the complete script. Do not include analysis.'
    ].filter(Boolean).join('\n')

    const origin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || ''
    const base = String(origin).replace(/^https?:\/\//, '').replace(/\/$/, '')
    const url = `https://${base}/api/cue/respond`
    const isDebug = req.nextUrl?.searchParams?.get('debug') === '1'
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      return NextResponse.json({ success: false, error: err?.error || 'Cue service error' }, { status: 500 })
    }
    const json = await resp.json().catch(() => ({}))
    const script = json?.reply || ''
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (isDebug) headers['x-sf-prompt'] = encodeURIComponent(prompt.slice(0, 1000))
    return new Response(JSON.stringify({ success: true, script }), { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}


