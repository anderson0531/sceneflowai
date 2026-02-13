/**
 * Series Resonance Analysis API
 * 
 * Analyzes a production series for audience engagement, character depth,
 * story arc coherence, and commercial viability.
 * 
 * POST /api/series/[seriesId]/analyze-resonance
 */

import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'
import { callLLM } from '@/services/llmGateway'
import { v4 as uuidv4 } from 'uuid'
import {
  SeriesResonanceAnalysis,
  SeriesResonanceAxis,
  EpisodeEngagementScore,
  SeriesResonanceInsight,
  CharacterAnalysis,
  LocationAnalysis,
  getSeriesGreenlightTier,
  SERIES_RESONANCE_WEIGHTS
} from '@/types/series'

export const dynamic = 'force-dynamic'
export const maxDuration = 180 // 3 minutes for comprehensive analysis

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * Safely parse JSON from LLM responses
 */
function safeParseJSON(text: string): any {
  let cleaned = text.trim()
  
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      let json = cleaned.slice(firstBrace, lastBrace + 1)
      json = json.replace(/,(\s*[\]\}])/g, '$1')
      return JSON.parse(json)
    }
    throw new Error('Invalid JSON from LLM')
  }
}

/**
 * GET /api/series/[seriesId]/analyze-resonance
 * 
 * Retrieve cached resonance analysis without re-running analysis
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString()
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    const cachedAnalysis = series.resonance_analysis
    
    if (!cachedAnalysis) {
      return NextResponse.json({
        success: true,
        analysis: null,
        message: 'No cached analysis available. Run POST to analyze.'
      })
    }
    
    // Check if analysis is stale (episode count changed)
    const currentEpisodeCount = series.episode_blueprints?.length || 0
    const analyzedEpisodeCount = cachedAnalysis.episodeCount || 0
    const isStale = currentEpisodeCount !== analyzedEpisodeCount
    
    return NextResponse.json({
      success: true,
      analysis: cachedAnalysis,
      isStale,
      analyzedAt: cachedAnalysis.analyzedAt,
      currentEpisodeCount,
      analyzedEpisodeCount,
      isReadyForProduction: cachedAnalysis.greenlightScore?.score >= 90
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [GET /api/series/${seriesId}/analyze-resonance] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve analysis'
    }, { status: 500 })
  }
}

/**
 * POST /api/series/[seriesId]/analyze-resonance
 * 
 * Analyze series for audience resonance
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString()
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    const bible = series.production_bible || {}
    const episodes = series.episode_blueprints || []
    const characters = bible.characters || []
    const locations = bible.locations || []
    
    if (episodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Series must have at least one episode to analyze'
      }, { status: 400 })
    }
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/analyze-resonance] Analyzing series with ${episodes.length} episodes`)
    
    // Get previous analysis for iteration tracking and score stabilization
    const existingAnalysis = series.resonance_analysis || {}
    const previousScore = existingAnalysis.greenlightScore?.score || null
    const existingAppliedFixes = existingAnalysis.appliedFixes || []
    const previousIterationCount = existingAnalysis.iterationCount || 0
    const currentIteration = previousIterationCount + 1
    
    // Build comprehensive prompt for analysis with context about previous analysis
    const analysisPrompt = buildAnalysisPrompt(
      series, bible, episodes, characters, locations,
      { previousScore, iterationCount: currentIteration, appliedFixes: existingAppliedFixes }
    )
    
    const response = await callLLM(
      { 
        provider: 'gemini', 
        model: 'gemini-2.5-flash',
        maxOutputTokens: 16384,
        timeoutMs: 120000
      },
      analysisPrompt
    )
    
    const rawAnalysis = safeParseJSON(response)
    
    // Build final analysis with normalized scores
    const analysis = buildAnalysisResult(seriesId, rawAnalysis, episodes, characters, locations, previousScore, currentIteration)
    
    // Determine score trend
    let scoreTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (previousScore !== null) {
      const scoreDiff = analysis.greenlightScore.score - previousScore
      if (scoreDiff > 2) scoreTrend = 'improving'
      else if (scoreDiff < -2) scoreTrend = 'declining'
    }
    
    // Determine if production ready (score >= 85 AND at least 2 iterations)
    const isProductionReady = analysis.greenlightScore.score >= 85 && currentIteration >= 2
    
    // Determine suggested action
    let suggestedAction: 'proceed-to-production' | 'apply-fixes' | 'major-rework' | 'continue-iterating'
    if (isProductionReady) {
      suggestedAction = 'proceed-to-production'
    } else if (analysis.greenlightScore.score < 60) {
      suggestedAction = 'major-rework'
    } else if (analysis.insights.filter(i => i.actionable && !existingAppliedFixes.includes(i.id)).length > 0) {
      suggestedAction = 'apply-fixes'
    } else {
      suggestedAction = 'continue-iterating'
    }
    
    // Persist analysis to database for future reference
    await series.update({
      resonance_analysis: {
        ...analysis,
        appliedFixes: existingAppliedFixes,
        iterationCount: currentIteration,
        previousScore,
        isProductionReady,
        suggestedAction,
        scoreTrend,
        analyzedAt: timestamp,
        episodeCount: episodes.length,
        version: '1.1'
      }
    })
    
    // Include all metadata in the returned analysis
    const analysisWithMetadata = {
      ...analysis,
      appliedFixes: existingAppliedFixes,
      iterationCount: currentIteration,
      previousScore,
      isProductionReady,
      suggestedAction,
      scoreTrend
    }
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/analyze-resonance] Analysis complete. Score: ${analysis.greenlightScore.score} (iteration ${currentIteration}, trend: ${scoreTrend})`)
    
    return NextResponse.json({
      success: true,
      analysis: analysisWithMetadata,
      isReadyForProduction: isProductionReady,
      suggestedAction,
      iterationCount: currentIteration,
      scoreTrend,
      savedToDatabase: true
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series/${seriesId}/analyze-resonance] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }, { status: 500 })
  }
}

/**
 * Build the comprehensive analysis prompt
 */
