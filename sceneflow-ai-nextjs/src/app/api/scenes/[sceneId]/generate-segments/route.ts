import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120
export const runtime = 'nodejs'

interface GenerateSegmentsRequest {
  preferredDuration: number
  sceneId?: string
  projectId?: string
}

interface Segment {
  sequence: number
  estimated_duration: number
  video_generation_prompt: string
  recommended_generation_type: 'T2V' | 'I2V' | 'T2I'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sceneId: string }> }
) {
  try {
    const { sceneId } = await params
    const body: GenerateSegmentsRequest = await req.json()
    const { preferredDuration, projectId } = body

    if (!sceneId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: sceneId and projectId' },
        { status: 400 }
      )
    }

    if (!preferredDuration || preferredDuration <= 0) {
      return NextResponse.json(
        { error: 'preferredDuration must be a positive number' },
        { status: 400 }
      )
    }

    console.log('[Scene Segmentation] Generating segments for scene:', sceneId)

    // Fetch project and scene data
    const projectResponse = await fetch(`${req.nextUrl.origin}/api/projects/${projectId}`)
    if (!projectResponse.ok) {
      throw new Error('Failed to fetch project')
    }
    const project = await projectResponse.json()

    // Extract scene data from both possible locations
    const visionPhase = project.metadata?.visionPhase || {}
    const scenesFromDirect = visionPhase.scenes || []
    const scenesFromScript = visionPhase.script?.script?.scenes || []
    
    // Combine scenes (prioritize direct scenes, then script scenes)
    const allScenes = [...scenesFromDirect]
    // Add scenes from script that aren't already in direct scenes
    scenesFromScript.forEach((s: any) => {
      const existingIndex = allScenes.findIndex((existing: any) => 
        existing.id === s.id || 
        (existing.sceneNumber && s.sceneNumber && existing.sceneNumber === s.sceneNumber)
      )
      if (existingIndex === -1) {
        allScenes.push(s)
      }
    })
    
    console.log('[Scene Segmentation] Found scenes:', allScenes.length, 'from direct:', scenesFromDirect.length, 'from script:', scenesFromScript.length)

    // Improved scene matching logic
    let scene: any = null
    
    // Try exact id match first
    scene = allScenes.find((s: any) => s.id === sceneId)
    
    // Try sceneNumber match (if sceneId is numeric)
    if (!scene && !isNaN(parseInt(sceneId))) {
      const sceneNumber = parseInt(sceneId)
      scene = allScenes.find((s: any) => s.sceneNumber === sceneNumber)
    }
    
    // Try scene-{index} format (e.g., "scene-1" -> index 0)
    if (!scene && sceneId.startsWith('scene-')) {
      const indexMatch = sceneId.match(/^scene-(\d+)$/)
      if (indexMatch) {
        const index = parseInt(indexMatch[1]) - 1 // Convert to 0-indexed
        if (index >= 0 && index < allScenes.length) {
          scene = allScenes[index]
        }
      }
    }
    
    // Fall back to array index if sceneId is numeric (1-indexed)
    if (!scene && !isNaN(parseInt(sceneId))) {
      const index = parseInt(sceneId) - 1 // Convert to 0-indexed
      if (index >= 0 && index < allScenes.length) {
        scene = allScenes[index]
      }
    }
    
    if (!scene) {
      console.error('[Scene Segmentation] Scene not found. SceneId:', sceneId, 'Available scenes:', allScenes.map((s: any, idx: number) => ({
        index: idx,
        id: s.id,
        sceneNumber: s.sceneNumber,
        fallbackId: `scene-${idx + 1}`
      })))
      return NextResponse.json(
        { error: 'Scene not found', sceneId, availableScenes: allScenes.length },
        { status: 404 }
      )
    }
    
    console.log('[Scene Segmentation] Found scene:', scene.id || scene.sceneNumber || 'unknown', 'at index:', allScenes.indexOf(scene))

    // Get script and director's notes
    const script = buildScriptText(scene)
    const directorsNotes = buildDirectorsNotes(scene)

    // Generate segmentation prompt
    const prompt = generateBreakdownPrompt(script, directorsNotes, preferredDuration)

    // Call Gemini 2.5
    const segments = await callGeminiForSegmentation(prompt)

    // Transform segments to match our data structure
    const transformedSegments = segments.map((seg: Segment, idx: number) => {
      let cumulativeTime = 0
      for (let i = 0; i < idx; i++) {
        cumulativeTime += segments[i].estimated_duration
      }

      return {
        segmentId: `seg_${sceneId}_${seg.sequence}`,
        sequenceIndex: seg.sequence,
        startTime: cumulativeTime,
        endTime: cumulativeTime + seg.estimated_duration,
        status: 'DRAFT' as const,
        generatedPrompt: seg.video_generation_prompt,
        userEditedPrompt: null,
        activeAssetUrl: null,
        assetType: null as const,
        references: {
          startFrameUrl: null,
          endFrameUrl: null,
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
        },
        takes: [],
      }
    })

    return NextResponse.json({
      success: true,
      segments: transformedSegments,
      targetSegmentDuration: preferredDuration,
    })
  } catch (error: any) {
    console.error('[Scene Segmentation] Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate segments',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

function buildScriptText(scene: any): string {
  const parts: string[] = []
  
  if (scene.heading) {
    const headingText = typeof scene.heading === 'string' ? scene.heading : scene.heading.text
    parts.push(`SCENE HEADING: ${headingText}`)
  }
  
  if (scene.narration) {
    parts.push(`NARRATION: ${scene.narration}`)
  }
  
  if (scene.visualDescription) {
    parts.push(`VISUAL DESCRIPTION: ${scene.visualDescription}`)
  }
  
  if (scene.dialogue && Array.isArray(scene.dialogue)) {
    const dialogueText = scene.dialogue
      .map((d: any) => {
        const char = d.character || d.name || 'UNKNOWN'
        const text = d.text || d.dialogue || ''
        return `${char}: ${text}`
      })
      .join('\n')
    parts.push(`DIALOGUE:\n${dialogueText}`)
  }
  
  return parts.join('\n\n')
}

function buildDirectorsNotes(scene: any): string {
  if (!scene.sceneDirection) {
    return 'No director notes available.'
  }

  const dir = scene.sceneDirection
  const parts: string[] = []

  if (dir.camera) {
    parts.push(`CAMERA: ${JSON.stringify(dir.camera, null, 2)}`)
  }
  if (dir.lighting) {
    parts.push(`LIGHTING: ${JSON.stringify(dir.lighting, null, 2)}`)
  }
  if (dir.scene) {
    parts.push(`SCENE: ${JSON.stringify(dir.scene, null, 2)}`)
  }
  if (dir.talent) {
    parts.push(`TALENT: ${JSON.stringify(dir.talent, null, 2)}`)
  }
  if (dir.audio) {
    parts.push(`AUDIO: ${JSON.stringify(dir.audio, null, 2)}`)
  }

  return parts.length > 0 ? parts.join('\n\n') : 'No specific director notes.'
}

function generateBreakdownPrompt(
  script: string,
  directorsNotes: string,
  preferredDuration: number
): string {
  return `
SYSTEM INSTRUCTION:

You are an expert film editor and AI video generation specialist (using models like Veo). Your task is to break down a film scene into sequential, generation-ready segments (clips).

INPUTS:

1. Scene Script (Dialogue & Action):

${script}

2. Director's Chair (Cinematic Direction, Style, Mood):

${directorsNotes}

3. Target Segment Duration: ${preferredDuration} seconds. (Guideline: Prioritize natural breaks in action or dialogue over strict timing.)

RULES & OUTPUT:

1. Continuity is paramount. Segments must flow logically from one to the next.

2. Ensure all dialogue and key actions are covered.

3. Output must be a strict JSON array of objects.

SEGMENT FIELDS:

- sequence: (Integer) Sequential ID starting from 1.

- estimated_duration: (Float) Estimated time in seconds.

- video_generation_prompt: (String) A highly detailed, vivid description optimized for video generation. Synthesize the script action, camera direction, lighting, and style cues for THIS SPECIFIC segment.

- recommended_generation_type: (String) Recommend the best approach:
    - "T2V" (Text-to-Video): Standard generation.
    - "I2V" (Image-to-Video): Use when seamless continuity from the previous clip is critical (requires a starting frame).
    - "T2I" (Text-to-Image): For static shots where motion is not required.

EXAMPLE JSON OUTPUT:

[
  {
    "sequence": 1,
    "estimated_duration": 6.5,
    "video_generation_prompt": "Wide establishing shot, low angle. The lobby is futuristic, cold, and imposing with blue ambient lighting. Brian Anderson stands alone, center frame. Slow, smooth camera push-in.",
    "recommended_generation_type": "T2V"
  }
]

IMPORTANT: Return ONLY valid JSON. Do not include markdown code blocks or any explanatory text.
`
}

async function callGeminiForSegmentation(prompt: string): Promise<Segment[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Google Gemini API key not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Scene Segmentation] Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    console.error('[Scene Segmentation] No text in response:', data)
    throw new Error('No segments generated from Gemini')
  }

  // Parse JSON response
  let segments: Segment[]
  try {
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    segments = JSON.parse(cleanedText)
  } catch (parseError) {
    console.error('[Scene Segmentation] JSON parse error:', parseError)
    console.error('[Scene Segmentation] Response text:', text.substring(0, 500))
    throw new Error('Failed to parse segments JSON')
  }

  // Validate segments
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('Invalid segments format: expected non-empty array')
  }

  // Validate each segment
  for (const seg of segments) {
    if (!seg.sequence || !seg.estimated_duration || !seg.video_generation_prompt || !seg.recommended_generation_type) {
      throw new Error('Invalid segment format: missing required fields')
    }
    if (!['T2V', 'I2V', 'T2I'].includes(seg.recommended_generation_type)) {
      throw new Error(`Invalid generation type: ${seg.recommended_generation_type}`)
    }
  }

  return segments
}

