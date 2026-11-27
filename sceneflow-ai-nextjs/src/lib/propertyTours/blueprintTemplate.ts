/**
 * Property Showcase Blueprint Template (30+ Minute Interactive Real Estate Experience)
 *
 * Structures SceneFlow's Blueprint & Production stages so every Room × Wall (N/E/S/W)
 * × Experience (As-Is, Redesign, Event, Addition) is generated with:
 * - Architectural cross-angle continuity tags (`[ROOM: ...] [WALL: N|E|S|W] [MODE: ...]`)
 * - Expert consultative sales narration by the Listing Advisor (EN / ES / JA ready)
 * - Motion clip + In-Scene Agent Sync presenter directions
 *
 * Output compiles 1-to-1 into the standalone white-label Interactive Property Explorer (`/tour/[slug]`).
 */

export interface PropertyShowcaseTemplateInput {
  propertyTitle: string
  propertyAddress: string
  priceDisplay: string
  beds: string
  baths: string
  sqft: string
  agentName: string
  agencyName: string
  spaces: string[]
  targetBuyer: string
  includeEvents: boolean
  includeRedesigns: boolean
  includeAdditions: boolean
  includeMultilingual: boolean
}

export const DEFAULT_PROPERTY_SHOWCASE_TEMPLATE: PropertyShowcaseTemplateInput = {
  propertyTitle: '742 Oceanfront Terrace — Modern Coastal Estate',
  propertyAddress: '742 Oceanfront Terrace, Malibu, CA 90265',
  priceDisplay: '$8,450,000',
  beds: '5',
  baths: '6.5',
  sqft: '6,240',
  agentName: 'Elena Vance',
  agencyName: 'Pacific Crest Luxury Estates',
  spaces: [
    'Oceanfront Great Room',
    "Chef's Kitchen & Dining",
    'Primary Ocean Suite',
    'Infinity Pool & Twilight Terrace',
    'Arrival Courtyard & Foyer',
    'Wellness Spa & Rooftop Deck',
  ],
  targetBuyer: 'Luxury coastal families, entertainers, and international real estate buyers (EN / ES / JA)',
  includeEvents: true,
  includeRedesigns: true,
  includeAdditions: true,
  includeMultilingual: true,
}

export function buildPropertyShowcaseBlueprintPrompt(
  input: Partial<PropertyShowcaseTemplateInput> = {}
): string {
  const cfg: PropertyShowcaseTemplateInput = {
    ...DEFAULT_PROPERTY_SHOWCASE_TEMPLATE,
    ...input,
    spaces:
      input.spaces && input.spaces.length > 0
        ? input.spaces
        : DEFAULT_PROPERTY_SHOWCASE_TEMPLATE.spaces,
  }

  const spaceCount = cfg.spaces.length
  const targetMinutes = Math.max(30, spaceCount * 5)

  const experienceModes: string[] = [
    '- AS_IS / ARCHITECTURAL INSPECTION: N, E, S, and W cardinal perspectives preserving exact room geometry, sightlines, flooring, and natural light.',
  ]
  if (cfg.includeRedesigns) {
    experienceModes.push(
      '- REDESIGN VISIONS: Modern Coastal, Chef Remodel, Organic Japandi, and European Estate finishes with consultative remodel ROI commentary.'
    )
  }
  if (cfg.includeEvents) {
    experienceModes.push(
      '- LIVE EVENTS: Sunday Family Gathering, Sunset Cocktail Party, Private Chef Dinner, and Holiday Celebration showing effortless hosting flow.'
    )
  }
  if (cfg.includeAdditions) {
    experienceModes.push(
      '- ARCHITECTURAL ADDITIONS (ILLUSTRATIVE CONCEPT RANGES): Glass Wine Cellar & Wet Bar (Est. $40K–$60K), Pergola & Outdoor Kitchen (Est. $55K–$80K), Infinity Pool & Firepit (Est. $110K–$150K), and Detached Guest Casita / ADU (Est. $165K–$220K) — always framed as illustrative concepts subject to permitting and bids.'
    )
  }

  return [
    `INTERACTIVE PROPERTY SHOWCASE BLUEPRINT (${targetMinutes}+ MINUTES OF NON-LINEAR SCENES & CLIPS)`,
    `Property: ${cfg.propertyTitle}`,
    `Address: ${cfg.propertyAddress} | Price: ${cfg.priceDisplay} | Specs: ${cfg.beds} Beds, ${cfg.baths} Baths, ${cfg.sqft} Sq Ft`,
    `Listing Advisor (Recurring On-Camera & Voiceover Host): ${cfg.agentName} (${cfg.agencyName})`,
    `Target Buyer Personas: ${cfg.targetBuyer}`,
    '',
    'CORE CONCEPT & DELIVERY TARGET:',
    `Design a comprehensive ${targetMinutes}-minute library of architectural clips, N/E/S/W camera pan transitions, and lifestyle scenes compiled for the SceneFlow Interactive Property Explorer (/tour/[slug]). Buyers navigate non-linearly by room, compass wall (N, E, S, W), lighting (Daylight, Golden Hour, Twilight), Redesign, Events, and Additions.`,
    '',
    'HOST CHARACTER & CONSULTATIVE SALES VOICE DIRECTION:',
    `${cfg.agentName} acts as an expert luxury real estate advisor — never pushy, always consultative, specific, and high-trust. Every scene must include spoken expert sales narration highlighting architectural craftsmanship, indoor-outdoor flow, renovation ROI, entertaining capacity, and neighborhood lifestyle. Provide both voiceover narration and In-Scene Agent Sync presenter intros for each space.`,
    cfg.includeMultilingual
      ? 'LOCALIZATION TARGET: Write crisp, culturally natural sales narration designed for English (EN), Spanish (ES), and Japanese (JA) voice tracks and lip-sync.'
      : '',
    '',
    'SPACES TO COVER (WITH N/E/S/W PERSPECTIVE LOCK):',
    ...cfg.spaces.map((space, idx) => `${idx + 1}. ${space}`),
    '',
    'EXPERIENCE MODES PER SPACE:',
    ...experienceModes,
    '',
    'SCENE TAGGING CONVENTION (FOR 1-CLICK EXPORT TO INTERACTIVE PROPERTY EXPLORER):',
    'Format every scene heading with structured tags so SceneFlow Production compiles directly into interactive player controls:',
    'Example: "INT. OCEANFRONT GREAT ROOM - DAY [ROOM: Oceanfront Great Room] [WALL: N] [REDESIGN: modern_coastal]"',
    'Example: "INT. OCEANFRONT GREAT ROOM - TWILIGHT [ROOM: Oceanfront Great Room] [WALL: N] [EVENT: cocktail_party]"',
    'Example: "EXT. INFINITY POOL TERRACE - GOLDEN HOUR [ROOM: Infinity Pool & Twilight Terrace] [WALL: N] [ADDITION: adu_casita]"',
    '',
    'VISUAL & AUDIO CONTINUITY RULES:',
    '- Ground exterior aerials, curb appeal, lot lines, and neighborhood context using licensed VSP/broker drone & exterior photography (plus compliant official map/neighborhood embeds with required attribution where enabled — never unauthorized scraped map imagery).',
    '- Lock flooring, millwork, ceiling beams, and Listing Advisor wardrobe across all 60+ minutes of clips.',
    '- Use 24mm tilt-shift architectural framing with straight verticals and zero fisheye distortion.',
    '- Pair daytime architectural clips with Coastal Acoustic ambient music and twilight/event clips with Twilight Lounge score (ducked under agent narration).',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}