function buildAnalysisPrompt(
  series: Series,
  bible: any,
  episodes: any[],
  characters: any[],
  locations: any[],
  context?: { previousScore: number | null; iterationCount: number; appliedFixes: string[] }
): string {
  // Episode summaries with story threads
  const episodeSummaries = episodes.map(ep => {
    const threads = ep.storyThreads?.map((t: any) => `${t.name}(${t.status})`).join(', ') || 'none'
    return `Ep ${ep.episodeNumber}: "${ep.title}"
  Logline: ${ep.logline}
  Synopsis: ${ep.synopsis?.slice(0, 300)}...
  Story Threads: ${threads}
  Hook: ${ep.episodeHook || 'none'}`
  }).join('\n\n')
  
  // Character summaries
  const characterSummaries = characters.map(c => 
    `- ${c.name} (${c.role}): ${c.description?.slice(0, 150)}...`
  ).join('\n')
  
  // Location summaries
  const locationSummaries = locations.map(l => 
    `- ${l.name}: ${l.description?.slice(0, 100)}...`
  ).join('\n')
  
  // Build context section for iterative analysis
  let contextSection = ''
  if (context && context.previousScore !== null) {
    contextSection = `
ANALYSIS CONTEXT:
- This is iteration #${context.iterationCount} of the analysis
- Previous overall score: ${context.previousScore}
- ${context.appliedFixes.length} fixes have been applied since the last analysis

IMPORTANT SCORING GUIDELINES:
1. Be consistent with previous scores unless the content has materially changed
2. If fixes were applied, acknowledge improvements but don't inflate scores
3. Score fluctuations should be minimal (±3 points) unless there are significant changes
4. Don't re-flag issues that have already been addressed by applied fixes
5. Episode-level scores (hookStrength, cliffhangerScore, etc. on 1-10 scale) should align with the overall Episode Engagement axis score

`
  }
  
  return `You are an expert TV series analyst evaluating a production series for audience engagement and commercial viability.
${contextSection}
SERIES: ${series.title}
GENRE: ${series.genre || 'Drama'}
TARGET AUDIENCE: ${series.target_audience || 'General'}
LOGLINE: ${series.logline || bible.logline || 'Not specified'}

SYNOPSIS:
${bible.synopsis || 'Not specified'}

PROTAGONIST: ${bible.protagonist?.name || 'Not specified'} - Goal: ${bible.protagonist?.goal || ''}, Flaw: ${bible.protagonist?.flaw || ''}

ANTAGONIST/CONFLICT: ${bible.antagonistConflict?.description || 'Not specified'}

SETTING: ${bible.setting || 'Not specified'}

TONE: ${bible.toneGuidelines || 'Not specified'}

CHARACTERS (${characters.length}):
${characterSummaries || 'No characters defined'}

LOCATIONS (${locations.length}):
${locationSummaries || 'No locations defined'}

EPISODES (${episodes.length}):
${episodeSummaries}

Analyze this series comprehensively. Score each dimension 0-100.

Return ONLY valid JSON:
{
  "axes": {
    "conceptOriginality": {
      "score": 75,
      "reasoning": "Why this score"
    },
    "characterDepth": {
      "score": 80,
      "reasoning": "Why this score"
    },
    "episodeEngagement": {
      "score": 70,
      "reasoning": "Why this score"
    },
    "storyArcCoherence": {
      "score": 85,
      "reasoning": "Why this score"
    },
    "commercialViability": {
      "score": 72,
      "reasoning": "Why this score"
    }
  },
  "episodeScores": [
    {
      "episodeNumber": 1,
      "hookStrength": 8,
      "cliffhangerScore": 7,
      "continuityScore": 9,
      "characterMoments": 7,
      "tensionLevel": "medium",
      "pacing": "moderate",
      "overallScore": 76,
      "notes": "Strong pilot setup",
      "improvements": ["Stronger opening hook", "More character conflict"]
    }
  ],
  "characterScores": [
    {
      "name": "Character Name",
      "role": "protagonist",
      "arcClarity": 8,
      "distinctiveness": 7,
      "relatability": 8,
      "visualClarity": 6,
      "strengths": ["Clear motivation"],
      "weaknesses": ["Needs more backstory"]
    }
  ],
  "locationScores": [
    {
      "name": "Location Name",
      "visualImpact": 7,
      "narrativeRole": 8,
      "worldBuilding": 6,
      "notes": "Well-integrated into story"
    }
  ],
  "insights": [
    {
      "category": "characters",
      "status": "strength",
      "title": "Strong protagonist arc",
      "insight": "The protagonist has a clear goal and compelling flaw",
      "targetSection": "bible",
      "actionable": false
    },
    {
      "category": "episodes",
      "status": "weakness",
      "title": "Weak episode 5 cliffhanger",
      "insight": "Episode 5 ends without tension, breaking binge momentum",
      "targetSection": "episode",
      "targetId": "5",
      "actionable": true,
      "fixSuggestion": "End episode 5 with the revelation that...",
      "axisId": "episode-engagement",
      "estimatedImpact": 5
    }
  ],
  "summary": {
    "overallAssessment": "Detailed 3-4 sentence overall assessment of the series quality, production readiness, and audience appeal",
    "bingeWorthiness": "High/Medium/Low - Detailed explanation of what drives binge-watching behavior",
    "targetAudience": "Specific demographic with psychographic details",
    "comparableSeries": ["Similar Series 1", "Similar Series 2"],
    "keyStrengths": ["Strength 1 with detail", "Strength 2 with detail"],
    "criticalWeaknesses": ["Weakness 1 with detail", "Weakness 2 with detail"],
    "audienceEngagementDrivers": [
      {
        "driver": "Mystery Hooks",
        "description": "Unexplained phenomena create compelling questions",
        "episodeExamples": [1, 3, 7],
        "impactLevel": "high"
      },
      {
        "driver": "Character Reveals",
        "description": "Backstory revelations add depth",
        "episodeExamples": [4, 8],
        "impactLevel": "medium"
      },
      {
        "driver": "Emotional Peaks",
        "description": "Key dramatic moments that resonate",
        "episodeExamples": [5, 10],
        "impactLevel": "high"
      }
    ],
    "marketPositioning": "Where this series fits in the current market landscape",
    "renewalPotential": "High/Medium/Low with reasoning for continued seasons"
  }
}`
}

