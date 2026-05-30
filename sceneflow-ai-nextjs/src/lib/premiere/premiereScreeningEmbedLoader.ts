export type PremiereScreeningVideoPayload = {
  screeningType: string
  videoUrl: string
  title: string
  description?: string
  feedbackEnabled: boolean
  collectBiometrics: boolean
  collectDemographics: boolean
}

export type LoadedPremiereScreening = PremiereScreeningVideoPayload & {
  screeningId: string
  sessionId?: string
}

export class PremiereScreeningLoadError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PremiereScreeningLoadError'
    this.status = status
  }
}

/** Load premiere screening metadata + video for embed / landing player. */
export async function loadPremiereScreeningForEmbed(
  screeningId: string,
  fetchFn: typeof fetch = fetch
): Promise<LoadedPremiereScreening> {
  const trimmed = screeningId.trim()
  if (!trimmed) {
    throw new PremiereScreeningLoadError('Screening ID required', 400)
  }

  const metaRes = await fetchFn(`/api/screening/${encodeURIComponent(trimmed)}`)
  const metaData = await metaRes.json().catch(() => ({}))

  if (metaRes.status === 404) {
    throw new PremiereScreeningLoadError(metaData.error || 'Screening not found', 404)
  }
  if (metaRes.status === 410) {
    throw new PremiereScreeningLoadError(metaData.error || 'Screening has expired', 410)
  }
  if (!metaRes.ok) {
    throw new PremiereScreeningLoadError(metaData.error || 'Failed to load screening', metaRes.status)
  }

  if (metaData.screening?.requiresPassword) {
    throw new PremiereScreeningLoadError(
      'This screening is password protected and cannot be embedded',
      401
    )
  }

  const videoRes = await fetchFn(`/api/screening/${encodeURIComponent(trimmed)}/video`)
  const videoData = await videoRes.json().catch(() => ({}))

  if (!videoRes.ok) {
    throw new PremiereScreeningLoadError(videoData.error || 'Failed to load video', videoRes.status)
  }

  if (!videoData.videoUrl || typeof videoData.videoUrl !== 'string') {
    throw new PremiereScreeningLoadError('No video URL for this screening', 404)
  }

  let sessionId: string | undefined
  try {
    const sessionRes = await fetchFn(`/api/screening/${encodeURIComponent(trimmed)}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cameraConsentGranted: false,
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'embed',
          screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
          screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
          isMobile:
            typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent),
        },
      }),
    })
    if (sessionRes.ok) {
      const sessionData = await sessionRes.json()
      sessionId = sessionData.sessionId
    }
  } catch {
    // Premiere blob screenings may not have project metadata sessions; AudiencePlayer init handles fallback.
  }

  return {
    screeningId: trimmed,
    sessionId,
    screeningType: videoData.screeningType || 'premiere',
    videoUrl: videoData.videoUrl,
    title: videoData.title || metaData.screening?.title || 'Screening',
    description: videoData.description || metaData.screening?.description,
    feedbackEnabled: videoData.feedbackEnabled !== false,
    collectBiometrics: videoData.collectBiometrics === true,
    collectDemographics: videoData.collectDemographics !== false,
  }
}
