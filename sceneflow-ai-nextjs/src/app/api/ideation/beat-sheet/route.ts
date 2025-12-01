import { NextRequest, NextResponse } from 'next/server'
import { strictJsonPromptSuffix } from '@/lib/safeJson'

interface BeatSheetRequest {
  input: string
  coreConcept: {
    input_title: string
    input_synopsis: string
    core_themes: string[]
    narrative_structure: string
  }
  filmTreatment: {
    film_treatment: string
    visual_style: string
    tone_description: string
    target_audience: string
  }
  characters: Array<{
    name: string
    role: string
    description: string
    importance: string
    key_traits: string[]
  }>
  targetAudience?: string
  keyMessage?: string
  tone?: string
  genre?: string
  duration?: number
  platform?: string
}

interface Beat {
  beat_number: number
  beat_title: string
  beat_description: string
  duration_estimate: string
  key_elements: string[]
  visual_cues: string[]
  audio_cues: string[]
}

interface Act {
  title: string
  duration: string
  beats: Beat[]
}

interface BeatSheetResponse {
  success: boolean
  data: {
    act_structure: {
      act_1: Act
      act_2: Act
      act_3: Act
    }
    total_duration: string
    pacing_notes: string[]
    transition_notes: string[]
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body: BeatSheetRequest = await request.json()
    const { 
      input, 
      coreConcept, 
      filmTreatment, 
      characters,
      targetAudience, 
      keyMessage, 
      tone, 
      genre, 
      duration, 
      platform 
    } = body

    if (!input || !coreConcept || !filmTreatment || !characters) {
      return NextResponse.json({
        success: false,
        message: 'Input content, core concept, film treatment, and characters are required'
      }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Google Gemini API key not configured'
      }, { status: 500 })
    }

    console.log('📋 Beat Sheet Generation - Input length:', input.length)
    console.log('📋 Core concept:', coreConcept.input_title)
    console.log('📋 Characters count:', characters.length)

    const beatSheet = await generateBeatSheet(input, coreConcept, filmTreatment, characters, {
      targetAudience,
      keyMessage,
      tone,
      genre,
      duration,
      platform
    }, apiKey)

    return NextResponse.json({
      success: true,
      data: beatSheet,
      message: 'Beat sheet generated successfully'
    })

  } catch (error) {
    console.error('❌ Beat Sheet Error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to generate beat sheet'
    }, { status: 500 })
  }
}

