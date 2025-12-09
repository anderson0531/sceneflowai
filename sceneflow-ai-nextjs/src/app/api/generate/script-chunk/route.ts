import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

type OutlineScene = {
  id?: string
  slugline?: string
  summary?: string
  objective?: string
  keyAction?: string
  emotionalTone?: string
}

type BriefCharacter = { name: string; description: string }

function formatSlugline(slug?: string): string {
  return (slug || 'INT./EXT. LOCATION - DAY').toUpperCase().replace(/\s+/g, ' ').trim()
}
function minDurationByContext(seconds: number, opts: { summary?: string; slug?: string; sceneIndex?: number }): number {
  const s = (opts.summary || '').toLowerCase()
  const slug = (opts.slug || '').toLowerCase()
  const isOpener = (opts.sceneIndex || 0) === 0 || /opener|opening|episode opener/.test(s)
  const isDrone = /drone|sweeping/.test(s) || /drone|sweeping/.test(slug)
  const isMontage = /montage|series of shots/.test(s)
  let floor = 10
  if (isOpener) floor = Math.max(floor, 60)
  if (isDrone) floor = Math.max(floor, 60)
  if (isMontage) floor = Math.max(floor, 75)
  return Math.max(floor, seconds)
}
function estimateDurationSeconds(text: string, tone?: string): number {
  const content = (text || '').trim()
  const toneBase: Record<string, number> = { Tense: 3.0, Joyful: 3.8, Contemplative: 5.5, Somber: 4.8, Wondrous: 5.2, Neutral: 4.0 }
  const baseShot = toneBase[(tone || 'Neutral') as keyof typeof toneBase] || 4.0
  const sentences = content ? content.split(/(?<=[.!?])\s+/).filter(Boolean).length : 0
  let seconds = sentences > 0 ? Math.round(sentences * baseShot) : Math.round((content.split(/\s+/).filter(Boolean).length) / 3.5)
  seconds += Math.floor((sentences || 1) / 6)
  return Math.max(10, Math.min(seconds, 600))
}

// Deterministic fallback retained
function fallbackSynthesize(scene: OutlineScene, index: number, opts: { title?: string; episode?: string; sceneNumber?: number } = {}): { text: string; seconds: number } {
  const slug = formatSlugline(scene.slugline)
  const summary = (scene.summary || '').trim()
  const objective = (scene.objective || '').trim()
  const action = (scene.keyAction || '').trim()
  const tone = (scene.emotionalTone || 'Neutral').trim()
  const n = (typeof opts.sceneNumber === 'number' ? opts.sceneNumber : (index + 1))

  const core = [
    'SCENE START',
    '',
    slug,
    '',
    'VISUAL:',
    summary,
    objective && `Objective: ${objective}`,
    action && `Key Action: ${action}`,
    '',
    'AUDIO:',
    'SOUND — ambient environment, subtle and textured',
    `HOST (V.O.) — one line that frames intent; tone: ${tone}.`,
    '',
    'FADE / CUT as the moment resolves.',
    '',
    'SCENE END'
  ].filter(Boolean).join('\n')

  let seconds = estimateDurationSeconds(core, tone)
  seconds = minDurationByContext(seconds, { summary, slug, sceneIndex: n - 1 })

  const header = [
    opts.title && `Title: ${opts.title}`,
    opts.episode && `Episode: ${opts.episode}`,
    `Scene: ${n}`,
    `Estimated Duration: ${seconds} seconds`,
    ''
  ].filter(Boolean).join('\n')

  return { text: header + core, seconds }
}

