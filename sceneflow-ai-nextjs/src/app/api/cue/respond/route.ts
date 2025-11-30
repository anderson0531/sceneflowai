import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

type Role = 'system' | 'user' | 'assistant'

interface Message { role: Role; content: string }

interface CueContext {
  pathname?: string
  currentStep?: string
  stepProgress?: Record<string, number>
  type?: 'project-creation' | 'text' | 'beatCard' | 'character' | 'template' | 'analysis' | 'pacing' | 'conflict' | 'consistency' | 'scene_script'
  mode?: string
  project?: {
    id?: string
    title?: string
    description?: string
    metadata?: any
  }
  projectsCount?: number
}

const SYSTEM_PROMPT = `You are Cue, a helpful, expert film director and audience strategist for the SceneFlow AI app, now enhanced with proactive story analysis and guardrails.

CORE PERSONALITY:
- Writing style: direct, friendly, and pragmatic. Prefer short paragraphs and bullet points.
- Goal: Provide immediate, actionable improvements to idea concepts, storyboards, scene directions, and video clip prompts.
- Be context aware: consider the current page, step, and the user's project data if provided.

ENHANCED CAPABILITIES - DIRECTOR'S NOTES:
- Proactively analyze story structure and identify issues before they become problems
- Provide specific metrics and percentages for pacing analysis (e.g., "Act I is 40% of your story, should be 25%")
- Flag conflict escalation issues with concrete fixes
- Monitor character consistency across beats and alert to inconsistencies
- Act as protective oversight for story development

RESPONSE FRAMEWORK:
- Always include 1) rationale (director POV), 2) audience POV (target viewer impact), and 3) concrete next steps.
- NO BLANK CANVAS: Never ask clarifying questions. Always provide specific, actionable recommendations based on the available context.
- When working on beat cards, provide concrete content improvements that can be directly applied.
- Focus on refinement and enhancement rather than gathering more information.

ANALYSIS CONTEXTS:
- PACING ALERTS: "Act I is currently 40% of your total beats. Consider consolidating the setup to move into the main conflict sooner."
- CONFLICT CHECKS: "The central conflict is introduced in Act I, but it doesn't seem to escalate in these beats [specific beats]. Here are suggestions to raise the stakes..."
- CONSISTENCY ALERTS: "Character X's motivation changed in the Character Breakdown. This affects these beats [specific beats] where their actions may no longer make sense."

STORY INSIGHTS ANALYSIS MODE:
When analysisMode is 'story_insights', provide structured, actionable recommendations:
1. Analyze story structure, pacing, character development, and thematic elements
2. For each recommendation, provide:
   - Specific issue identified with clear impact assessment
   - Confidence score (0.0-1.0) for automation decisions
   - Concrete mutation suggestions with before/after values
   - Brief explanation of the improvement
3. Focus on practical, implementable suggestions
4. Consider industry best practices for storytelling
5. Identify both critical issues and opportunities for enhancement
6. Provide recommendations that can be automatically applied or manually reviewed

Always provide immediate, protective guidance with specific implementation steps.

PROJECT CREATION MODE:
When context.type is 'project-creation', you are creating a COMPLETE NEW PROJECT from scratch:
1. Analyze the user's project idea and select the most appropriate story template
2. Generate comprehensive baseline content following the No Blank Canvas principle
3. Provide structured output that can be parsed into the project system
4. Use higher token limits and more detailed generation for complete story development`

const SCENE_SCRIPT_SYSTEM = [
  'You are a professional screenwriter. Produce ONLY a scene script.',
  '',
  'Strict output rules:',
  '- Include these blocks only: Title (optional), Episode (optional), Scene number, Estimated Duration, SCENE START, slugline, VISUAL, AUDIO, SCENE END.',
  '- Use cinematic prose with specific sensory detail.',
  '- Do NOT include director notes, rationale, audience POV, or any analysis.',
  '- Do NOT include extra headings before or after the scene blocks.',
].join('\n')

