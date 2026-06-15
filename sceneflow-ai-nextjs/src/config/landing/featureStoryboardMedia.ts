/** Media URLs for platform walkthrough cards (non-translatable). */

const BLOB = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'

export const FEATURE_STORYBOARD_MEDIA: Record<
  number,
  { screenshotUrl?: string; videoUrl?: string }
> = {
  /** 1 — Platform Overview (interim: One Platform clip until 90s overview is recorded) */
  1: {
    screenshotUrl: '/landing/storyboard/intuitive-ux-2.png',
    videoUrl: `${BLOB}/One%20Platform%20.mp4`,
  },
  5: {
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-17%20at%2014.33.01.png',
    videoUrl: `${BLOB}/Reference.mp4`,
  },
  7: {
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2008.22.24.png',
    videoUrl: `${BLOB}/Audience%20.mp4`,
  },
  9: {
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2009.17.05.png',
    videoUrl: `${BLOB}/Series.mp4`,
  },
  10: {
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-21%20at%2010.05.03.png',
    videoUrl: `${BLOB}/BLUEPRINT.mp4`,
  },
  11: {
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-27%20at%2011.15.48.png',
    videoUrl: `${BLOB}/walkthrough/Production.mp4`,
  },
  /** 14 — Screening Room (preview, assemble, publish) */
  14: {
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-19%20at%2018.29.48.png',
    videoUrl: `${BLOB}/walkthrough/Premiere.mp4`,
  },
  /** 16 — Trust & Safety */
  16: {
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-19%20at%2018.29.48.png',
    videoUrl: `${BLOB}/walkthrough/TrustSafety.mp4`,
  },
}