function buildAnalysisPrompt({ logline, characters, outline, currentSceneNumber }: { logline: string; characters: BriefCharacter[]; outline: OutlineScene[]; currentSceneNumber: number }) {
  const currentScene = outline[currentSceneNumber - 1] || {}
  const previousScene = currentSceneNumber > 1 ? outline[currentSceneNumber - 2] : null
  const nextScene = currentSceneNumber < outline.length ? outline[currentSceneNumber] : null
  const characterInfo = (characters || []).map(c => `- ${c.name}: ${c.description}`).join('\n') || '- (none)'
  
  // Determine pacing context based on position in script
  const totalScenes = outline.length
  const positionRatio = currentSceneNumber / totalScenes
  let pacingContext = 'EARLY (Setup & Introduction)'
  let pacingGuidance = 'Focus on establishing character, world, and stakes. Plant seeds for later payoffs.'
  if (positionRatio > 0.7) {
    pacingContext = 'LATE (Climax & Resolution)'
    pacingGuidance = 'Accelerate pacing. Payoff earlier setups. Maximum emotional intensity. Clear stakes and consequences.'
  } else if (positionRatio > 0.4) {
    pacingContext = 'MIDDLE (Rising Action & Complications)'
    pacingGuidance = 'Escalate conflict. Deepen character relationships. Raise stakes progressively. Plant/payoff story threads.'
  }
  
  return [
    'You are an expert script editor and story analyst with deep understanding of narrative craft.',
    'Your task is to create a comprehensive "Director\'s Brief" for a specific scene.',
    '',
    '=== OVERALL CONTEXT ===',
    `LOGLINE: ${logline || '(not provided)'}`,
    '',
    'KEY CHARACTERS:',
    characterInfo,
    '',
    '=== SCENE SEQUENCE CONTEXT ===',
    previousScene ? `PREVIOUS SCENE: ${previousScene.summary || ''}` : 'PREVIOUS SCENE: This is the opening scene.',
    `CURRENT SCENE: ${currentScene.summary || ''}`,
    `SCENE OBJECTIVE: ${currentScene.objective || 'Not specified.'}`,
    nextScene ? `NEXT SCENE: ${nextScene.summary || ''}` : 'NEXT SCENE: This is the final scene.',
    '',
    '=== PACING & STRUCTURE ===',
    `POSITION: Scene ${currentSceneNumber} of ${totalScenes} — ${pacingContext}`,
    `PACING GUIDANCE: ${pacingGuidance}`,
    '',
    '=== CHARACTER RELATIONSHIPS ===',
    'Consider: How do the characters in this scene relate to each other?',
    '- What is their history?',
    '- What tensions or bonds exist between them?',
    '- What do they want FROM each other in this scene?',
    '- What are they hiding or avoiding?',
    '',
    '=== YOUR TASK ===',
    'Generate the Director\'s Brief covering:',
    '',
    '1. CORE PURPOSE',
    '   - The single most important function of this scene in the story',
    '   - What MUST the audience understand or feel after this scene?',
    '',
    '2. EMOTIONAL ARC',
    '   - Starting emotional state → Turning point → Ending emotional state',
    '   - How does this connect to the previous scene\'s ending?',
    '',
    '3. CHARACTER DYNAMICS',
    '   - Specific relationship dynamics at play',
    '   - Power balance between characters',
    '   - What each character wants (stated and unstated)',
    '',
    '4. KEY BEATS & SUBTEXT',
    '   - Crucial moments, actions, or revelations',
    '   - Unspoken tensions the screenwriter must convey',
    '   - Opportunities for "show don\'t tell"',
    '',
    '5. THEMATIC RESONANCE',
    '   - How this scene reinforces or complicates the central theme',
    '   - Visual or dialogue motifs to echo',
    '',
    '6. SETUP FOR NEXT SCENE',
    '   - What plot point, object, or emotional state must be established',
    '   - What question should linger in the audience\'s mind?',
    '',
    'Keep the brief actionable and specific to THIS scene.'
  ].join('\n')
}

function buildScenePrompt({ title, episode, sceneNumber, scene, directorsBrief }: { title?: string; episode?: string; sceneNumber?: number; scene: OutlineScene; directorsBrief: string }) {
  const slug = formatSlugline(scene.slugline)
  return [
    'You are an award-winning screenwriter known for emotionally resonant, visually compelling storytelling.',
    '',
    '=== CRAFT PRINCIPLES (APPLY THROUGHOUT) ===',
    '',
    'SHOW, DON\'T TELL:',
    '- Reveal character through action and behavior, not exposition',
    '- Express emotions through physical details: gestures, micro-expressions',
    '- Instead of "He was angry" → "His jaw tightened. He set down the cup with deliberate care."',
    '',
    'SUBTEXT & LAYERED DIALOGUE:',
    '- Characters rarely say exactly what they mean',
    '- What\'s NOT said is as important as what IS said',
    '- Use deflection, misdirection, loaded silences',
    '',
    'VISUAL STORYTELLING:',
    '- Write for the camera: think in shots, angles, reveals',
    '- Specific sensory details: sounds, textures, lighting',
    '- Environmental details reflect or contrast emotional state',
    '',
    'CHARACTER VOICE:',
    '- Each character sounds distinctly different',
    '- Speech patterns reflect background, education, emotional state',
    '- Maintain consistency with how this character spoke in previous scenes',
    '',
    '=== TECHNICAL REQUIREMENTS ===',
    '- The scene must be COMPLETE from beginning to end',
    '- Include SCENE START/SCENE END markers',
    '- Include clear slugline and Estimated Duration',
    '- Use VISUAL and AUDIO sections',
    '',
    '=== DIRECTOR\'S BRIEF ===',
    directorsBrief || '(not provided)',
    '',
    '=== SCENE DETAILS ===',
    title ? `TITLE: ${title}` : '',
    episode ? `EPISODE: ${episode}` : '',
    sceneNumber ? `SCENE NUMBER: ${sceneNumber}` : '',
    `SLUGLINE: ${slug}`,
    `SUMMARY: ${scene.summary || ''}`,
    scene.objective ? `SCENE OBJECTIVE: ${scene.objective}` : '',
    scene.keyAction ? `KEY ACTION: ${scene.keyAction}` : '',
    scene.emotionalTone ? `EMOTIONAL TONE: ${scene.emotionalTone}` : '',
    '',
    '=== QUALITY CHECKLIST ===',
    '✓ Emotions shown through action, not stated',
    '✓ Dialogue has subtext and layers',
    '✓ Scene has clear beginning, middle, end',
    '✓ Visual details are specific and evocative',
    '✓ Character voices are distinct and consistent',
    '',
    'Now produce the complete scene following the Director\'s Brief.'
  ].filter(Boolean).join('\n')
}