/**
 * Build the final analysis result with proper typing and normalized scores
 */
function buildAnalysisResult(
  seriesId: string,
  raw: any,
  episodes: any[],
  characters: any[],
  locations: any[],
  previousScore: number | null = null,
  iterationCount: number = 1
): SeriesResonanceAnalysis {
  // First, build episode engagement scores to calculate normalized axis score
  const episodeEngagement: EpisodeEngagementScore[] = (raw.episodeScores || []).map((es: any, i: number) => {
    const ep = episodes.find(e => e.episodeNumber === es.episodeNumber) || episodes[i]
    return {
      episodeId: ep?.id || `ep_${es.episodeNumber}`,
      episodeNumber: es.episodeNumber,
      title: ep?.title || `Episode ${es.episodeNumber}`,
      hookStrength: Math.min(10, Math.max(1, es.hookStrength || 5)),
      cliffhangerScore: Math.min(10, Math.max(1, es.cliffhangerScore || 5)),
      continuityScore: Math.min(10, Math.max(1, es.continuityScore || 5)),
      characterMoments: Math.min(10, Math.max(1, es.characterMoments || 5)),
      tensionLevel: es.tensionLevel || 'medium',
      pacing: es.pacing || 'moderate',
      overallScore: Math.min(100, Math.max(0, es.overallScore || 70)),
      notes: es.notes || '',
      improvements: es.improvements || []
    }
  })
  
  // Ensure all episodes have scores
  episodes.forEach((ep, i) => {
    if (!episodeEngagement.find(e => e.episodeNumber === ep.episodeNumber)) {
      episodeEngagement.push({
        episodeId: ep.id,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        hookStrength: 5,
        cliffhangerScore: 5,
        continuityScore: 5,
        characterMoments: 5,
        tensionLevel: 'medium',
        pacing: 'moderate',
        overallScore: 70,
        notes: 'Not analyzed',
        improvements: []
      })
    }
  })
  
  // Sort by episode number
  episodeEngagement.sort((a, b) => a.episodeNumber - b.episodeNumber)
  
  // Calculate normalized Episode Engagement axis score from actual episode metrics
  // This ensures consistency between episode-level scores and the axis score
  const avgEpisodeMetrics = episodeEngagement.length > 0
    ? episodeEngagement.reduce((sum, ep) => {
        // Average of the 4 core metrics (1-10 scale), then multiply by 10 to get 0-100
        const epAvg = (ep.hookStrength + ep.cliffhangerScore + ep.continuityScore + ep.characterMoments) / 4
        return sum + (epAvg * 10)
      }, 0) / episodeEngagement.length
    : 70
  
  // Blend LLM's assessment (30%) with calculated average (70%) for Episode Engagement
  const llmEpisodeEngagement = raw.axes?.episodeEngagement?.score || 70
  const normalizedEpisodeEngagement = Math.round(avgEpisodeMetrics * 0.7 + llmEpisodeEngagement * 0.3)
  
  // Build axes from raw scores with normalized Episode Engagement
  const axes: SeriesResonanceAxis[] = [
    {
      id: 'concept-originality',
      label: 'Concept Originality',
      score: Math.min(100, Math.max(0, raw.axes?.conceptOriginality?.score || 70)),
      weight: SERIES_RESONANCE_WEIGHTS['concept-originality'],
      description: raw.axes?.conceptOriginality?.reasoning || 'Uniqueness of series premise'
    },
    {
      id: 'character-depth',
      label: 'Character Depth',
      score: Math.min(100, Math.max(0, raw.axes?.characterDepth?.score || 70)),
      weight: SERIES_RESONANCE_WEIGHTS['character-depth'],
      description: raw.axes?.characterDepth?.reasoning || 'Complexity and relatability of characters'
    },
    {
      id: 'episode-engagement',
      label: 'Episode Engagement',
      score: normalizedEpisodeEngagement, // Use normalized score
      weight: SERIES_RESONANCE_WEIGHTS['episode-engagement'],
      description: `${raw.axes?.episodeEngagement?.reasoning || 'How well episodes hook and retain viewers'} (Normalized from episode metrics: avg ${Math.round(avgEpisodeMetrics)})`
    },
    {
      id: 'story-arc-coherence',
      label: 'Story Arc Coherence',
      score: Math.min(100, Math.max(0, raw.axes?.storyArcCoherence?.score || 70)),
      weight: SERIES_RESONANCE_WEIGHTS['story-arc-coherence'],
      description: raw.axes?.storyArcCoherence?.reasoning || 'Narrative continuity across episodes'
    },
    {
      id: 'commercial-viability',
      label: 'Commercial Viability',
      score: Math.min(100, Math.max(0, raw.axes?.commercialViability?.score || 70)),
      weight: SERIES_RESONANCE_WEIGHTS['commercial-viability'],
      description: raw.axes?.commercialViability?.reasoning || 'Market potential and audience appeal'
    }
  ]
  
  // Calculate weighted overall score
  const totalWeight = axes.reduce((sum, axis) => sum + axis.weight, 0)
  const weightedScore = axes.reduce((sum, axis) => sum + (axis.score * axis.weight), 0) / totalWeight
  let overallScore = Math.round(weightedScore)
  
  // Apply score stabilization after iteration 3+ to prevent endless fluctuation
  // New score can't drop more than 2 points below previous score
  if (previousScore !== null && iterationCount >= 3) {
    const minAllowedScore = previousScore - 2
    if (overallScore < minAllowedScore) {
      overallScore = minAllowedScore
    }
  }
  
  // Build character analysis
  const characterAnalysis: CharacterAnalysis[] = (raw.characterScores || []).map((cs: any) => {
    const char = characters.find(c => c.name === cs.name)
    return {
      characterId: char?.id || uuidv4(),
      name: cs.name,
      role: cs.role || char?.role || 'supporting',
      arcClarity: cs.arcClarity || 5,
      distinctiveness: cs.distinctiveness || 5,
      relatability: cs.relatability || 5,
      visualClarity: cs.visualClarity || 5,
      strengths: cs.strengths || [],
      weaknesses: cs.weaknesses || []
    }
  })
  
  // Build location analysis
  const locationAnalysis: LocationAnalysis[] = (raw.locationScores || []).map((ls: any) => {
    const loc = locations.find(l => l.name === ls.name)
    return {
      locationId: loc?.id || uuidv4(),
      name: ls.name,
      visualImpact: ls.visualImpact || 5,
      narrativeRole: ls.narrativeRole || 5,
      worldBuilding: ls.worldBuilding || 5,
      notes: ls.notes || ''
    }
  })
  
  // Build insights with deterministic IDs based on content
  // This ensures IDs stay the same across re-analysis so appliedFixes tracking works
  const insights: SeriesResonanceInsight[] = (raw.insights || []).map((ins: any, i: number) => {
    const category = ins.category || 'concept'
    const title = ins.title || 'Insight'
    const targetSection = ins.targetSection || ''
    const targetId = ins.targetId || ''
    // Create a deterministic hash from the insight's identifying characteristics
    const stableIdBase = `${category}-${title}-${targetSection}-${targetId}`.toLowerCase().replace(/[^a-z0-9-]/g, '_')
    return {
      id: `insight_${stableIdBase}`,
      category,
      status: ins.status || 'neutral',
      title,
      insight: ins.insight || '',
      targetSection,
      targetId,
      actionable: ins.actionable || false,
      fixSuggestion: ins.fixSuggestion,
      axisId: ins.axisId,
      estimatedImpact: ins.estimatedImpact
    }
  })
  
  return {
    seriesId,
    greenlightScore: getSeriesGreenlightTier(overallScore),
    axes,
    episodeEngagement,
    characterAnalysis,
    locationAnalysis,
    insights,
    summary: {
      overallAssessment: raw.summary?.overallAssessment || 'Analysis complete.',
      bingeWorthiness: raw.summary?.bingeWorthiness || 'Medium',
      targetAudience: raw.summary?.targetAudience || 'General audience',
      comparableSeries: raw.summary?.comparableSeries || [],
      keyStrengths: raw.summary?.keyStrengths || [],
      criticalWeaknesses: raw.summary?.criticalWeaknesses || [],
      audienceEngagementDrivers: raw.summary?.audienceEngagementDrivers || [],
      marketPositioning: raw.summary?.marketPositioning || '',
      renewalPotential: raw.summary?.renewalPotential || ''
    },
    analysisVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    creditsUsed: 1
  }
}
