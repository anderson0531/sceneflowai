import type { CastingBriefDirectorRequest } from '@/lib/character/buildCastingBriefDirectorPrompt'

export type RequestCastingBriefInput = CastingBriefDirectorRequest

export async function requestCastingBrief(
  input: RequestCastingBriefInput,
): Promise<{ voiceDescription: string }> {
  const response = await fetch('/api/character/generate-casting-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const body = (await response.json().catch(() => ({}))) as {
    error?: string
    voiceDescription?: string
  }

  if (!response.ok) {
    throw new Error(body.error || 'Failed to generate casting brief')
  }

  const voiceDescription =
    typeof body.voiceDescription === 'string' ? body.voiceDescription.trim() : ''
  if (!voiceDescription) {
    throw new Error('Casting brief response was empty.')
  }

  return { voiceDescription }
}