async function generateBeatSheet(
  input: string,
  coreConcept: any,
  filmTreatment: any,
  characters: any[],
  context: any,
  apiKey: string
): Promise<BeatSheetResponse['data']> {
  
  const prompt = `CRITICAL INSTRUCTIONS: You are a professional beat sheet writer. Create a detailed beat sheet based on the analysis, NOT by copying the input.

INPUT:
${input}

CORE CONCEPT:
- Title: ${coreConcept.input_title}
- Synopsis: ${coreConcept.input_synopsis}
- Themes: ${coreConcept.core_themes.join(', ')}
- Structure: ${coreConcept.narrative_structure}

FILM TREATMENT:
- Treatment: ${filmTreatment.film_treatment}
- Visual Style: ${filmTreatment.visual_style}
- Tone: ${filmTreatment.tone_description}
- Target Audience: ${filmTreatment.target_audience}

CHARACTERS:
${characters.map(char => `- ${char.name} (${char.role}): ${char.description}`).join('\n')}

CONTEXT:
- Target Audience: ${context.targetAudience || 'General'}
- Key Message: ${context.keyMessage || 'Not specified'}
- Tone: ${context.tone || 'Professional'}
- Genre: ${context.genre || 'Documentary'}
- Duration: ${context.duration || 300} seconds (minimum 5 minutes)
- Platform: ${context.platform || 'Multi-platform'}

CRITICAL RULES:
1. DO NOT copy or repeat the input content
2. Create ORIGINAL beat descriptions based on the analysis
3. Focus on STRUCTURE and PACING, not scene details
4. Each beat should be CONCISE but informative
5. Use the characters and themes to guide the beats

TASK: Create a detailed beat sheet with:
1. Three-act structure with specific beats
2. Each beat should have detailed descriptions (ORIGINAL, not copied)
3. Duration estimates that add up to the total duration
4. Visual and audio cues for each beat
5. Pacing and transition notes

CRITICAL: Total duration of all beats must equal ${context.duration || 300} seconds (minimum 5 minutes).

Respond with valid JSON only:
{
  "act_structure": {
    "act_1": {
      "title": "Setup",
      "duration": "25% of total",
      "beats": [
        {
          "beat_number": 1,
          "beat_title": "Opening Hook",
          "beat_description": "Detailed description of what happens",
          "duration_estimate": "5-10% of total",
          "key_elements": ["Element 1", "Element 2"],
          "visual_cues": ["Visual 1", "Visual 2"],
          "audio_cues": ["Audio 1", "Audio 2"]
        }
      ]
    },
    "act_2": {
      "title": "Development",
      "duration": "50% of total",
      "beats": [
        {
          "beat_number": 2,
          "beat_title": "Main Content",
          "beat_description": "Detailed description of core content",
          "duration_estimate": "30-40% of total",
          "key_elements": ["Element 1", "Element 2"],
          "visual_cues": ["Visual 1", "Visual 2"],
          "audio_cues": ["Audio 1", "Audio 2"]
        }
      ]
    },
    "act_3": {
      "title": "Resolution",
      "duration": "25% of total",
      "beats": [
        {
          "beat_number": 3,
          "beat_title": "Call to Action",
          "beat_description": "Clear conclusion and CTA",
          "duration_estimate": "15-20% of total",
          "key_elements": ["Element 1", "Element 2"],
          "visual_cues": ["Visual 1", "Visual 2"],
          "audio_cues": ["Audio 1", "Audio 2"]
        }
      ]
    }
  },
  "total_duration": "${context.duration || 60} seconds",
  "pacing_notes": ["Note 1", "Note 2"],
  "transition_notes": ["Transition 1", "Transition 2"]
}` + strictJsonPromptSuffix

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!generatedText) {
    throw new Error('No response from Gemini API')
  }

  console.log('📋 Gemini Beat Sheet Response:', generatedText)

  try {
  const parsed = (() => {
    let t = (generatedText || '').trim()
    if (t.includes('```')) { const s=t.indexOf('```'); const e=t.indexOf('```', s+3); if (s!==-1&&e!==-1&&e>s){ t=t.slice(s+3,e).trim(); const nl=t.indexOf('\n'); const fl= nl!==-1 ? t.slice(0,nl) : t; if (/^[a-zA-Z]+\s*$/.test(fl)) t=(nl!==-1?t.slice(nl+1):'').trim(); } }
    const a=t.indexOf('{'); const b=t.lastIndexOf('}'); if (a!==-1&&b!==-1&&b>a) t=t.slice(a,b+1);
    t = t.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/,\s*([}\]])/g,'$1')
    return JSON.parse(t)
  })()
    return {
      act_structure: parsed.act_structure || {
        act_1: { title: 'Setup', duration: '25%', beats: [] },
        act_2: { title: 'Development', duration: '50%', beats: [] },
        act_3: { title: 'Resolution', duration: '25%', beats: [] }
      },
      total_duration: parsed.total_duration || `${context.duration || 60} seconds`,
      pacing_notes: Array.isArray(parsed.pacing_notes) ? parsed.pacing_notes : [],
      transition_notes: Array.isArray(parsed.transition_notes) ? parsed.transition_notes : []
    }
  } catch (parseError) {
    console.error('❌ Failed to parse beat sheet response:', parseError)
    throw new Error('Failed to parse beat sheet response')
  }
}
