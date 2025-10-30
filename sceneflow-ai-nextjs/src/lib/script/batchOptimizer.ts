import { buildCharacterBible } from './characterBible'
import { buildInitialSynopsis, updateSynopsis } from './synopsis'

type FetchFn = (input: string, init?: any) => Promise<Response>

export interface BatchResult {
  optimizedScript: any
  changesSummary: Array<{ category: string, changes: string, rationale: string }>
}

export async function runBatchOptimize(params: {
  apiKey: string
  fetchImpl: FetchFn
  script: any
  characters: any[]
  onProgress?: (info: { total: number, index: number, message: string }) => void
}): Promise<BatchResult> {
  const { apiKey, fetchImpl, script, characters, onProgress } = params
  const total = (script?.scenes || []).length
  const bible = buildCharacterBible(characters, script)
  let synopsis = buildInitialSynopsis(script)
  const outScenes: any[] = new Array(total).fill(null)
  const changes: BatchResult['changesSummary'] = []

  for (let i = 0; i < total; i++) {
    onProgress?.({ total, index: i, message: `Optimizing scene ${i + 1}/${total}` })
    const current = script.scenes[i]
    const prevA = outScenes[i - 1]
    const prevB = outScenes[i - 2]
    const contextPrev = [prevB, prevA].filter(Boolean)

    const prompt = buildScenePrompt({ bible, synopsis, contextPrev, current })
    const scene = await callGeminiForScene({ apiKey, fetchImpl, prompt })
    const merged = mergeScene(current, scene, i)
    outScenes[i] = merged
    synopsis = updateSynopsis(synopsis, merged, i)
    changes.push({
      category: 'Scene',
      changes: `Scene ${i + 1} updated (heading/narration/dialogue may be revised).`,
      rationale: 'Maintain continuity with rolling synopsis and character bible.'
    })
  }

  return { optimizedScript: { scenes: outScenes }, changesSummary: changes }
}

function buildScenePrompt(input: { bible: string, synopsis: string, contextPrev: any[], current: any }): string {
  const { bible, synopsis, contextPrev, current } = input
  const prevText = contextPrev.map((s, idx) => `PREVIOUS ${idx + 1}:
${JSON.stringify(minimalScene(s), null, 2)}`).join('\n\n')
  return `You are an expert screenwriter. Optimize the CURRENT scene while preserving global continuity.

${bible}

${synopsis}

${prevText}

CURRENT:
${JSON.stringify(minimalScene(current), null, 2)}

Return ONLY JSON for ONE scene with fields: heading, action, narration, dialogue[{character,line}], music, sfx[], duration.
Rules:
- narration MUST be present and non-empty; if reducing, replace with 1–2 concise sentences.
- JSON only, no code fences, escape quotes, use \\n for line breaks.
`
}

async function callGeminiForScene({ apiKey, fetchImpl, prompt }: { apiKey: string, fetchImpl: FetchFn, prompt: string }): Promise<any> {
  const res = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1536, responseMimeType: 'application/json' }
      })
    }
  )
  if (!res.ok) throw new Error(`Gemini scene error: ${res.status}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const json = extractSceneJson(text)
  return json
}

function extractSceneJson(text: string): any {
  let s = text || ''
  const fence = s.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fence && fence[1]) s = fence[1]
  if (!s.trim().startsWith('{')) {
    const bal = balanced(s)
    if (bal) s = bal
  }
  s = normalizeJson(s)
  return JSON.parse(s)
}

function minimalScene(scene: any) {
  return {
    heading: scene?.heading || '',
    action: scene?.action || '',
    narration: scene?.narration || '',
    dialogue: Array.isArray(scene?.dialogue) ? scene.dialogue : [],
    music: scene?.music || '',
    sfx: Array.isArray(scene?.sfx) ? scene.sfx : [],
    duration: scene?.duration || 0
  }
}

function mergeScene(original: any, revised: any, idx: number) {
  const narration = coerceNarration(revised?.narration, original?.narration, revised?.action || original?.action)
  return {
    ...revised,
    imageUrl: original?.imageUrl,
    narrationAudioUrl: original?.narrationAudioUrl,
    musicAudio: original?.musicAudio,
    sceneNumber: original?.sceneNumber || (idx + 1),
    duration: revised?.duration || original?.duration,
    narration
  }
}

function coerceNarration(candidate: any, original: any, fallbackSource?: any): string {
  const val = String(candidate ?? '').trim()
  if (val && val.toLowerCase() !== 'none' && val !== 'null' && val !== 'undefined') return val
  const orig = String(original ?? '').trim()
  if (orig) return orig
  const action = String(fallbackSource ?? '').trim()
  if (!action) return ''
  const m = action.match(/[^.!?]*[.!?]/)
  const sentence = (m?.[0] || action).replace(/\s+/g, ' ').trim()
  return sentence.length > 220 ? sentence.slice(0, 217) + '…' : sentence
}

function balanced(text: string): string {
  const start = text.indexOf('{')
  if (start === -1) return ''
  const chars = Array.from(text)
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < chars.length; i++) {
    const c = chars[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
    } else {
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}') { depth--; if (depth === 0) return chars.slice(start, i + 1).join('') }
    }
  }
  return depth > 0 ? chars.slice(start).join('') + '}'.repeat(depth) : ''
}

function normalizeJson(input: string): string {
  let s = String(input || '')
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  s = s.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
  s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"')
  s = s.replace(/[\u2013\u2014]/g, '-')
  s = s.replace(/,\s*(\]|\})/g, '$1')
  return s
}


