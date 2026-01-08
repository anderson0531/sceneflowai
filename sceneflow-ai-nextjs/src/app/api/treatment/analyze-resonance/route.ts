import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import type {
  AnalyzeResonanceRequest,
  AnalyzeResonanceResponse,
  AudienceResonanceAnalysis,
  ResonanceAxis,
  ResonanceInsight,
  OptimizationRecommendation,
  GreenlightScore,
  AudienceIntent,
  getGreenlightTier
} from '@/lib/types/audienceResonance'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Audience Resonance Analysis API
 * 
 * Analyzes a film treatment against target market intent and returns:
 * - Greenlight score (0-100)
 * - Radar chart data (5 axes)
 * - Categorized insights with fix suggestions
 */
export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  
  try {
    const body: AnalyzeResonanceRequest = await request.json()
    const { treatment, intent, quickAnalysis = false } = body
    
    if (!treatment) {
      return NextResponse.json({
        success: false,
        error: 'Treatment data is required'
      }, { status: 400 })
    }
    
    // Quick analysis uses heuristics only (no AI cost)
    if (quickAnalysis) {
      const heuristicAnalysis = performHeuristicAnalysis(treatment, intent)
      return NextResponse.json({
        success: true,
        analysis: heuristicAnalysis,
        cached: false
      })
    }
    
    // Full AI analysis
    console.log(`[Resonance] Starting analysis for "${treatment.title}" with intent:`, intent)
    
    const analysis = await analyzeWithGemini(treatment, intent, reqId)
    
    return NextResponse.json({
      success: true,
      analysis,
      cached: false
    }, {
      headers: {
        'x-sf-request-id': reqId,
        'cache-control': 'no-store'
      }
    })
    
  } catch (error: any) {
    console.error('[Resonance] Analysis failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Analysis failed'
    }, { status: 500 })
  }
}

/**
 * Heuristic-based quick analysis (no AI credits)
 */
function performHeuristicAnalysis(
  treatment: AnalyzeResonanceRequest['treatment'],
  intent: AudienceIntent
): AudienceResonanceAnalysis {
  const axes: ResonanceAxis[] = [
    {
      id: 'originality',
      label: 'Concept Originality',
      description: 'How unique is the concept?',
      score: treatment.logline && treatment.logline.length > 50 ? 70 : 50,
      weight: 0.2
    },
    {
      id: 'genre-fidelity',
      label: 'Genre Fidelity',
      description: 'Does it match genre conventions?',
      score: treatment.genre?.toLowerCase().includes(intent.primaryGenre) ? 85 : 60,
      weight: 0.25
    },
    {
      id: 'character-depth',
      label: 'Character Depth',
      description: 'Are characters well-defined?',
      score: (treatment.protagonist && treatment.antagonist) ? 75 : 
             treatment.protagonist ? 60 : 40,
      weight: 0.2
    },
    {
      id: 'pacing',
      label: 'Pacing & Structure',
      description: 'Is the structure clear?',
      score: treatment.beats && treatment.beats.length >= 4 ? 80 : 
             treatment.act_breakdown ? 70 : 50,
      weight: 0.15
    },
    {
      id: 'commercial-viability',
      label: 'Commercial Viability',
      description: 'Is this marketable?',
      score: treatment.title && treatment.logline ? 70 : 50,
      weight: 0.2
    }
  ]
  
  // Calculate weighted average
  const totalWeight = axes.reduce((sum, a) => sum + a.weight, 0)
  const weightedScore = axes.reduce((sum, a) => sum + (a.score * a.weight), 0) / totalWeight
  const score = Math.round(weightedScore)
  
  const tierInfo = getGreenlightTierLocal(score)
  
  const greenlightScore: GreenlightScore = {
    score,
    tier: tierInfo.tier as any,
    label: tierInfo.label,
    confidence: 0.6, // Lower confidence for heuristic
    analysisDate: new Date().toISOString()
  }
  
  // Generate basic insights
  const insights: ResonanceInsight[] = []
  
  if (!treatment.protagonist) {
    insights.push({
      id: 'missing-protagonist',
      category: 'character-arc',
      status: 'weakness',
      title: 'Missing Protagonist Definition',
      insight: 'Your treatment lacks a clearly defined protagonist. Audiences connect through character.',
      actionable: true,
      fixSection: 'story'
    })
  }
  
  if (!treatment.beats || treatment.beats.length < 4) {
    insights.push({
      id: 'weak-structure',
      category: 'structural-beats',
      status: 'weakness',
      title: 'Incomplete Beat Structure',
      insight: 'Your treatment needs more defined story beats for clear pacing.',
      actionable: true,
      fixSection: 'beats'
    })
  }
  
  if (treatment.logline && treatment.logline.length > 50) {
    insights.push({
      id: 'strong-logline',
      category: 'market-positioning',
      status: 'strength',
      title: 'Compelling Logline',
      insight: 'Your logline effectively communicates the core concept.',
      actionable: false
    })
  }
  
  return {
    intent,
    treatmentId: 'heuristic',
    greenlightScore,
    axes,
    insights,
    recommendations: [],
    analysisVersion: '1.0-heuristic',
    generatedAt: new Date().toISOString(),
    creditsUsed: 0
  }
}

