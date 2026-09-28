/**
 * Empty 60-second overview slots for the four feature rooms.
 * WebM is listed before the MP4 fallback. URLs stay empty until a file exists.
 */

export const FEATURE_ROOM_IDS = [
  'series-desk',
  'blueprint-board',
  'production-stage',
  'screening-room',
] as const

export type FeatureRoomId = (typeof FEATURE_ROOM_IDS)[number]

export type FeatureRoomMediaEntry = {
  posterUrl: string
  webmUrl: string
  mp4Url: string
}

const EMPTY_ROOM_MEDIA: FeatureRoomMediaEntry = {
  posterUrl: '',
  webmUrl: '',
  mp4Url: '',
}

export const FEATURE_ROOM_MEDIA: Record<FeatureRoomId, FeatureRoomMediaEntry> = {
  'series-desk': { ...EMPTY_ROOM_MEDIA },
  'blueprint-board': { ...EMPTY_ROOM_MEDIA },
  'production-stage': { ...EMPTY_ROOM_MEDIA },
  'screening-room': { ...EMPTY_ROOM_MEDIA },
}

export function getFeatureRoomMedia(id: string): FeatureRoomMediaEntry {
  if ((FEATURE_ROOM_IDS as readonly string[]).includes(id)) {
    return FEATURE_ROOM_MEDIA[id as FeatureRoomId]
  }
  return EMPTY_ROOM_MEDIA
}

export function featureRoomHasVideo(entry: FeatureRoomMediaEntry): boolean {
  return Boolean(entry.webmUrl || entry.mp4Url)
}
