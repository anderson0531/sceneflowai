export type CreateBlueprintShareInput = {
  projectId: string
  variantId: string
  treatment: Record<string, unknown>
  heroImageUrl?: string
  audienceDefinition?: unknown
  expiresInDays?: number
  legacyOwnerId?: string
}

function legacyOwnerIdFromStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const id = localStorage.getItem('authUserId')
  return id && id.length > 0 ? id : undefined
}

export type CreateBlueprintShareResult =
  | {
      success: true
      token: string
      sessionId: string
      url: string
    }
  | {
      success: false
      error: string
      status?: number
    }

export async function createBlueprintShare(
  input: CreateBlueprintShareInput
): Promise<CreateBlueprintShareResult> {
  try {
    const res = await fetch('/api/blueprint/share/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        legacyOwnerId: input.legacyOwnerId ?? legacyOwnerIdFromStorage(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success || !data?.token) {
      return {
        success: false,
        error:
          data?.error ||
          (res.status === 403
            ? 'You do not have permission to share this project'
            : `Share failed (${res.status})`),
        status: res.status,
      }
    }
    const url =
      data.url ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/blueprint/share/${data.token}`
        : `/blueprint/share/${data.token}`)
    return {
      success: true,
      token: data.token,
      sessionId: data.sessionId,
      url,
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Network error',
    }
  }
}

export type ActiveBlueprintShare = {
  token: string
  sessionId: string
  url: string
  expiresAt?: string | null
}

export async function fetchActiveBlueprintShare(
  projectId: string
): Promise<ActiveBlueprintShare | null> {
  try {
    const res = await fetch(
      `/api/blueprint/share/active?projectId=${encodeURIComponent(projectId)}`,
      { credentials: 'include', cache: 'no-store' }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success || !data?.token) return null
    return {
      token: data.token,
      sessionId: data.sessionId,
      url: data.url,
      expiresAt: data.expiresAt,
    }
  } catch {
    return null
  }
}