function extractContextFromTreatment(treatment_context: any): { logline: string; characters: BriefCharacter[]; outline: OutlineScene[] } {
  try {
    const data = typeof treatment_context === 'string' ? JSON.parse(treatment_context) : (treatment_context || {})
    const idea = (data && (data.selectedIdea || data)) || {}
    const logline = String(idea.logline || idea.synopsis || idea.title || '').trim()
    const characters: BriefCharacter[] = Array.isArray(idea.characters) ? (idea.characters as any[]).map((c: any, i: number) => ({ name: c.name || c.role || `Character ${i+1}`, description: c.description || c.role || '' })) : []
    let outline: OutlineScene[] = []
    if (Array.isArray(idea.beat_outline) && idea.beat_outline.length) {
      outline = idea.beat_outline.map((b: any, i: number) => ({ id: String(b.id || `beat-${i+1}`), slugline: String(b.scene_name || b.beat_title || `Scene ${i+1}`), summary: String(b.beat_description || b.scene || ''), objective: String(b.objective || ''), keyAction: String(b.keyAction || ''), emotionalTone: String(b.emotionalTone || '') }))
    } else if (Array.isArray(idea.dynamic_acts)) {
      outline = idea.dynamic_acts.flatMap((a: any) => (a?.beats || []).map((b: any, i: number) => ({ id: String(b.id || `beat-${i+1}`), slugline: String(b.beat_title || b.title || `Scene ${i+1}`), summary: String(b.beat_description || b.description || ''), objective: String(b.objective || ''), keyAction: String(b.keyAction || ''), emotionalTone: String(b.emotionalTone || '') })))
    }
    return { logline, characters, outline }
  } catch { return { logline: '', characters: [], outline: [] } }
}

export async function POST(request: NextRequest) {
  try {
    const { outline_chunk, previous_scene_summary, title, episode, sceneNumber, treatment_context } = await request.json().catch(() => ({}))
    if (!Array.isArray(outline_chunk) || outline_chunk.length === 0) {
      return new Response('Bad Request: outline_chunk[] required', { status: 400 })
    }

    const scene = outline_chunk[0] as OutlineScene
    const n = typeof sceneNumber === 'number' ? sceneNumber : 1

    // Step 1: Build a Director's Brief from broader context
    const { logline, characters, outline } = extractContextFromTreatment(treatment_context)
    const effectiveOutline = outline.length ? outline : outline_chunk // fall back to current chunk
    const analysisPrompt = buildAnalysisPrompt({ logline, characters, outline: effectiveOutline as any, currentSceneNumber: n })

    const origin = request.nextUrl?.origin || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || ''
    const base = String(origin).replace(/^https?:\/\//, '').replace(/\/$/, '')
    const url = `https://${base}/api/cue/respond`
    const isDebug = request.nextUrl?.searchParams?.get('debug') === '1'

    let directorsBrief = ''
    try {
      const respBrief = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: analysisPrompt, context: { mode: 'text', type: 'analysis' } }) })
      if (respBrief.ok) {
        const briefJson = await respBrief.json().catch(()=>({}))
        directorsBrief = String(briefJson?.reply || '').trim()
      }
    } catch {}

    // Step 2: Build enriched scene prompt using the Director's Brief
    const prompt = buildScenePrompt({ title, episode, sceneNumber: n, scene, directorsBrief })

    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: { mode: 'scene_script', type: 'text', project: { metadata: { treatment_context } } } }) })
      if (!resp.ok) throw new Error('Cue unavailable')
      const json = await resp.json().catch(() => ({}))
      const text: string = json?.reply || ''
      if (!text) throw new Error('Empty response')
      const headers: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      if (isDebug) {
        headers['x-sf-brief'] = encodeURIComponent((directorsBrief || '').slice(0, 1000))
        headers['x-sf-prompt'] = encodeURIComponent(prompt.slice(0, 1000))
      }
      return new Response(text, { status: 200, headers })
    } catch {
      const { text } = fallbackSynthesize(scene, (n ? n - 1 : 0), { title, episode, sceneNumber: n })
      const headers: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      if (isDebug) {
        headers['x-sf-brief'] = encodeURIComponent((directorsBrief || '').slice(0, 1000))
        headers['x-sf-prompt'] = encodeURIComponent(prompt.slice(0, 1000))
      }
      return new Response(text, { status: 200, headers })
    }
  } catch (e: any) {
    return new Response(`Script generation failed: ${e?.message || 'unknown'}`, { status: 500 })
  }
}


