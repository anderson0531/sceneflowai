/**
 * Self-contained UI Sandbox / Demo Project ("The Glass Ledger").
 *
 * Designed to work with zero GCP dependencies (no Cloud SQL, no GCS signed URLs,
 * no Vertex AI calls required) so the Production Studio, Direction Workbench,
 * Audio/Mixer, Frame Pre-Vis, Video, Screening Room, Streams, and Blueprint UI
 * can be reviewed and iterated on even when GCP billing/database is unavailable.
 */

export const DEMO_PROJECT_ID = '00000000-0000-4000-8000-000000000001'

export function isDemoProjectId(id?: string | null): boolean {
  if (!id) return false
  const normalized = id.trim().toLowerCase()
  return (
    normalized === DEMO_PROJECT_ID ||
    normalized === 'demo' ||
    normalized === 'demo-project' ||
    normalized === 'demo-production-sandbox' ||
    normalized === 'demo-ui-sandbox' ||
    normalized === 'ui-sandbox' ||
    normalized === 'sandbox'
  )
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generates a crisp 16:9 or 3:4 SVG data URI so storyboard stills, character portraits,
 * location references, and prop cards render immediately without external network requests.
 */
export function createCinematicSvgDataUri(opts: {
  title: string
  subtitle: string
  badge?: string
  detail?: string
  accentColor?: string
  bgStart?: string
  bgEnd?: string
  aspect?: '16:9' | '3:4'
}): string {
  const width = opts.aspect === '3:4' ? 600 : 1280
  const height = opts.aspect === '3:4' ? 800 : 720
  const accent = opts.accentColor || '#22d3ee'
  const bgStart = opts.bgStart || '#090d16'
  const bgEnd = opts.bgEnd || '#1e293b'
  const badge = opts.badge ? escapeXml(opts.badge) : 'SHOT PRE-VIS'
  const title = escapeXml(opts.title)
  const subtitle = escapeXml(opts.subtitle)
  const detail = opts.detail ? escapeXml(opts.detail) : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="65%" stop-color="${bgEnd}" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <radialGradient id="glow" cx="68%" cy="38%" r="55%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
        <stop offset="60%" stop-color="${accent}" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" />
    <rect width="${width}" height="${height}" fill="url(#glow)" />
    <!-- Rule of thirds cinematic composition grid -->
    <line x1="${Math.round(width / 3)}" y1="0" x2="${Math.round(width / 3)}" y2="${height}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1" />
    <line x1="${Math.round((width * 2) / 3)}" y1="0" x2="${Math.round((width * 2) / 3)}" y2="${height}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1" />
    <line x1="0" y1="${Math.round(height / 3)}" x2="${width}" y2="${Math.round(height / 3)}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1" />
    <line x1="0" y1="${Math.round((height * 2) / 3)}" x2="${width}" y2="${Math.round((height * 2) / 3)}" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1" />
    <!-- Cinematic frame border -->
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="12" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="1.5" />
    <!-- Badge -->
    <rect x="48" y="48" width="${Math.min(width - 96, Math.max(150, badge.length * 11 + 32))}" height="34" rx="6" fill="#0f172a" fill-opacity="0.85" stroke="${accent}" stroke-opacity="0.55" stroke-width="1" />
    <text x="64" y="70" fill="${accent}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5">${badge}</text>
    <!-- Lower third gradient & typography -->
    <rect x="24" y="${height - 190}" width="${width - 48}" height="166" rx="10" fill="#020617" fill-opacity="0.76" />
    <text x="52" y="${height - 128}" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="${opts.aspect === '3:4' ? 24 : 28}" font-weight="700">${title}</text>
    <text x="52" y="${height - 90}" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="${opts.aspect === '3:4' ? 15 : 18}" font-weight="500">${subtitle}</text>
    ${
      detail
        ? `<text x="52" y="${height - 54}" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="14">${detail}</text>`
        : ''
    }
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Generates a small valid PCM WAV data URI with a soft low hum so browser <audio>
 * elements in the Audio tab, Scene Mixer, and Screening Room load real durations and play.
 */
export function createDemoAudioDataUri(durationSeconds = 3.5, freqHz = 220): string {
  const sampleRate = 8000
  const numSamples = Math.max(800, Math.floor(sampleRate * Math.min(durationSeconds, 6)))
  const buffer = new ArrayBuffer(44 + numSamples)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true) // Byte rate (8-bit mono)
  view.setUint16(32, 1, true) // Block align
  view.setUint16(34, 8, true) // 8 bits per sample
  writeString(36, 'data')
  view.setUint32(40, numSamples, true)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const envelope = Math.min(1, i / 400) * Math.min(1, (numSamples - i) / 400)
    const sample = 128 + Math.round(Math.sin(2 * Math.PI * freqHz * t) * 10 * envelope)
    view.setUint8(44 + i, sample)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(buffer).toString('base64')
      : btoa(binary)
  return `data:audio/wav;base64,${base64}`
}

const AUDIO_3_5S = createDemoAudioDataUri(3.5, 220)
const AUDIO_4_2S = createDemoAudioDataUri(4.2, 261)
const AUDIO_5_0S = createDemoAudioDataUri(5.0, 196)
const AUDIO_ES_4_0S = createDemoAudioDataUri(4.0, 246)

const CHAR_ELARA_IMG = createCinematicSvgDataUri({
  aspect: '3:4',
  badge: 'PROTAGONIST • CAST REF',
  title: 'Elara Vance',
  subtitle: 'Forensic Archivist • Charcoal Trench & Brass Loupe',
  detail: 'Want: Expose the ledger manipulation • Need: Forgive her mentor',
  accentColor: '#38bdf8',
  bgStart: '#0c192c',
  bgEnd: '#1e293b',
})

const CHAR_MARCUS_IMG = createCinematicSvgDataUri({
  aspect: '3:4',
  badge: 'ANTAGONIST • CAST REF',
  title: 'Director Marcus Thorne',
  subtitle: 'Chief Curator • Bespoke Slate Suit & Silver Pocket Watch',
  detail: 'Want: Seal the vault before midnight • Need: Control the historical record',
  accentColor: '#f59e0b',
  bgStart: '#1f1610',
  bgEnd: '#27272a',
})

const CHAR_ARIS_IMG = createCinematicSvgDataUri({
  aspect: '3:4',
  badge: 'SUPPORTING • CAST REF',
  title: 'Dr. Aris Kael',
  subtitle: 'Clockwork Restorer • Oil-Stained Linen Apron',
  detail: 'Want: Protect his inventions • Need: Stand up to Thorne',
  accentColor: '#34d399',
  bgStart: '#08201d',
  bgEnd: '#1e293b',
})

const LOC_VAULT_IMG = createCinematicSvgDataUri({
  badge: 'LOCATION REFERENCE • INT',
  title: 'Subterranean Archive Vault',
  subtitle: 'Towering brass filing tiers, green banker lamps, rain condensation on stone',
  detail: 'Key lighting: Warm 2700K desk pools vs. cold 5600K overhead grate shafts',
  accentColor: '#22d3ee',
  bgStart: '#061523',
  bgEnd: '#0f172a',
})

const LOC_DECK_IMG = createCinematicSvgDataUri({
  badge: 'LOCATION REFERENCE • INT/EXT',
  title: 'Rain-Slicked Observation Deck',
  subtitle: 'Floor-to-ceiling arched glass overlooking neon harbor fog',
  detail: 'Key lighting: Cyan city reflections streaking across wet terrazzo',
  accentColor: '#818cf8',
  bgStart: '#0f1026',
  bgEnd: '#1e1b4b',
})

const PROP_LEDGER_IMG = createCinematicSvgDataUri({
  badge: 'CRITICAL PROP • OBJECT REF',
  title: 'The Glass Ledger',
  subtitle: 'Etched quartz plates bound in oxidized copper spine with cipher markings',
  detail: 'Refracts amber desk light into sharp geometric caustics across faces',
  accentColor: '#fbbf24',
  bgStart: '#1c1508',
  bgEnd: '#292524',
})

const PROP_KEY_IMG = createCinematicSvgDataUri({
  badge: 'CRITICAL PROP • OBJECT REF',
  title: 'Brass Chrono-Key',
  subtitle: 'Twin-bezel skeleton key with rotating vernier teeth',
  detail: 'Engraved with the inscription "VERITAS IN UMBRA"',
  accentColor: '#fb923c',
  bgStart: '#231208',
  bgEnd: '#1c1917',
})

const SCENE_1_STILL_1 = createCinematicSvgDataUri({
  badge: 'SCENE 1 • SHOT 1 • WIDE ESTABLISHING',
  title: 'Subterranean Archive Vault — The Audit Begins',
  subtitle: 'Elara screen-left at the oak table; Marcus emerges from the aisle shadows screen-right',
  detail: '35mm anamorphic • Low-angle slow dolly-in • Chiaroscuro amber vs. slate blue',
  accentColor: '#22d3ee',
})

const SCENE_1_STILL_2 = createCinematicSvgDataUri({
  badge: 'SCENE 1 • SHOT 2 • MEDIUM TWO-SHOT',
  title: 'Elara & Marcus Across the Glass Ledger',
  subtitle: 'Elara plants both palms on the quartz plates; Marcus halts two paces right',
  detail: '50mm eye-level • Locked-off tension • 180-degree table axis',
  accentColor: '#38bdf8',
})

const SCENE_1_STILL_3 = createCinematicSvgDataUri({
  badge: 'SCENE 1 • SHOT 3 • INSERT CLOSE-UP',
  title: 'Insert: The Missing Quartz Plate & Brass Chrono-Key',
  subtitle: 'Amber light refracts through the etched cipher "VERITAS IN UMBRA"',
  detail: '85mm macro high-angle • Subtle focus rack from fractured hinge to key teeth',
  accentColor: '#fbbf24',
})

const SCENE_1_STILL_4 = createCinematicSvgDataUri({
  badge: 'SCENE 1 • SHOT 4 • CLOSE-UP ON THE TURN',
  title: 'Elara Locks Eyes With Marcus as the Vault Alarm Clicks',
  subtitle: 'Elara slides the Brass Chrono-Key into her trench coat pocket',
  detail: '85mm tight close-up • Slow push-in • Cold cyan rim light on her jaw',
  accentColor: '#f43f5e',
})

const SCENE_2_STILL_1 = createCinematicSvgDataUri({
  badge: 'SCENE 2 • SHOT 1 • OVER-THE-SHOULDER WIDE',
  title: 'Observation Deck — Rain Streaks Across Arched Glass',
  subtitle: 'Dr. Aris Kael waits by the telescope; Elara enters from the stairwell screen-left',
  detail: '28mm wide OTS • Slow lateral track • Neon harbor reflections',
  accentColor: '#818cf8',
})

const SCENE_2_STILL_2 = createCinematicSvgDataUri({
  badge: 'SCENE 2 • SHOT 2 • MEDIUM TWO-SHOT',
  title: 'Elara Confronts Aris With the Fractured Plate',
  subtitle: 'Aris adjusts his brass loupe with trembling fingers as Elara holds up the quartz shard',
  detail: '50mm eye-level • Subtle handheld breathing • Cyan & warm tungsten contrast',
  accentColor: '#34d399',
})

const SCENE_2_STILL_3 = createCinematicSvgDataUri({
  badge: 'SCENE 2 • SHOT 3 • TIGHT CLOSE-UP',
  title: 'Aris Confesses the Midnight Purge Protocol',
  subtitle: 'Rain shadows fall across Aris’s face as he points toward the central clocktower',
  detail: '85mm close-up • Slow push-in • High-contrast noir key light',
  accentColor: '#a78bfa',
})

const SCENE_3_STILL_1 = createCinematicSvgDataUri({
  badge: 'SCENE 3 • SHOT 1 • LOW-ANGLE TRACKING WIDE',
  title: 'Archive Corridor — Security Shutters Descending',
  subtitle: 'Elara sprints down the vaulted colonnade as red strobe beacons ignite',
  detail: '24mm dynamic Steadicam • Fast push-in • Crimson emergency rim lighting',
  accentColor: '#fb7185',
})

const SCENE_3_STILL_2 = createCinematicSvgDataUri({
  badge: 'SCENE 3 • SHOT 2 • MEDIUM CLOSE-UP',
  title: 'Elara Unlocks the Service Lift With the Brass Chrono-Key',
  subtitle: 'Marcus’s voice echoes over the PA while the key turns in the rotary lock',
  detail: '50mm Dutch tilt • Whip-pan to lock mechanism • Sparks & steam',
  accentColor: '#f59e0b',
})

function buildDemoScenes() {
  return [
    {
      id: 'scene-demo-1',
      sceneId: 'scene-demo-1',
      sceneNumber: 1,
      heading: 'INT. SUBTERRANEAN ARCHIVE VAULT - NIGHT',
      location: 'Subterranean Archive Vault',
      timeOfDay: 'NIGHT',
      duration: 16.5,
      estimatedDuration: 16.5,
      imageUrl: SCENE_1_STILL_1,
      visualDescription:
        'A cavernous subterranean vault lined with towering brass filing tiers. Rainwater beads on dark stone columns while green banker lamps cast pools of warm 2700K amber across an oak examination table.',
      action:
        'Elara Vance leans over the oak table, examining The Glass Ledger under a jeweler’s loupe. She discovers plate #14 has been cleanly snapped from the copper spine. Director Marcus Thorne steps out of the central aisle shadows, his silver pocket watch ticking in his palm.',
      narration:
        'Every empire keeps two histories: the one carved into marble, and the one locked beneath the waterline.',
      narrationAudioUrl: AUDIO_3_5S,
      narrationAudio: {
        en: { url: AUDIO_3_5S, duration: 3.5, startTime: 0 },
        es: { url: AUDIO_ES_4_0S, duration: 4.0, startTime: 0 },
      },
      dialogue: [
        {
          character: 'MARCUS',
          characterId: 'char-marcus',
          line: 'You are three hours past curfew, Elara. Close the vault and hand me the cipher.',
          emotion: 'Controlled authority masking urgency',
        },
        {
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Plate fourteen didn’t shatter from age, Marcus. Someone cut it out with a rotary key.',
          emotion: 'Defiant precision',
        },
      ],
      dialogueAudio: {
        en: [
          {
            dialogueIndex: 0,
            character: 'MARCUS',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 4.0,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 9.0,
          },
        ],
        es: [
          {
            dialogueIndex: 0,
            character: 'MARCUS',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.8,
            startTime: 4.2,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.6,
            startTime: 9.5,
          },
        ],
      },
      sfx: [
        {
          description: 'Heavy brass vault relay clicking and quartz plate sliding on oak',
          audioUrl: AUDIO_3_5S,
          startTime: 1.5,
          duration: 3.5,
        },
      ],
      sfxAudio: [AUDIO_3_5S],
      musicAudio: AUDIO_5_0S,
      musicDuration: 16.5,
      musicTitle: 'Subterranean Tension Pulse (Cello & Prepared Piano)',
      characters: ['Elara Vance', 'Marcus Thorne'],
      sceneMovements: [
        {
          id: 'mov_s1_1',
          index: 1,
          title: 'The Discovery in the Vault',
          dramaticFunction: 'Establish the missing quartz plate and Marcus’s intrusion',
          turn: 'Marcus steps from the shadows demanding the cipher before Elara can photograph the fracture',
          emotionalEndState: 'Suspicion crystallizes into an open standoff',
          beatIds: ['bt_s1_1', 'bt_s1_2'],
        },
        {
          id: 'mov_s1_2',
          index: 2,
          title: 'The Accusation & Concealed Key',
          dramaticFunction: 'Elara tests Marcus with the rotary-cut evidence while pocketing the key',
          turn: 'Elara names the rotary key cut and secretly secures the Brass Chrono-Key',
          emotionalEndState: 'Cold defiance',
          beatIds: ['bt_s1_3', 'bt_s1_4'],
        },
      ],
      sceneDirection: {
        sceneDescription:
          'Cavernous subterranean archive vault where warm banker-lamp pools collide with cold overhead rain-grate shafts.',
        mood: 'Noir suspense',
        pacing: 'measured',
        intent: 'Turn a routine forensic audit into a cat-and-mouse confrontation across the examination table.',
        scene: {
          setting: 'INT. SUBTERRANEAN ARCHIVE VAULT - NIGHT',
          location: 'Subterranean Archive Vault',
          timeOfDay: 'NIGHT',
          atmosphere: 'Claustrophobic, damp stone, dust motes suspended in amber lamp beams',
          keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
          sceneArc:
            'Opens wide on Elara’s solitary discovery, tightens into a 180-degree table axis standoff when Marcus arrives, and lands on an insert/close-up turn as Elara conceals the key.',
        },
        camera: {
          shots: ['Wide Establishing', 'Medium Two-Shot', 'Insert', 'Close-Up'],
          angle: 'Eye-level tightening to low-angle authority and macro insert',
          movement: 'Slow dolly-in opening, locked-off table axis, slow push-in on final turn',
          lensChoice: '35mm & 85mm anamorphic primes',
          focus: 'Deep focus on vault tiers narrowing to shallow DOF on quartz cipher',
          coveragePhilosophy:
            'Preserve strict 180-degree axis across the oak examination table: Elara anchored screen-left, Marcus anchored screen-right.',
        },
        lighting: {
          overallMood: 'High-contrast neo-noir chiaroscuro',
          timeOfDay: 'Night',
          keyLight: 'Warm 2700K banker lamp pool from table center',
          fillLight: 'Soft slate-blue bounce from wet stone columns',
          backlight: '5600K cool cyan shafts through overhead street grates',
          practicals: 'Green glass banker lamps and distant red vault status indicator',
          colorTemperature: 'Warm amber foreground vs. cold cyan background',
        },
        talent: {
          blocking:
            'Elara stands screen-left leaning over the oak table; Marcus enters from deep center-right and halts two paces from the table edge.',
          keyActions: [
            'Elara inspects the snapped copper spine of The Glass Ledger',
            'Marcus checks his silver pocket watch and extends an open palm',
            'Elara slides the Brass Chrono-Key into her coat pocket out of Marcus’s sightline',
          ],
          emotionalBeat: 'Controlled academic calm sharpening into covert defiance',
        },
        audio: {
          priorities: 'Crisp room tone, quartz-on-oak scrape, and rhythmic pocket-watch ticking',
          considerations: 'Keep cello pulse under -18dB during dialogue turns',
        },
        movements: [
          {
            id: 'mov_s1_1',
            index: 1,
            title: 'The Discovery in the Vault',
            dramaticFunction: 'Establish the missing quartz plate and Marcus’s intrusion',
            turn: 'Marcus steps from the shadows demanding the cipher',
            emotionalEndState: 'Suspicion',
          },
          {
            id: 'mov_s1_2',
            index: 2,
            title: 'The Accusation & Concealed Key',
            dramaticFunction: 'Elara confronts Marcus while pocketing the key',
            turn: 'Elara names the rotary cut and secures the Brass Chrono-Key',
            emotionalEndState: 'Cold defiance',
          },
        ],
        beatCoverage: [
          {
            beatIndex: 0,
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Slow dolly-in',
            coveragePurpose: 'Establish vault geography and Marcus emerging behind Elara',
            lensEnergy: 'push-in',
            spatialRelationship: 'Elara screen-left at oak table; Marcus deep screen-right in aisle shadow',
            blocking: 'Elara bends over the open Glass Ledger; Marcus halts by the brass tier column',
            gaze: 'Elara focused down on the quartz plate; Marcus locked on Elara’s hands',
            emotion: 'Elara: absorbed tension; Marcus: calculating stillness',
            frozenMoment:
              'Elara leans screen-left over the glowing Glass Ledger while Marcus stands screen-right in the aisle shadow holding an open silver watch',
            lightingAccent: 'Warm 2700K banker lamp uplight on Elara’s cheekbones; cyan grate rim on Marcus',
            transition: 'CUT',
          },
          {
            beatIndex: 1,
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Static lock-off',
            coveragePurpose: 'Anchor the 180-degree confrontation across the table',
            lensEnergy: 'lock-off',
            spatialRelationship: 'Elara screen-left foreground, Marcus screen-right across the oak table',
            blocking: 'Marcus steps to the right edge of the table; Elara plants both palms beside the ledger',
            gaze: 'Marcus stares directly at Elara; Elara raises her chin toward Marcus',
            emotion: 'Marcus: icy authority; Elara: guarded composure',
            frozenMoment:
              'Marcus stands screen-right extending an open palm across the oak table as Elara braces her hands beside The Glass Ledger screen-left',
            lightingAccent: 'Amber caustic reflections from the quartz plate across both faces',
            transition: 'CUT',
          },
          {
            beatIndex: 2,
            shotType: 'Insert',
            cameraAngle: 'High angle macro',
            cameraMovement: 'Slow focus rack',
            coveragePurpose: 'Pay off the physical clue of the rotary-cut hinge and Brass Chrono-Key',
            lensEnergy: 'lock-off',
            spatialRelationship: 'Macro foreground on fractured copper hinge and Brass Chrono-Key',
            blocking: 'Elara’s gloved fingertips rest beside the jagged copper mount and engraved key',
            gaze: 'Insert shot — no faces in frame',
            emotion: 'Forensic precision',
            frozenMoment:
              'Macro insert of the fractured quartz mount reading "PLATE XIV" beside the Brass Chrono-Key engraved "VERITAS IN UMBRA"',
            lightingAccent: 'Hard amber beam refracting through the bevelled quartz edge',
            transition: 'CUT',
          },
          {
            beatIndex: 3,
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            coveragePurpose: 'Land the emotional turn as Elara challenges Marcus and conceals the key',
            lensEnergy: 'push-in',
            spatialRelationship: 'Elara centered-left in tight close-up; Marcus’s shoulder blurred right foreground',
            blocking: 'Elara’s right hand slips the Brass Chrono-Key into her trench coat pocket',
            gaze: 'Elara’s eyes locked unwaveringly on Marcus',
            emotion: 'Elara: defiant resolve',
            frozenMoment:
              'Elara holds Marcus’s gaze in tight close-up while her right thumb presses the Brass Chrono-Key into her coat pocket',
            lightingAccent: 'Crisp cyan rim light along Elara’s jawline',
            transition: 'CUT',
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_s1_1',
          sequenceIndex: 0,
          movementId: 'mov_s1_1',
          kind: 'action',
          durationSeconds: 4.0,
          actionDescription:
            'Elara Vance leans screen-left over the oak examination table, inspecting The Glass Ledger as Director Marcus Thorne emerges from the vault aisle shadows screen-right.',
          storyboardImageUrl: SCENE_1_STILL_1,
          storyboardImagePrompt:
            'Wide Shot, low angle, Subterranean Archive Vault at night. Elara Vance leans screen-left over an oak table beside The Glass Ledger; Director Marcus Thorne stands screen-right in the brass aisle shadow holding a silver pocket watch. Warm 2700K banker lamp pool vs cold cyan overhead grate light.',
          videoPrompt:
            'Slow dolly-in wide shot inside the Subterranean Archive Vault. Elara Vance leans screen-left over the glowing Glass Ledger while Marcus Thorne steps out of the deep aisle shadows screen-right. Dust motes drift through warm amber banker-lamp light.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Slow dolly-in',
            blocking: 'Elara bends over the open Glass Ledger screen-left; Marcus halts by the brass tier column screen-right',
            gaze: 'Elara focused down on the quartz plate; Marcus locked on Elara’s hands',
            emotion: 'Elara: absorbed tension; Marcus: calculating stillness',
            frozenMoment:
              'Elara leans screen-left over the glowing Glass Ledger while Marcus stands screen-right in the aisle shadow holding an open silver watch',
            lightingAccent: 'Warm 2700K banker lamp uplight on Elara; cyan grate rim on Marcus',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Marcus Thorne'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s1_2',
          sequenceIndex: 1,
          movementId: 'mov_s1_1',
          kind: 'dialogue',
          character: 'MARCUS',
          characterId: 'char-marcus',
          line: 'You are three hours past curfew, Elara. Close the vault and hand me the cipher.',
          durationSeconds: 4.5,
          storyboardImageUrl: SCENE_1_STILL_2,
          storyboardImagePrompt:
            'Medium Two-Shot, eye-level across the oak examination table. Elara Vance screen-left with both palms planted beside The Glass Ledger; Marcus Thorne screen-right extending an open hand. High-contrast neo-noir amber and slate lighting.',
          videoPrompt:
            'Locked-off medium two-shot across the oak archive table. Marcus Thorne screen-right speaks with quiet authority while extending his hand toward Elara Vance screen-left, who braces her palms beside The Glass Ledger.',
          beatDirection: {
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Static lock-off',
            blocking: 'Marcus steps to the right edge of the table; Elara plants both palms beside the ledger',
            gaze: 'Marcus stares directly at Elara; Elara raises her chin toward Marcus',
            emotion: 'Marcus: icy authority; Elara: guarded composure',
            frozenMoment:
              'Marcus stands screen-right extending an open palm across the oak table as Elara braces her hands beside The Glass Ledger screen-left',
            lightingAccent: 'Amber caustic reflections from the quartz plate across both faces',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Marcus Thorne'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s1_3',
          sequenceIndex: 2,
          movementId: 'mov_s1_2',
          kind: 'action',
          durationSeconds: 3.5,
          actionDescription:
            'Macro insert of The Glass Ledger’s fractured copper hinge marked "PLATE XIV" resting beside the Brass Chrono-Key engraved "VERITAS IN UMBRA".',
          storyboardImageUrl: SCENE_1_STILL_3,
          storyboardImagePrompt:
            'Macro Insert, high angle on the oak table surface. Fractured copper mount of The Glass Ledger reading "PLATE XIV" beside the Brass Chrono-Key engraved "VERITAS IN UMBRA". Hard amber beam refracting through quartz.',
          videoPrompt:
            'High-angle macro insert with a slow focus rack from the sheared copper hinge of The Glass Ledger ("PLATE XIV") to the rotating vernier teeth of the Brass Chrono-Key ("VERITAS IN UMBRA").',
          beatDirection: {
            shotType: 'Insert',
            cameraAngle: 'High angle macro',
            cameraMovement: 'Slow focus rack',
            blocking: 'Settled macro arrangement of the fractured copper mount and Brass Chrono-Key on dark oak',
            propInteraction: 'The Brass Chrono-Key rests parallel to the sheared copper spine of The Glass Ledger',
            frozenMoment:
              'Macro insert of the fractured quartz mount reading "PLATE XIV" beside the Brass Chrono-Key engraved "VERITAS IN UMBRA"',
            lightingAccent: 'Hard amber beam refracting through the bevelled quartz edge',
            transition: 'CUT',
            castInFrame: [],
            keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s1_4',
          sequenceIndex: 3,
          movementId: 'mov_s1_2',
          kind: 'dialogue',
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Plate fourteen didn’t shatter from age, Marcus. Someone cut it out with a rotary key.',
          durationSeconds: 4.5,
          storyboardImageUrl: SCENE_1_STILL_4,
          storyboardImagePrompt:
            'Close-Up on Elara Vance, eye-level, Marcus Thorne’s dark shoulder blurred in right foreground. Elara’s right thumb slips the Brass Chrono-Key into her trench coat pocket as she locks eyes with Marcus.',
          videoPrompt:
            'Slow push-in close-up on Elara Vance speaking with defiant precision while her hand discreetly slides the Brass Chrono-Key into her coat pocket.',
          beatDirection: {
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            blocking: 'Elara’s right hand slips the Brass Chrono-Key into her trench coat pocket',
            gaze: 'Elara’s eyes locked unwaveringly on Marcus',
            emotion: 'Elara: defiant resolve',
            propInteraction: 'Right hand conceals the Brass Chrono-Key inside trench coat pocket',
            frozenMoment:
              'Elara holds Marcus’s gaze in tight close-up while her right thumb presses the Brass Chrono-Key into her coat pocket',
            lightingAccent: 'Crisp cyan rim light along Elara’s jawline',
            transition: 'CUT',
            castInFrame: ['Elara Vance'],
            keyProps: ['Brass Chrono-Key'],
            generatedBy: 'llm',
          },
        },
      ],
      audienceAnalysis: {
        score: 91,
        pacing: 'moderate',
        tension: 'high',
        characterDevelopment: 'strong',
        visualPotential: 'high',
        notes:
          'Strong cat-and-mouse opening with clear visual storytelling through the fractured quartz plate and concealed key.',
        recommendations: [
          'Let the vault relay click land half a beat before Elara’s final line to heighten the threat of lockdown.',
        ],
      },
      polishAnalysis: {
        issueCount: 1,
        beatFingerprint: 'demo-fp-s1',
        notes: 'Strong neo-noir dialogue rhythm and clear visual staging across the oak examination table.',
        analyzedAt: '2026-10-25T00:00:00.000Z',
        recommendations: [
          {
            id: 'polish-demo-s1-1',
            text: 'In beats 2 and 4, tighten Marcus’s opening line cadence to contrast with the ticking pocket watch.',
            priority: 'medium',
            category: 'action_order',
            beatIndices: [2, 4],
            beatIds: ['bt_s1_2', 'bt_s1_4'],
            reason: 'Sharpens the rhythmic interplay between the pocket watch SFX and Marcus’s entrance.',
          },
        ],
      },
    },
    {
      id: 'scene-demo-2',
      sceneId: 'scene-demo-2',
      sceneNumber: 2,
      heading: 'INT. OBSERVATION DECK - CONTINUOUS',
      location: 'Rain-Slicked Observation Deck',
      timeOfDay: 'NIGHT',
      duration: 13.0,
      estimatedDuration: 13.0,
      imageUrl: SCENE_2_STILL_1,
      visualDescription:
        'Floor-to-ceiling arched windows overlook a fog-shrouded harbor lit by cyan neon beacons. Rain sheets down the glass, casting rippling water shadows across the terrazzo floor.',
      action:
        'Dr. Aris Kael stands by a brass transit telescope, wiping condensation from its lens. Elara emerges from the spiral stairwell and holds up the fractured quartz shard between them.',
      narration:
        'Only three craftsmen in the city could cut quartz without fracturing the cipher lattice—and Aris had built the blade.',
      narrationAudioUrl: AUDIO_3_5S,
      narrationAudio: {
        en: { url: AUDIO_3_5S, duration: 3.5, startTime: 0 },
        es: { url: AUDIO_ES_4_0S, duration: 4.0, startTime: 0 },
      },
      dialogue: [
        {
          character: 'ARIS',
          characterId: 'char-aris',
          line: 'Thorne told me the plate was being transferred to the High Vault. I didn’t know he meant to erase it.',
          emotion: 'Guilt-stricken urgency',
        },
        {
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Then help me read the twin impression before the midnight purge wipes the index.',
          emotion: 'Fierce determination',
        },
      ],
      dialogueAudio: {
        en: [
          {
            dialogueIndex: 0,
            character: 'ARIS',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 4.0,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 8.5,
          },
        ],
        es: [
          {
            dialogueIndex: 0,
            character: 'ARIS',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.4,
            startTime: 4.0,
          },
          {
            dialogueIndex: 1,
            character: 'ELARA',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.4,
            startTime: 8.6,
          },
        ],
      },
      sfx: [
        {
          description: 'Rain lashing against arched glass and distant harbor foghorn',
          audioUrl: AUDIO_3_5S,
          startTime: 0,
          duration: 3.5,
        },
      ],
      sfxAudio: [AUDIO_3_5S],
      musicAudio: AUDIO_5_0S,
      musicDuration: 13.0,
      musicTitle: 'Rain on the Glass (Ambient Synth & Solo Viola)',
      characters: ['Elara Vance', 'Dr. Aris Kael'],
      sceneDirection: {
        sceneDescription:
          'Arched glass observation deck where rippling rain shadows and harbor neon frame a fragile alliance.',
        mood: 'Urgent conspiracy',
        pacing: 'fast',
        intent: 'Flip Aris from fearful accomplice to active ally before the midnight purge.',
        scene: {
          setting: 'INT. OBSERVATION DECK - CONTINUOUS',
          location: 'Rain-Slicked Observation Deck',
          timeOfDay: 'NIGHT',
          atmosphere: 'Rippling rain caustics, distant foghorns, cold harbor mist',
          keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
          sceneArc: 'Starts wide in silhouette against the rain-streaked glass and closes into an urgent pact.',
        },
        camera: {
          shots: ['Over-the-Shoulder', 'Medium Two-Shot', 'Close-Up'],
          angle: 'Eye-level',
          movement: 'Slow lateral track into tight handheld intimacy',
          coveragePhilosophy: 'Use the rain-streaked glass as a kinetic background behind Aris while keeping Elara anchored screen-left.',
        },
        lighting: {
          overallMood: 'Cool cyan harbor neon contrasted with warm brass instrument practicals',
          timeOfDay: 'Night',
          colorTemperature: '5600K cyan rain shadows with 3200K warm key',
        },
        talent: {
          blocking: 'Aris stands screen-right beside the brass telescope; Elara closes the distance from screen-left.',
          emotionalBeat: 'Shared urgency and moral reckoning',
        },
        audio: {
          priorities: 'Rain texture on glass and hushed, urgent vocal delivery',
        },
        movements: [
          {
            id: 'mov_s2_1',
            index: 1,
            title: 'The Confrontation at the Glass',
            dramaticFunction: 'Elara confronts Aris with the rotary-cut quartz shard',
            turn: 'Aris confesses Thorne ordered the transfer',
            emotionalEndState: 'Remorseful urgency',
          },
          {
            id: 'mov_s2_2',
            index: 2,
            title: 'The Midnight Pact',
            dramaticFunction: 'Elara recruits Aris to decode the twin impression before the purge',
            turn: 'Aris accepts the Brass Chrono-Key',
            emotionalEndState: 'Shared resolve',
          },
        ],
        beatCoverage: [
          {
            beatIndex: 0,
            shotType: 'Over-the-Shoulder',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow lateral track',
            coveragePurpose: 'Establish the rain-streaked observation deck and Aris’s isolation',
            lensEnergy: 'push-in',
            spatialRelationship: 'Aris screen-right by brass telescope; Elara entering screen-left',
            blocking: 'Aris pauses at the telescope as Elara steps forward',
            gaze: 'Aris glances back over his shoulder toward Elara',
            emotion: 'Startled apprehension',
            frozenMoment:
              'Aris pauses with his hand on the brass telescope screen-right as Elara halts screen-left framed by rain-streaked arched windows',
            lightingAccent: 'Rippling cyan rain shadows across wet terrazzo',
            transition: 'CUT',
          },
          {
            beatIndex: 1,
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Subtle handheld',
            coveragePurpose: 'Frame the confession across The Glass Ledger',
            lensEnergy: 'lock-off',
            spatialRelationship: 'Elara screen-left holding the quartz plate; Aris screen-right',
            blocking: 'Elara raises The Glass Ledger between them as Aris leans in',
            gaze: 'Mutual eyeline across the etched quartz plate',
            emotion: 'Remorseful urgency',
            frozenMoment:
              'Elara holds the glowing Glass Ledger between them screen-left while Aris grips his brass loupe screen-right',
            lightingAccent: 'Warm tungsten instrument glow between their faces',
            transition: 'CUT',
          },
          {
            beatIndex: 2,
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            coveragePurpose: 'Seal the alliance with the Brass Chrono-Key handoff',
            lensEnergy: 'push-in',
            spatialRelationship: 'Tight close-up on the key handoff and locked eyelines',
            blocking: 'Elara presses the Brass Chrono-Key into Aris’s open palm',
            gaze: 'Direct eyeline lock between Elara and Aris',
            emotion: 'Shared determination',
            frozenMoment:
              'Elara presses the Brass Chrono-Key into Aris’s open palm as rain caustics streak across their faces',
            lightingAccent: 'Cyan harbor reflection rim light',
            transition: 'CUT',
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_s2_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 4.0,
          actionDescription:
            'Over-the-shoulder wide shot past Dr. Aris Kael at the brass telescope as Elara Vance steps onto the rain-slicked observation deck.',
          storyboardImageUrl: SCENE_2_STILL_1,
          storyboardImagePrompt:
            'Over-the-Shoulder Wide Shot inside the Rain-Slicked Observation Deck at night. Dr. Aris Kael screen-right beside a brass telescope; Elara Vance enters screen-left. Neon harbor fog and rain streaks on arched glass.',
          videoPrompt:
            'Slow lateral tracking wide shot across the Rain-Slicked Observation Deck as Elara Vance approaches Dr. Aris Kael beside the brass telescope.',
          beatDirection: {
            shotType: 'Over-the-Shoulder',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow lateral track',
            blocking: 'Aris stands screen-right by the telescope; Elara steps forward screen-left',
            gaze: 'Aris turns his head over his shoulder toward Elara',
            emotion: 'Aris: startled apprehension; Elara: focused resolve',
            frozenMoment:
              'Aris pauses with his hand on the brass telescope screen-right as Elara halts screen-left framed by rain-streaked arched windows',
            lightingAccent: 'Rippling cyan rain shadows across wet terrazzo',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Dr. Aris Kael'],
            keyProps: [],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s2_2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'ARIS',
          characterId: 'char-aris',
          line: 'Thorne told me the plate was being transferred to the High Vault. I didn’t know he meant to erase it.',
          durationSeconds: 4.5,
          storyboardImageUrl: SCENE_2_STILL_2,
          storyboardImagePrompt:
            'Medium Two-Shot, eye-level. Elara Vance screen-left holding up the etched quartz plate of The Glass Ledger; Dr. Aris Kael screen-right adjusting his brass loupe with tense shoulders.',
          videoPrompt:
            'Subtle handheld medium two-shot as Elara Vance raises The Glass Ledger between them and Dr. Aris Kael confesses what Thorne ordered.',
          beatDirection: {
            shotType: 'Two-Shot',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Subtle handheld',
            blocking: 'Elara holds the quartz plate at chest height screen-left; Aris leans in screen-right',
            gaze: 'Both look from the fractured quartz edge into each other’s eyes',
            emotion: 'Aris: remorseful urgency; Elara: searching intensity',
            frozenMoment:
              'Elara holds the glowing Glass Ledger between them screen-left while Aris grips his brass loupe screen-right',
            lightingAccent: 'Warm tungsten instrument glow between their faces',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Dr. Aris Kael'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s2_3',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Then help me read the twin impression before the midnight purge wipes the index.',
          durationSeconds: 4.5,
          storyboardImageUrl: SCENE_2_STILL_3,
          storyboardImagePrompt:
            'Tight Close-Up on Elara Vance and Dr. Aris Kael sealing their pact as rain shadows streak across the glass behind them.',
          videoPrompt:
            'Slow push-in close-up as Elara Vance places the Brass Chrono-Key into Dr. Aris Kael’s palm under cyan rain light.',
          beatDirection: {
            shotType: 'Close-Up',
            cameraAngle: 'Eye-level',
            cameraMovement: 'Slow push-in',
            blocking: 'Elara presses the Brass Chrono-Key into Aris’s open palm',
            gaze: 'Direct eyeline lock between Elara and Aris',
            emotion: 'Shared determination',
            frozenMoment:
              'Elara presses the Brass Chrono-Key into Aris’s open palm as rain caustics streak across their faces',
            lightingAccent: 'Cyan harbor reflection rim light',
            transition: 'CUT',
            castInFrame: ['Elara Vance', 'Dr. Aris Kael'],
            keyProps: ['Brass Chrono-Key'],
            generatedBy: 'director',
          },
        },
      ],
      audienceAnalysis: {
        score: 89,
        pacing: 'fast',
        tension: 'high',
        characterDevelopment: 'strong',
        visualPotential: 'high',
        notes: 'Rain-streaked observation deck provides strong visual contrast to the subterranean vault.',
        recommendations: [],
      },
    },
    {
      id: 'scene-demo-3',
      sceneId: 'scene-demo-3',
      sceneNumber: 3,
      heading: 'INT. ARCHIVE CORRIDOR - NIGHT',
      location: 'Subterranean Archive Vault',
      timeOfDay: 'NIGHT',
      duration: 10.0,
      estimatedDuration: 10.0,
      imageUrl: SCENE_3_STILL_1,
      visualDescription:
        'A long vaulted stone corridor lined with iron security shutters descending in sequence as crimson strobe beacons flash.',
      action:
        'Elara races down the corridor clutching The Glass Ledger while iron shutters clang shut behind her. She reaches the service lift and inserts the Brass Chrono-Key into the rotary cylinder.',
      narration:
        'When the archive seals, nothing leaves—unless you hold the key that wound the clock.',
      narrationAudioUrl: AUDIO_3_5S,
      narrationAudio: {
        en: { url: AUDIO_3_5S, duration: 3.5, startTime: 0 },
        es: { url: AUDIO_ES_4_0S, duration: 4.0, startTime: 0 },
      },
      dialogue: [
        {
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Come on, Aris—third notch counterclockwise.',
          emotion: 'Breathless focus',
        },
      ],
      dialogueAudio: {
        en: [
          {
            dialogueIndex: 0,
            character: 'ELARA',
            audioUrl: AUDIO_4_2S,
            duration: 4.2,
            startTime: 4.2,
          },
        ],
        es: [
          {
            dialogueIndex: 0,
            character: 'ELARA',
            audioUrl: AUDIO_ES_4_0S,
            duration: 4.4,
            startTime: 4.2,
          },
        ],
      },
      sfx: [
        {
          description: 'Iron security shutters slamming and rotary brass lock engaging',
          audioUrl: AUDIO_3_5S,
          startTime: 0.5,
          duration: 3.5,
        },
      ],
      sfxAudio: [AUDIO_3_5S],
      musicAudio: AUDIO_5_0S,
      musicDuration: 10.0,
      musicTitle: 'Lockdown Pursuit (Percussive Brass & Ostinato Strings)',
      characters: ['Elara Vance'],
      sceneDirection: {
        sceneDescription: 'Kinetic corridor escape under crimson lockdown strobes.',
        mood: 'High-stakes thriller',
        pacing: 'fast',
        intent: 'Drive climax momentum as Elara unlocks the service lift seconds before lockdown.',
        scene: {
          setting: 'INT. ARCHIVE CORRIDOR - NIGHT',
          location: 'Subterranean Archive Vault',
          timeOfDay: 'NIGHT',
          atmosphere: 'Flashing crimson beacons, rising steam, echoing iron shutters',
          keyProps: ['The Glass Ledger', 'Brass Chrono-Key'],
          sceneArc: 'Dynamic wide pursuit resolving in a tactile mechanical unlock.',
        },
        camera: {
          shots: ['Wide Tracking Shot', 'Medium Close-Up'],
          angle: 'Low angle',
          movement: 'Fast Steadicam push-in to whip-pan insert',
          coveragePhilosophy: 'Keep shutters closing in background depth while foreground focuses on the rotary lock.',
        },
        lighting: {
          overallMood: 'Crimson emergency strobes cutting through dark slate shadows',
          timeOfDay: 'Night',
          colorTemperature: 'Crimson 2200K strobe vs 5600K steel shadows',
        },
        talent: {
          blocking: 'Elara sprints center-frame toward camera, then pivots screen-left into the lift alcove.',
          emotionalBeat: 'Adrenaline-fueled precision',
        },
        movements: [
          {
            id: 'mov_s3_1',
            index: 1,
            title: 'The Corridor Lockdown',
            dramaticFunction: 'Elara races the descending iron shutters to reach the lift',
            turn: 'The final corridor shutter slams behind her heels',
            emotionalEndState: 'Breathless urgency',
          },
          {
            id: 'mov_s3_2',
            index: 2,
            title: 'The Rotary Unlock',
            dramaticFunction: 'Elara uses the Brass Chrono-Key to open the service lift',
            turn: 'The third counterclockwise notch releases the lift doors',
            emotionalEndState: 'Fierce relief',
          },
        ],
        beatCoverage: [
          {
            beatIndex: 0,
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Fast Steadicam pull-back',
            coveragePurpose: 'Capture the scale of the descending iron shutters behind Elara',
            lensEnergy: 'pull-back',
            spatialRelationship: 'Elara center-left sprinting toward lens; shutters dropping in depth',
            blocking: 'Elara sprints with The Glass Ledger tucked against her ribs',
            gaze: 'Fixed ahead on the lift doors',
            emotion: 'Breathless urgency',
            frozenMoment:
              'Elara lunges forward center-left clutching The Glass Ledger as an iron shutter drops into the stone floor behind her',
            lightingAccent: 'Crimson emergency strobe rim light',
            transition: 'CONTINUE',
          },
          {
            beatIndex: 1,
            shotType: 'Medium Close-Up',
            cameraAngle: 'Dutch angle',
            cameraMovement: 'Push-in',
            coveragePurpose: 'Pay off the Brass Chrono-Key unlocking the service lift cylinder',
            lensEnergy: 'push-in',
            spatialRelationship: 'Elara screen-left at rotary lock; corridor strobe in right background',
            blocking: 'Elara turns the Brass Chrono-Key three notches counterclockwise',
            gaze: 'Glancing sharply back down the corridor',
            emotion: 'Fierce concentration',
            frozenMoment:
              'Elara twists the Brass Chrono-Key in the brass lift lock screen-left while glancing back toward the descending shutter screen-right',
            lightingAccent: 'Warm brass reflection on her fingers against crimson strobe',
            transition: 'CUT',
          },
        ],
      },
      beats: [
        {
          beatId: 'bt_s3_1',
          sequenceIndex: 0,
          kind: 'action',
          durationSeconds: 5.0,
          actionDescription:
            'Low-angle tracking wide shot as Elara Vance sprints down the vaulted corridor clutching The Glass Ledger while iron shutters descend behind her.',
          storyboardImageUrl: SCENE_3_STILL_1,
          storyboardImagePrompt:
            'Low-Angle Wide Shot inside the Archive Corridor at night. Elara Vance sprints toward camera clutching The Glass Ledger under her left arm while iron security shutters descend in the background under crimson strobe lights.',
          videoPrompt:
            'Fast Steadicam low-angle tracking shot pulling backward ahead of Elara Vance as she sprints down the vaulted corridor under flashing crimson strobes.',
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Low angle',
            cameraMovement: 'Fast Steadicam pull-back',
            blocking: 'Elara drives forward center-left with The Glass Ledger tucked against her ribs',
            gaze: 'Elara’s eyes fixed on the service lift doors ahead',
            emotion: 'Elara: breathless urgency',
            frozenMoment:
              'Elara lunges forward center-left clutching The Glass Ledger as an iron shutter drops into the stone floor behind her',
            lightingAccent: 'Crimson emergency strobe rim light across her trench coat',
            transition: 'CONTINUE',
            castInFrame: ['Elara Vance'],
            keyProps: ['The Glass Ledger'],
            generatedBy: 'director',
          },
        },
        {
          beatId: 'bt_s3_2',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'ELARA',
          characterId: 'char-elara',
          line: 'Come on, Aris—third notch counterclockwise.',
          durationSeconds: 5.0,
          storyboardImageUrl: SCENE_3_STILL_2,
          storyboardImagePrompt:
            'Medium Close-Up, slight Dutch angle. Elara Vance turns the Brass Chrono-Key inside the brass service-lift cylinder while looking back down the corridor.',
          videoPrompt:
            'Medium close-up with a tight push-in on Elara Vance’s hands twisting the Brass Chrono-Key three notches counterclockwise as the lift doors part.',
          beatDirection: {
            shotType: 'Medium Close-Up',
            cameraAngle: 'Dutch angle',
            cameraMovement: 'Push-in',
            blocking: 'Elara braces her left shoulder against the lift frame while turning the Brass Chrono-Key with her right hand',
            gaze: 'Elara glances sharply screen-right down the corridor',
            emotion: 'Elara: fierce concentration',
            propInteraction: 'Right hand twists the Brass Chrono-Key in the brass rotary lock',
            frozenMoment:
              'Elara twists the Brass Chrono-Key in the brass lift lock screen-left while glancing back toward the descending shutter screen-right',
            lightingAccent: 'Warm brass reflection on her fingers against crimson corridor strobe',
            transition: 'CUT',
            castInFrame: ['Elara Vance'],
            keyProps: ['Brass Chrono-Key', 'The Glass Ledger'],
            generatedBy: 'director',
          },
        },
      ],
      audienceAnalysis: {
        score: 93,
        pacing: 'fast',
        tension: 'high',
        characterDevelopment: 'strong',
        visualPotential: 'high',
        notes: 'High-energy climax sequence with clear mechanical stakes.',
        recommendations: [],
      },
    },
  ]
}

function buildDemoProductionScenes(scenes: ReturnType<typeof buildDemoScenes>) {
  const productionScenes: Record<string, any> = {}

  for (const scene of scenes) {
    let cursor = 0
    const segments = scene.beats.map((beat, idx) => {
      const duration = beat.durationSeconds || 4.0
      const startTime = cursor
      const endTime = Number((cursor + duration).toFixed(2))
      cursor = endTime
      const segId = `seg_${scene.id}_${beat.beatId}`
      const takeId = `take_${segId}_1`

      return {
        segmentId: segId,
        beatId: beat.beatId,
        sequenceIndex: idx,
        startTime,
        endTime,
        status: 'COMPLETE',
        assetType: 'image',
        activeAssetUrl: beat.storyboardImageUrl,
        startFrameUrl: beat.storyboardImageUrl,
        startFramePrompt: beat.storyboardImagePrompt,
        generatedPrompt: beat.videoPrompt,
        userEditedPrompt: '',
        shotType: beat.beatDirection?.shotType,
        cameraMovement: beat.beatDirection?.cameraMovement,
        transitionType: beat.beatDirection?.transition || 'CUT',
        references: {
          sceneImageUrl: scene.imageUrl,
          thumbnailUrl: beat.storyboardImageUrl,
          startFrameUrl: beat.storyboardImageUrl,
          characterIds: [],
          sceneRefIds: [],
          objectRefIds: [],
        },
        takes: [
          {
            id: takeId,
            createdAt: '2026-10-25T00:00:00.000Z',
            assetUrl: beat.storyboardImageUrl,
            thumbnailUrl: beat.storyboardImageUrl,
            status: 'COMPLETE',
            durationSec: duration,
            notes: 'Pre-rendered UI Sandbox keyframe take',
          },
        ],
        currentTakeId: takeId,
      }
    })

    productionScenes[scene.id] = {
      sceneId: scene.id,
      isSegmented: true,
      targetSegmentDuration: 4,
      lastGeneratedAt: '2026-10-25T00:00:00.000Z',
      segments,
      productionStreams: [
        {
          id: `stream_${scene.id}_en_animatic`,
          language: 'en',
          languageLabel: 'English',
          streamType: 'animatic',
          status: 'complete',
          mp4Url: `/demo/video/poster-scene-1.jpg`,
          durationSeconds: scene.duration,
          createdAt: '2026-10-25T00:00:00.000Z',
          streamVersion: 1,
        },
        {
          id: `stream_${scene.id}_es_animatic`,
          language: 'es',
          languageLabel: 'Spanish (Español)',
          streamType: 'animatic',
          status: 'complete',
          mp4Url: `/demo/video/poster-scene-1.jpg`,
          durationSeconds: scene.duration + 1.1,
          createdAt: '2026-10-25T00:00:00.000Z',
          streamVersion: 1,
        },
      ],
    }
  }

  return productionScenes
}

export function getUiSandboxProject() {
  const scenes = buildDemoScenes().map((scene) => ({
    ...scene,
    beats: scene.beats.map((beat) => ({
      ...beat,
      endFrameImageUrl: beat.storyboardImageUrl,
    })),
  }))
  const productionScenes = buildDemoProductionScenes(scenes)

  const treatmentVariant = {
    id: 'variant-glass-ledger-1',
    label: 'Neo-Noir Archival Thriller',
    title: 'The Glass Ledger',
    logline:
      'When a forensic archivist discovers a missing quartz plate in the city’s subterranean ledger, she must team up with the guilt-ridden clockmaker who cut it before her own mentor seals the vault at midnight.',
    synopsis:
      'In a rain-drenched port city where property, memory, and debt are etched onto indestructible quartz plates, forensic archivist Elara Vance uncovers a deliberate excision in Ledger XIV. Her mentor, Chief Curator Marcus Thorne, orders the vault sealed. Because Elara pockets the Brass Chrono-Key left at the crime scene, she tracks down clockwork restorer Dr. Aris Kael on the observation deck—only to learn Thorne is triggering a midnight purge that will erase the city’s founding fraud forever.',
    genre: 'Thriller / Mystery',
    tone: 'High-contrast neo-noir suspense with tactile mechanical craft',
    visual_style:
      'Anamorphic chiaroscuro lighting: warm 2700K banker-lamp pools colliding with cold 5600K rain-streaked harbor cyan.',
    setting: 'Subterranean Archive Vault & Rain-Slicked Harbor Observation Deck',
    themes: ['Institutional memory vs. convenience', 'Loyalty vs. truth', 'Tactile craft'],
    total_duration_seconds: 180,
    estimatedDurationMinutes: 3,
    heroImage: {
      id: 'hero-glass-ledger',
      url: SCENE_1_STILL_1,
      status: 'ready',
      prompt: 'Anamorphic wide shot of Elara Vance in the Subterranean Archive Vault.',
    },
    character_descriptions: [
      {
        name: 'Elara Vance',
        role: 'protagonist',
        description:
          'Forensic Archivist in her early 30s. External Want: Expose the ledger manipulation. Internal Need: Outgrow her reverence for her mentor Marcus Thorne. Contradiction: Meticulous rule-keeper who becomes a lock-picking insurgent.',
        appearance: 'Sharp dark eyes, charcoal trench coat, brass jeweler’s loupe at collar.',
      },
      {
        name: 'Director Marcus Thorne',
        role: 'antagonist',
        description:
          'Chief Curator in his late 50s. External Want: Seal the vault before midnight. Internal Need: Preserve institutional stability at any moral cost. Speaks in measured, paternal cadences.',
        appearance: 'Silver temples, bespoke slate three-piece suit, antique silver pocket watch.',
      },
      {
        name: 'Dr. Aris Kael',
        role: 'supporting',
        description:
          'Master Clockwork Restorer in his 40s. External Want: Protect his workshop. Internal Need: Redeem his complicity in cutting Plate XIV.',
        appearance: 'Wire-rimmed spectacles, oil-stained linen apron, calloused hands.',
      },
    ],
    beats: [
      {
        title: '1. The Snapped Quartz Plate',
        intent: 'Inciting Discovery',
        minutes: 1,
        synopsis:
          'Elara discovers Plate XIV has been cut from The Glass Ledger with a rotary key; THEREFORE she refuses to close the audit, BUT Director Marcus Thorne emerges from the vault shadows demanding the cipher.',
      },
      {
        title: '2. The Concealed Chrono-Key',
        intent: 'Rising Standoff',
        intent_emotion: 'Defiant suspense',
        minutes: 1,
        synopsis:
          'Marcus orders Elara out past curfew; THEREFORE Elara tests him by naming the rotary cut while secretly pocketing the Brass Chrono-Key.',
      },
      {
        title: '3. Pact on the Observation Deck',
        intent: 'Midpoint Turn',
        minutes: 0.5,
        synopsis:
          'Elara confronts clockmaker Dr. Aris Kael with the quartz shard; THEREFORE Aris confesses Thorne’s midnight purge and joins forces with her, BUT the vault lockdown alarm triggers.',
      },
      {
        title: '4. The Third Notch Counterclockwise',
        intent: 'Climax Escape',
        minutes: 0.5,
        synopsis:
          'Iron shutters descend across the archive corridor; THEREFORE Elara races to the service lift and uses the Brass Chrono-Key to escape with The Glass Ledger.',
      },
    ],
  }

  const characters = [
    {
      id: 'char-elara',
      name: 'Elara Vance',
      role: 'protagonist',
      type: 'character',
      gender: 'female',
      description:
        'Forensic Archivist determined to expose the excision of Plate XIV. Meticulous, observant, and quietly defiant.',
      appearanceDescription:
        'Early 30s, dark hair pinned back, charcoal trench coat over ivory silk blouse, brass jeweler’s loupe hanging from a leather cord.',
      referenceImage: CHAR_ELARA_IMG,
      defaultWardrobe: 'Charcoal trench coat, ivory blouse, dark tailored trousers',
      wardrobeAccessories: 'Brass jeweler’s loupe, leather archive gloves',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Journey-F',
        voiceName: 'Evelyn (Crisp & Observant)',
      },
      wardrobes: [
        {
          id: 'wardrobe-elara-1',
          name: 'Archive Duty Trench',
          description: 'Charcoal trench coat over ivory blouse with brass loupe',
          accessories: 'Brass jeweler’s loupe, dark leather gloves',
          sceneNumbers: [1, 2, 3],
          isDefault: true,
          fullBodyUrl: CHAR_ELARA_IMG,
          headshotUrl: CHAR_ELARA_IMG,
        },
      ],
    },
    {
      id: 'char-marcus',
      name: 'Marcus Thorne',
      role: 'main',
      type: 'character',
      gender: 'male',
      description:
        'Chief Curator of the Subterranean Archive. Paternal, velvet-voiced, and ruthless in protecting the founding record.',
      appearanceDescription:
        'Late 50s, silver-streaked hair, bespoke slate-grey three-piece suit, silver pocket watch chain.',
      referenceImage: CHAR_MARCUS_IMG,
      defaultWardrobe: 'Bespoke slate-grey three-piece suit with burgundy silk tie',
      wardrobeAccessories: 'Antique silver pocket watch',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Studio-Q',
        voiceName: 'Arthur (Measured Authority)',
      },
      wardrobes: [
        {
          id: 'wardrobe-marcus-1',
          name: 'Curator Formal Suit',
          description: 'Bespoke slate-grey three-piece suit with silver pocket watch',
          accessories: 'Silver pocket watch',
          sceneNumbers: [1],
          isDefault: true,
          fullBodyUrl: CHAR_MARCUS_IMG,
          headshotUrl: CHAR_MARCUS_IMG,
        },
      ],
    },
    {
      id: 'char-aris',
      name: 'Dr. Aris Kael',
      role: 'supporting',
      type: 'character',
      gender: 'male',
      description:
        'Master clockwork restorer who built the rotary blade used on The Glass Ledger and seeks redemption.',
      appearanceDescription:
        'Mid 40s, wire-rimmed spectacles, tousled salt-and-pepper hair, oil-stained linen work apron over tweed waistcoat.',
      referenceImage: CHAR_ARIS_IMG,
      defaultWardrobe: 'Linen craftsman apron over tweed waistcoat and rolled sleeves',
      wardrobeAccessories: 'Wire-rimmed spectacles, caliper gauge',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Journey-D',
        voiceName: 'Julian (Warm & Urgent)',
      },
      wardrobes: [
        {
          id: 'wardrobe-aris-1',
          name: 'Workshop Coat & Apron',
          description: 'Oil-stained linen apron over tweed waistcoat',
          accessories: 'Wire-rimmed spectacles',
          sceneNumbers: [2],
          isDefault: true,
          fullBodyUrl: CHAR_ARIS_IMG,
          headshotUrl: CHAR_ARIS_IMG,
        },
      ],
    },
    {
      id: 'narrator-1',
      name: 'Narrator',
      type: 'narrator',
      role: 'supporting',
      description: 'Storytelling voice for scene narration',
      voiceConfig: {
        provider: 'google',
        voiceId: 'en-US-Studio-O',
        voiceName: 'Cinematic Narrator',
      },
    },
  ]

  const locationReferences = [
    {
      id: 'loc-archive-vault',
      location: 'Subterranean Archive Vault',
      locationDisplay: 'INT. SUBTERRANEAN ARCHIVE VAULT',
      description:
        'Cavernous underground vault with towering brass filing tiers, oak examination tables, green banker lamps, and overhead street grates.',
      imageUrl: LOC_VAULT_IMG,
      sceneNumbers: [1, 3],
    },
    {
      id: 'loc-observation-deck',
      location: 'Rain-Slicked Observation Deck',
      locationDisplay: 'INT. OBSERVATION DECK',
      description:
        'High arched-glass observation gallery overlooking a fog-swept harbor with brass astronomical instruments and wet terrazzo floors.',
      imageUrl: LOC_DECK_IMG,
      sceneNumbers: [2],
    },
  ]

  const objectReferences = [
    {
      id: 'prop-glass-ledger',
      type: 'object',
      name: 'The Glass Ledger',
      description:
        'Ancient archival codex of etched quartz plates bound in an oxidized copper spine; Plate XIV is sheared at the hinge.',
      category: 'prop',
      importance: 'critical',
      imageUrl: PROP_LEDGER_IMG,
      sceneNumbers: [1, 2, 3],
    },
    {
      id: 'prop-chrono-key',
      type: 'object',
      name: 'Brass Chrono-Key',
      description:
        'Twin-bezel skeleton key with rotating vernier teeth engraved with the motto "VERITAS IN UMBRA".',
      category: 'prop',
      importance: 'critical',
      imageUrl: PROP_KEY_IMG,
      sceneNumbers: [1, 2, 3],
    },
  ]

  const scriptPayload = {
    title: 'The Glass Ledger',
    logline: treatmentVariant.logline,
    genre: 'Thriller / Mystery',
    tone: 'Neo-Noir Suspense',
    visualStyle: treatmentVariant.visual_style,
    characters,
    script: {
      title: 'The Glass Ledger',
      logline: treatmentVariant.logline,
      scenes,
    },
  }

  return {
    id: DEMO_PROJECT_ID,
    title: 'The Glass Ledger (UI Sandbox Demo)',
    description:
      'Interactive UI Sandbox project with pre-built Blueprint, 3 directed scenes, 9 storyboard stills, multilanguage audio (EN/ES), and Mixer/Stream data for offline/billing-independent UI review.',
    currentStep: 'vision',
    progress: 85,
    status: 'in-progress',
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
    completedSteps: ['ideation', 'blueprint'],
    metadata: {
      isDemoSandbox: true,
      genre: 'Thriller / Mystery',
      format: 'Short Film',
      duration: 180,
      aspectRatio: '16:9',
      artStyle: 'realistic-cinematic',
      thumbnailUrl: SCENE_1_STILL_1,
      posterUrl: SCENE_1_STILL_1,
      filmTreatment: treatmentVariant.synopsis,
      filmTreatmentVariant: treatmentVariant,
      treatmentVariants: [treatmentVariant],
      beats: treatmentVariant.beats,
      estimatedRuntime: 3,
      visionPhase: {
        scriptGenerated: true,
        charactersGenerated: true,
        scenesGenerated: true,
        scriptUpdatedAt: '2026-10-25T00:00:00.000Z',
        script: scriptPayload,
        scenes,
        characters,
        narrationVoice: {
          provider: 'google',
          voiceId: 'en-US-Studio-O',
          voiceName: 'Cinematic Narrator',
        },
        references: {
          sceneReferences: locationReferences,
          locationReferences,
          objectReferences,
          objectDuplicateIgnores: [],
        },
        production: {
          lastUpdated: '2026-10-25T00:00:00.000Z',
          scenes: productionScenes,
        },
        reviews: {
          audience: {
            overallScore: 91,
            targetDemographic: 'Thriller & Sci-Fi Cinema Enthusiasts (18–49)',
            emotionalImpact:
              'High-tension cat-and-mouse intrigue with tactile visual payoffs and strong causal beat turns.',
            categories: [
              { name: 'Story & Causal Flow', score: 92 },
              { name: 'Character Depth & Subtext', score: 90 },
              { name: 'Visual & Shot Continuity', score: 94 },
              { name: 'Pacing & Escalation', score: 89 },
            ],
            sceneAnalysis: [
              {
                sceneNumber: 1,
                score: 91,
                pacing: 'moderate',
                tension: 'high',
                characterDevelopment: 'strong',
                visualPotential: 'high',
                notes: 'Excellent 180-degree table axis and macro insert payoff.',
                recommendations: [],
              },
              {
                sceneNumber: 2,
                score: 89,
                pacing: 'fast',
                tension: 'high',
                characterDevelopment: 'strong',
                visualPotential: 'high',
                notes: 'Strong atmospheric contrast on the rain-slicked observation deck.',
                recommendations: [],
              },
              {
                sceneNumber: 3,
                score: 93,
                pacing: 'fast',
                tension: 'high',
                characterDevelopment: 'strong',
                visualPotential: 'high',
                notes: 'Kinetic corridor finale.',
                recommendations: [],
              },
            ],
          },
        },
        translations: {
          es: {
            0: {
              heading: 'INT. BÓVEDA DEL ARCHIVO SUBTERRÁNEO - NOCHE',
              narration:
                'Todo imperio guarda dos historias: la tallada en mármol y la encerrada bajo la línea de flotación.',
              dialogue: [
                'Pasaste tres horas del toque de queda, Elara. Cierra la bóveda y entrégame el cifrado.',
                'La placa catorce no se rompió por la edad, Marcus. Alguien la cortó con una llave rotatoria.',
              ],
            },
            1: {
              heading: 'INT. CUBIERTA DE OBSERVACIÓN - CONTINUO',
              narration:
                'Solo tres artesanos en la ciudad podían cortar cuarzo sin fracturar la red del cifrado.',
              dialogue: [
                'Thorne me dijo que la placa sería trasladada a la Bóveda Alta. No sabía que planeaba borrarla.',
                'Entonces ayúdame a leer la impresión gemela antes de que la purga de medianoche borre el índice.',
              ],
            },
          },
        },
      },
    },
  }
}

export function getUiSandboxProjectSummary() {
  const full = getUiSandboxProject()
  return {
    id: full.id,
    title: full.title,
    description: full.description,
    currentStep: full.currentStep,
    progress: full.progress,
    status: full.status,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
    completedSteps: full.completedSteps,
    metadata: {
      isDemoSandbox: true,
      genre: full.metadata.genre,
      format: full.metadata.format,
      duration: full.metadata.duration,
      thumbnailUrl: full.metadata.thumbnailUrl,
      posterUrl: full.metadata.posterUrl,
    },
  }
}

export function directSandboxBeatStillsFallback(request: {
  beats: Array<{ beatIndex: number; beat: Record<string, any> }>
}) {
  const patches = request.beats.map(({ beatIndex, beat }) => {
    const dir = (beat.beatDirection ?? {}) as Record<string, any>
    const shotType = dir.shotType || 'Close-Up'
    const cameraAngle = dir.cameraAngle || 'Eye-level'
    const cameraMovement = dir.cameraMovement || 'Slow push-in'
    const frozenMoment =
      dir.frozenMoment ||
      beat.actionDescription ||
      'Elara Vance holds Marcus’s gaze as her thumb conceals the Brass Chrono-Key inside her coat pocket'
    return {
      beatIndex,
      beatId: beat.beatId,
      patch: {
        shotType,
        cameraAngle,
        cameraMovement,
        blocking:
          dir.blocking ||
          'Elara’s right hand slips the Brass Chrono-Key into her trench coat pocket screen-left',
        gaze: dir.gaze || 'Elara’s eyes locked unwaveringly on Marcus across the oak table',
        emotion: dir.emotion || 'Defiant resolve',
        propInteraction:
          dir.propInteraction || 'Right hand conceals the Brass Chrono-Key inside coat pocket',
        frozenMoment,
        actionFraming: `${shotType}, ${cameraAngle}. ${frozenMoment}`,
        lightingAccent: dir.lightingAccent || 'Crisp cyan rim light along Elara’s jawline',
        transition: dir.transition || 'CUT',
        castInFrame: Array.isArray(dir.castInFrame) ? dir.castInFrame : ['Elara Vance'],
        keyProps: Array.isArray(dir.keyProps) ? dir.keyProps : ['Brass Chrono-Key'],
      },
    }
  })

  return {
    usedAI: true,
    patches,
    fallbackReason: 'UI Sandbox offline director',
  }
}
