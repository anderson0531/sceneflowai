export interface ConceptInput {
  concept: string
  targetAudience?: string
  keyMessage?: string
  tone?: string
}

export interface ConceptScores {
  audience: number // 0-100
  technical: number // 0-100
  rationale: {
    audience: string
    technical: string
  }
  breakdown?: {
    audienceFactors: Array<{ label: string; contribution: number; note?: string }>
    technicalFactors: Array<{ label: string; contribution: number; note?: string }>
  }
  recommendations?: {
    audience: string[]
    technical: string[]
  }
}

export interface ProfessionalizedConcept {
  title: string
  summary: string
}

export class ScoreService {
  static professionalize(input: ConceptInput): ProfessionalizedConcept {
    const title = this.extractTitle(input.concept) || 'Untitled Concept'
    const parts: string[] = []
    if (input.keyMessage) parts.push(input.keyMessage)
    if (input.targetAudience) parts.push(`For: ${input.targetAudience}`)
    if (input.tone) parts.push(`Tone: ${input.tone}`)
    const summary = [this.cleanSentence(input.concept), parts.join(' • ')].filter(Boolean).join('\n\n')
    return { title, summary }
  }

  static score(input: ConceptInput): ConceptScores {
    const len = (input.concept || '').split(/\s+/).filter(Boolean).length
    const hasAudience = !!input.targetAudience?.trim()
    const hasMessage = !!input.keyMessage?.trim()
    const hasTone = !!input.tone?.trim()

    // Lightweight heuristic scoring
    const richnessAudience = Math.min(20, Math.max(0, len - 12))
    const richnessTechnical = Math.min(20, Math.max(0, len - 15))
    const audienceTarget = hasAudience ? 20 : 0
    const technicalMessage = hasMessage ? 20 : 0
    const technicalTone = hasTone ? 10 : 0

    let audience = 40 + audienceTarget + richnessAudience
    let technical = 40 + technicalMessage + technicalTone + richnessTechnical

    audience = Math.max(10, Math.min(95, audience))
    technical = Math.max(10, Math.min(95, technical))

    const breakdown = {
      audienceFactors: [
        { label: 'Baseline appeal', contribution: 40, note: 'General content viability' },
        { label: 'Target audience specified', contribution: audienceTarget, note: hasAudience ? 'Audience defined' : 'Missing audience' },
        { label: 'Concept richness (detail/length)', contribution: richnessAudience, note: `${len} words` }
      ],
      technicalFactors: [
        { label: 'Baseline structure', contribution: 40, note: 'General production feasibility' },
        { label: 'Key message clarity', contribution: technicalMessage, note: hasMessage ? 'Defined' : 'Missing' },
        { label: 'Tone specified', contribution: technicalTone, note: hasTone ? 'Defined' : 'Missing' },
        { label: 'Concept richness (detail/length)', contribution: richnessTechnical, note: `${len} words` }
      ]
    }

    const recAudience: string[] = []
    const recTechnical: string[] = []

    if (!hasAudience) recAudience.push('Specify a precise audience segment (demographic, interest, experience level).')
    if (len < 30) recAudience.push('Add a compelling hook, specific outcome, and emotional payoff (at least one concrete example).')
    recAudience.push('Reference a trending topic or “why now” angle to boost shareability.')
    recAudience.push('Clarify platform fit (e.g., YouTube vs TikTok) to tailor pacing and framing.')

    if (!hasMessage) recTechnical.push('Define a single-sentence key message or thesis to anchor the narrative.')
    if (!hasTone) recTechnical.push('Select a tone (e.g., Professional, Energetic) to guide voiceover and visuals.')
    if (len < 40) recTechnical.push('Outline a 3-act structure with setup, tension, and resolution. Include a call-to-action.')
    recTechnical.push('State intended duration and any visual motifs or references for shot design.')

    return {
      audience,
      technical,
      rationale: {
        audience: hasAudience ? 'Audience identified; messaging can be tailored.' : 'Add a clear audience to improve resonance.',
        technical: hasMessage ? 'Key message improves clarity.' : 'Define a key message to anchor storytelling.'
      },
      breakdown,
      recommendations: {
        audience: recAudience,
        technical: recTechnical
      }
    }
  }

  private static extractTitle(text?: string): string | null {
    if (!text) return null
    const firstSentence = text.split(/[\.!?]/)[0]
    return this.titleCase(firstSentence.slice(0, 60).trim())
  }

  private static cleanSentence(text?: string): string {
    return (text || '').trim().replace(/\s+/g, ' ')
  }

  private static titleCase(s: string): string {
    return s
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase())
  }
}
