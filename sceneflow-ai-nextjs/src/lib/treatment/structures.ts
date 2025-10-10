export type BeatStructureKey = 'three_act' | 'save_the_cat' | 'heros_journey' | 'mini_doc' | 'instructional'

export const BEAT_STRUCTURES: Record<BeatStructureKey, { label: string; beats: Array<{ key: string; title: string; weight: number }> }> = {
  three_act: {
    label: 'Three‑Act Structure',
    beats: [
      { key: 'setup', title: 'Act I: Setup / Inciting Incident', weight: 0.25 },
      { key: 'confrontation', title: 'Act II: Confrontation / Rising Action', weight: 0.5 },
      { key: 'resolution', title: 'Act III: Resolution / Climax', weight: 0.25 }
    ]
  },
  save_the_cat: {
    label: 'Save the Cat',
    beats: [
      { key: 'opening', title: 'Opening Image & Theme Stated', weight: 0.08 },
      { key: 'set_up', title: 'Set‑Up & Catalyst', weight: 0.12 },
      { key: 'debate', title: 'Debate → Break into Two', weight: 0.12 },
      { key: 'fun_games', title: 'Fun and Games / Midpoint', weight: 0.30 },
      { key: 'bad_worse', title: 'Bad Guys Close In / All Is Lost', weight: 0.18 },
      { key: 'finale', title: 'Break into Three / Finale', weight: 0.20 }
    ]
  },
  heros_journey: {
    label: "The Hero's Journey",
    beats: [
      { key: 'ordinary', title: 'Ordinary World → Call to Adventure', weight: 0.12 },
      { key: 'mentor', title: 'Refusal / Meeting the Mentor / Crossing', weight: 0.18 },
      { key: 'trials', title: 'Tests, Allies, Enemies → Ordeal → Reward', weight: 0.40 },
      { key: 'return', title: 'The Road Back → Resurrection → Return', weight: 0.30 }
    ]
  },
  mini_doc: {
    label: 'Mini‑Doc (3‑part)',
    beats: [
      { key: 'hook_context', title: 'Hook & Context', weight: 0.25 },
      { key: 'journey', title: 'Journey / Process / Discovery', weight: 0.50 },
      { key: 'impact', title: 'Impact & Takeaway', weight: 0.25 }
    ]
  },
  instructional: {
    label: 'Instructional (3 modules + recap)',
    beats: [
      { key: 'intro', title: 'Intro & Objectives', weight: 0.15 },
      { key: 'module1', title: 'Module 1', weight: 0.25 },
      { key: 'module2', title: 'Module 2', weight: 0.25 },
      { key: 'recap', title: 'Recap & Assessment', weight: 0.35 }
    ]
  }
}


