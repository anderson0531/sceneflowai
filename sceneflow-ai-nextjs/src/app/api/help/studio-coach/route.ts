import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import {
  JIT_CONTEXT_GUIDES,
  type JitContextId,
} from '@/config/help/helpAcademyConfig'
import {
  buildDeterministicCoachReply,
  buildGroundedCoachPromptContext,
  retrieveStudioCoachContext,
} from '@/lib/help/studioCoachEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COACH_RATE_WINDOW_MS = 5 * 60_000
const COACH_RATE_MAX = 20
const coachRateBuckets = new Map<string, number[]>()

function checkCoachRateLimit(userKey: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const recent = (coachRateBuckets.get(userKey) || []).filter(
    (ts) => ts > now - COACH_RATE_WINDOW_MS
  )
  if (recent.length >= COACH_RATE_MAX) {
    const oldest = recent[0] ?? now
    const retryAfterSec = Math.max(1, Math.ceil((oldest + COACH_RATE_WINDOW_MS - now) / 1000))
    coachRateBuckets.set(userKey, recent)
    return { allowed: false, retryAfterSec }
  }
  recent.push(now)
  coachRateBuckets.set(userKey, recent)
  return { allowed: true, retryAfterSec: 0 }
}

interface StudioCoachRequestBody {
  question?: string
  contextId?: JitContextId
  locale?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userKey =
      (session as { user?: { id?: string; email?: string } } | null)?.user?.id ||
      (session as { user?: { id?: string; email?: string } } | null)?.user?.email ||
      null

    if (!userKey) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to ask Studio Coach.' },
        { status: 401 }
      )
    }

    const rate = checkCoachRateLimit(String(userKey))
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many coach questions in a short window. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }

    const body = (await request.json().catch(() => ({}))) as StudioCoachRequestBody
    const question = (body.question || '').trim().slice(0, 600)
    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Please enter a question.' },
        { status: 400 }
      )
    }

    const contextId: JitContextId =
      body.contextId && body.contextId in JIT_CONTEXT_GUIDES
        ? body.contextId
        : 'dashboard'
    const locale = (body.locale || 'en').trim().slice(0, 16)

    const deterministic = buildDeterministicCoachReply(question, contextId)

    // Optional live Vertex AI synthesis when explicitly enabled in production;
    // falls back seamlessly to deterministic grounded answers at $0 compute cost.
    if (process.env.ENABLE_AI_STUDIO_COACH === 'true') {
      try {
        const docs = retrieveStudioCoachContext(question, contextId, 4)
        const groundedContext = buildGroundedCoachPromptContext(docs)
        const prompt = [
          'You are the official SceneFlow Studio Coach inside the SceneFlow AI Studio app.',
          `Respond in language/locale "${locale}" clearly and concisely (max 140 words, bullet points welcome).`,
          'Answer STRICTLY from the verified SceneFlow Studio Knowledge Context below. Never invent prices, routes, or features not present in the context.',
          `User's current room: ${JIT_CONTEXT_GUIDES[contextId].shortTitle}.`,
          '',
          '=== VERIFIED SCENEFLOW KNOWLEDGE CONTEXT ===',
          groundedContext,
          '',
          `=== USER QUESTION ===`,
          question,
        ].join('\n')

        const result = await generateText(prompt, {
          model: getGeminiTextModel('flash'),
          temperature: 0.2,
          maxOutputTokens: 450,
        })

        const aiText = result?.text?.trim()
        if (aiText) {
          return NextResponse.json({
            success: true,
            reply: {
              ...deterministic,
              answer: aiText,
              mode: 'grounded-ai' as const,
            },
          })
        }
      } catch (err) {
        console.warn('[StudioCoach] AI synthesis unavailable, serving deterministic grounded answer:', err)
      }
    }

    return NextResponse.json({
      success: true,
      reply: deterministic,
    })
  } catch (error) {
    console.error('[StudioCoach] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Could not answer your question right now.' },
      { status: 500 }
    )
  }
}
