export async function createScriptARShare(input: {
  projectId: string
  forceNew?: boolean
  language?: string
  voiceId?: string
}): Promise<
  | { success: true; token: string; sessionId: string; url: string; reused?: boolean }
  | { success: false; error: string; status?: number }
> {
  try {
    const res = await fetch('/api/script-resonance/share/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success || !data?.token) {
      return {
        success: false,
        error: data?.error || `Share failed (${res.status})`,
        status: res.status,
      }
    }
    return {
      success: true,
      token: data.token,
      sessionId: data.sessionId,
      url:
        data.url ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/share/script-resonance/${data.token}`
          : `/share/script-resonance/${data.token}`),
      reused: data.reused === true,
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function triggerScriptARShareAudio(
  token: string,
  options?: { language?: string; voiceId?: string }
) {
  const res = await fetch(
    `/api/script-resonance/share/${encodeURIComponent(token)}/audio/generate`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.success) {
    return { success: false as const, error: data?.error || 'Audio generation failed' }
  }
  return { success: true as const, skipped: data.skipped === true }
}