function getGreenlightTierLocal(score: number): { tier: string; label: string; color: string } {
  if (score >= 90) {
    return { tier: 'market-ready', label: 'Market Ready', color: '#22c55e' }
  } else if (score >= 70) {
    return { tier: 'strong-potential', label: 'Strong Potential', color: '#f59e0b' }
  } else {
    return { tier: 'needs-refinement', label: 'Needs Refinement', color: '#ef4444' }
  }
}

/**
 * Full AI-powered analysis using Gemini
 */
async function analyzeWithGemini(
  treatment: AnalyzeResonanceRequest['treatment'],
  intent: AudienceIntent,
  reqId: string
): Promise<AudienceResonanceAnalysis> {
  
  const prompt = buildAnalysisPrompt(treatment, intent)
  
  console.log('[Resonance] Calling Vertex AI Gemini for analysis...')
  
  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json'
  })
  
  if (!result?.text) {
    throw new Error('No response from Gemini')
  }
  
  const parsed = safeParseJsonFromText(result.text)
  
  // Validate and transform the response
  const axes: ResonanceAxis[] = [
    {
      id: 'originality',
      label: 'Concept Originality',
      description: 'How unique is the concept?',
      score: clamp(parsed.originality_score || 50, 0, 100),
      weight: 0.2
    },
    {
      id: 'genre-fidelity',
      label: 'Genre Fidelity',
      description: 'Does it match genre conventions?',
      score: clamp(parsed.genre_fidelity_score || 50, 0, 100),
      weight: 0.25
    },
    {
      id: 'character-depth',
      label: 'Character Depth',
      description: 'Are characters well-defined?',
      score: clamp(parsed.character_depth_score || 50, 0, 100),
      weight: 0.2
    },
    {
      id: 'pacing',
      label: 'Pacing & Structure',
      description: 'Is the structure clear?',
      score: clamp(parsed.pacing_score || 50, 0, 100),
      weight: 0.15
    },
    {
      id: 'commercial-viability',
      label: 'Commercial Viability',
      description: 'Is this marketable?',
      score: clamp(parsed.commercial_viability_score || 50, 0, 100),
      weight: 0.2
    }
  ]
  
  const overallScore = clamp(parsed.greenlight_score || calculateWeightedScore(axes), 0, 100)
  const tierInfo = getGreenlightTierLocal(overallScore)
  
  const greenlightScore: GreenlightScore = {
    score: overallScore,
    tier: tierInfo.tier as any,
    label: tierInfo.label,
    confidence: clamp(parsed.confidence || 0.8, 0, 1),
    analysisDate: new Date().toISOString()
  }
  
  // Transform insights
  const insights: ResonanceInsight[] = (parsed.insights || []).map((i: any, idx: number) => ({
    id: `insight-${idx}`,
    category: mapCategory(i.category),
    status: i.status === 'strength' ? 'strength' : i.status === 'neutral' ? 'neutral' : 'weakness',
    title: i.title || 'Insight',
    insight: i.insight || i.description || '',
    treatmentSection: i.treatment_section,
    actionable: Boolean(i.actionable),
    fixSuggestion: i.fix_suggestion,
    fixSection: mapFixSection(i.fix_section)
  }))
  
  // Transform recommendations
  const recommendations: OptimizationRecommendation[] = (parsed.recommendations || []).map((r: any, idx: number) => ({
    id: `rec-${idx}`,
    priority: r.priority === 'high' ? 'high' : r.priority === 'low' ? 'low' : 'medium',
    category: mapCategory(r.category),
    title: r.title || 'Recommendation',
    description: r.description || '',
    expectedImpact: clamp(r.expected_impact || 5, 0, 30),
    effort: r.effort === 'quick' ? 'quick' : r.effort === 'significant' ? 'significant' : 'moderate'
  }))
  
  return {
    intent,
    treatmentId: reqId,
    greenlightScore,
    axes,
    insights,
    recommendations,
    analysisVersion: '1.0',
    generatedAt: new Date().toISOString(),
    creditsUsed: 500 // Approximate credit cost
  }
}

