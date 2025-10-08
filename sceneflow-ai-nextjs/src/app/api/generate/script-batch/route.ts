import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

type SceneIn = { id?: string; slugline?: string; summary?: string; objective?: string; keyAction?: string; emotionalTone?: string }

function upper(s?: string): string { return String(s || '').toUpperCase() }
function clean(s?: string): string { return String(s || '').replace(/\s+/g, ' ').trim() }

function buildBriefPrompt({ title, treatment, scenes, index }: { title?: string; treatment?: any; scenes: SceneIn[]; index: number }) {
  const logline = treatment?.logline || title || ''
  const chars = Array.isArray(treatment?.characters) ? treatment.characters : []
  const charLines = chars.map((c:any)=>`- ${c.name}: ${c.description}`).join('\n') || '- (none)'
  const current = scenes[index]
  const prev = index>0 ? scenes[index-1] : null
  const next = index<scenes.length-1 ? scenes[index+1] : null
  return [
    'You are an expert script editor and story analyst.',
    'Create a concise Director\'s Brief for the CURRENT SCENE to guide a screenwriter.',
    '',
    '--- OVERALL CONTEXT ---',
    `LOGLINE: ${logline}`,
    `KEY CHARACTERS:\n${charLines}`,
    '',
    '--- SCENE SEQUENCE CONTEXT ---',
    prev ? `PREVIOUS SCENE SUMMARY: ${prev.summary || ''}` : 'PREVIOUS SCENE SUMMARY: This is the opening scene.',
    `CURRENT SCENE SUMMARY: ${current.summary || ''}`,
    `CURRENT SCENE OBJECTIVE: ${current.objective || 'Not specified.'}`,
    next ? `NEXT SCENE SUMMARY: ${next.summary || ''}` : 'NEXT SCENE SUMMARY: This is the final scene.',
    '',
    '--- YOUR TASK ---',
    'Provide Core Purpose, Emotional Arc, Key Beats & Subtext, and Setup for Next Scene. Keep concise and actionable.'
  ].join('\n')
}

function buildScenePrompt({ title, episode, sceneNumber, scene, directorsBrief }: { title?: string; episode?: string; sceneNumber: number; scene: SceneIn; directorsBrief: string }) {
  const slug = upper(scene.slugline || 'INT./EXT. LOCATION - DAY')
  return [
    'You are an award-winning screenwriter. Write a compelling, professional, and COMPLETE scene script.',
    'Requirements:',
    '- The scene must be COMPLETE from beginning to end, fully realizing its objective.',
    '- Include SCENE START/SCENE END.',
    '- Include a clear slugline.',
    '- Use VISUAL and AUDIO sections.',
    '- Include an Estimated Duration line (video duration, not reading time).',
    '- Cinematic, specific, sensory detail; avoid generic filler.',
    '',
    '--- CONTEXT & DIRECTION ---',
    `DIRECTOR'S BRIEF: ${directorsBrief || '(not provided)'}`,
    '-------------------------',
    '',
    title && `TITLE: ${title}`,
    episode && `EPISODE: ${episode}`,
    `SCENE NUMBER: ${sceneNumber}`,
    '',
    `SLUGLINE: ${slug}`,
    `SUMMARY: ${scene.summary || ''}`,
    scene.objective ? `SCENE OBJECTIVE: ${scene.objective}` : '',
    scene.keyAction ? `KEY ACTION: ${scene.keyAction}` : '',
    scene.emotionalTone ? `EMOTIONAL TONE: ${scene.emotionalTone}` : '',
    '',
    'Now, using the Director\'s Brief for guidance, produce the complete scene.'
  ].filter(Boolean).join('\n')
}

function deterministicFallback(title: string, episode: string, scenes: SceneIn[]): string {
  return scenes.map((s, i) => [
    `SCENE: ${i+1}`,
    title && `Title: ${title}`,
    episode && `Episode: ${episode}`,
    'Estimated Duration: 60 seconds',
    '',
    'SCENE START',
    '',
    upper(s.slugline || 'INT./EXT. LOCATION - DAY'),
    '',
    'VISUAL:',
    s.summary || '',
    '',
    'AUDIO:',
    'SOUND — ambient environment, subtle and textured',
    'HOST (V.O.) — one line that frames intent.',
    '',
    'SCENE END'
  ].filter(Boolean).join('\n')).join('\n\n')
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 40000, ...rest } = init
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(input, { ...rest, signal: controller.signal })
    return resp
  } finally {
    clearTimeout(id)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({}))
    const scenes: SceneIn[] = Array.isArray(body?.scenes) ? body.scenes : []
    if (!scenes.length) return new Response('scenes[] required', { status: 400 })
    const title = clean(body?.title || '')
    const episode = clean(body?.episode || '')
    const treatment = body?.treatment || {}

    const origin = req.nextUrl?.origin || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || ''
    const base = String(origin).replace(/^https?:\/\//, '').replace(/\/$/, '')
    const url = `https://${base}/api/cue/respond`

    let outParts: string[] = []
    for (let i=0;i<scenes.length;i++) {
      try {
        // Step 1: Director's Brief (timeout ~20s)
        const briefPrompt = buildBriefPrompt({ title, treatment, scenes, index: i })
        const briefResp = await fetchWithTimeout(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: briefPrompt, context: { mode:'text', type:'analysis' } }), timeoutMs: 20000 })
        const briefJson = await briefResp.json().catch(()=>({}))
        const directorsBrief = String(briefJson?.reply || '').trim()
        // Step 2: Strict scene script (timeout ~60s)
        const scenePrompt = buildScenePrompt({ title, episode, sceneNumber: i+1, scene: scenes[i], directorsBrief })
        const sceneResp = await fetchWithTimeout(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: scenePrompt, context: { mode:'scene_script', type:'text' } }), timeoutMs: 60000 })
        if (!sceneResp.ok) throw new Error('Scene gen failed')
        const sceneJson = await sceneResp.json().catch(()=>({}))
        const sceneText = String(sceneJson?.reply || '').trim()
        outParts.push(`SCENE: ${i+1}\n\n${sceneText}`)
      } catch {
        // fallback single scene
        outParts.push(deterministicFallback(title, episode, [scenes[i]]))
      }
    }

    const out = outParts.join('\n\n')
    return new Response(out, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return new Response(`Batch script failed: ${e?.message || 'unknown'}`, { status: 500 })
  }
}


