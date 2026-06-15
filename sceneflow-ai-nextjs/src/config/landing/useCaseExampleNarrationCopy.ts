/**
 * Spoken narration scripts for use-case example previews.
 * Used by scripts/generate-use-case-narration.ts (Gemini TTS).
 */

export type UseCaseExampleNarration = {
  categoryId: string
  exampleId: string
  label: string
  script: string
}

export const USE_CASE_EXAMPLE_NARRATIONS: UseCaseExampleNarration[] = [
  // Entertainment (5)
  {
    categoryId: 'entertainment',
    exampleId: 'vertical-short-drama',
    label: 'YouTube TV Drama',
    script:
      "Here's how it works. You start with your series concept and character references in SceneFlow's Blueprint — locking your look, tone, and widescreen format before a single frame is rendered. SceneFlow then produces beat-first pre-visualization, keeps every face and voice consistent through your Reference Library, and delivers publish-ready sixteen-by-nine episodic drama masters built for YouTube and connected TV. The result is engaging alternative content that can compete for the growing share of viewers watching long-form drama on the big screen.",
  },
  {
    categoryId: 'entertainment',
    exampleId: 'animated-web-series',
    label: 'Animated Web Series',
    script:
      "Here's how it works. You lock your stylized characters once in the Reference Library — anime, Pixar, Ghibli-inspired, or any art style you choose. SceneFlow then ships serialized animated episodes where every character, voice, and visual beat stays consistent, episode after episode. What you get is an indie-quality animated web series with the continuity audiences expect from hits like Glitch Productions — without rebuilding your cast in every new tool.",
  },
  {
    categoryId: 'entertainment',
    exampleId: 'episodic-youtube-series',
    label: 'Episodic YouTube Series',
    script:
      "Here's how it works. You define your season arcs in Series Studio, and SceneFlow syncs those outlines into Blueprint and Production automatically. Every face, voice, and story beat stays aligned as your channel grows — no drift between episodes, no manual handoffs. What you get is a serialized YouTube series that scales with your audience, produced from one guided studio instead of a patchwork of disconnected apps.",
  },
  {
    categoryId: 'entertainment',
    exampleId: 'creator-reality-competition',
    label: 'Creator Reality & Competition',
    script:
      "Here's how it works. You write your competition format and character beats in Blueprint, then produce multi-camera-style segments through SceneFlow's beat-first pipeline. Stakeholders review rounds in the Screening Room, and you ship a master MP4 the same week — no broadcast crew required. What you get is reality-scale creator competition content with professional pacing and stakeholder approval built in.",
  },
  {
    categoryId: 'entertainment',
    exampleId: 'ctv-ready-series',
    label: 'Vertical Mobile Drama',
    script:
      "Here's how it works. You set your nine-by-sixteen format and photoreal style in Blueprint, approve Beat Frames before any render, and extend emotional beats into longer scenes that hold attention in the scroll. SceneFlow outputs vertical masters ready for YouTube Shorts and mobile feeds. What you get is serialized mobile drama with hooks that stop the thumb — produced and approved before you spend credits on final video.",
  },
  // Property (5)
  {
    categoryId: 'property',
    exampleId: 'residential-real-estate',
    label: 'Residential Real Estate',
    script:
      "Here's how it works. You upload your actual property photos, along with your saved headshot and voice. SceneFlow then instantly produces a professional listing walkthrough — a smooth, full-motion tour of the home, narrated in your own voice and presented by your avatar, in over seventy languages. No film crew, no editing suite — just your photos, transformed into a polished walkthrough buyers anywhere can watch.",
  },
  {
    categoryId: 'property',
    exampleId: 'commercial-real-estate',
    label: 'Commercial Real Estate',
    script:
      "Here's how it works. You upload floor plans, renderings, and neighborhood data, paired with your broker's saved voice and avatar. SceneFlow then produces investor pitch walkthroughs that bring every square foot to life — animatics or full-motion tours localized in over seventy languages. What you get is a compelling property story that closes deals without a production crew on every listing.",
  },
  {
    categoryId: 'property',
    exampleId: 'short-term-rentals',
    label: 'Short-Term Rentals',
    script:
      "Here's how it works. You upload your house photos and amenity notes with your host's saved voice. SceneFlow then instantly publishes digital welcome videos that greet every guest in their language — before they ever check in. What you get is a warm, personalized arrival experience for every booking, without recording a new video for each guest.",
  },
  {
    categoryId: 'property',
    exampleId: 'hospitality-tourism',
    label: 'Hospitality & Tourism',
    script:
      "Here's how it works. You upload hotel photos and itinerary highlights with your brand's saved host voice and avatar. SceneFlow then ships virtual tours and narrated travel guides in over seventy languages — no film crew per property. What you get is destination marketing that scales across your portfolio, with a consistent brand voice in every market.",
  },
  {
    categoryId: 'property',
    exampleId: 'museum-gallery-guides',
    label: 'Museum & Gallery Guides',
    script:
      "Here's how it works. You upload exhibit photos and curator notes as displays change. SceneFlow then instantly refreshes narrated gallery tours in over seventy languages — no reshoot when the exhibition rotates. What you get is a living audio-visual guide that updates with your collection, keeping every visitor engaged in the language they prefer.",
  },
  // Knowledge (6)
  {
    categoryId: 'knowledge',
    exampleId: 'k12-higher-ed',
    label: 'K-12 & Higher Ed',
    script:
      "Here's how it works. You upload lesson materials with your instructor's saved voice and character reference. SceneFlow then generates full curriculum modules your ESL and global campus students can watch in over seventy languages. What you get is engaging instructional video that reaches every learner — without a separate production for each language or classroom.",
  },
  {
    categoryId: 'knowledge',
    exampleId: 'corporate-ld',
    label: 'Corporate L&D',
    script:
      "Here's how it works. You upload training slides with your L&D lead's saved voice. SceneFlow then publishes module videos — extending long explainers scene by scene, with Beat Frames approved before render. What you get is professional compliance and skills training that ships the same week your content is approved, not months after a vendor quote.",
  },
  {
    categoryId: 'knowledge',
    exampleId: 'software-saas-tutorials',
    label: 'Software SaaS Tutorials',
    script:
      "Here's how it works. You upload UI screenshots as reference frames with your product expert's saved voice. SceneFlow then generates walkthrough videos that animate every click — updated the day your UI ships. What you get is always-current product tutorials that onboard users faster, without re-recording every time the interface changes.",
  },
  {
    categoryId: 'knowledge',
    exampleId: 'niche-skill-tutoring',
    label: 'Niche Skill Tutoring',
    script:
      "Here's how it works. You upload step-by-step photos with your instructor's saved voice and character reference. SceneFlow then publishes professional how-to series — cooking, DIY, or certification prep — in over seventy languages. What you get is a scalable tutoring channel that teaches hands-on skills with your voice and presence, reaching students worldwide.",
  },
  {
    categoryId: 'knowledge',
    exampleId: 'medical-patient-education',
    label: 'Medical/Patient Education',
    script:
      "Here's how it works. You upload procedure diagrams with your clinician's approved saved voice. SceneFlow then generates clear patient education videos families can understand in over seventy languages. What you get is compassionate, accurate health guidance that reaches every community — without waiting on translation vendors or reshoots.",
  },
  {
    categoryId: 'knowledge',
    exampleId: 'video-memoirs',
    label: 'Video Memoirs',
    script:
      "Here's how it works. You upload family photos, interview audio, and scene notes with a saved narrator voice. SceneFlow then shapes chapter-based memoir videos — and you approve the pre-vis before final render. What you get is a polished legacy video that honors a life story, produced with care and control at every step.",
  },
  // JIT Media (5)
  {
    categoryId: 'jit',
    exampleId: 'hyper-local-news',
    label: 'Hyper-Local News',
    script:
      "Here's how it works. You upload today's photos and bulletins with your anchor's saved voice. SceneFlow then instantly publishes a daily neighborhood news brief — no film crew, no missed deadline. What you get is timely local journalism that keeps your community informed, produced and published before the story goes cold.",
  },
  {
    categoryId: 'jit',
    exampleId: 'financial-market-recaps',
    label: 'Financial & Market Recaps',
    script:
      "Here's how it works. You upload market data and chart snapshots each morning with your analyst's saved voice. SceneFlow then turns them into a narrated visual digest — ready before the opening bell. What you get is a daily market recap your audience can watch while they plan their day, without a studio or editing team.",
  },
  {
    categoryId: 'jit',
    exampleId: 'sports-commentary',
    label: 'Sports Commentary',
    script:
      "Here's how it works. You upload game stats and still photography with your commentator's saved voice. SceneFlow then generates recap videos with animated action — published while fans are still talking. What you get is same-night sports coverage that rides the momentum of the game, not a highlight reel that ships days later.",
  },
  {
    categoryId: 'jit',
    exampleId: 'true-crime-historical-docs',
    label: 'True Crime & Historical Docs',
    script:
      "Here's how it works. You lock historical figures in your Reference Library once — faces, voices, and visual style. SceneFlow then produces multi-part episodes where every character stays consistent, series after series. What you get is binge-worthy documentary content with the continuity audiences demand, without recasting every new installment.",
  },
  {
    categoryId: 'jit',
    exampleId: 'weather-emergency-alerts',
    label: 'Weather & Emergency Alerts',
    script:
      "Here's how it works. You upload emergency bulletins with your agency's trusted saved voice. SceneFlow then broadcasts clear alerts in over seventy languages across social platforms — in minutes, not days. What you get is life-saving public communication that reaches every community fast, with the urgency and clarity the moment demands.",
  },
  // B2B (4)
  {
    categoryId: 'b2b',
    exampleId: 'product-explainer-videos',
    label: 'Product Explainer Videos',
    script:
      "Here's how it works. You upload product catalog shots with your brand's saved presenter voice and avatar. SceneFlow then generates a cinematic explainer series — and you approve the pre-vis before you render. What you get is polished product storytelling that wins attention and converts prospects, without a production agency on every launch.",
  },
  {
    categoryId: 'b2b',
    exampleId: 'case-study-testimonials',
    label: 'Case Study/Testimonials',
    script:
      "Here's how it works. You upload client headshots, project photos, and success metrics with a saved narrator voice. SceneFlow then produces polished visual case studies — without a testimonial shoot. What you get is credible social proof that showcases real results, ready to share with prospects the same week the project closes.",
  },
  {
    categoryId: 'b2b',
    exampleId: 'recruitment-branding',
    label: 'Recruitment & Branding',
    script:
      "Here's how it works. You upload office photos and culture highlights with your recruiter's saved voice and avatar. SceneFlow then gives candidates a narrated day-in-the-life tour — in over seventy languages for global hiring. What you get is employer branding that attracts talent worldwide, with a personal voice that makes your company feel real before the first interview.",
  },
  {
    categoryId: 'b2b',
    exampleId: 'conference-event-promos',
    label: 'Conference & Event Promos',
    script:
      "Here's how it works. You upload speaker bios, session details, and venue photos with your event host's saved voice. SceneFlow then generates speaker intros and what-to-expect guides — refreshed every time the agenda changes. What you get is event marketing that stays current through every schedule update, without reshooting promos from scratch.",
  },
  // Public (4)
  {
    categoryId: 'public',
    exampleId: 'ngo-impact-reports',
    label: 'NGO Impact Reports',
    script:
      "Here's how it works. You upload field photography and impact data with your organization's saved narrator voice. SceneFlow then turns donor reports into emotive narrated videos — your mission's voice, not a slideshow. What you get is fundraising content that moves hearts and opens wallets, grounded in the real work your team does on the ground.",
  },
  {
    categoryId: 'public',
    exampleId: 'public-health-announcements',
    label: 'Public Health Announcements',
    script:
      "Here's how it works. You upload approved health messaging with your department's trusted saved voice. SceneFlow then reaches every community in over seventy languages — same clarity, same urgency, zero translation delay. What you get is public health communication that saves lives across language barriers, published when minutes matter.",
  },
  {
    categoryId: 'public',
    exampleId: 'legal-insurance-explainers',
    label: 'Legal & Insurance Explainers',
    script:
      "Here's how it works. You upload contract summaries and process diagrams with your advisor's saved voice. SceneFlow then generates visual breakdowns clients actually understand — before they sign or file a claim. What you get is clear, trustworthy explainers that reduce confusion and build confidence, without legalese that loses your audience.",
  },
  {
    categoryId: 'public',
    exampleId: 'religious-spiritual-teachings',
    label: 'Religious & Spiritual Teachings',
    script:
      "Here's how it works. You upload sermon notes or sacred texts with your teacher's saved voice and presence. SceneFlow then publishes a consistent daily video series for global congregations — in over seventy languages. What you get is spiritual teaching that reaches believers everywhere, with your voice and message carried faithfully across cultures and time zones.",
  },
]