function buildAnalysisPrompt(
  treatment: AnalyzeResonanceRequest['treatment'],
  intent: AudienceIntent
): string {
  const genreLabel = intent.primaryGenre.replace('-', ' ')
  const demoLabel = intent.targetDemographic.replace(/-/g, ' ')
  const toneLabel = intent.toneProfile.replace('-', ' ')
  
  return `You are a professional Creative Executive at a major film studio. Analyze this film treatment for market viability.

TARGET INTENT:
- Primary Genre: ${genreLabel}
- Target Demographic: ${demoLabel}
- Desired Tone: ${toneLabel}

TREATMENT:
Title: ${treatment.title || 'Untitled'}
Logline: ${treatment.logline || 'Not provided'}
Genre: ${treatment.genre || 'Not specified'}
Tone: ${treatment.tone || 'Not specified'}

Synopsis: ${treatment.synopsis || 'Not provided'}

Setting: ${treatment.setting || 'Not specified'}
Protagonist: ${treatment.protagonist || 'Not specified'}
Antagonist: ${treatment.antagonist || 'Not specified'}

Themes: ${Array.isArray(treatment.themes) ? treatment.themes.join(', ') : treatment.themes || 'Not specified'}

Beats: ${treatment.beats?.map(b => `${b.title}: ${b.intent || b.synopsis || ''}`).join('\n') || 'Not provided'}

Characters: ${treatment.character_descriptions?.map(c => `${c.name} (${c.role}): ${c.description}`).join('\n') || 'Not provided'}

Act Breakdown:
${treatment.act_breakdown ? `Act 1: ${treatment.act_breakdown.act1 || 'N/A'}\nAct 2: ${treatment.act_breakdown.act2 || 'N/A'}\nAct 3: ${treatment.act_breakdown.act3 || 'N/A'}` : 'Not provided'}

ANALYZE and return JSON with this structure:
{
  "greenlight_score": number (0-100, overall market readiness),
  "confidence": number (0-1, your confidence in this assessment),
  
  "originality_score": number (0-100),
  "genre_fidelity_score": number (0-100),
  "character_depth_score": number (0-100),
  "pacing_score": number (0-100),
  "commercial_viability_score": number (0-100),
  
  "insights": [
    {
      "category": "genre-alignment" | "audience-demographics" | "tone-consistency" | "character-arc" | "structural-beats" | "market-positioning",
      "status": "strength" | "weakness" | "neutral",
      "title": string,
      "insight": string (specific, actionable feedback),
      "treatment_section": string (which part of treatment this refers to),
      "actionable": boolean,
      "fix_suggestion": string (if actionable, provide specific text to add/change),
      "fix_section": "core" | "story" | "tone" | "beats" | "characters"
    }
  ],
  
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "category": string,
      "title": string,
      "description": string,
      "expected_impact": number (points this could add to score),
      "effort": "quick" | "moderate" | "significant"
    }
  ]
}

GENRE ANALYSIS GUIDELINES for ${genreLabel}:
${getGenreGuidelines(intent.primaryGenre)}

DEMOGRAPHIC RESONANCE for ${demoLabel}:
${getDemographicGuidelines(intent.targetDemographic)}

Provide at least 3 insights (mix of strengths and weaknesses) and 2 recommendations.
Be specific and actionable. Reference actual content from the treatment.
For weaknesses, always provide a fix_suggestion with specific text changes.`
}

