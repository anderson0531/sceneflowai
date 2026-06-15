/**
 * Spoken narration scripts for landing-page section audio.
 * Used by scripts/generate-section-narration.ts (Gemini TTS) — the `id` maps to
 * SECTION_NARRATION_AUDIO in landingVisualMedia.ts and the public MP3 filename.
 */

export type SectionNarrationId =
  | 'creative-range'
  | 'tool-stack'
  | 'why-sceneflow'
  | 'beat-first-pipeline'
  | 'extended-scenes'
  | 'trust-safety'
  | 'use-cases'
  | 'core-capabilities'
  | 'pre-vis-engine'
  | 'feature-pre-vis'
  | 'engineering'
  | 'pricing'

export type SectionNarration = {
  id: SectionNarrationId
  /** Human label for logs / reference. */
  label: string
  /** Spoken narration text. */
  script: string
}

export const SECTION_NARRATIONS: SectionNarration[] = [
  {
    id: 'creative-range',
    label: 'Every Style, Every Screen',
    script:
      "Your creative identity shouldn't be an afterthought. In SceneFlow, your style, your aspect ratio, your tone, and your story all lock in at the very beginning, in Blueprint. Whether you're shaping a cinematic widescreen drama or a vertical video built for the phone, that single choice shapes everything that follows: how scenes are framed, how characters move, even how the dialogue is written. Choose from looks like photorealism, anime, Pixar-style 3D, Ghibli, comic book, watercolor, and more. SceneFlow weaves that look into the very DNA of your script, so every beat matches your vision, and every screen gets the right format. The result is a project that feels intentional, from the first frame to the last.",
  },
  {
    id: 'tool-stack',
    label: 'The Broken Way vs the SceneFlow Way',
    script:
      "Here's how most people make AI video today. A script in one tool, images in another, voices somewhere else, then video, then music, then editing. Six tabs open, copying and pasting between them, re-rolling generations until something finally sticks. It's slow, it's frustrating, and it can eat four hours or more before you have anything to show. SceneFlow replaces that chaos with one guided studio. You move from Blueprint, to References, to Production, to Publish, approving the look as you go and testing how your story lands before you ever pay for a final render. Same creative power, far less busywork. A project that used to take an entire afternoon can be finished in thirty to sixty minutes.",
  },
  {
    id: 'why-sceneflow',
    label: 'Why SceneFlow vs prompt-and-generate tools',
    script:
      "Tools like Gemini Studio and Google Flow are great at generating individual clips. But a finished video is so much more than a clip. SceneFlow is built around the entire production, not just the moment you hit generate. Instead of prompting in isolation, you work in structured phases with editable baselines at every step. Instead of fighting to keep your characters and scenes consistent, your Reference Library and Beat Frames lock the visuals in before any video is made. Instead of guessing what your audience will think, you validate your story with Audience Resonance, and preview it in the Screening Room before you publish. From script, to scenes, to final assembly and distribution, it all lives in one place. That is the difference between generating clips, and producing video.",
  },
  {
    id: 'beat-first-pipeline',
    label: 'Beat-First Video Pipeline',
    script:
      "Most AI video feels like pulling a slot machine. Generate, cross your fingers, and regenerate when it comes out wrong. SceneFlow flips that completely. We call it beat-first. Before any expensive final video is made, you get a quick pre-visualization of your scene, the audio and the visual beats, ready to review in minutes. You lock the opening and closing frames, so your composition and continuity stay true. Only then does SceneFlow generate the video, building from frames you have already approved, instead of blind prompts. You're refining a look you can already see, not gambling on a random result. The payoff is fewer wasted generations, tighter continuity, and the confidence that you're spending credits on something you already love.",
  },
  {
    id: 'extended-scenes',
    label: 'Beyond the 8-Second Clip',
    script:
      "A single AI clip is usually just a few seconds long, nowhere near enough for a real monologue, an explainer, or a back-and-forth conversation. SceneFlow breaks through that limit. It plans longer moments as one connected sequence: it starts your scene, then seamlessly continues it, step by step, holding the same angle, the same motion, and the same performance the whole way through. And because you approve the look first, you're never guessing. Long lines are split automatically during review, the pieces are stitched together smoothly, and the audio stays in sync, even when your narration runs longer than the picture. The result is a scene that flows naturally, well beyond what a single clip could ever capture.",
  },
  {
    id: 'trust-safety',
    label: 'Layered Guardrails for Creators & Platforms',
    script:
      "Creative freedom and responsibility don't have to be at odds. SceneFlow protects both your work and your platform, with safety built into every layer. Every generation runs through Google-native safety, with production-tuned filtering, and your content is never used to train shared models. When a policy limit gets in the way, extended guardrails step in, with a guarded creative path and a mandatory review before anything is stored. On top of that, moderation runs across your entire workflow, from Blueprint, to script, to pre-visualization, to final video. And your clips carry signed provenance, with audit logs and clear reporting. It's enterprise-grade trust and safety, so creators can move fast, and platforms can stay protected.",
  },
  {
    id: 'use-cases',
    label: 'Whatever Video You Can Imagine',
    script:
      "Whatever you're trying to make, you can build it in SceneFlow. Episodic series and creator shows. Real-estate and property tours. Training, education, and how-tos. Podcasts, news formats, and timely market or sports recaps. Branded campaigns, case studies, and product explainers. Even public-service and advocacy messages. A solo creator can turn forty hours of work into twenty-five minutes. An in-house team can bring weeks of vendor backlog down to the very same week. A production shop can productize an entire service. An agency can go from a three-week delivery, to just three days. And a film team can take a script all the way to an interactive pre-visualization, in dozens of languages, in under thirty minutes. One automated studio, from concept to a publish-ready master.",
  },
  {
    id: 'core-capabilities',
    label: 'Audience Resonance Analysis · Sceneflow Express',
    script:
      "SceneFlow gives you two superpowers before you ever spend on final video. First, Audience Resonance Analysis. Define your target audience in Blueprint, and SceneFlow scores your script for clarity, pacing, emotional arc, and persona fit — with section-level recommendations and one-click fixes, not a black-box grade. You know what lands before you invest in heavy renders. Second, Sceneflow Express. Auto-generate pre-vis, animatics, and video beats concurrently — move from script to a shareable preview in minutes, approve Beat Frames, then generate final video from frames you have already locked. Intelligence plus speed, in one studio.",
  },
  {
    id: 'pre-vis-engine',
    label: 'Pre-Visualization Engine',
    script:
      "In traditional filmmaking, pre-visualization takes weeks and a small army of artists. SceneFlow's Pre-Visualization Engine changes that equation. Upload your script, run Audience Resonance against your target demographic, and generate a fully voiced, scored animatic you can screen for investors, producers, and test audiences — with Express concurrent generation across beats. Fail fast in pre-production: iterate scenes, test story fit, and get stakeholder sign-off before a single camera rolls. For financiers, hard resonance data backs every creative decision. This is enterprise-grade pre-vis, scaled to the speed of modern production.",
  },
  {
    id: 'feature-pre-vis',
    label: 'Detailed Platform Walkthrough',
    script:
      "SceneFlow is not a single tool — it is a guided production pipeline. This walkthrough takes you under the hood: from Series and Blueprint, where you lock your story, audience, and visual style, through Production, where script, pre-vis, voice, and scene video are generated beat by beat, to Screening Room, where you preview, assemble a master, collect feedback, and publish. Every phase is editable. Every phase gives you approval before the next spend. Whether you are a solo creator or an in-house team, you will see exactly how one studio replaces the fragmented tool stack — and how automation keeps you in control at every step.",
  },
  {
    id: 'engineering',
    label: 'Built for Production Workloads',
    script:
      "SceneFlow is built for real production workloads, not hobbyist clip generation. The architecture runs on Google Cloud with Vertex AI, Imagen, and Veo synthesis — scalable orchestration that grows with your team. Security and privacy are first-class: encryption at rest, access controls, and privacy-first handling of your creative assets. Enterprise teams get BYOK for billing control, audit logs, and signed content provenance on every generated clip. Whether you are shipping weekly episodes or running an in-house video team, the platform is engineered for reliability, scale, and the trust your stakeholders expect.",
  },
  {
    id: 'pricing',
    label: 'Pay for What You Create',
    script:
      "SceneFlow pricing is designed for clarity, not surprise. One base plan gives you full platform access. Credits power AI generation — script, pre-vis, voice, and video — and you top up only when you need more. No hidden per-seat surprises, no paying for tools you do not use. Compare that to traditional pre-vis at thousands of dollars per project, or agency retainers that stretch timelines. With SceneFlow, you see credit spend at every workflow phase, cap budgets per project, and scale from a nine-dollar Explorer test flight to team plans with BYOK. Pay for what you create — and keep every dollar accountable.",
  },
]