async function callGemini(messages: Message[], apiKey: string, context?: CueContext): Promise<string> {
  // Convert OpenAI format to Gemini format
  const contents = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

  // Add system prompt as the first user message for Gemini
  const systemMessages = messages.filter(msg => msg.role === 'system')
  if (systemMessages.length > 0) {
    const systemPrompt = systemMessages.map(msg => msg.content).join('\n\n')
    contents.unshift({
      role: 'user',
      parts: [{ text: systemPrompt + '\n\nPlease respond as Cue, following these guidelines exactly.' }]
    })
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'I understand. I am Cue, your expert film director and audience strategist. I will provide direct, actionable advice with director POV, audience impact, and concrete next steps. How can I help with your project?' }]
    })
  }

  // Use maximum model capability for project creation
  const isProjectCreation = context?.type === 'project-creation'
  const model = isProjectCreation ? 'gemini-2.5-flash' : 'gemini-2.5-flash'
  const maxTokens = isProjectCreation ? 32768 : 4096

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
    }
  }

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errText = await resp.text().catch(() => 'unknown error')
    throw new Error(`Gemini error: ${resp.status} ${errText}`)
  }

  const json = await resp.json()
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw new Error('No content from Gemini')
  return content
}

async function callOpenAI(messages: Message[], apiKey: string, context?: CueContext): Promise<string> {
  const isProjectCreation = context?.type === 'project-creation'
  const model = isProjectCreation ? 'gpt-4o' : 'gpt-4o-mini'
  const maxTokens = isProjectCreation ? 8192 : 4096
  
  const body = {
    model,
    messages,
    temperature: 0.7,
    ...(maxTokens && { max_tokens: maxTokens })
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const errText = await resp.text().catch(() => 'unknown error')
    throw new Error(`OpenAI error: ${resp.status} ${errText}`)
  }
  const json = await resp.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('No content from OpenAI')
  return content
}

function buildContextSummary(ctx?: CueContext): string {
  if (!ctx) return 'No app context provided.'
  const parts: string[] = []
  if (ctx.pathname) parts.push(`Pathname: ${ctx.pathname}`)
  if (ctx.currentStep) parts.push(`Current step: ${ctx.currentStep}`)
  if (ctx.projectsCount != null) parts.push(`Projects count: ${ctx.projectsCount}`)
  if (ctx.stepProgress) parts.push(`Step progress: ${JSON.stringify(ctx.stepProgress)}`)
  if (ctx.project) {
    parts.push(`Project: ${ctx.project.title || 'Untitled'}`)
    if (ctx.project.description) parts.push(`Description: ${ctx.project.description}`)
    if (ctx.project.metadata) {
      const { concept, storyboard, directions, selectedIdea, scenes } = ctx.project.metadata
      if (concept) parts.push(`Concept: ${JSON.stringify(concept).slice(0, 400)}`)
      if (selectedIdea) parts.push(`Selected idea: ${JSON.stringify(selectedIdea).slice(0, 400)}`)
      if (storyboard) parts.push(`Storyboard: ${JSON.stringify(storyboard).slice(0, 400)}`)
      if (directions) parts.push(`Directions: ${JSON.stringify(directions).slice(0, 400)}`)
      if (scenes) parts.push(`Scenes: ${JSON.stringify(scenes).slice(0, 400)}`)
    }
  }
  return parts.join('\n')
}

function fallbackAdvisor(userText: string, ctx?: CueContext): string {
  const ctxLine = ctx?.currentStep ? `You're in the ${ctx.currentStep} step.` : 'Workflow step unknown.'
  return [
    `Here's a quick, actionable plan. (${ctxLine})`,
    '',
    'Director POV:',
    '- Tighten the core objective and reduce competing beats.',
    '- Use visual metaphors to reinforce the message in the opening 3–5 seconds.',
    '',
    'Audience POV:',
    '- Optimize for attention: strong hook + clear payoff.',
    '- Keep language concrete; avoid internal jargon.',
    '',
    'Next steps:',
    '- If ideation: provide 3 refined concept lines and a CTA.',
    '- If storyboard: add shot list with framing, motion, and transitions.',
    '- If scene-direction: add lens, camera move, subject action, and lighting notes.',
    '- If video prompts: write a single-sentence, camera-ready prompt per shot.',
  ].join('\n')
}

