/**
 * Live smoke: call Vertex with the flash default and fail if MODEL DOWNGRADE fires.
 * Skips cleanly when Vertex credentials are not configured in this environment.
 *
 * Usage: npx tsx scripts/smoke-gemini-flash-model.ts
 */
import { getGeminiTextModel, normalizeGeminiTextModel } from '../src/lib/config/modelConfig'

async function main() {
  const flash = getGeminiTextModel('flash')
  console.log(`[smoke] flash default = ${flash}`)
  console.log(
    `[smoke] normalize(gemini-3.0-flash) = ${normalizeGeminiTextModel('gemini-3.0-flash')}`
  )

  const hasCreds = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  )
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  if (!hasCreds || !projectId) {
    console.log(
      '[smoke] SKIP — Vertex credentials not available (set GOOGLE_APPLICATION_CREDENTIALS_JSON and VERTEX_PROJECT_ID to run live).'
    )
    return
  }

  const { generateText } = await import('../src/lib/vertexai/gemini')
  const result = await generateText('Reply with the single word: ok', {
    model: flash,
    responseMimeType: 'text/plain',
    temperature: 0,
    maxOutputTokens: 16,
    thinkingLevel: 'minimal',
    disableModelFallback: true,
    timeoutMs: 60000,
  })

  if (result.downgraded) {
    throw new Error(
      `Unexpected downgrade: requested=${result.requestedModelId} resolved=${result.modelId}`
    )
  }
  if (result.modelId !== flash) {
    throw new Error(`Expected modelId ${flash}, got ${result.modelId}`)
  }
  console.log(`[smoke] OK modelId=${result.modelId} text=${JSON.stringify(result.text?.slice(0, 80))}`)
}

main().catch((err) => {
  console.error('[smoke] FAILED', err)
  process.exit(1)
})