function getGenreGuidelines(genre: string): string {
  const guidelines: Record<string, string> = {
    'thriller': 'Must have: clear stakes, ticking clock, escalating tension, "All Is Lost" moment, twist/reveal. Check for: suspenseful pacing, moral ambiguity, red herrings.',
    'horror': 'Must have: atmosphere of dread, clear monster/threat, final girl/survivor archetype, escalating scares. Check for: isolation, vulnerability, supernatural or psychological menace.',
    'drama': 'Must have: emotional core, character transformation, stakes (personal or interpersonal), cathartic resolution. Check for: authenticity, relatable struggles.',
    'comedy': 'Must have: clear comedic premise, set-up/payoff structure, likeable protagonist, stakes despite humor. Check for: comedic timing beats, character foibles.',
    'sci-fi': 'Must have: world-building consistency, technology/concept that drives plot, human element amidst spectacle. Check for: internal logic, thematic resonance (what does tech mean?).',
    'romance': 'Must have: meet-cute, obstacles to love, emotional vulnerability, satisfying resolution. Check for: chemistry setup, emotional stakes, genre conventions (will they/won\'t they).',
    'action': 'Must have: clear hero\'s goal, escalating set-pieces, physical stakes, villain with clear motivation. Check for: pacing, visual spectacle potential.',
    'documentary': 'Must have: clear thesis/angle, compelling subjects, narrative arc despite non-fiction. Check for: access, visual interest, emotional hook.',
    'fantasy': 'Must have: consistent magic system, world-building, chosen one or quest structure. Check for: internal logic, wonder moments.',
    'mystery': 'Must have: central question, clues/red herrings, satisfying revelation. Check for: fair-play mystery rules, detective/investigator character.'
  }
  return guidelines[genre] || 'Evaluate against standard narrative conventions: protagonist goal, obstacles, climax, resolution.'
}

function getDemographicGuidelines(demo: string): string {
  const guidelines: Record<string, string> = {
    'gen-z-18-24': 'Values: authenticity, social consciousness, diverse representation, fast-paced content, digital native themes, mental health awareness. Avoid: preachy messaging, outdated references.',
    'millennials-25-34': 'Values: nostalgia with modern twist, work-life themes, relationship complexity, economic anxiety themes, ironic humor. Avoid: condescension, simplistic solutions.',
    'gen-x-35-54': 'Values: skepticism, anti-establishment themes, family dynamics, career/life balance, quality over spectacle. Avoid: excessive CGI reliance, superficiality.',
    'boomers-55+': 'Values: legacy themes, health/mortality awareness, grandparent roles, historical context, proven star power. Avoid: excessive technology focus, rapid editing.',
    'teens-13-17': 'Values: identity exploration, peer dynamics, first experiences, rebellion, aspirational heroes. Avoid: condescension, adult preachiness.',
    'family-all-ages': 'Values: multi-generational appeal, positive messaging, adventure, humor for all ages, emotional moments. Avoid: adult innuendo, violence, complex moral ambiguity.',
    'mature-21+': 'Values: complex themes, moral ambiguity, explicit content if meaningful, sophisticated narratives. Avoid: unnecessary shock value.'
  }
  return guidelines[demo] || 'Consider broad appeal factors: relatable characters, clear narrative, emotional resonance.'
}

function mapCategory(cat: string): ResonanceInsight['category'] {
  const map: Record<string, ResonanceInsight['category']> = {
    'genre-alignment': 'genre-alignment',
    'genre': 'genre-alignment',
    'audience-demographics': 'audience-demographics',
    'audience': 'audience-demographics',
    'demographics': 'audience-demographics',
    'tone-consistency': 'tone-consistency',
    'tone': 'tone-consistency',
    'character-arc': 'character-arc',
    'character': 'character-arc',
    'characters': 'character-arc',
    'structural-beats': 'structural-beats',
    'structure': 'structural-beats',
    'beats': 'structural-beats',
    'pacing': 'structural-beats',
    'market-positioning': 'market-positioning',
    'market': 'market-positioning',
    'commercial': 'market-positioning'
  }
  return map[cat?.toLowerCase()] || 'market-positioning'
}

function mapFixSection(section: string): ResonanceInsight['fixSection'] | undefined {
  if (!section) return undefined
  const map: Record<string, ResonanceInsight['fixSection']> = {
    'core': 'core',
    'story': 'story',
    'tone': 'tone',
    'beats': 'beats',
    'characters': 'characters'
  }
  return map[section?.toLowerCase()]
}

function calculateWeightedScore(axes: ResonanceAxis[]): number {
  const totalWeight = axes.reduce((sum, a) => sum + a.weight, 0)
  const weightedScore = axes.reduce((sum, a) => sum + (a.score * a.weight), 0) / totalWeight
  return Math.round(weightedScore)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