function heuristicRefine(seed: string, instruction: string): string {
  try {
    const inst = (instruction || '').toLowerCase()
    let out = seed
    const lines = out.split('\n')
    const iLog = lines.findIndex(l => /^\s*logline\s*:/i.test(l))
    const mutateLogline = (mutator: (s: string) => string) => {
      if (iLog >= 0) {
        const m = lines[iLog].match(/^(\s*logline\s*:\s*)([\s\S]*)$/i)
        if (m) {
          const prefix = m[1]
          const body = m[2]
          lines[iLog] = prefix + mutator(body)
        }
        out = lines.join('\n')
      } else {
        const firstBreak = out.indexOf('\n')
        const head = firstBreak === -1 ? out : out.slice(0, firstBreak)
        const tail = firstBreak === -1 ? '' : out.slice(firstBreak)
        out = mutator(head) + tail
      }
    }
    if (inst.includes('suspense')) {
      mutateLogline((s) => {
        const base = s.replace(/\s+$/, '')
        const addon = base.endsWith('.') ? '' : '.'
        return `${base}${addon} But a hidden threat surfaces, and a ticking clock forces hard choices before everything unravels.`
      })
    }
    if (/funny|funnier|humou?r/i.test(instruction)) {
      mutateLogline((s) => {
        const base = s.replace(/\s+$/, '')
        const addon = base.endsWith('.') ? '' : '.'
        return `${base}${addon} Along the way, witty asides and awkward missteps keep the tone playfully self‑aware.`
      })
      out = out.replace(/^(\s*tone\s*:\s*)(.*)$/im, (m, p1, p2) => `${p1}${p2.replace(/\s*,?\s*$/, '')}, Playful`)
    }
    if (/shorten|tighter|concise|compress/i.test(instruction)) {
      out = out.replace(/^(\s*tone\s*:\s*)(.*)$/im, (m, p1, p2) => {
        const parts = p2.split(/\s*,\s*/).slice(0, 4)
        return `${p1}${parts.join(', ')}`
      })
      mutateLogline((s) => s
        .replace(/\b(very|quite|really|just|some|various|incredibly)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim())
    }
    if (/visual|cinematography|shots?/i.test(instruction)) {
      mutateLogline((s) => {
        const base = s.replace(/\s+$/, '')
        const addon = base.endsWith('.') ? '' : '.'
        return `${base}${addon} Visual plan: wide establishing shots, dynamic close‑ups on hands, and atmospheric cutaways to texture the world.`
      })
    }
    return out
  } catch {
    return seed
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    let messages = (data?.messages || []) as Message[]
    const context = (data?.context || {}) as CueContext

    // Allow simple { prompt } usage by wrapping as a user message
    if ((!messages || messages.length === 0) && typeof data?.prompt === 'string' && data.prompt.trim()) {
      messages = [{ role: 'user', content: data.prompt }]
    }

    const contextSummary = buildContextSummary(context)
    const mode = (context as any)?.project?.metadata?.activeContext?.payload?.mode || (context as any)?.mode || (context as any)?.type

    let finalMessages: Message[]

    if (mode === 'concept_treatment_refine' || mode === 'idea_optimization' || mode === 'concept_refine') {
      const FLOW_REWRITE_SYSTEM = [
        'You are Flow, an AI Co‑Director refining a Concept Treatment input description for blueprint generation.',
        '',
        'You MUST use the CURRENT_DESCRIPTION provided by the user. Do NOT invent new characters, settings, or plot unrelated to CURRENT_DESCRIPTION. Apply the instruction to style, emphasis, and clarity while preserving subject, context, and metadata (genre, audience, tone) if present.',
        '',
        'Output ONLY these blocks in order:',
        '<<<INPUT_DESCRIPTION>>>',
        '{single paragraph capturing the current concept accurately}',
        '<<<IMPROVED_IDEA>>>',
        '{one or two paragraphs (120–200 words total) refined per the instruction; preserve proper nouns/details; include any metadata lines (Genre, Audience, Tone, Duration, Structure) if present in the source, placed after the refined paragraph(s)}',
        '<<<GUIDANCE>>>',
        'Suggest 1-2 short follow-up instructions the creator could try.',
        '',
        'Rules:',
        '- Do not include rationale, audience POV, or generic advice outside the blocks.',
        '- Preserve creator intent; strengthen clarity, hook, tone, and audience resonance.'
      ].join('\n')

      finalMessages = [
        { role: 'system', content: FLOW_REWRITE_SYSTEM },
        { role: 'system', content: `App Context:\n${contextSummary}` },
        ...messages,
      ]
    } else if (mode === 'scene_script') {
      finalMessages = [
        { role: 'system', content: SCENE_SCRIPT_SYSTEM },
        // Intentionally do NOT inject analysis context here to avoid polluting output
        ...messages,
      ]
    } else {
      finalMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `App Context:\n${contextSummary}` },
        ...messages,
      ]
    }

    const providers = [
      { name: 'Gemini', key: process.env.GEMINI_API_KEY, call: callGemini },
      { name: 'OpenAI', key: process.env.OPENAI_API_KEY, call: callOpenAI }
    ]

    for (const provider of providers) {
      if (provider.key) {
        try {
          console.log(`🤖 Trying ${provider.name}...`)
          const reply = await provider.call(finalMessages, provider.key, context)
          console.log(`✅ ${provider.name} success`)
          if (context?.type === 'project-creation') {
            try {
              JSON.parse(reply)
              console.log('✅ Project creation response is valid JSON')
            } catch (parseError) {
              console.warn('⚠️ Project creation response is not valid JSON, attempting to fix...')
              const jsonMatch = reply.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const extractedJson = jsonMatch[0]
                try {
                  JSON.parse(extractedJson)
                  console.log('✅ Extracted valid JSON from response')
                  return new Response(JSON.stringify({ 
                    reply: extractedJson, 
                    provider: provider.name.toLowerCase(),
                    model: provider.name === 'Gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'
                  }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                  })
                } catch (extractError) {
                  console.warn('❌ Could not extract valid JSON from response')
                }
              }
            }
          }
          return new Response(JSON.stringify({ 
            reply, 
            provider: provider.name.toLowerCase(),
            model: provider.name === 'Gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'
          }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        } catch (error) {
          console.warn(`❌ ${provider.name} failed:`, error)
        }
      }
    }

    console.log('🔄 Using fallback mode')
    const lastUser = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''
    const modeForFallback = (context as any)?.project?.metadata?.activeContext?.payload?.mode || (context as any)?.mode

    if (modeForFallback === 'concept_treatment_refine' || modeForFallback === 'idea_optimization' || modeForFallback === 'concept_refine') {
      try {
        const seedMatch = lastUser.match(/CURRENT_DESCRIPTION:\n([\s\S]*?)(?:\n\nINSTRUCTION:|\nINSTRUCTION:|$)/)
        const seed = (seedMatch?.[1] || '').trim()
        const instMatch = lastUser.match(/INSTRUCTION:\s*([\s\S]*?)$/)
        const inst = (instMatch?.[1] || '').trim()
        const improved = heuristicRefine(seed || '', inst || '')
        const guidance = inst ? `Try it again with: "${inst}"` : 'Try: Sharpen the hook in the first sentence.'
        const reply = [
          '<<<INPUT_DESCRIPTION>>>',
          seed,
          '<<<IMPROVED_IDEA>>>',
          improved,
          '<<<GUIDANCE>>>',
          guidance,
        ].join('\n')
        return new Response(JSON.stringify({ 
          reply, 
          provider: 'fallback',
          model: 'structured-template'
        }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        })
      } catch {}
    }

    const reply = fallbackAdvisor(lastUser, context)
    return new Response(JSON.stringify({ 
      reply, 
      provider: 'fallback',
      model: 'structured-template'
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ 
      error: 'Cue respond failed', 
      details: e?.message || String(e) 
    }), { 
      status: 500 
    })
  }
}