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
      'You are an award-winning screenwriter known for emotionally resonant, visually compelling storytelling.',
      '',
      '=== CRAFT PRINCIPLES (CRITICAL) ===',
      '',
      'CHARACTER VOICE CONSISTENCY:',
      '- Each character has a DISTINCT speaking pattern, vocabulary level, and rhythm',
      '- Characters reveal personality through HOW they speak, not just WHAT they say',
      '- Maintain speech patterns throughout: formal/casual, verbose/terse, direct/evasive',
      '- Character voice should reflect their background, education, emotional state',
      '',
      'SHOW, DON\'T TELL:',
      '- Reveal character through ACTION and BEHAVIOR, not exposition',
      '- Express emotions through physical details: gestures, micro-expressions, body language',
      '- Instead of "She was nervous" → "Her fingers drummed the table. She checked her phone again."',
      '- Let subtext do the heavy lifting—what\'s NOT said is as important as what IS',
      '',
      'EMOTIONAL BEATS:',
      '- Every scene has a clear EMOTIONAL ARC: beginning state → turning point → end state',
      '- Build tension through conflict, stakes, obstacles—not just dialogue',
      '- Earn emotional moments through setup and payoff',
      '- Vary emotional texture: moments of levity, dread, hope, despair',
      '',
      'SUBTEXT & LAYERED DIALOGUE:',
      '- Characters rarely say exactly what they mean',
      '- Dialogue should have surface meaning AND underlying tension',
      '- Use loaded silences, deflection, misdirection',
      '- What characters AVOID discussing reveals as much as what they say',
      '',
      'VISUAL STORYTELLING:',
      '- Write for the CAMERA: think in shots, angles, visual reveals',
      '- Use specific sensory details: sounds, textures, lighting, color',
      '- Environmental details should reflect or contrast with emotional state',
      '- Every visual choice should serve story or character',
      '',
      '=== TECHNICAL REQUIREMENTS ===',
      '',
      '- Use VISUAL and AUDIO sections within each scene where helpful',
      '- Include SCENE START/SCENE END around each scene',
      '- Include a clear slugline (INT./EXT. LOCATION - TIME)',
      '- Add an Estimated Duration line for each scene (video duration, not reading time)',
      '- Use professional screenplay format and terminology',
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
      '=== QUALITY CHECKLIST ===',
      '✓ Each character sounds distinctly different',
      '✓ Emotions shown through action, not stated',
      '✓ Every scene has conflict or tension',
      '✓ Dialogue has subtext and layers',
      '✓ Visual details are specific and evocative',
      '✓ Scenes flow naturally with clear transitions',
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


