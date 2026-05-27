/**
 * Unified Blueprint → Production handoff.
 */

import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'

export interface StartProductionOptions {
  variant: Record<string, unknown>
  userId: string
  sourceBlueprintProjectId?: string
}

export interface StartProductionResponse {
  success: boolean
  projectId?: string
  error?: string
  redirect?: string
}

export async function startProductionFromBlueprint(
  options: StartProductionOptions
): Promise<StartProductionResponse> {
  try {
    const res = await fetch('/api/projects/from-variant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: options.userId,
        variant: options.variant,
        sourceBlueprintProjectId: options.sourceBlueprintProjectId,
      }),
    })

    const data = await res.json()

    if (data.success && data.project) {
      return {
        success: true,
        projectId: data.project.id,
        redirect: data.redirect ?? `/dashboard/workflow/vision/${data.project.id}`,
      }
    }

    return {
      success: false,
      error: data.error || 'Failed to create Production project',
    }
  } catch (e) {
    console.error('[startProductionFromBlueprint]', e)
    return {
      success: false,
      error: BLUEPRINT_COPY.startProduction,
    }
  }
}

export function getOrCreateAuthUserId(): string {
  if (typeof window === 'undefined') return ''
  let userId = localStorage.getItem('authUserId')
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem('authUserId', userId)
  }
  return userId
}
