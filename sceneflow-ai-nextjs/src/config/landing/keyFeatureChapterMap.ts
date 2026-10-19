/**
 * Edit plan for Key Features captures. This is not a graphic on the page.
 *
 * Room films are 60–90 second screen recordings of the live studio, cut against
 * frames from the flagship longform. Feature demos are separate 30-second
 * captures from the same session. Beats with standaloneDemo false appear only
 * inside the room film.
 *
 * Ship the English room films before any dub. Do not dub every 30-second demo.
 */

import { FEATURE_ROOM_IDS, type FeatureRoomId } from '@/config/landing/featureRoomMedia'

export const FEATURE_DEMO_SECONDS = 30

export type FeatureChapterBeat = {
  id: string
  /** First icon owns the 30-second file. Later icons play that same demo. */
  demoIcons: readonly string[]
  standaloneDemo: boolean
}

export type FeatureRoomChapterPlan = {
  roomId: FeatureRoomId
  filmSeconds: number
  beats: readonly FeatureChapterBeat[]
}

export const FEATURE_CHAPTER_MAP: readonly FeatureRoomChapterPlan[] = [
  {
    roomId: 'series-desk',
    filmSeconds: 90,
    beats: [
      { id: 'new-series', demoIcons: ['newSeries'], standaloneDemo: true },
      { id: 'first-cut', demoIcons: ['seriesReview'], standaloneDemo: true },
      { id: 'series-resonance', demoIcons: ['seriesResonance'], standaloneDemo: true },
      {
        id: 'series-director',
        demoIcons: ['seriesDirector', 'directEpisode'],
        standaloneDemo: true,
      },
      { id: 'start-episode', demoIcons: ['startEpisode'], standaloneDemo: false },
    ],
  },
  {
    roomId: 'blueprint-board',
    filmSeconds: 75,
    beats: [
      { id: 'start-blueprint', demoIcons: ['startBlueprint'], standaloneDemo: true },
      { id: 'direct-beats', demoIcons: ['treatment'], standaloneDemo: true },
      { id: 'cast-locations', demoIcons: ['castLocations'], standaloneDemo: true },
      { id: 'blueprint-director', demoIcons: ['blueprintDirector'], standaloneDemo: true },
      { id: 'resonance', demoIcons: ['blueprintResonance'], standaloneDemo: true },
      {
        id: 'go-production',
        demoIcons: ['goToProduction', 'stakeholderReview'],
        standaloneDemo: false,
      },
    ],
  },
  {
    roomId: 'production-stage',
    filmSeconds: 90,
    beats: [
      { id: 'spend', demoIcons: ['byok', 'budget'], standaloneDemo: true },
      { id: 'production-script', demoIcons: ['productionScript'], standaloneDemo: true },
      { id: 'script-resonance', demoIcons: ['scriptResonance'], standaloneDemo: true },
      { id: 'cast-visual', demoIcons: ['castVisual'], standaloneDemo: true },
      { id: 'direct-shot', demoIcons: ['directShot'], standaloneDemo: true },
      { id: 'audio', demoIcons: ['audioAgent'], standaloneDemo: true },
      { id: 'continuity', demoIcons: ['continuity'], standaloneDemo: true },
      { id: 'stills', demoIcons: ['stillsAgent'], standaloneDemo: true },
      { id: 'animatic', demoIcons: ['animatic'], standaloneDemo: true },
      { id: 'clips', demoIcons: ['videoAgent'], standaloneDemo: true },
      { id: 'mixer', demoIcons: ['mixer'], standaloneDemo: true },
      { id: 'languages', demoIcons: ['languageStreams'], standaloneDemo: true },
      { id: 'publish', demoIcons: ['promoTrailers', 'shipPackage'], standaloneDemo: false },
    ],
  },
  {
    roomId: 'screening-room',
    filmSeconds: 60,
    beats: [
      {
        id: 'player',
        demoIcons: ['screeningPlayer', 'screeningCollab'],
        standaloneDemo: false,
      },
    ],
  },
]

const BEAT_BY_ICON = new Map<string, FeatureChapterBeat>()
for (const room of FEATURE_CHAPTER_MAP) {
  for (const beat of room.beats) {
    for (const icon of beat.demoIcons) {
      BEAT_BY_ICON.set(icon, beat)
    }
  }
}

/** Icon whose 30-second file plays for this feature, or null when the beat is room-film only. */
export function standaloneDemoKey(icon: string): string | null {
  const beat = BEAT_BY_ICON.get(icon)
  if (!beat?.standaloneDemo) return null
  return beat.demoIcons[0] ?? null
}

export function chapterPlanForRoom(roomId: string): FeatureRoomChapterPlan | null {
  return FEATURE_CHAPTER_MAP.find((room) => room.roomId === roomId) ?? null
}

export function chapterMapCoversEveryRoom(): boolean {
  return FEATURE_ROOM_IDS.every((roomId) =>
    FEATURE_CHAPTER_MAP.some((room) => room.roomId === roomId)
  )
}
