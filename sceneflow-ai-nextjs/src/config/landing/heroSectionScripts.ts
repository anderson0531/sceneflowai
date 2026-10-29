/**
 * Copyable video scripts for the three hero sections.
 * They match the on-page subtitles. The shipped MP4s stay until a new cut is produced.
 */

export type HeroVideoBeat = {
  label: string
  narration: string
  picture: string
  settle: string
}

export type HeroVideoScript = {
  id: 'friction' | 'control' | 'agent' | 'cut'
  eyebrow: string
  beats: readonly HeroVideoBeat[]
}

export const HERO_SECTION_SCRIPTS: readonly HeroVideoScript[] = [
  {
    id: 'friction',
    eyebrow: 'The friction we remove',
    beats: [
      {
        label: 'The stack',
        narration:
          'Clip prompts in one tab. Music in another. Narration recorded somewhere else, then dragged back onto a timeline that does not know the scene.',
        picture:
          'A dim desk with three glowing tools side by side: a prompt box, a music waveform, and a narration track, none of them sharing a frame.',
        settle: 'The three windows stay open and disconnected. The chair is empty.',
      },
      {
        label: 'The pipeline',
        narration:
          'SceneFlow is one pipeline. The series, or the 90-minute master, is built in the same studio that writes the clip prompt, lays the music cue, and holds the narration on the beat.',
        picture:
          'One dark studio path: blueprint pages, a reference portrait, a shot frame, a music cue bar, and a narration line, arranged as a single sequence.',
        settle: 'The path ends on one playable scene, not three exports.',
      },
      {
        label: 'The publish',
        narration:
          'When a scene or a chapter is ready, you publish that cut. You do not rebuild the prompt, the score, and the voice from scratch.',
        picture:
          'A finished frame with a thin music bar and a narration line already sitting under the picture.',
        settle: 'The frame holds. The music bar and the narration line remain in place.',
      },
    ],
  },
  {
    id: 'control',
    eyebrow: 'The control you keep',
    beats: [
      {
        label: 'The direction',
        narration:
          'You direct the shot in plain language. Who is in the frame, where they stand, what the moment is.',
        picture:
          'A director’s note beside a storyboard frame. The note is handwriting, not a wall of keywords.',
        settle: 'The note and the frame agree: same people, same pose.',
      },
      {
        label: 'The clip prompt',
        narration:
          'Shot direction writes the still and the clip prompt. You do not retype the shot into a generator.',
        picture:
          'The same frame splitting into a still prompt and a clip prompt, both naming the people and the settled pose.',
        settle: 'Both prompts stay visible under the frame you approved.',
      },
      {
        label: 'Music and narration',
        narration:
          'Music cues and narration sit on the beat. You hear them in the animatic, change the shot if it is wrong, and only then spend on motion.',
        picture:
          'An animatic timeline: picture, a music cue across the scene, and a narration line locked to the same beats.',
        settle: 'The playhead rests before the motion render. The cue and the narration are already there.',
      },
    ],
  },
  {
    id: 'agent',
    eyebrow: 'Production Agent • Autonomous Studio Builder',
    beats: [
      {
        label: 'The 300-shot wall',
        narration:
          'A twenty-seven scene production takes over three hundred manual still and clip prompts. With the Production Agent, you spend under an hour perfecting the script, then launch the build.',
        picture:
          'CHAR_ANA in the dark virtual production suite beside a curved display showing 27 scene cards, selecting Pre-Vis, Clips, Scenes, Master, and Promo in one click.',
        settle: 'A single cyan-to-emerald progress bar ignites across all 27 scenes.',
      },
      {
        label: 'The autonomous build and self-healing',
        narration:
          'The Agent walks every scene on its own — locking references, laying narration and music stems, generating stills, optimizing any failed clip prompt, and switching to Creative Clips when a dramatic shot hits policy filters.',
        picture:
          'Behind Ana, storyboard frames, narration waveforms, and motion clips populate in sequence while an amber retry pulse self-heals a flagged shot into green.',
        settle: 'All 27 scene indicators hold steady emerald green while the studio runs hands-free.',
      },
      {
        label: 'Walk away and review in the Screening Room',
        narration:
          'Set scene checkpoints or walk away completely. When the cut is finished, a notification arrives on your phone with a private Screening Room link ready for review.',
        picture:
          'Ana picks up her coffee mug and steps away from the desk as a calm notification chime lights up a private /s/ Screening Room preview on her phone.',
        settle: 'Ana smiles to camera, coffee in hand, while the finished master plays behind her.',
      },
    ],
  },
  {
    id: 'cut',
    eyebrow: 'The cut you publish',
    beats: [
      {
        label: 'The scene',
        narration:
          'The scene you export already carries the picture, the music, and the narration. The clip prompt was written with the shot, not pasted in later.',
        picture:
          'A screening-room frame. Under it, a music stem and a narration stem, both aligned to the picture.',
        settle: 'The frame holds in a dark review room. The stems do not drift.',
      },
      {
        label: 'The master',
        narration:
          'Download the master and ship it yourself, or publish a finished scene or chapter while the long cut is still in progress.',
        picture:
          'One master timeline beside a shorter chapter pulled from it, same faces, same score, same voice.',
        settle: 'The chapter card and the master share one frame of the same scene.',
      },
      {
        label: 'The room',
        narration:
          'Before anything reaches a public feed, watch it in the Screening Room. The network, if you earn it, is an invitation — not an open shelf.',
        picture:
          'A quiet screening room, one large picture, no storefront. A small premiere mark waits, unlit, at the side.',
        settle: 'The picture is the only light. The premiere mark stays dark until it is earned.',
      },
    ],
  },
]

const SCRIPT_BY_ID: Record<HeroVideoScript['id'], HeroVideoScript> = {
  friction: HERO_SECTION_SCRIPTS[0],
  control: HERO_SECTION_SCRIPTS[1],
  agent: HERO_SECTION_SCRIPTS[2],
  cut: HERO_SECTION_SCRIPTS[3],
}

export function getHeroSectionScript(id: HeroVideoScript['id']): HeroVideoScript {
  return SCRIPT_BY_ID[id]
}

export function formatHeroVideoScript(script: HeroVideoScript): string {
  const beats = script.beats
    .map(
      (beat, index) =>
        `${index + 1}. ${beat.label}\nNarration: ${beat.narration}\nPicture: ${beat.picture}\nSettle on: ${beat.settle}`
    )
    .join('\n\n')
  return `${script.eyebrow}\n\n${beats}`
}
