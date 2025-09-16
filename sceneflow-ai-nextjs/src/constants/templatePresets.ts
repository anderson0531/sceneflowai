export type TemplatePreset = {
  name: string
  description: string
  content: string
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    name: 'Product Ad (60s)',
    description: 'Direct-response product ad optimized for 60s with social-first pacing.',
    content: `Title: Product Ad — 60s

Structure:
1) Hook: On-screen line promises key benefit to <Target Audience>
2) Problem: Show the pain the product solves
3) Demonstration: Product in action with clear steps
4) Social Proof: Before/after or testimonial snippet
5) CTA: Strong on-screen CTA and VO

Creative Directives:
- Visual change every 8–10s
- Subtitles on by default
- Platform-safe text (avoid clutter)

Attributes (inline):
- Target Audience: 
- Key Message / CTA: 
- Platform: 
- Tone: Energetic, helpful
- Duration: 60
`
  },
  {
    name: 'Explainer (90s)',
    description: 'Educational explainer with simple narrative arc and examples.',
    content: `Title: Explainer — 90s

Structure:
1) Why it matters now
2) What it is (clear definition)
3) How it works (3 steps)
4) Example (relatable scenario)
5) Recap and CTA

Directives:
- Keep jargon minimal; define first use
- Visual support for each step

Attributes (inline):
- Audience: 
- Key Takeaway: 
- Examples: 
- Duration: 90
`
  },
  {
    name: 'TikTok Short (30s)',
    description: 'Fast, punchy short with strong hook and quick payoff.',
    content: `Title: TikTok Short — 30s

Structure:
1) 0–3s Hook (pattern interrupt)
2) 3–20s Demo/Reveal
3) 20–30s CTA / Follow

Directives:
- Bold captions; high contrast
- Beat cuts aligned to music

Attributes (inline):
- Hook Line: 
- Visual Gag / Reveal: 
- CTA: 
- Duration: 30
`
  },
  {
    name: 'Trailer (45s)',
    description: 'Cinematic mini-trailer structure with rising stakes.',
    content: `Title: Trailer — 45s

Beats:
1) Cold open: intriguing image or line
2) Setup: what this is about
3) Escalation: stakes / features / beats
4) Peak moment: hero line or visual
5) Tag + CTA

Directives:
- Cinematic camera; motion accents
- Music rise and sting
`
  },
  {
    name: 'Corporate Overview (120s)',
    description: 'Company story structured for B2B audiences.',
    content: `Title: Corporate Overview — 120s

Sections:
1) Mission & Vision
2) Problems we solve
3) Solutions & Differentiators
4) Customers & Impact (metrics)
5) CTA (contact / demo)
`
  }
]















