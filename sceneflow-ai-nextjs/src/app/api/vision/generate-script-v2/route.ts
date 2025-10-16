import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 })
    }

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const treatment = project.metadata?.filmTreatmentVariant
    if (!treatment) {
      return NextResponse.json({ success: false, error: 'No film treatment found' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 })
    }

    // Simple calculation: ~1 scene per minute
    const duration = project.duration || 300
    const sceneCount = Math.max(10, Math.min(40, Math.floor(duration / 60)))
    
    console.log(`[Script Gen V2] Generating ${sceneCount} scenes for ${duration}s project`)

    // Generate in 2 batches (20 scenes max per batch)
    const batchSize = Math.ceil(sceneCount / 2)
    const allScenes: any[] = []

    for (let batch = 0; batch < 2; batch++) {
      const start = batch * batchSize + 1
      const end = Math.min((batch + 1) * batchSize, sceneCount)
      
      const prompt = buildPrompt(treatment, start, end, sceneCount, allScenes)
      const response = await callGemini(apiKey, prompt)
      const scenes = parseScenes(response, start, end)
      
      allScenes.push(...scenes)
      console.log(`[Script Gen V2] Batch ${batch + 1}/2: ${scenes.length} scenes`)
    }

    // Build final script
    const script = {
      title: treatment.title,
      logline: treatment.logline,
      script: { scenes: allScenes },
      characters: extractCharacters(allScenes),
      totalDuration: duration
    }

    // Save to project
    await project.update({
      metadata: {
        ...project.metadata,
        visionPhase: {
          script,
          scriptGenerated: true
        }
      }
    })

    return NextResponse.json({ success: true, script })
    
  } catch (error: any) {
    console.error('[Script Gen V2] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

function buildPrompt(treatment: any, start: number, end: number, total: number, previousScenes: any[]) {
  const prev = previousScenes.length > 0
    ? `PREVIOUS SCENES:\n${previousScenes.slice(-3).map((s: any) => `${s.sceneNumber}. ${s.heading}: ${s.action.substring(0, 100)}...`).join('\n')}\n\n`
    : ''

  return `Generate scenes ${start}-${end} of a ${total}-scene script.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
Genre: ${treatment.genre}
Tone: ${treatment.tone}

${prev}Return JSON array ONLY:
[
  {
    "sceneNumber": ${start},
    "heading": "INT. LOCATION - TIME",
    "action": "Detailed action and what happens",
    "dialogue": [{"character": "NAME", "line": "text"}],
    "visualDescription": "Camera, lighting, composition",
    "duration": ${Math.floor((treatment.total_duration_seconds || 300) / total)}
  }
]

Generate ${end - start + 1} complete scenes with dialogue.`
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function parseScenes(response: string, start: number, end: number): any[] {
  try {
    const cleaned = response.replace(/```json\n?|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || [])
    
    // Mark as expanded and add missing fields
    return scenes.map((s: any, idx: number) => ({
      sceneNumber: start + idx,
      heading: s.heading || `SCENE ${start + idx}`,
      action: s.action || 'Scene content',
      dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
      visualDescription: s.visualDescription || s.action || 'Cinematic shot',
      duration: s.duration || 8,
      isExpanded: true
    }))
  } catch {
    // Fallback: create basic scenes
    const count = end - start + 1
    return Array.from({ length: count }, (_, i) => ({
      sceneNumber: start + i,
      heading: `SCENE ${start + i}`,
      action: 'Scene content',
      dialogue: [],
      visualDescription: 'Cinematic shot',
      duration: 8,
      isExpanded: true
    }))
  }
}

function extractCharacters(scenes: any[]): any[] {
  const charMap = new Map()
  scenes.forEach((scene: any) => {
    scene.dialogue?.forEach((d: any) => {
      if (!charMap.has(d.character)) {
        charMap.set(d.character, {
          name: d.character,
          role: 'character',
          description: `Character from script`
        })
      }
    })
  })
  return Array.from(charMap.values())
}

