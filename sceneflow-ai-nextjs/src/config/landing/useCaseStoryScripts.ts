/**
 * Cinematic "Hear the Story" scripts for landing use-case examples.
 *
 * Keyed by "{categoryId}/{exampleId}". Each story dramatizes the use case's problem
 * and SceneFlow solution with a Narrator plus one or two named characters.
 * Source of truth for `scripts/generate-use-case-stories.ts`.
 */

import type {
  RoleStoryCharacter,
  RoleStoryLine,
  RoleStoryScript,
} from '@/config/landing/roleStoryScripts'

export type { RoleStoryCharacter, RoleStoryLine, RoleStoryScript as UseCaseStoryScript }

export type UseCaseStoryKey = `${string}/${string}`

export const USE_CASE_STORY_SCRIPTS: Record<UseCaseStoryKey, RoleStoryScript> = {
  // ── Entertainment (5) ──────────────────────────────────────────────────────
  'entertainment/vertical-short-drama': {
    title: 'The Connected-TV Deadline',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Rasalgethi',
        profile: 'Robust, deep, narrative-driven storyteller; cinematic gravity.',
      },
      {
        id: 'jordan',
        name: 'Jordan (series creator)',
        voiceId: 'gemini-Leda',
        profile: 'Youthful, warm, ambitious YouTube drama creator; expressive and driven.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Thirteen percent of American TV viewing now happens on YouTube. Jordan has the script for episode four. What Jordan does not have is time.',
        directorNote: 'Open with cinematic weight; let the stat land, then tighten on the deadline.',
      },
      {
        characterId: 'jordan',
        kind: 'dialogue',
        text: 'Every scene is a different tool, a different face, a different voice. I cannot ship widescreen drama on this cadence.',
        directorNote: 'Frustrated, racing against the upload schedule; voice tight with pressure.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Then Jordan locks the cast in Blueprint, maps every beat to pre-vis, and lets the Reference Library carry continuity across the season.',
        directorNote: 'The turn — warmer, momentum building, relief arriving.',
      },
      {
        characterId: 'jordan',
        kind: 'dialogue',
        text: 'Same protagonist, every scene, publish-ready sixteen-by-nine? I can actually compete on connected TV now.',
        directorNote: 'Dawning excitement, disbelief turning into a grin on the last line.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Episode four ships on schedule. With SceneFlow, the drama stays on the screen — not stuck in the edit bay.',
        directorNote: 'Confident, satisfying close; land the final line with quiet pride.',
      },
    ],
  },

  'entertainment/animated-web-series': {
    title: 'The Locked Cast',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Aoede',
        profile: 'Smooth, rich, warm immersive storyteller; cinematic and enveloping.',
      },
      {
        id: 'alex',
        name: 'Alex (animator)',
        voiceId: 'gemini-Puck',
        profile: 'Upbeat, playful, energetic indie animator; creative and quick.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Alex built a cult following with one animated pilot. Episode two broke the spell — different faces, different voices, fans noticed.',
        directorNote: 'Warm open, then a note of loss when fans noticed.',
      },
      {
        characterId: 'alex',
        kind: 'dialogue',
        text: 'Glitch-level consistency is the bar. I cannot rebuild my cast in every new tool and hope the audience stays.',
        directorNote: 'Earnest frustration from a creator who cares about craft.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'So Alex locks stylized characters once in the Reference Library — anime, Pixar, Ghibli — and ships serialized episodes from one studio.',
        directorNote: 'Building hope; each phrase lifts slightly.',
      },
      {
        characterId: 'alex',
        kind: 'dialogue',
        text: 'Episode ten looks like episode one? That is the whole game. I can finally run a real series.',
        directorNote: 'Bright, relieved, ending with confident energy.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Indie quality, series continuity. With SceneFlow, Alex stopped making pilots — and started making a show.',
        directorNote: 'Warm, resonant close.',
      },
    ],
  },

  'entertainment/episodic-youtube-series': {
    title: 'Season Drift',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Algieba',
        profile: 'Smooth, commanding, polished announcer; measured authority.',
      },
      {
        id: 'riley',
        name: 'Riley (channel lead)',
        voiceId: 'gemini-Despina',
        profile: 'Upbeat, bright, modern YouTube channel lead; fast and organized.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Riley\'s channel hit a hundred thousand subscribers. Season two was supposed to scale. Instead, every episode drifted.',
        directorNote: 'Polished setup; let drift land with a touch of irony.',
      },
      {
        characterId: 'riley',
        kind: 'dialogue',
        text: 'Outlines in one doc, production in five apps, and the season arc? Lost somewhere between episode three and six.',
        directorNote: 'Brisk exasperation; listing the chaos with clipped energy.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Series Studio syncs season arcs into Blueprint and Production automatically — every face, voice, and beat stays aligned.',
        directorNote: 'The pivot — brighter, decisive momentum.',
      },
      {
        characterId: 'riley',
        kind: 'dialogue',
        text: 'The whole season pipeline in one place? I can grow the channel without growing the chaos.',
        directorNote: 'Relief turning into command; confident close.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'One guided studio replaced a patchwork of tabs. With SceneFlow, Riley ships seasons — not just episodes.',
        directorNote: 'Assured, conclusive.',
      },
    ],
  },

  'entertainment/creator-reality-competition': {
    title: 'Same-Week Stakes',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Sadaltager',
        profile: 'Confident, corporate, stable anchor; sleek and assured.',
      },
      {
        id: 'taylor',
        name: 'Taylor (showrunner)',
        voiceId: 'gemini-Fenrir',
        profile: 'Excitable, dynamic, animated competition showrunner; high energy.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The elimination round airs Friday. Taylor\'s competition format needs broadcast pacing — without a broadcast crew.',
        directorNote: 'Sleek tension; build urgency on Friday.',
      },
      {
        characterId: 'taylor',
        kind: 'dialogue',
        text: 'Multi-cam beats, stakeholder reviews, and I am still stitching clips at two a.m. This cannot scale.',
        directorNote: 'High energy fraying into exhaustion by the last sentence.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Taylor writes the format in Blueprint, produces beat-first segments, and runs rounds through the Screening Room for sign-off.',
        directorNote: 'Accelerating, brighter; momentum on each step.',
      },
      {
        characterId: 'taylor',
        kind: 'dialogue',
        text: 'Approved in Screening Room, master MP4 out the same week? That is a real competition show.',
        directorNote: 'Triumphant, animated; land the last line with punch.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Reality scale, creator budget. With SceneFlow, Taylor ships the stakes — on schedule.',
        directorNote: 'Crisp, confident close.',
      },
    ],
  },

  'entertainment/ctv-ready-series': {
    title: 'Stop the Scroll',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Callirrhoe',
        profile: 'Elegant, melodic, articulate; refined and dramatic.',
      },
      {
        id: 'casey',
        name: 'Casey (mobile drama creator)',
        voiceId: 'gemini-Zephyr',
        profile: 'Bright, clear, energetic mobile-first creator; fast and emotional.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Nine by sixteen. Three seconds to hook. Casey\'s mobile drama lives or dies in the scroll — and every re-roll burns credits.',
        directorNote: 'Elegant tension; let three seconds feel urgent.',
      },
      {
        characterId: 'casey',
        kind: 'dialogue',
        text: 'I approve a frame, render, wrong emotion, re-roll again. The thumb keeps scrolling while I am still guessing.',
        directorNote: 'Frustrated, quick pacing; scroll anxiety in the voice.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Casey sets photoreal nine-sixteen in Blueprint, approves Beat Frames before render, and chains extensions for emotional beats that hold.',
        directorNote: 'The turn — opening up, warmer, building confidence.',
      },
      {
        characterId: 'casey',
        kind: 'dialogue',
        text: 'Hooks that stop the thumb — approved before I spend on final video? That changes everything.',
        directorNote: 'Excited realization; energy rising on the last phrase.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Vertical masters ready for Shorts and mobile feeds. With SceneFlow, Casey owns the scroll — not the slot machine.',
        directorNote: 'Polished, satisfying close.',
      },
    ],
  },

  // ── Property (5) ───────────────────────────────────────────────────────────
  'property/residential-real-estate': {
    title: 'The Listing Clock',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Algieba',
        profile: 'Smooth, commanding, polished; professional and assured.',
      },
      {
        id: 'maria',
        name: 'Maria (realtor)',
        voiceId: 'gemini-Kore',
        profile: 'Firm, confident realtor; decisive and client-focused.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The listing goes live Monday. Maria has twenty photos and no film crew — and buyers in three countries waiting.',
        directorNote: 'Cool setup; let the deadline and global buyers create pressure.',
      },
      {
        characterId: 'maria',
        kind: 'dialogue',
        text: 'I used to wait a week for video, or pay thousands for a shoot. My listings cannot wait that long anymore.',
        directorNote: 'Controlled frustration; professional but pressed for time.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Maria uploads property photos with her saved headshot and voice. SceneFlow produces a narrated walkthrough in over seventy languages.',
        directorNote: 'The pivot — brighter, each step landing cleanly.',
      },
      {
        characterId: 'maria',
        kind: 'dialogue',
        text: 'My voice, my face, a full-motion tour — from my phone photos? That closes deals before the open house.',
        directorNote: 'Relief turning into confident pride.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'No crew, no edit suite. With SceneFlow, Maria turns listings into walkthroughs buyers watch anywhere.',
        directorNote: 'Polished, conclusive close.',
      },
    ],
  },

  'property/commercial-real-estate': {
    title: 'Every Square Foot',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Schedar',
        profile: 'Gravelly, deep, authoritative; weathered and grounded.',
      },
      {
        id: 'david',
        name: 'David (commercial broker)',
        voiceId: 'gemini-Sadaltager',
        profile: 'Confident, corporate, stable commercial broker; persuasive.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'David has floor plans, renderings, and an investor meeting Thursday. What he needs is a pitch that makes every square foot feel real.',
        directorNote: 'Grounded open; build stakes toward Thursday.',
      },
      {
        characterId: 'david',
        kind: 'dialogue',
        text: 'Static PDFs do not close commercial deals. Investors want to walk the space — and I cannot fly them all onsite.',
        directorNote: 'Measured frustration; the gap between PDFs and experience.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'David uploads plans and neighborhood data with his broker voice and avatar. SceneFlow produces investor pitch walkthroughs localized in seventy-plus languages.',
        directorNote: 'Building momentum; warmer with each capability.',
      },
      {
        characterId: 'david',
        kind: 'dialogue',
        text: 'A compelling property story, in their language, before the meeting? That is how you win the room.',
        directorNote: 'Confident, resonant; land the last line with authority.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Every square foot, brought to life. With SceneFlow, David closes without a production crew on every listing.',
        directorNote: 'Deep, satisfying close.',
      },
    ],
  },

  'property/short-term-rentals': {
    title: 'Before Check-In',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Aoede',
        profile: 'Smooth, rich, warm storyteller; inviting and cinematic.',
      },
      {
        id: 'lisa',
        name: 'Lisa (host)',
        voiceId: 'gemini-Erinome',
        profile: 'Gentle, reassuring, warm short-term rental host; hospitable.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Lisa\'s guest arrives from Tokyo tonight. Last week\'s guest came from São Paulo. Same house — different languages, same warm welcome needed.',
        directorNote: 'Warm, intimate open; let the global guests feel personal.',
      },
      {
        characterId: 'lisa',
        kind: 'dialogue',
        text: 'I cannot record a new welcome video for every booking. But a cold check-in feels wrong for a superhost.',
        directorNote: 'Gentle worry; hospitality pride underneath.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Lisa uploads house photos and amenity notes with her saved host voice. SceneFlow publishes digital welcome videos in every guest\'s language.',
        directorNote: 'Relief building; tender and hopeful.',
      },
      {
        characterId: 'lisa',
        kind: 'dialogue',
        text: 'They hear my voice, in their language, before they even walk in? That is the experience I want every time.',
        directorNote: 'Soft delight; warmth and satisfaction.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Personal arrival, every booking. With SceneFlow, Lisa greets the world — without recording it twice.',
        directorNote: 'Warm, enveloping close.',
      },
    ],
  },

  'property/hospitality-tourism': {
    title: 'Every Property, One Voice',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Rasalgethi',
        profile: 'Robust, narrative-driven; cinematic travel storyteller.',
      },
      {
        id: 'nina',
        name: 'Nina (brand director)',
        voiceId: 'gemini-Sulafat',
        profile: 'Polished, clean, corporate hospitality brand director; premium tone.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Nina manages twelve properties across four countries. Each one deserves a film crew. The budget allows for none.',
        directorNote: 'Cinematic scale; let the gap between deserve and budget land.',
      },
      {
        characterId: 'nina',
        kind: 'dialogue',
        text: 'Every hotel launch waits on video. Every market needs its own language. We cannot scale tours one crew at a time.',
        directorNote: 'Polished pressure; corporate but strained.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Nina uploads hotel photos and itinerary highlights with the brand host voice and avatar. SceneFlow ships virtual tours in seventy-plus languages.',
        directorNote: 'The turn — expansive, building across markets.',
      },
      {
        characterId: 'nina',
        kind: 'dialogue',
        text: 'Consistent brand voice across the whole portfolio, in every market? That is destination marketing that scales.',
        directorNote: 'Confident satisfaction; premium delivery.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'No film crew per property. With SceneFlow, Nina\'s brand travels — in every language.',
        directorNote: 'Resonant, sweeping close.',
      },
    ],
  },

  'property/museum-gallery-guides': {
    title: 'When the Exhibition Turns',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Charon',
        profile: 'Deep, informative, measured; documentary curator tone.',
      },
      {
        id: 'helen',
        name: 'Helen (curator)',
        voiceId: 'gemini-Vindemiatrix',
        profile: 'Precise, bright, analytical museum curator; articulate and passionate.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The new exhibition opens Saturday. Helen has new pieces, new labels, and a gallery tour that still describes last season.',
        directorNote: 'Measured setup; quiet urgency before Saturday.',
      },
      {
        characterId: 'helen',
        kind: 'dialogue',
        text: 'Every rotation means a reshoot or stale audio. Visitors deserve a guide that matches what is on the wall today.',
        directorNote: 'Precise frustration; care for visitors in every word.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Helen uploads exhibit photos and curator notes as displays change. SceneFlow refreshes narrated gallery tours in seventy-plus languages.',
        directorNote: 'Building hope; scholarly warmth.',
      },
      {
        characterId: 'helen',
        kind: 'dialogue',
        text: 'A living guide that updates with the collection? That is what a modern museum sounds like.',
        directorNote: 'Quiet pride; precise and satisfied.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'No reshoot when the exhibition rotates. With SceneFlow, Helen keeps every visitor engaged — in the language they prefer.',
        directorNote: 'Informative, warm close.',
      },
    ],
  },

  // ── Knowledge (6) ──────────────────────────────────────────────────────────
  'knowledge/k12-higher-ed': {
    title: 'Every Learner, Every Language',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Aoede',
        profile: 'Smooth, rich, warm educational storyteller.',
      },
      {
        id: 'prof',
        name: 'Dr. Chen (instructor)',
        voiceId: 'gemini-Achernar',
        profile: 'Crisp, articulate, professional educator; clear and caring.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Dr. Chen\'s classroom spans three continents. The lesson is ready. The video that reaches every student is not.',
        directorNote: 'Warm open; global scale, then the gap.',
      },
      {
        characterId: 'prof',
        kind: 'dialogue',
        text: 'ESL students, global campus learners — they need video in their language. I cannot produce six versions by Friday.',
        directorNote: 'Professional pressure; care for students underneath.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Dr. Chen uploads lesson materials with a saved instructor voice. SceneFlow generates full curriculum modules in seventy-plus languages.',
        directorNote: 'The pivot — hopeful, building reach.',
      },
      {
        characterId: 'prof',
        kind: 'dialogue',
        text: 'Engaging instruction that every learner can watch? That is equity I can actually deliver.',
        directorNote: 'Relief and conviction; crisp delivery.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'One module, every language. With SceneFlow, Dr. Chen reaches the whole classroom — not just the front row.',
        directorNote: 'Warm, inspiring close.',
      },
    ],
  },

  'knowledge/corporate-ld': {
    title: 'Same-Week Compliance',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Algieba',
        profile: 'Smooth, commanding corporate narrator; polished authority.',
      },
      {
        id: 'james',
        name: 'James (L&D lead)',
        voiceId: 'gemini-Alnilam',
        profile: 'Balanced, professional L&D lead; clear and pragmatic.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The policy update drops Monday. Legal approved the slides Tuesday. James\'s team needs module video by Friday.',
        directorNote: 'Deadpan corporate rhythm; compress the timeline tension.',
      },
      {
        characterId: 'james',
        kind: 'dialogue',
        text: 'Vendor quotes say six weeks. Internal tools say figure it out yourself. Compliance does not wait on either.',
        directorNote: 'Pragmatic exasperation; no-nonsense delivery.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'James uploads training slides with the L&D lead\'s saved voice. SceneFlow publishes module videos — Beat Frames approved before render.',
        directorNote: 'Decisive pivot; momentum on approval-before-render.',
      },
      {
        characterId: 'james',
        kind: 'dialogue',
        text: 'Approved pre-vis, shipped the same week the content was signed off? That is L&D on our timeline.',
        directorNote: 'Quiet satisfaction; professional pride.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Months of vendor backlog became same-week delivery. With SceneFlow, training ships when the business needs it.',
        directorNote: 'Assured, conclusive close.',
      },
    ],
  },

  'knowledge/software-saas-tutorials': {
    title: 'The Day the UI Ships',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Umbriel',
        profile: 'Conversational, clear, modern tech narrator.',
      },
      {
        id: 'sam',
        name: 'Sam (product marketer)',
        voiceId: 'gemini-Iapetus',
        profile: 'Clear, neutral, direct product marketer; tech-savvy.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The UI ships today. Sam\'s tutorial video still shows last month\'s dashboard. Users will notice.',
        directorNote: 'Modern, quick setup; urgency on today.',
      },
      {
        characterId: 'sam',
        kind: 'dialogue',
        text: 'Every release means re-recording every click. By the time the tutorial is done, we are two versions behind.',
        directorNote: 'Matter-of-fact frustration; SaaS pace in the voice.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Sam uploads UI screenshots as reference frames with the product expert\'s saved voice. SceneFlow animates every click — updated the day the UI ships.',
        directorNote: 'The turn — tech-forward optimism.',
      },
      {
        characterId: 'sam',
        kind: 'dialogue',
        text: 'Always-current walkthroughs the day we release? Onboarding finally keeps up with the product.',
        directorNote: 'Relieved, direct; clean landing on the last line.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'No re-record every sprint. With SceneFlow, Sam\'s tutorials ship with the code.',
        directorNote: 'Crisp, confident close.',
      },
    ],
  },

  'knowledge/niche-skill-tutoring': {
    title: 'Hands-On, Worldwide',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Schedar',
        profile: 'Gravelly, warm, authoritative craft narrator.',
      },
      {
        id: 'marco',
        name: 'Marco (tutor)',
        voiceId: 'gemini-Algenib',
        profile: 'Resonant, warm, engaging hands-on instructor; friendly expert.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Marco teaches bread baking to a local class of twelve. Online, twelve thousand students are waiting — in forty languages.',
        directorNote: 'Warm contrast between local twelve and global thousands.',
      },
      {
        characterId: 'marco',
        kind: 'dialogue',
        text: 'I can demo at the counter. I cannot fly to every kitchen. And my voice needs to reach students who do not speak English.',
        directorNote: 'Earnest, practical; passion for teaching.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Marco uploads step photos with his saved voice and character reference. SceneFlow publishes professional how-to series in seventy-plus languages.',
        directorNote: 'Building scale with warmth.',
      },
      {
        characterId: 'marco',
        kind: 'dialogue',
        text: 'My hands, my voice, teaching worldwide? That is a tutoring channel I can actually grow.',
        directorNote: 'Quiet excitement growing into pride.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Local craft, global reach. With SceneFlow, Marco teaches the world — from his own kitchen.',
        directorNote: 'Grounded, resonant close.',
      },
    ],
  },

  'knowledge/medical-patient-education': {
    title: 'Words They Can Trust',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Charon',
        profile: 'Deep, informative, clinical documentary tone.',
      },
      {
        id: 'dr',
        name: 'Dr. Patel (clinician)',
        voiceId: 'gemini-Pulcherrima',
        profile: 'Calm, composed, steady clinician; reassuring and precise.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The procedure is standard. The pamphlet is dense. The family in the waiting room speaks three different languages.',
        directorNote: 'Quiet clinical gravity; let the language gap sit.',
      },
      {
        characterId: 'dr',
        kind: 'dialogue',
        text: 'Families need to understand before they consent. A PDF and an interpreter phone line are not enough.',
        directorNote: 'Calm but firm; compassion without sentimentality.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Dr. Patel uploads procedure diagrams with an approved clinician voice. SceneFlow generates clear patient education in seventy-plus languages.',
        directorNote: 'Gentle hope; trust building.',
      },
      {
        characterId: 'dr',
        kind: 'dialogue',
        text: 'Compassionate, accurate guidance every community can understand? That is care that reaches everyone.',
        directorNote: 'Steady warmth; quiet conviction.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'No translation vendor, no reshoot. With SceneFlow, health guidance crosses every language barrier.',
        directorNote: 'Measured, reassuring close.',
      },
    ],
  },

  'knowledge/video-memoirs': {
    title: 'Her Mother\'s Story',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Aoede',
        profile: 'Smooth, rich, warm; tender long-form storyteller.',
      },
      {
        id: 'rachel',
        name: 'Rachel (adult child)',
        voiceId: 'gemini-Gacrux',
        profile: 'Soft, gentle, intimate; emotional and sincere.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Rachel found a shoebox of photos and a voice memo from her mother. She wanted more than a slideshow. She wanted her mother\'s story to last.',
        directorNote: 'Tender, slow open; memory and longing.',
      },
      {
        characterId: 'rachel',
        kind: 'dialogue',
        text: 'I have the pieces — photos, audio, notes. I do not have a way to shape them into something her grandchildren will actually watch.',
        directorNote: 'Soft, vulnerable; love for family in every word.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Rachel uploads family photos, interview audio, and scene notes. SceneFlow shapes chapter-based memoir videos — pre-vis approved before final render.',
        directorNote: 'Gentle resolve; hope building.',
      },
      {
        characterId: 'rachel',
        kind: 'dialogue',
        text: 'A polished legacy video — with me approving every chapter before it is final? That honors her properly.',
        directorNote: 'Emotional release; quiet tears possible, not overwrought.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'A life story, told with care. With SceneFlow, Rachel preserved a voice — not just a folder of files.',
        directorNote: 'Warm, enveloping close.',
      },
    ],
  },

  // ── JIT Media (5) ──────────────────────────────────────────────────────────
  'jit/hyper-local-news': {
    title: 'Before the Story Goes Cold',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Rasalgethi',
        profile: 'Robust, narrative news storyteller; urgent and grounded.',
      },
      {
        id: 'chris',
        name: 'Chris (neighborhood anchor)',
        voiceId: 'gemini-Achird',
        profile: 'Direct, steady, clear local news anchor; community-focused.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The council vote happened an hour ago. Chris\'s neighborhood wants to know before dinner — not after the morning paper.',
        directorNote: 'News urgency; compress the deadline.',
      },
      {
        characterId: 'chris',
        kind: 'dialogue',
        text: 'Hyper-local means hyper-fast. I cannot wait on a crew for a story that matters to people on my block today.',
        directorNote: 'Direct, community pride; frustration at delay.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Chris uploads today\'s photos and bulletins with the anchor\'s saved voice. SceneFlow publishes a daily neighborhood brief — no film crew, no missed deadline.',
        directorNote: 'Building momentum; civic energy.',
      },
      {
        characterId: 'chris',
        kind: 'dialogue',
        text: 'Timely journalism for my community, published while the story still matters? That is why I do this.',
        directorNote: 'Steady satisfaction; purpose in the voice.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Local news, local speed. With SceneFlow, Chris keeps the neighborhood informed — before the story goes cold.',
        directorNote: 'Grounded, resonant close.',
      },
    ],
  },

  'jit/financial-market-recaps': {
    title: 'Before the Bell',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Sadaltager',
        profile: 'Confident, corporate, crisp financial narrator.',
      },
      {
        id: 'morgan',
        name: 'Morgan (market analyst)',
        voiceId: 'gemini-Achernar',
        profile: 'Crisp, articulate, professional analyst; fast and precise.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Markets open in ninety minutes. Morgan has the data, the charts, and an audience that plans their day around the recap.',
        directorNote: 'Sleek urgency; ninety minutes ticking.',
      },
      {
        characterId: 'morgan',
        kind: 'dialogue',
        text: 'Charts in one tab, voiceover in another, edit in a third. My audience is at breakfast — I need to be in their ear before the bell.',
        directorNote: 'Brisk, pressured; professional tempo.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Morgan uploads market data and chart snapshots with the analyst\'s saved voice. SceneFlow turns them into a narrated visual digest — ready before the opening bell.',
        directorNote: 'Accelerating; clean financial confidence.',
      },
      {
        characterId: 'morgan',
        kind: 'dialogue',
        text: 'Daily recap they can watch while they plan their day — without a studio? That is the product.',
        directorNote: 'Sharp satisfaction; land cleanly.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Data to digest before the bell. With SceneFlow, Morgan owns the morning — not the edit timeline.',
        directorNote: 'Assured, crisp close.',
      },
    ],
  },

  'jit/sports-commentary': {
    title: 'While Fans Are Still Talking',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Fenrir',
        profile: 'Excitable, dynamic sports narrator; high energy.',
      },
      {
        id: 'derek',
        name: 'Derek (commentator)',
        voiceId: 'gemini-Zubenelgenubi',
        profile: 'Strong, resonant sports commentator; passionate and grounded.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Final whistle, ten minutes ago. Derek\'s recap needs to drop while fans are still in the parking lot — not tomorrow morning.',
        directorNote: 'High energy open; ride the post-game buzz.',
      },
      {
        characterId: 'derek',
        kind: 'dialogue',
        text: 'Highlights packages take until noon. By then the moment is gone. Fans want recap while the game still stings or soars.',
        directorNote: 'Passionate frustration; fan energy.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Derek uploads game stats and still photography with the commentator\'s saved voice. SceneFlow generates recap videos with animated action — published while fans are still talking.',
        directorNote: 'Building excitement; momentum like a drive.',
      },
      {
        characterId: 'derek',
        kind: 'dialogue',
        text: 'Same-night coverage that rides the emotion of the game? That is how you grow an audience.',
        directorNote: 'Triumphant, resonant; stadium energy.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Same night, not days later. With SceneFlow, Derek ships while the crowd is still loud.',
        directorNote: 'Dynamic, punchy close.',
      },
    ],
  },

  'jit/true-crime-historical-docs': {
    title: 'The Same Face, Episode Ten',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Schedar',
        profile: 'Gravelly, deep, authoritative documentary narrator.',
      },
      {
        id: 'vera',
        name: 'Vera (documentary producer)',
        voiceId: 'gemini-Laomedeia',
        profile: 'Nuanced, expressive documentary producer; dramatic range.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Episode ten drops Friday. Vera\'s historical figure appeared in episode one — and episode five looked like a different person entirely.',
        directorNote: 'Ominous documentary tone; continuity failure as dread.',
      },
      {
        characterId: 'vera',
        kind: 'dialogue',
        text: 'Binge audiences notice. Recasting every installment kills trust. I need the same face and voice, series after series.',
        directorNote: 'Intense, precise; producer who knows the audience.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Vera locks historical figures in the Reference Library once. SceneFlow produces multi-part episodes where every character stays consistent.',
        directorNote: 'Building dread into relief.',
      },
      {
        characterId: 'vera',
        kind: 'dialogue',
        text: 'Continuity audiences demand — without rebuilding the cast every episode? That is binge-worthy.',
        directorNote: 'Satisfied intensity; dramatic landing.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Same witnesses, every episode. With SceneFlow, Vera keeps the story — and the trust.',
        directorNote: 'Gravelly, resonant close.',
      },
    ],
  },

  'jit/weather-emergency-alerts': {
    title: 'Minutes, Not Days',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Charon',
        profile: 'Deep, informative, urgent public-safety narrator.',
      },
      {
        id: 'angela',
        name: 'Angela (emergency comms officer)',
        voiceId: 'gemini-Kore',
        profile: 'Firm, confident, commanding emergency communicator.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The storm shifted thirty minutes ago. Angela\'s bulletin is approved. Getting it to every community in their language is what takes days — usually.',
        directorNote: 'Urgent, measured; minutes matter.',
      },
      {
        characterId: 'angela',
        kind: 'dialogue',
        text: 'Seventy languages, four platforms, and people who need clear instructions now — not after translation vendor turnaround.',
        directorNote: 'Command tone; controlled urgency, no panic.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Angela uploads emergency bulletins with the agency\'s trusted saved voice. SceneFlow broadcasts clear alerts in seventy-plus languages — in minutes.',
        directorNote: 'Building authority and speed.',
      },
      {
        characterId: 'angela',
        kind: 'dialogue',
        text: 'Life-saving communication that reaches every community fast? That is the job.',
        directorNote: 'Firm resolve; quiet weight on the last word.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Clarity and urgency, everywhere. With SceneFlow, Angela reaches everyone — when minutes matter.',
        directorNote: 'Deep, grave, reassuring close.',
      },
    ],
  },

  // ── B2B (4) ────────────────────────────────────────────────────────────────
  'b2b/product-explainer-videos': {
    title: 'Launch Day Proof',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Sadaltager',
        profile: 'Confident, corporate, sleek B2B narrator.',
      },
      {
        id: 'kate',
        name: 'Kate (brand marketer)',
        voiceId: 'gemini-Despina',
        profile: 'Upbeat, bright, modern brand marketer; launch energy.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Launch is Thursday. Kate\'s product explainer is still a deck of catalog shots and a quote from an agency that cannot start until next month.',
        directorNote: 'Sleek tension; launch clock ticking.',
      },
      {
        characterId: 'kate',
        kind: 'dialogue',
        text: 'We need cinematic product storytelling before launch — not a PDF and a prayer. And I need to approve before we burn budget on wrong renders.',
        directorNote: 'Bright but stressed; marketing urgency.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Kate uploads catalog shots with the brand presenter voice and avatar. SceneFlow generates a cinematic explainer series — pre-vis approved before render.',
        directorNote: 'The turn — polished momentum.',
      },
      {
        characterId: 'kate',
        kind: 'dialogue',
        text: 'Approved pre-vis, polished explainer, on budget, before launch? That wins attention and converts.',
        directorNote: 'Confident triumph; crisp delivery.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Pitch to publish, no agency queue. With SceneFlow, Kate launches with proof — not a placeholder.',
        directorNote: 'Assured, conclusive close.',
      },
    ],
  },

  'b2b/case-study-testimonials': {
    title: 'The Deal Closed Tuesday',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Algieba',
        profile: 'Smooth, commanding B2B storyteller.',
      },
      {
        id: 'ben',
        name: 'Ben (sales lead)',
        voiceId: 'gemini-Umbriel',
        profile: 'Conversational, clear, modern sales lead; credible.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The client said yes Tuesday. Ben\'s pipeline wants social proof by Friday. Scheduling a testimonial shoot? That is next month.',
        directorNote: 'Corporate rhythm; compress the sales clock.',
      },
      {
        characterId: 'ben',
        kind: 'dialogue',
        text: 'Prospects want to see results, not hear about them. A slide deck case study does not close the next deal.',
        directorNote: 'Direct, slightly weary sales realism.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Ben uploads client headshots, project photos, and success metrics with a saved narrator voice. SceneFlow produces polished visual case studies — without a testimonial shoot.',
        directorNote: 'Building credibility; cleaner path forward.',
      },
      {
        characterId: 'ben',
        kind: 'dialogue',
        text: 'Credible proof I can share the same week the project closes? That accelerates every deal in the pipeline.',
        directorNote: 'Satisfied, conversational confidence.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Real results, real fast. With SceneFlow, Ben turns wins into proof — before the next prospect goes cold.',
        directorNote: 'Polished close.',
      },
    ],
  },

  'b2b/recruitment-branding': {
    title: 'Day One, Worldwide',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Rasalgethi',
        profile: 'Robust, narrative employer-brand storyteller.',
      },
      {
        id: 'olivia',
        name: 'Olivia (recruiter)',
        voiceId: 'gemini-Sulafat',
        profile: 'Polished, clean, corporate recruiter; warm professionalism.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Olivia is hiring in Austin, Berlin, and Singapore. Candidates want to feel the culture before they apply — not read a bullet list.',
        directorNote: 'Global scale; culture as the hook.',
      },
      {
        characterId: 'olivia',
        kind: 'dialogue',
        text: 'A day-in-the-life video in English only misses half our pipeline. And flying a crew to every office is not scalable.',
        directorNote: 'Professional concern; global hiring reality.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Olivia uploads office photos and culture highlights with the recruiter\'s saved voice and avatar. SceneFlow delivers narrated tours in seventy-plus languages.',
        directorNote: 'Expansive, inviting pivot.',
      },
      {
        characterId: 'olivia',
        kind: 'dialogue',
        text: 'Candidates worldwide hear our story in their language before the first interview? That is employer branding that works.',
        directorNote: 'Warm satisfaction; premium tone.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Culture that travels. With SceneFlow, Olivia makes the company feel real — in every market.',
        directorNote: 'Resonant close.',
      },
    ],
  },

  'b2b/conference-event-promos': {
    title: 'Agenda Changed Again',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Aoede',
        profile: 'Smooth, rich event storyteller; polished warmth.',
      },
      {
        id: 'renee',
        name: 'Renee (event producer)',
        voiceId: 'gemini-Autonoe',
        profile: 'Distinct, sharp, expressive event producer; fast-moving.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The keynote swapped. Two sessions moved. Renee\'s event promo still features last week\'s agenda — and registration closes Sunday.',
        directorNote: 'Event chaos energy; Sunday deadline.',
      },
      {
        characterId: 'renee',
        kind: 'dialogue',
        text: 'Every agenda change used to mean reshooting promos from scratch. I cannot keep up with a live conference schedule that way.',
        directorNote: 'Sharp exasperation; producer in motion.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Renee uploads speaker bios, session details, and venue photos with the event host\'s saved voice. SceneFlow generates intros and guides — refreshed every time the agenda changes.',
        directorNote: 'Relief through capability; pace picking up.',
      },
      {
        characterId: 'renee',
        kind: 'dialogue',
        text: 'Current promos the same day the schedule updates? That is event marketing that finally keeps pace.',
        directorNote: 'Triumphant, expressive; energy on the landing.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Live agenda, live promos. With SceneFlow, Renee markets the event — not last week\'s version.',
        directorNote: 'Warm, polished close.',
      },
    ],
  },

  // ── Public (4) ─────────────────────────────────────────────────────────────
  'public/ngo-impact-reports': {
    title: 'More Than a Slideshow',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Aoede',
        profile: 'Smooth, rich, emotive advocacy storyteller.',
      },
      {
        id: 'amara',
        name: 'Amara (NGO director)',
        voiceId: 'gemini-Erinome',
        profile: 'Gentle, reassuring, passionate NGO leader; heartfelt.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Amara stood in the field last month. The donor report is due Friday. A PDF of statistics will not show what her team built.',
        directorNote: 'Tender stakes; field memory vs spreadsheet.',
      },
      {
        characterId: 'amara',
        kind: 'dialogue',
        text: 'Donors need to feel the mission — not scroll through charts. Our story deserves more than a slideshow.',
        directorNote: 'Soft passion; conviction without preaching.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Amara uploads field photography and impact data with the organization\'s saved narrator voice. SceneFlow turns donor reports into emotive narrated videos.',
        directorNote: 'Hope building; mission-forward.',
      },
      {
        characterId: 'amara',
        kind: 'dialogue',
        text: 'Fundraising content that moves hearts and opens wallets — grounded in our real work? That is how we grow support.',
        directorNote: 'Emotional release; quiet strength.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The mission\'s voice, not a deck. With SceneFlow, Amara shows impact — and inspires action.',
        directorNote: 'Warm, inspiring close.',
      },
    ],
  },

  'public/public-health-announcements': {
    title: 'Zero Translation Delay',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Charon',
        profile: 'Deep, informative public-health narrator; urgent clarity.',
      },
      {
        id: 'director',
        name: 'Director Kim (health department)',
        voiceId: 'gemini-Achernar',
        profile: 'Crisp, articulate, authoritative public health director.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'The guidance was approved at noon. By evening, communities that speak forty different languages still had not heard it.',
        directorNote: 'Grave urgency; language gap as risk.',
      },
      {
        characterId: 'director',
        kind: 'dialogue',
        text: 'Same clarity, same urgency — in every language. Translation vendors measure turnaround in days. Outbreaks do not wait.',
        directorNote: 'Crisp authority; controlled urgency.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Director Kim uploads approved health messaging with the department\'s trusted saved voice. SceneFlow reaches every community in seventy-plus languages — zero translation delay.',
        directorNote: 'Building trust and speed together.',
      },
      {
        characterId: 'director',
        kind: 'dialogue',
        text: 'Public health communication that saves lives across language barriers — published when minutes matter? That is the standard.',
        directorNote: 'Firm, precise; public duty in the voice.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Clarity everywhere, immediately. With SceneFlow, health guidance crosses every barrier — on time.',
        directorNote: 'Measured, grave, reassuring close.',
      },
    ],
  },

  'public/legal-insurance-explainers': {
    title: 'Before They Sign',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Algieba',
        profile: 'Smooth, polished explainer narrator; trustworthy.',
      },
      {
        id: 'robert',
        name: 'Robert (advisor)',
        voiceId: 'gemini-Alnilam',
        profile: 'Balanced, professional legal advisor; clear and patient.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Robert\'s client has a contract to sign and a claim form on the desk. The PDF is forty pages. The confusion is written all over their face.',
        directorNote: 'Polished setup; empathy for the client.',
      },
      {
        characterId: 'robert',
        kind: 'dialogue',
        text: 'Legalese loses people. They sign without understanding — or they do not sign at all. Both outcomes cost everyone.',
        directorNote: 'Patient frustration; professional care.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Robert uploads contract summaries and process diagrams with the advisor\'s saved voice. SceneFlow generates visual breakdowns clients actually understand.',
        directorNote: 'Clear pivot; trust building.',
      },
      {
        characterId: 'robert',
        kind: 'dialogue',
        text: 'Clear, trustworthy explainers before they sign or file? That builds confidence — and reduces costly mistakes.',
        directorNote: 'Quiet satisfaction; professional warmth.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Complex made clear. With SceneFlow, Robert guides clients — before confusion becomes cost.',
        directorNote: 'Assured close.',
      },
    ],
  },

  'public/religious-spiritual-teachings': {
    title: 'Every Time Zone, Every Tongue',
    characters: [
      {
        id: 'narrator',
        name: 'Narrator',
        voiceId: 'gemini-Rasalgethi',
        profile: 'Robust, reverent narrative storyteller; warm gravity.',
      },
      {
        id: 'pastor',
        name: 'Pastor Eli (teacher)',
        voiceId: 'gemini-Schedar',
        profile: 'Gravelly, deep, authoritative spiritual teacher; grounded warmth.',
      },
    ],
    lines: [
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Pastor Eli\'s congregation spans twelve time zones. Sunday\'s message reached the room. Monday\'s global family is still waiting.',
        directorNote: 'Reverent open; global flock waiting.',
      },
      {
        characterId: 'pastor',
        kind: 'dialogue',
        text: 'Believers everywhere deserve consistent teaching in their own language. I cannot record and translate every day by hand.',
        directorNote: 'Grounded care; pastoral weight without preachiness.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Pastor Eli uploads sermon notes and sacred texts with a saved teacher voice. SceneFlow publishes a daily video series for global congregations — in seventy-plus languages.',
        directorNote: 'Building reach with reverence.',
      },
      {
        characterId: 'pastor',
        kind: 'dialogue',
        text: 'My voice and message, carried faithfully across cultures and time zones? That is ministry that scales with love.',
        directorNote: 'Deep warmth; quiet conviction.',
      },
      {
        characterId: 'narrator',
        kind: 'narration',
        text: 'Teaching that travels. With SceneFlow, Pastor Eli reaches every believer — every day, every language.',
        directorNote: 'Resonant, reverent close.',
      },
    ],
  },
}

/** All story keys in stable category order (matches VIDEO_CATEGORIES). */
export function listUseCaseStoryKeys(): UseCaseStoryKey[] {
  return Object.keys(USE_CASE_STORY_SCRIPTS) as UseCaseStoryKey[]
}

export function parseUseCaseStoryKey(key: string): { categoryId: string; exampleId: string } | null {
  const slash = key.indexOf('/')
  if (slash <= 0) return null
  return { categoryId: key.slice(0, slash), exampleId: key.slice(slash + 1) }
}
