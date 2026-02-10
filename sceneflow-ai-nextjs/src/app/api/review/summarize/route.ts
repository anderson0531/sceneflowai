/**
 * Shared Review Feedback Summarize API
 * 
 * POST /api/review/summarize
 * 
 * Uses Gemini to analyze and summarize reviewer feedback, 
 * generating actionable revision recommendations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SceneFeedback, FeedbackSummary } from '@/types/productionStreams'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// Types
// ============================================================================

interface SummarizeFeedbackRequest {
  projectId: string
  projectTitle?: string
  feedback: SceneFeedback[]
  sceneInfo?: Array<{
    sceneId: string
    sceneNumber: number
    title?: string
  }>
}

interface SummarizeFeedbackResponse {
  success: boolean
  summary: FeedbackSummary
}

// ============================================================================
// Gemini Prompt
// ============================================================================

const FEEDBACK_SUMMARY_PROMPT = `You are a professional film production assistant analyzing reviewer feedback for a video project.

## Context
Project: {{PROJECT_TITLE}}
Total Feedback Submissions: {{FEEDBACK_COUNT}}
Scenes: {{SCENE_COUNT}}

## Reviewer Feedback
{{FEEDBACK_DATA}}

## Your Task
Analyze all the feedback and provide:

1. **Overall Summary** (2-3 paragraphs)
   - Key themes across all feedback
   - Strongest elements praised
   - Most common concerns
   - Overall sentiment

2. **Revision Recommendations** (3-5 prioritized items)
   For each recommendation:
   - Priority: high, medium, or low
   - Scene ID (if applicable) or "project-wide"
   - Clear, actionable recommendation
   - Quote or reference from feedback that supports this

## Response Format
Return a JSON object:
{
  "aiSummary": "Overall summary text...",
  "revisionRecommendations": [
    {
      "priority": "high",
      "sceneId": "scene-id-or-null",
      "recommendation": "Clear action to take",
      "basedOn": "Quoted or referenced feedback"
    }
  ]
}

Focus on constructive, actionable insights that will help improve the production.`

// ============================================================================
// Helper Functions
// ============================================================================

function formatFeedbackForPrompt(
  feedback: SceneFeedback[],
  sceneInfo?: Array<{ sceneId: string; sceneNumber: number; title?: string }>
): string {
  const sceneMap = new Map(sceneInfo?.map(s => [s.sceneId, s]) || [])
  
  return feedback.map((fb, idx) => {
    const scene = sceneMap.get(fb.sceneId)
    const sceneLabel = scene 
      ? `Scene ${scene.sceneNumber}${scene.title ? ` - ${scene.title}` : ''}`
      : `Scene ${fb.sceneId}`
    
    let text = `### Feedback ${idx + 1} - ${sceneLabel}\n`
    
    if (fb.reviewerName) {
      text += `Reviewer: ${fb.reviewerName}\n`
    }
    
    if (fb.scores && Object.keys(fb.scores).length > 0) {
      const scoreText = Object.entries(fb.scores)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${v}/10`)
        .join(', ')
      text += `Scores: ${scoreText}\n`
    }
    
    if (fb.feedbackText) {
      text += `Feedback: "${fb.feedbackText}"\n`
    }
    
    if (fb.timestampNotes && fb.timestampNotes.length > 0) {
      text += `Timestamped Notes:\n`
      fb.timestampNotes.forEach(note => {
        const mins = Math.floor(note.time / 60)
        const secs = Math.floor(note.time % 60)
        text += `  - ${mins}:${secs.toString().padStart(2, '0')}: "${note.note}"\n`
      })
    }
    
    return text
  }).join('\n')
}

function calculateAverageScores(feedback: SceneFeedback[]): FeedbackSummary['averageScores'] {
  const totals = {
    overall: { sum: 0, count: 0 },
    pacing: { sum: 0, count: 0 },
    visual: { sum: 0, count: 0 },
    audio: { sum: 0, count: 0 },
    story: { sum: 0, count: 0 },
  }
  
  feedback.forEach(fb => {
    if (fb.scores) {
      Object.entries(fb.scores).forEach(([key, value]) => {
        if (value !== undefined && key in totals) {
          totals[key as keyof typeof totals].sum += value
          totals[key as keyof typeof totals].count += 1
        }
      })
    }
  })
  
  return {
    overall: totals.overall.count > 0 ? totals.overall.sum / totals.overall.count : 0,
    pacing: totals.pacing.count > 0 ? totals.pacing.sum / totals.pacing.count : 0,
    visual: totals.visual.count > 0 ? totals.visual.sum / totals.visual.count : 0,
    audio: totals.audio.count > 0 ? totals.audio.sum / totals.audio.count : 0,
    story: totals.story.count > 0 ? totals.story.sum / totals.story.count : 0,
  }
}

function calculateSceneScores(feedback: SceneFeedback[]): FeedbackSummary['sceneScores'] {
  const sceneData: Record<string, { sum: number; count: number }> = {}
  
  feedback.forEach(fb => {
    if (fb.scores?.overall !== undefined) {
      if (!sceneData[fb.sceneId]) {
        sceneData[fb.sceneId] = { sum: 0, count: 0 }
      }
      sceneData[fb.sceneId].sum += fb.scores.overall
      sceneData[fb.sceneId].count += 1
    }
  })
  
  const result: FeedbackSummary['sceneScores'] = {}
  Object.entries(sceneData).forEach(([sceneId, data]) => {
    result[sceneId] = {
      overall: data.count > 0 ? data.sum / data.count : 0,
      responseCount: data.count,
    }
  })
  
  return result
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || session?.user?.email
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json() as SummarizeFeedbackRequest

    // Validate request
    if (!body.projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      )
    }

    if (!body.feedback || body.feedback.length === 0) {
      return NextResponse.json(
        { error: 'No feedback to summarize' },
        { status: 400 }
      )
    }

    console.log(`[Feedback Summarize] Analyzing ${body.feedback.length} feedback items for project ${body.projectId}`)

    // Calculate score averages
    const averageScores = calculateAverageScores(body.feedback)
    const sceneScores = calculateSceneScores(body.feedback)

    // Build prompt
    const feedbackText = formatFeedbackForPrompt(body.feedback, body.sceneInfo)
    const sceneCount = new Set(body.feedback.map(f => f.sceneId)).size
    
    const prompt = FEEDBACK_SUMMARY_PROMPT
      .replace('{{PROJECT_TITLE}}', body.projectTitle || 'Untitled Project')
      .replace('{{FEEDBACK_COUNT}}', body.feedback.length.toString())
      .replace('{{SCENE_COUNT}}', sceneCount.toString())
      .replace('{{FEEDBACK_DATA}}', feedbackText)

    // Get Gemini API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Missing Gemini API key')
    }

    // Call Gemini for AI summary
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
      systemInstruction: 'You are a professional video production consultant providing actionable feedback analysis. Return JSON only.',
    })

    const aiResult = result.response.text()

    // Parse AI response
    let aiSummary = ''
    let revisionRecommendations: FeedbackSummary['revisionRecommendations'] = []

    try {
      // Try to parse as JSON
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        aiSummary = parsed.aiSummary || ''
        revisionRecommendations = parsed.revisionRecommendations || []
      } else {
        // Use raw text as summary if JSON parse fails
        aiSummary = aiResult
      }
    } catch (parseError) {
      console.error('[Feedback Summarize] Failed to parse AI response:', parseError)
      aiSummary = aiResult
    }

    // Build response
    const summary: FeedbackSummary = {
      projectId: body.projectId,
      totalResponses: body.feedback.length,
      averageScores,
      sceneScores,
      aiSummary,
      revisionRecommendations,
      generatedAt: new Date().toISOString(),
    }

    console.log(`[Feedback Summarize] Generated summary with ${revisionRecommendations.length} recommendations`)

    const response: SummarizeFeedbackResponse = {
      success: true,
      summary,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Feedback Summarize] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to summarize feedback',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
