/**
 * Production-ready 48-second (6 × 8.0s) Promo Demonstration Trailer Scripts
 * for the 4 SceneFlow Video Business client service verticals across all 7
 * priority landing languages (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`).
 *
 * Each trailer visually demonstrates the finished client deliverable (multi-age
 * cast locks, architectural camera glides, precision SOP continuity, and Main Street
 * brand cinema + 9:16 social cutdowns) while narratively selling:
 *   1. The massive global market demand in every city & language, and
 *   2. SceneFlow's 50%–80% lower fully-loaded delivery cost & 65%–85% net margins.
 *
 * Shot prompts use single-take chronological physical blocking (`0.0s–3.0s`,
 * `3.0s–6.0s`, `6.0s–8.0s`) engineered for Veo 3.1 / Kling without morphing or cuts.
 */

import type {
  FeaturePanLocaleId,
  VideoServiceVerticalId,
} from './videoServicesNarratedPan'

export type PromoReferenceLock = {
  token: string
  category: 'Cast' | 'Location' | 'Prop'
  name: string
  role: string
  promptDescription: string
}

export type PromoLocalizedCue = {
  /** Optional lip-synced on-camera character line (keep ~6–9 words, ~2.5s) */
  inSceneDialogue?: string
  /** Studio executive voiceover line timed to fit cleanly within the 8.0s block */
  narrationVo: string
}

export type PromoTrailerShotBlock = {
  blockNumber: 1 | 2 | 3 | 4 | 5 | 6
  title: string
  timecode: string
  durationSeconds: 8
  /** Chronological single-take Veo 3.1 / Kling visual generation prompt */
  videoPrompt: string
  cameraAndLighting: string
  sfxAndMix: string
  settleOn: string
  localizedCues: Record<FeaturePanLocaleId, PromoLocalizedCue>
}

export type VideoServicePromoScript = {
  verticalId: VideoServiceVerticalId
  verticalLabel: string
  promoTitle: string
  formatBadge: string
  runtimeLabel: string
  durationSeconds: 48
  aspectRatio: '16:9 (with 9:16 Social Safe-Zone)'
  logline: string
  blueprintIntakePrompt: string
  artStyleLock: string
  unitEconomicsHook: string
  backgroundMusic: {
    title: string
    bpmAndKey: string
    mixLevel: string
    generationPrompt: string
  }
  referenceLocks: readonly PromoReferenceLock[]
  blocks: readonly [
    PromoTrailerShotBlock,
    PromoTrailerShotBlock,
    PromoTrailerShotBlock,
    PromoTrailerShotBlock,
    PromoTrailerShotBlock,
    PromoTrailerShotBlock,
  ]
}

export function getVideoServicePromoWebmPath(
  verticalId: VideoServiceVerticalId,
  locale: FeaturePanLocaleId
): string {
  return `/landing/video-services/videos/${verticalId}-${locale}.webm`
}

export function getVideoServicePromoMp4Path(
  verticalId: VideoServiceVerticalId,
  locale: FeaturePanLocaleId
): string {
  return `/landing/video-services/videos/${verticalId}-${locale}.mp4`
}

/**
 * Locales that currently have encoded `.webm` promo trailers deployed in
 * `public/landing/video-services/videos/{verticalId}-{locale}.webm`.
 * Populate each array after running `node scripts/encode-video-services-webm.mjs`.
 */
export const VIDEO_SERVICE_AVAILABLE_PROMO_LOCALES: Record<
  VideoServiceVerticalId,
  readonly FeaturePanLocaleId[]
> = {
  memoir: [],
  realestate: [],
  training: [],
  brand: [],
}

export function resolveAvailablePromoVideoLocale(
  verticalId: VideoServiceVerticalId,
  requestedLocale: FeaturePanLocaleId
): FeaturePanLocaleId | null {
  const available = VIDEO_SERVICE_AVAILABLE_PROMO_LOCALES[verticalId]
  if (available.includes(requestedLocale)) return requestedLocale
  if (available.includes('en')) return 'en'
  return available[0] ?? null
}

export const VIDEO_SERVICE_PROMO_SCRIPTS: Record<
  VideoServiceVerticalId,
  VideoServicePromoScript
> = {
  // ============================================================================
  // 1. VIDEO MEMOIRS — "The Coastline We Built" (48s · 6 × 8.0s Blocks)
  // ============================================================================
  memoir: {
    verticalId: 'memoir',
    verticalLabel: 'Video Memoirs & Family Tributes',
    promoTitle: 'The Coastline We Built',
    formatBadge: '48s Client Deliverable + Business Opportunity Promo · 6 × 8s Shots',
    runtimeLabel: '0:48',
    durationSeconds: 48,
    aspectRatio: '16:9 (with 9:16 Social Safe-Zone)',
    logline:
      'A faded 1974 Big Sur Polaroid transforms into a breathtaking multi-decade cinema biography across three locked ages—demonstrating how operators turn a universal family need into $300–$950 heirloom films at ~$100 total delivery cost.',
    blueprintIntakePrompt:
      'Create a 48-second (6 scenes × 8 seconds) photorealistic promo demonstration trailer titled "The Coastline We Built" for a Family Video Memoir service powered by SceneFlow. Follow Arthur and Eleanor Miller across three locked ages—present-day late-70s in a warm craftsman living room holding a 1974 coastal photo, 25-year-old newlyweds laughing beside a 1974 wood-paneled station wagon on a golden Big Sur cliffside, 40-year-old parents opening their neighborhood woodshop in 1989 rain, and three generations watching the finished tribute film in tears of joy—while executive narration highlights the global demand from hundreds of millions of families and ~$100 SceneFlow delivery economics.',
    artStyleLock:
      '35mm Anamorphic Cinema Photorealism · Kodak Portra 400 Golden Nostalgia for 1970s/1980s Eras vs Warm 3000K Documentary Naturalism for Present Day · Zero Text Overlays',
    unitEconomicsHook:
      'Global need: 100M+ families priced out of $2,000+ crews -> SceneFlow fully-loaded cost ~$100 (~$22 compute + <2 hrs) -> $300–$950 retail (70%–85% net margin).',
    backgroundMusic: {
      title: 'Golden Coastline Heirloom (48s Intimate Felt Piano & Warm Cello Score)',
      bpmAndKey: '84 BPM · F Major building to a soaring emotional swell at 0:32',
      mixLevel: '25% volume (-12 dB) ducked cleanly under dialogue and narration VO',
      generationPrompt:
        'Instrumental emotional documentary family memoir trailer score, 48 seconds, 84 BPM, F major. 0:00-0:16 intimate warm felt piano melody and delicate acoustic guitar harmonics evoking nostalgia. 0:16-0:32 solo expressive cello joins with warm orchestral string pads building heartfelt momentum across decades. 0:32-0:42 soaring, uplifting cinematic string crescendo full of love and family legacy. 0:42-0:48 gentle resolving piano and cello chord with warm room resonance. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_ARTHUR_78',
        category: 'Cast',
        name: 'Arthur Miller (Present Day, 78)',
        role: 'Grandfather · Present-Day Interview Anchor',
        promptDescription:
          'Warm-hearted 78-year-old man with silver-white combed hair, kind hazel-green eyes, laugh lines, wearing a heather-oatmeal shawl-collar cardigan over a soft chambray shirt.',
      },
      {
        token: 'REF: CHAR_ARTHUR_26',
        category: 'Cast',
        name: 'Young Arthur Miller (1974 Era Lock, 26)',
        role: 'Protagonist · Multi-Age Continuity Lock (26 & 41)',
        promptDescription:
          '26-year-old man sharing identical hazel-green eyes, nose bridge, and warm smile as REF: CHAR_ARTHUR_78, thick chestnut-brown 1970s tousled hair, wearing a vintage cream cable-knit sweater and corduroy jacket.',
      },
      {
        token: 'REF: CHAR_ELEANOR_76',
        category: 'Cast',
        name: 'Eleanor Miller (Present Day, 76 & 1974 Age 24)',
        role: 'Grandmother · Multi-Age Continuity Lock',
        promptDescription:
          'Graceful 76-year-old woman with silver-blonde waves, warm amber-brown eyes, and terracotta cashmere wrap; 1974 young version (REF: CHAR_ELEANOR_24) has identical facial structure, sunlit honey-blonde waves, and a floral 1970s sundress.',
      },
      {
        token: 'REF: LOC_CRAFTSMAN_LIVING',
        category: 'Location',
        name: 'Sunlit Craftsman Family Living Room',
        role: 'Present-Day Interview & Family Screening Set',
        promptDescription:
          'Warm oak-beamed craftsman living room at golden late afternoon, plushcognac-and-linen sofa, glowing 2700K table lamps, framed family photographs softly blurred in background, zero readable text.',
      },
      {
        token: 'REF: LOC_COASTAL_CLIFF_1974',
        category: 'Location',
        name: '1974 Pacific Cliffside Overlook',
        role: 'Golden-Hour Era Re-enactment Set',
        promptDescription:
          'Sun-drenched 1970s coastal highway pullout high above crashing golden-hour Pacific waves, wild coastal grasses blowing in warm salt breeze, classic 1974 wood-paneled station wagon parked along the bluff.',
      },
      {
        token: 'REF: PROP_COASTAL_PHOTO_1974',
        category: 'Prop',
        name: 'Worn 1974 Instant Photograph & Leather Album',
        role: 'Visual Transition Bridge Prop',
        promptDescription:
          'Hand-stitched chestnut leather family photo album open on lap, holding a slightly faded square 1970s instant snapshot of a young couple beside a wood-paneled station wagon by the ocean, no text.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'The Unfilmed Family Treasure',
        timecode: '0:00–0:08',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside REF: LOC_CRAFTSMAN_LIVING bathed in golden afternoon window light. At 0.0s, medium two-shot of REF: CHAR_ARTHUR_78 sitting beside REF: CHAR_ELEANOR_76 on the linen sofa holding REF: PROP_COASTAL_PHOTO_1974. From 0.0s to 3.2s, Arthur looks warmly toward the lens and speaks with gentle nostalgia while Eleanor smiles affectionately at the faded coastal photograph. From 3.2s to 8.0s, the camera glides smoothly forward toward the photograph in Arthur’s weathered hands as golden dust motes shimmer in the sunbeam.',
        cameraAndLighting:
          '50mm prime cinema lens, smooth dolly push-in from medium two-shot to tight over-shoulder insert, 3000K tungsten practicals + warm 4200K afternoon key light.',
        sfxAndMix:
          'Subtle room tone, soft paper page rustle at 3.4s, delicate felt piano enters at 25% (-12 dB).',
        settleOn:
          'Close framing on Arthur’s hand holding the sunlit 1974 coastal snapshot.',
        localizedCues: {
          en: {
            inSceneDialogue: 'Arthur (lip-sync, 0.5s–3.1s): "All we owned in seventy-four was that old wagon."',
            narrationVo: 'VO (3.5s–7.7s): "Millions of families want parents’ stories preserved—yet two-thousand-dollar crews price them out."',
          },
          es: {
            inSceneDialogue: 'Arthur (sincronía labial, 0.5s–3.1s): "En el setenta y cuatro solo teníamos esa vieja camioneta."',
            narrationVo: 'VO (3.5s–7.7s): "Millones de familias quieren preservar sus recuerdos, pero rodajes de dos mil dólares las excluyen."',
          },
          pt: {
            inSceneDialogue: 'Arthur (sincronia labial, 0.5s–3.1s): "Em setenta e quatro, tudo o que tínhamos era aquela perua."',
            narrationVo: 'VO (3.5s–7.7s): "Milhões de famílias querem eternizar essas memórias, mas equipes de dois mil dólares são inviáveis."',
          },
          hi: {
            inSceneDialogue: 'Arthur (लिप-सिंक, 0.5s–3.1s): "चौहत्तर में हमारे पास बस वही पुरानी गाड़ी और सपने थे।"',
            narrationVo: 'VO (3.5s–7.7s): "करोड़ों परिवार ऐसी यादें सहेजना चाहते हैं, पर दो हज़ार डॉलर के महँगे शूट उन्हें रोक देते हैं।"',
          },
          zh: {
            inSceneDialogue: 'Arthur（口型同步，0.5s–3.1s）：“七四年那会儿，我们全部家当只有那辆旧旅行车。”',
            narrationVo: 'VO（3.5s–7.7s）：“亿万家庭渴望珍藏父母的故事，却被两千美元的传统拍摄拒之门外。”',
          },
          ar: {
            inSceneDialogue: 'Arthur (مزامنة شفاه، 0.5s–3.1s): "في عام أربعة وسبعين، لم نملك سوى تلك العربة القديمة."',
            narrationVo: 'VO (3.5s–7.7s): "ملايين العائلات تتمنى توثيق قصص الآباء، لكن تكلفة التصوير البالغة ألفي دولار تمنعها."',
          },
          th: {
            inSceneDialogue: 'Arthur (ลิปซิงค์, 0.5s–3.1s): "เมื่อปีเจ็ดสี่ สมบัติชิ้นเดียวที่เรามีคือรถแวกอนคันเก่าคันนั้น"',
            narrationVo: 'VO (3.5s–7.7s): "หลายล้านครอบครัวอยากเก็บความทรงจำคุณพ่อคุณแม่ แต่กองถ่ายสองพันดอลลาร์แพงเกินเอื้อม"',
          },
        },
      },
      {
        blockNumber: 2,
        title: '1974 Golden-Hour Multi-Age Lock',
        timecode: '0:08–0:16',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. At 0.0s, wide-to-medium cinema shot at REF: LOC_COASTAL_CLIFF_1974 in lush 1970s Kodak Portra golden hour. REF: CHAR_ARTHUR_26 and young 24-year-old Eleanor (matching REF: CHAR_ELEANOR_76) lean against the wood-paneled 1974 station wagon overlooking sparkling Pacific surf. From 0.0s to 4.0s, ocean breeze lifts Eleanor’s floral sundress as Arthur wraps an arm around her waist and both laugh genuinely. From 4.0s to 8.0s, lateral gimbal arc glides around them catching warm golden lens flare and unmistakable facial continuity.',
        cameraAndLighting:
          '35mm anamorphic lens, fluid clockwise gimbal arc, low golden-hour sunset backlight with soft warm halation and natural 35mm film grain.',
        sfxAndMix:
          'Distant Pacific waves, warm coastal breeze, joyful soft laughter under VO, piano & acoustic harmonics swell at 25%.',
        settleOn:
          'Glowing golden-hour medium close-up of young Arthur and Eleanor smiling toward the horizon.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.5s): "SceneFlow transforms real family albums into era-accurate cinema—locking exact faces, expressions, and wardrobes across decades."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.5s): "SceneFlow convierte fotos reales en cine de época, manteniendo los mismos rostros, miradas y vestuarios a través de las décadas."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.5s): "O SceneFlow transforma álbuns reais em cinema de época, preservando os mesmos rostos, olhares e figurinos por décadas."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.5s): "SceneFlow असली पारिवारिक तस्वीरों को जीवंत सिनेमा में बदलता है—दशकों के पार वही चेहरे और हाव-भाव लॉक रखते हुए।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.5s）：“SceneFlow 将真实老照片化作年代大片，跨数十年精准锁定同一张面孔、神态与服饰连续性。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.5s): "يحوّل SceneFlow ألبومات العائلة الحقيقية إلى سينما أصيلة، مع تثبيت الملامح والأزياء بدقة عبر العقود."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.5s): "SceneFlow เปลี่ยนภาพถ่ายจริงให้เป็นภาพยนตร์ย้อนยุค ล็อกใบหน้า แววตา และเสื้อผ้าเดิมได้อย่างแม่นยำข้ามทศวรรษ"',
          },
        },
      },
      {
        blockNumber: 3,
        title: '1989 Milestone & ~$100 Delivery Economics',
        timecode: '0:16–0:24',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Rain-slicked 1989 neighborhood evening outside a cozy timber woodworking studio. At 0.0s, 41-year-old Arthur (aged naturally from REF: CHAR_ARTHUR_26) turns a brass key in the front shop door while 39-year-old Eleanor shelters their smiling 6-year-old daughter beneath a clear umbrella. From 3.0s to 6.0s, Arthur reaches inside and flips a warm tungsten pendant switch, bathing all three faces in golden amber light reflected on wet pavement. From 6.0s to 8.0s, slow push-in as Arthur hugs them proudly.',
        cameraAndLighting:
          '40mm anamorphic lens, gentle Steadicam push-in, cool 5600K evening rain rim-light contrasted with rich 2700K interior amber bloom, zero text on glass.',
        sfxAndMix:
          'Gentle evening rain on umbrella, crisp brass lock click, warm electrical relay hum, expressive solo cello enters at 25%.',
        settleOn:
          'Warm amber window reflection framing the proud young family embracing in the doorway.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "No film crews or actors needed. Your total SceneFlow cost is roughly one hundred dollars—twenty-two in credits and under two hours."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Sin equipos de rodaje ni actores. Tu costo total en SceneFlow ronda los cien dólares: veintidós en créditos y menos de dos horas."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Sem equipe externa nem atores. Seu custo total no SceneFlow fica em cerca de cem dólares: vinte e dois em créditos e menos de duas horas."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "बिना किसी कैमरा क्रू या कलाकारों के, आपकी कुल लागत केवल सौ डॉलर आती है—बाईस डॉलर क्रेडिट और दो घंटे से कम समय।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“无需外景剧组与演员，仅需二十二美元算力积分与不到两小时统筹，综合交付成本仅约一百美元。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "دون طاقم تصوير أو ممثلين، تبلغ تكلفة التسليم الكاملة نحو مئة دولار فقط: اثنان وعشرون دولاراً للرصيد وأقل من ساعتين."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "ไม่ต้องจ้างกองถ่ายหรือนักแสดง ต้นทุนส่งมอบรวมเพียงราวหนึ่งร้อยดอลลาร์ เป็นค่าเครดิตยี่สิบสองดอลลาร์และเวลาไม่ถึงสองชั่วโมง"',
          },
        },
      },
      {
        blockNumber: 4,
        title: '2006 Summer Garden Lantern Toast',
        timecode: '0:24–0:32',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Warm twilight backyard garden celebration in 2006 strung with glowing bistro bulbs. At 0.0s, medium tracking shot of 58-year-old Arthur (bridging REF: CHAR_ARTHUR_26 and REF: CHAR_ARTHUR_78) in a navy linen blazer raising a champagne glass beside 56-year-old Eleanor. From 0.0s to 4.5s, their grown daughter in an ivory silk dress steps in and hugs Arthur tightly under warm golden bokeh. From 4.5s to 8.0s, camera cranes gently upward revealing the joyful family table glowing beneath twilight trees.',
        cameraAndLighting:
          '50mm cinema prime, smooth jib crane rise with shallow f/1.8 bokeh of warm 2700K string lights against deep twilight blue.',
        sfxAndMix:
          'Soft crystal glass clink, warm garden evening ambience, orchestral strings swell emotionally at 25%.',
        settleOn:
          'Elevated medium-wide tableau of the family cheering under golden garden lights.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.5s): "Clients upload photos from their phone, approve cast likeness in Continuity Vault, and review cuts right inside Screening Room."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.5s): "El cliente sube fotos desde su móvil, aprueba los rostros en Continuidad y revisa el corte final en Screening Room."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.5s): "O cliente envia fotos pelo celular, aprova os rostos na Continuidade e revisa o corte final direto na Screening Room."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.5s): "क्लाइंट फ़ोन से फ़ोटो अपलोड करते हैं, चेहरे की समानता मंज़ूर करते हैं, और Screening Room में फ़िल्म पास करते हैं।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.5s）：“客户用手机上传老照片、在线确认角色神似度，并在 Screening Room 一键审片签字。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.5s): "يرفع العميل الصور من هاتفه، ويعتمد تطابق الملامح، ويراجع النسخة النهائية مباشرة داخل غرفة العرض."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.5s): "ลูกค้าอัปโหลดรูปจากมือถือ อนุมัติความเหมือนของตัวละคร และตรวจรับหนังฉบับสมบูรณ์ได้ทันทีใน Screening Room"',
          },
        },
      },
      {
        blockNumber: 5,
        title: 'Three-Generation Premiere Tears of Joy',
        timecode: '0:32–0:40',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Back inside REF: LOC_CRAFTSMAN_LIVING at dusk, illuminated by warm golden cinema light flickering softly from an off-screen living room display. At 0.0s, medium close-up on REF: CHAR_ELEANOR_76 and REF: CHAR_ARTHUR_78 surrounded by their adult daughter and two young grandchildren leaning against their shoulders. From 0.0s to 3.4s, Eleanor touches her heart with glistening eyes and speaks softly while smiling at the screen. From 3.4s to 8.0s, her 9-year-old granddaughter hugs Arthur’s arm tightly as everyone beams with emotion.',
        cameraAndLighting:
          '50mm prime, intimate eye-level dolly arc across three generations, warm cinema screen bounce light + soft 2800K lamp fill.',
        sfxAndMix:
          'Quiet emotional breath, warm family room presence, soaring cello & piano peak at 25% (-12 dB).',
        settleOn:
          'Intimate close framing of Eleanor, Arthur, and their granddaughter smiling through happy tears.',
        localizedCues: {
          en: {
            inSceneDialogue: 'Eleanor (lip-sync, 0.5s–3.0s): "Look—that is the exact dress I wore."',
            narrationVo: 'VO (3.4s–7.6s): "Every anniversary, retirement, and milestone birthday becomes an unforgettable heirloom."',
          },
          es: {
            inSceneDialogue: 'Eleanor (sincronía labial, 0.5s–3.0s): "Mira, es exactamente el vestido que llevé."',
            narrationVo: 'VO (3.4s–7.6s): "Cada aniversario, jubilación y cumpleaños especial se convierte en un legado inolvidable."',
          },
          pt: {
            inSceneDialogue: 'Eleanor (sincronia labial, 0.5s–3.0s): "Olha só, é exatamente o vestido que eu usei."',
            narrationVo: 'VO (3.4s–7.6s): "Cada boda, aposentadoria e aniversário marcante vira uma joia de família inesquecível."',
          },
          hi: {
            inSceneDialogue: 'Eleanor (लिप-सिंक, 0.5s–3.0s): "देखो, यह बिल्कुल वही पोशाक है जो मैंने पहनी थी।"',
            narrationVo: 'VO (3.4s–7.6s): "हर वर्षगाँठ, रिटायरमेंट और विशेष जन्मदिन एक अनमोल पारिवारिक धरोहर बन जाता है।"',
          },
          zh: {
            inSceneDialogue: 'Eleanor（口型同步，0.5s–3.0s）：“快看，那正是我当年穿的那条裙子。”',
            narrationVo: 'VO（3.4s–7.6s）：“让每一场金婚庆典、荣休仪式与寿辰纪念，都化作代代相传的家族珍藏。”',
          },
          ar: {
            inSceneDialogue: 'Eleanor (مزامنة شفاه، 0.5s–3.0s): "انظروا، هذا هو الفستان نفسه الذي ارتديته."',
            narrationVo: 'VO (3.4s–7.6s): "كل ذكرى زواج أو تقاعد أو ميلاد مميز تتحول إلى إرث عائلي خالد لا يُقدّر بثمن."',
          },
          th: {
            inSceneDialogue: 'Eleanor (ลิปซิงค์, 0.5s–3.0s): "ดูสิ นั่นชุดเดียวกับที่แม่ใส่ในวันนั้นเลย"',
            narrationVo: 'VO (3.4s–7.6s): "เปลี่ยนทุกวันครบรอบ งานเกษียณ และวันเกิดสำคัญ ให้เป็นมรดกความทรงจำล้ำค่าของครอบครัว"',
          },
        },
      },
      {
        blockNumber: 6,
        title: 'High-Margin Memoir Studio Close',
        timecode: '0:40–0:48',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Wide heartwarming portrait inside REF: LOC_CRAFTSMAN_LIVING. At 0.0s, REF: CHAR_ARTHUR_78 and REF: CHAR_ELEANOR_76 sit at the center of the sofa with REF: PROP_COASTAL_PHOTO_1974 open before them, surrounded by their smiling children and grandchildren sharing stories. From 0.0s to 8.0s, smooth symmetrical dolly pull-back through the oak living room archway as warm golden lamps glow, settling into a poised, timeless family cinema frame.',
        cameraAndLighting:
          '35mm cinema lens, slow symmetrical dolly pull-back through warm foreground archway, rich 3000K golden documentary glow.',
        sfxAndMix:
          'Warm resolving F-major piano and cello chord holds and fades cleanly at 7.9s.',
        settleOn:
          'Timeless wide three-generation family portrait framed by warm oak beams.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.4s–7.6s): "Charge three hundred to nine-fifty, keep up to eighty percent net profit, and launch your Video Memoir business on SceneFlow."',
          },
          es: {
            narrationVo: 'VO (0.4s–7.6s): "Cobra entre trescientos y novecientos cincuenta dólares, gana hasta ochenta por ciento neto y lanza tu negocio con SceneFlow."',
          },
          pt: {
            narrationVo: 'VO (0.4s–7.6s): "Cobre de trezentos a novecentos e cinquenta dólares, lucre até oitenta por cento líquido e lance seu negócio no SceneFlow."',
          },
          hi: {
            narrationVo: 'VO (0.4s–7.6s): "तीन सौ से नौ सौ पचास डॉलर चार्ज करें, अस्सी प्रतिशत तक शुद्ध लाभ कमाएँ, और SceneFlow के साथ अपना व्यवसाय शुरू करें।"',
          },
          zh: {
            narrationVo: 'VO（0.4s–7.6s）：“每单报价三百至九百五十美元，净利率高达百分之八十，立即用 SceneFlow 开启家族传记影视事业。”',
          },
          ar: {
            narrationVo: 'VO (0.4s–7.6s): "سعّر الفيلم بين ثلاثمئة وتسعمئة وخمسين دولاراً، وحقق صافي ربح يصل لثمانين بالمئة، وأطلق مشروعك عبر SceneFlow."',
          },
          th: {
            narrationVo: 'VO (0.4s–7.6s): "ตั้งราคาสามร้อยถึงเก้าร้อยห้าสิบดอลลาร์ ทำกำไรสุทธิถึงแปดสิบเปอร์เซ็นต์ เริ่มธุรกิจวิดีโอชีวประวัติของคุณได้ทันทีบน SceneFlow"',
          },
        },
      },
    ],
  },

  // ============================================================================
  // 2. REAL ESTATE & HOSPITALITY TOURS — "Villa Maris — Sold Across Borders"
  // ============================================================================
  realestate: {
    verticalId: 'realestate',
    verticalLabel: 'Real Estate & Boutique Hospitality Tours',
    promoTitle: 'Villa Maris — Sold Across Borders',
    formatBadge: '48s Luxury Walkthrough + Brokerage Business Promo · 6 × 8s Shots',
    runtimeLabel: '0:48',
    durationSeconds: 48,
    aspectRatio: '16:9 (with 9:16 Social Safe-Zone)',
    logline:
      'Ordinary property photos ignite into a blue-hour coastal villa walkthrough with on-camera host presentation and instant multilingual buyer closing—showing how operators replace $1,500 shoots with ~$60 SceneFlow tours on monthly retainers.',
    blueprintIntakePrompt:
      'Create a 48-second (6 scenes × 8 seconds) architectural cinema promo trailer titled "Villa Maris — Sold Across Borders" for a Real Estate & Hospitality Video Tour service powered by SceneFlow. Showcase a contemporary hillside oceanfront villa awakening at blue hour with an infinity pool and fire pit, a seamless interior glide from a Calacatta marble chef’s kitchen onto a sunlit Mediterranean terrace, a poised luxury advisor welcoming buyers on-camera, a serene spa suite, and an international investor couple approving an offer remotely in their native language—while executive narration sells the tens-of-millions global listing market and ~$60 total delivery cost.',
    artStyleLock:
      '24mm Architectural Cinema Photorealism · Crisp Verticals · 2700K Warm Designer Interior Glow vs Deep Sapphire Blue-Hour Ocean Horizon · Zero Signage Text',
    unitEconomicsHook:
      'Global need: Tens of millions of static property & hotel listings -> SceneFlow fully-loaded cost ~$60 (~$12 compute + ~1 hr) -> $199–$549 per listing + monthly retainers.',
    backgroundMusic: {
      title: 'Blue Hour Horizon (48s Luxury Architectural Lounge & Strings Score)',
      bpmAndKey: '100 BPM · A Minor shifting to luminous F Major lift',
      mixLevel: '25% volume (-12 dB) crisp and modern beneath host line and VO',
      generationPrompt:
        'Instrumental luxury real estate and architectural cinema showcase music, 48 seconds, 100 BPM, A minor to F major. 0:00-0:16 warm deep sub-bass pulse, silky Rhodes electric piano chords, and subtle brushed electronic percussion evoking million-dollar coastal twilight. 0:16-0:36 lush modern chamber strings and crystalline harp harmonics gliding smoothly. 0:36-0:48 sophisticated uplifting harmonic resolution with warm acoustic piano shimmer. Clean, aspirational, instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: LOC_VILLA_EXTERIOR_TWILIGHT',
        category: 'Location',
        name: 'Villa Maris Coastal Infinity Terrace (Blue Hour)',
        role: 'Hero Architectural Exterior Plate',
        promptDescription:
          'Contemporary hillside coastal luxury villa at twilight blue hour, soaring frameless glass walls glowing with 2700K warm interior lighting, travertine infinity-edge pool mirroring amber light and sapphire ocean horizon, recessed linear fire pit.',
      },
      {
        token: 'REF: LOC_VILLA_PAVILION',
        category: 'Location',
        name: 'Calacatta Marble Kitchen & Ocean Terrace Pavilion',
        role: 'Interior-to-Exterior Gimbal Glide Set',
        promptDescription:
          'Expansive open-concept coastal living pavilion in golden morning sunlight, veined Calacatta marble waterfall island, natural white-oak ceiling beams, wide-open motorized glass doors leading to a Mediterranean ocean-view terrace.',
      },
      {
        token: 'REF: LOC_SPA_SUITE',
        category: 'Location',
        name: 'Oceanfront Limestone Primary Spa Suite',
        role: 'Hospitality & Resort Versatility Set',
        promptDescription:
          'Serene luxury boutique hotel & villa primary bath carved from warm honed limestone, freestanding soaking tub with gentle rising steam overlooking glass ocean panorama at sunset, warm cove lighting.',
      },
      {
        token: 'REF: CHAR_AGENT_SOFIA',
        category: 'Cast',
        name: 'Sofia Laurent (36)',
        role: 'Luxury Property & Hospitality Advisor',
        promptDescription:
          'Poised 36-year-old international luxury property advisor, sleek dark chestnut blowout hair, warm confident smile, tailored ivory linen blazer and gold minimalist earrings.',
      },
      {
        token: 'REF: CHAR_INVESTOR_CHEN',
        category: 'Cast',
        name: 'David & Mei Chen (40s)',
        role: 'International Luxury Buyers',
        promptDescription:
          'Sophisticated East Asian couple in their early 40s in smart-casual cashmere evening wear inside a high-rise city penthouse lounge overlooking nighttime skyline bokeh.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'Twilight Villa Awakening & Global Listing Demand',
        timecode: '0:00–0:08',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Wide architectural cinema establishing shot of REF: LOC_VILLA_EXTERIOR_TWILIGHT overlooking a tranquil sapphire ocean at blue hour. At 0.0s, the villa sits poised above the infinity pool. From 0.5s to 3.5s, warm 2700K interior chandeliers and recessed travertine fire-pit flames ignite sequentially, sending golden reflections dancing across the water. From 3.5s to 8.0s, ultra-smooth drone-style gimbal glide pushes across the infinity edge toward the glowing glass living room.',
        cameraAndLighting:
          '24mm tilt-shift-inspired architectural cinema lens, razor-straight verticals, blue-hour sky vs 2700K warm interior glow.',
        sfxAndMix:
          'Soft ocean surf below cliff, gentle fire-pit whoosh at 1.2s, silky luxury Rhodes pulse enters at 25%.',
        settleOn:
          'Balanced twilight reflections of the glowing glass pavilion across the infinity pool.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Millions of property listings and boutique hotels compete globally every month—yet most use flat photos because video crews cost fifteen hundred dollars."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Millones de propiedades y hoteles boutique compiten cada mes, pero la mayoría solo usa fotos fijas porque un rodaje cuesta mil quinientos dólares."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Milhões de imóveis e hotéis boutique disputam atenção todo mês, mas a maioria só usa fotos porque gravações custam mil e quinhentos dólares."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "हर महीने लाखों प्रॉपर्टी और बुटीक होटल खरीदारों के लिए होड़ करते हैं, पर पंद्रह सौ डॉलर के महँगे शूट के कारण फ़ोटो तक सीमित रहते हैं।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“全球每月数千万房源与精品酒店激烈获客，却因一千五百美元的昂贵实拍只能展示静态照片。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "تتنافس ملايين العقارات والفنادق شهرياً حول العالم، لكن معظمها يكتفي بالصور الثابتة لأن التصوير الميداني يكلف ألفاً وخمسمئة دولار."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "อสังหาฯ และโรงแรมบูทีคหลายล้านแห่งต้องแข่งขันดึงดูดผู้ซื้อทุกเดือน แต่ส่วนใหญ่มีแค่ภาพนิ่งเพราะกองถ่ายแพงถึงพันห้าร้อยดอลลาร์"',
          },
        },
      },
      {
        blockNumber: 2,
        title: 'Interior-to-Ocean Gimbal Glide in ~$60',
        timecode: '0:08–0:16',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside REF: LOC_VILLA_PAVILION bathed in crisp golden morning sunlight. At 0.0s, smooth waist-height gimbal tracking shot glides past the veined Calacatta marble waterfall island and white-oak beams. From 2.5s to 6.0s, camera passes seamlessly through wide-open frameless glass doors onto the sunlit Mediterranean stone terrace as sheer linen curtains sway gently. From 6.0s to 8.0s, camera settles overlooking panoramic turquoise coastline.',
        cameraAndLighting:
          '24mm cinema lens, effortless forward Steadicam glide from interior shadow-play into sunlit ocean terrace, natural 4800K morning sun.',
        sfxAndMix:
          'Subtle coastal morning breeze, soft curtain rustle, modern chamber strings glide in at 25%.',
        settleOn:
          'Sun-drenched Mediterranean ocean terrace framed by open architectural glass.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Without visiting the site or waiting on weather, SceneFlow turns listing photos into scored four-K tours in under an hour—for around sixty dollars."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Sin viajar ni depender del clima, SceneFlow convierte las fotos del anuncio en tours cuatro K en menos de una hora por unos sesenta dólares."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Sem ir ao local nem depender do clima, o SceneFlow transforma fotos do anúncio em tours quatro K em menos de uma hora por cerca de sessenta dólares."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "बिना साइट पर जाए या मौसम देखे, SceneFlow एक घंटे से कम और लगभग साठ डॉलर की लागत में फ़ोटो को फ़ोर-के लक्ज़री टूर में बदल देता है।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“无需奔赴现场或等待晴天，SceneFlow 一小时内即可将房源照片升级为配乐漫游大片，总成本仅约六十美元。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "دون زيارة الموقع أو انتظار الطقس، يحوّل SceneFlow صور الإعلان إلى جولة سينمائية في أقل من ساعة وبتكلفة تقارب ستين دولاراً."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "ไม่ต้องเดินทางไปหน้างานหรือรอลมฟ้าอากาศ SceneFlow เปลี่ยนรูปถ่ายเป็นวิดีโอทัวร์ระดับโฟร์เคในไม่ถึงชั่วโมง ด้วยต้นทุนราวหกสิบดอลลาร์"',
          },
        },
      },
      {
        blockNumber: 3,
        title: 'On-Camera Luxury Host Presentation',
        timecode: '0:16–0:24',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. On the sunlit oceanfront glass balcony of REF: LOC_VILLA_PAVILION. At 0.0s, medium shot of REF: CHAR_AGENT_SOFIA in her tailored ivory linen blazer walking two graceful steps along the glass balustrade with sparkling blue ocean behind her. From 0.5s to 3.3s, Sofia turns warmly to the camera with natural eye contact and speaks clearly. From 3.3s to 8.0s, she gestures smoothly toward the panoramic terrace while the camera executes a subtle slow push-in.',
        cameraAndLighting:
          '50mm cinema lens at f/2.2, flattering golden bounce key light on Sofia with sparkling coastal horizon bokeh.',
        sfxAndMix:
          'Clean outdoor lavalier voice presence, gentle coastal air, warm lounge beat continues at 25%.',
        settleOn:
          'Poised medium close-up of Sofia welcoming viewers against the sunlit ocean horizon.',
        localizedCues: {
          en: {
            inSceneDialogue: 'Sofia (lip-sync, 0.5s–3.1s): "Every suite wakes up to uninterrupted ocean horizon."',
            narrationVo: 'VO (3.5s–7.6s): "Pair architectural motion with poised on-camera hosts and custom brand voiceovers."',
          },
          es: {
            inSceneDialogue: 'Sofia (sincronía labial, 0.5s–3.1s): "Cada suite despierta frente al horizonte infinito del mar."',
            narrationVo: 'VO (3.5s–7.6s): "Combina movimiento arquitectónico fluido con presentadores en cámara y locución a medida."',
          },
          pt: {
            inSceneDialogue: 'Sofia (sincronia labial, 0.5s–3.1s): "Cada suíte desperta de frente para o horizonte infinito do mar."',
            narrationVo: 'VO (3.5s–7.6s): "Una movimento arquitetônico fluido a apresentadores em cena e locução personalizada."',
          },
          hi: {
            inSceneDialogue: 'Sofia (लिप-सिंक, 0.5s–3.1s): "यहाँ हर सुइट से खुले समंदर का अनंत नज़ारा दिखता है।"',
            narrationVo: 'VO (3.5s–7.6s): "शानदार कैमरा मूवमेंट के साथ ऑन-कैमरा होस्ट और प्रीमियम वॉइसओवर जोड़ें।"',
          },
          zh: {
            inSceneDialogue: 'Sofia（口型同步，0.5s–3.1s）：“每一间套房推窗醒来，皆是无遮挡的浩瀚海平线。”',
            narrationVo: 'VO（3.5s–7.6s）：“将丝滑建筑运镜与优雅真人出镜讲解完美结合，瞬间拉满豪宅格调。”',
          },
          ar: {
            inSceneDialogue: 'Sofia (مزامنة شفاه، 0.5s–3.1s): "يستيقظ كل جناح هنا على أفق بحري مفتوح بلا حدود."',
            narrationVo: 'VO (3.5s–7.6s): "امزج حركة الكاميرا المعمارية الانسيابية مع تقديم احترافي أمام العدسة وتعليق صوتي فاخر."',
          },
          th: {
            inSceneDialogue: 'Sofia (ลิปซิงค์, 0.5s–3.1s): "ทุกห้องสวีทตื่นมาพร้อมวิวเส้นขอบฟ้าทะเลแบบพาโนรามาไร้สิ่งบดบัง"',
            narrationVo: 'VO (3.5s–7.6s): "ผสานงานกล้องสถาปัตยกรรมสุดสมูทเข้ากับผู้ดำเนินรายการหน้ากล้องและเสียงบรรยายพรีเมียม"',
          },
        },
      },
      {
        blockNumber: 4,
        title: 'Boutique Hospitality & Resort Versatility',
        timecode: '0:24–0:32',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside REF: LOC_SPA_SUITE at warm sunset. At 0.0s, low-angle lateral cinema slider shot glides past warm honed limestone walls and folded white spa towels toward the freestanding soaking tub. From 2.0s to 6.0s, delicate wisps of warm steam rise from crystal-clear water reflecting the amber sunset sky beyond floor-to-ceiling glass. From 6.0s to 8.0s, camera settles on the tranquil ocean panorama.',
        cameraAndLighting:
          '28mm cinema prime, precision motorized slider left-to-right, 2700K hidden architectural cove lighting + golden sunset horizon.',
        sfxAndMix:
          'Serene water ripple, soft spa room resonance, crystalline harp & strings swell at 25%.',
        settleOn:
          'Tranquil limestone spa tub framing the glowing sunset coastline.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Serve residential Realtors, luxury vacation rentals, boutique hotels, and pre-sale developments from the exact same studio workflow."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Atiende a inmobiliarias, alquileres vacacionales, hoteles boutique y preventas arquitectónicas con el mismo flujo de estudio."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Atenda imobiliárias, casas de temporada, hotéis boutique e lançamentos na planta com exatamente o mesmo fluxo de estúdio."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "एक ही स्टूडियो वर्कफ़्लो से रियल एस्टेट एजेंट, लक्ज़री विला, बुटीक होटल और नए प्रोजेक्ट्स को सेवा दें।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“同一套工作流即可通吃住宅经纪、高端度假民宿、精品酒店与期房沙盘推广。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "اخدِم الوسطاء العقاريين وبيوت العطلات والفنادق البوتيكية والمشاريع قيد الإنشاء بنفس منظومة الإنتاج."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "รับงานได้ครบทั้งนายหน้าบ้านหรู วิลล่าตากอากาศ โรงแรมบูทีค และโครงการเปิดจองใหม่ด้วยเวิร์กโฟลว์เดียว"',
          },
        },
      },
      {
        blockNumber: 5,
        title: '70+ Buyer Languages Closing Across Time Zones',
        timecode: '0:32–0:40',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside a sleek high-rise penthouse lounge at night with glittering city skyline bokeh behind glass. At 0.0s, over-the-shoulder medium shot of REF: CHAR_INVESTOR_CHEN watching the glowing Villa Maris twilight pool tour on a sleek widescreen tablet resting on a marble coffee table, zero readable text on screen. From 2.5s to 5.5s, Mei smiles and nods approvingly to David, who taps a clean glowing emerald confirmation button on the tablet. From 5.5s to 8.0s, camera arcs gently to show their excited expressions.',
        cameraAndLighting:
          '40mm anamorphic lens, shallow depth-of-field city lights bokeh, warm screen glow + soft 3200K lounge key light.',
        sfxAndMix:
          'Subtle glass tap chime at 4.8s, quiet luxury penthouse ambience, uplifting F-major harmonic lift at 25%.',
        settleOn:
          'Confident smiling international buyer couple exchanging an excited look over the Villa Maris tour.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Export Mandarin, Spanish, Arabic, or Portuguese buyer editions in minutes—helping agents close international investors faster."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Exporta versiones en inglés, mandarín, árabe o portugués en minutos para que las agencias cierren inversores internacionales."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Exporte versões em inglês, mandarim, espanhol ou árabe em minutos, ajudando corretores a fechar investidores globais."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "मिनटों में मंदारिन, स्पैनिश, अरबी या अंग्रेज़ी संस्करण दें—जिससे एजेंट विदेशी निवेशकों के साथ तेज़ी से डील क्लोज़ करें।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“几分钟即可导出英语、西语、阿语等七十多语种买家版，助力经纪人跨国锁客成交。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "صدّر نسخاً بالإنجليزية أو الصينية أو الإسبانية في دقائق لمساعدة الوسطاء على إتمام الصفقات الدولية بسرعة."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "ส่งออกเวอร์ชันภาษาจีน อังกฤษ อาหรับ หรือสเปนได้ในไม่กี่นาที ช่วยนายหน้าปิดการขายนักลงทุนต่างชาติได้ไวขึ้น"',
          },
        },
      },
      {
        blockNumber: 6,
        title: 'Monthly Brokerage Retainer Close',
        timecode: '0:40–0:48',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Breathtaking elevated crane pull-back from REF: LOC_VILLA_EXTERIOR_TWILIGHT. At 0.0s, medium-wide framing of the warm glowing glass villa, flickering fire pit, and mirror-still infinity pool. From 0.0s to 8.0s, camera rises and pulls back smoothly over the coastal bluff revealing the dramatic illuminated architectural jewel against the twilight ocean horizon.',
        cameraAndLighting:
          '24mm architectural cinema lens, majestic ascending crane pull-back, rich sapphire twilight sky and warm 2700K villa glow.',
        sfxAndMix:
          'Gentle distant surf, sophisticated piano & string chord resolves cleanly at 7.9s.',
        settleOn:
          'Iconic wide luxury coastal estate hero frame glowing at blue hour.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.4s–7.6s): "Charge two hundred to five-fifty per tour, sign top brokerages onto monthly retainers, and scale effortlessly with SceneFlow."',
          },
          es: {
            narrationVo: 'VO (0.4s–7.6s): "Cobra entre doscientos y quinientos cincuenta por tour, cierra igualas mensuales con inmobiliarias y escala con SceneFlow."',
          },
          pt: {
            narrationVo: 'VO (0.4s–7.6s): "Cobre de duzentos a quinhentos e cinquenta por tour, feche contratos mensais com imobiliárias e escale com o SceneFlow."',
          },
          hi: {
            narrationVo: 'VO (0.4s–7.6s): "प्रति टूर दो सौ से पाँच सौ पचास डॉलर चार्ज करें, टॉप ब्रोकरेज से मासिक अनुबंध जोड़ें, और SceneFlow से तेज़ विस्तार करें।"',
          },
          zh: {
            narrationVo: 'VO（0.4s–7.6s）：“每套房源报价二百至五百五十美元，轻松签下头部中介包月合作，用 SceneFlow 规模化交付。”',
          },
          ar: {
            narrationVo: 'VO (0.4s–7.6s): "سعّر كل جولة بين مئتين وخمسمئة وخمسين دولاراً، ووقّع عقوداً شهرية متكررة مع شركات الوساطة عبر SceneFlow."',
          },
          th: {
            narrationVo: 'VO (0.4s–7.6s): "คิดราคาสองร้อยถึงห้าร้อยห้าสิบดอลลาร์ต่อทัวร์ ปิดสัญญาเหมาจ่ายรายเดือนกับโบรกเกอร์ชั้นนำ และขยายธุรกิจด้วย SceneFlow"',
          },
        },
      },
    ],
  },

  // ============================================================================
  // 3. TRAINING & MULTILINGUAL SOPS — "Zero-Reshoot Precision"
  // ============================================================================
  training: {
    verticalId: 'training',
    verticalLabel: 'Corporate Training & Multilingual SOPs',
    promoTitle: 'Zero-Reshoot Precision',
    formatBadge: '48s Enterprise SOP Demo + B2B Retainer Promo · 6 × 8s Shots',
    runtimeLabel: '0:48',
    durationSeconds: 48,
    aspectRatio: '16:9 (with 9:16 Social Safe-Zone)',
    logline:
      'From clean-tech robotics lockout safety to clinical onboarding and 1-click regulation updates without reshooting, see how operators replace $3,000 enterprise training shoots with ~$150 localized modules in 70+ workforce languages.',
    blueprintIntakePrompt:
      'Create a 48-second (6 scenes × 8 seconds) crisp commercial cinema promo trailer titled "Zero-Reshoot Precision" for a Corporate Training & Multilingual SOP Video service powered by SceneFlow. Follow locked Operations Instructor Maya in a clean-tech robotics bay demonstrating a safety lockout procedure, macro technician calibration, a seamless cut to a sunlit clinical nursing onboarding workflow, diverse global staff completing localized tablet SOPs on a logistics floor, and Maya delivering an instant updated compliance check in the identical set without reshooting—while narration sells universal enterprise demand and ~$150 SceneFlow delivery cost.',
    artStyleLock:
      '35mm Clean Commercial Cinema Photorealism · Crisp 5000K Daylight Facility Key Light + Emerald/Amber Status Indicators · Locked Uniforms & Sets · Zero Readable Wall Text',
    unitEconomicsHook:
      'Global need: Every factory, clinic, restaurant & franchise faces turnover & safety compliance -> ~$150 SceneFlow cost (70% lower than $3,000 shoots) -> $599–$1,800 modules + quarterly update retainers.',
    backgroundMusic: {
      title: 'Precision Momentum (48s Modern Enterprise Innovation Pulse)',
      bpmAndKey: '108 BPM · C Major / A Minor clean tech-orchestral confidence',
      mixLevel: '25% volume (-12 dB) crisp, articulate, never masking technical instruction',
      generationPrompt:
        'Instrumental modern corporate innovation and precision engineering training underscore, 48 seconds, 108 BPM, C major. 0:00-0:16 clean marimba-like muted synth plucks, tight light percussion pulse, and warm bass establishing clarity and focus. 0:16-0:34 confident staccato strings and warm piano chords building global enterprise momentum. 0:34-0:48 uplifting, decisive harmonic resolution conveying safety, mastery, and trust. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_INSTRUCTOR_MAYA',
        category: 'Cast',
        name: 'Maya Lin (38)',
        role: 'Lead Operations & Safety Instructor (Continuity Locked)',
        promptDescription:
          'Confident, approachable 38-year-old female operations lead, neat dark ponytail, clear anti-reflective safety glasses, tailored navy blazer over slate technical polo, silver clip mic on lapel.',
      },
      {
        token: 'REF: CHAR_CLINICAL_PRIYA',
        category: 'Cast',
        name: 'Dr. Priya Nair (41)',
        role: 'Senior Clinical Onboarding Lead',
        promptDescription:
          'Warm, authoritative 41-year-old South Asian clinical educator in tailored deep-teal medical scrubs with stethoscope, guiding two attentive onboarding nurses.',
      },
      {
        token: 'REF: LOC_ROBOTICS_BAY',
        category: 'Location',
        name: 'Clean-Tech Precision Robotics Assembly Bay',
        role: 'Primary Industrial SOP Set',
        promptDescription:
          'Pristine modern clean-tech robotics and precision assembly floor, brushed aluminum workstations, sleek articulated yellow-and-slate robotic arm behind glass guard, crisp 5000K overhead commercial lighting, zero readable signs.',
      },
      {
        token: 'REF: LOC_CLINICAL_SUITE',
        category: 'Location',
        name: 'Modern Sunlit Diagnostic Clinic Suite',
        role: 'Healthcare SOP Demonstration Set',
        promptDescription:
          'State-of-the-art sunlit medical clinic training suite with clean white cabinetry, warm oak accents, stainless diagnostic cart, and soft natural daylight, zero screen text.',
      },
      {
        token: 'REF: LOC_LOGISTICS_HUB',
        category: 'Location',
        name: 'Global Clean-Tech Fulfillment & Prep Floor',
        role: 'Multilingual Workforce Rollout Set',
        promptDescription:
          'Bright modern global fulfillment and hospitality prep floor with spotless stainless workstations, mounted training tablets showing clean imagery, and balanced 4800K commercial key lighting, zero readable text.',
      },
      {
        token: 'REF: PROP_LOCKOUT_CONSOLE',
        category: 'Prop',
        name: 'Dual-Key Safety Lockout Control Console',
        role: 'Tactile SOP Procedure Prop',
        promptDescription:
          'Brushed steel industrial safety control pedestal featuring a tactile red rotary lockout switch, brass safety padlock clasp, and clean emerald-green status LED ring, zero printed words.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'Safety-Critical Clarity & Universal Enterprise Demand',
        timecode: '0:00–0:08',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside REF: LOC_ROBOTICS_BAY. At 0.0s, medium cinema shot of REF: CHAR_INSTRUCTOR_MAYA standing beside REF: PROP_LOCKOUT_CONSOLE while a robotic arm decelerates smoothly to a stop behind safety glass. From 0.5s to 3.1s, Maya engages the red rotary lockout switch and speaks directly to camera with calm authority. From 3.1s to 8.0s, two attentive technicians in matching slate uniforms step into frame observing her demonstration as camera dollies gently inward.',
        cameraAndLighting:
          '35mm commercial cinema lens, smooth forward dolly push, crisp 5000K clean-room key light with subtle cyan industrial rim.',
        sfxAndMix:
          'Robotic servo power-down hum, crisp mechanical lockout click at 1.4s, clean marimba-synth pulse enters at 25%.',
        settleOn:
          'Clear three-shot of Maya demonstrating the locked safety console to her technicians.',
        localizedCues: {
          en: {
            inSceneDialogue: 'Maya (lip-sync, 0.5s–3.0s): "Lock out power first. Clarity prevents every accident."',
            narrationVo: 'VO (3.4s–7.7s): "Every factory, clinic, and franchise battles turnover and strict safety compliance worldwide."',
          },
          es: {
            inSceneDialogue: 'Maya (sincronía labial, 0.5s–3.0s): "Bloquea la energía primero. La claridad evita accidentes."',
            narrationVo: 'VO (3.4s–7.7s): "Cada fábrica, clínica y franquicia enfrenta rotación constante y normas estrictas de seguridad."',
          },
          pt: {
            inSceneDialogue: 'Maya (sincronia labial, 0.5s–3.0s): "Trave a energia primeiro. Clareza evita qualquer acidente."',
            narrationVo: 'VO (3.4s–7.7s): "Toda fábrica, clínica e franquia enfrenta rotatividade constante e normas rígidas de segurança."',
          },
          hi: {
            inSceneDialogue: 'Maya (लिप-सिंक, 0.5s–3.0s): "पहले पावर लॉक करें। स्पष्टता हर दुर्घटना रोकती है।"',
            narrationVo: 'VO (3.4s–7.7s): "दुनिया भर की हर फ़ैक्ट्री, क्लिनिक और फ़्रैंचाइज़ी को सुरक्षा और नए स्टाफ़ की ट्रेनिंग चाहिए।"',
          },
          zh: {
            inSceneDialogue: 'Maya（口型同步，0.5s–3.0s）：“先锁定电源。清晰的标准能杜绝每一场事故。”',
            narrationVo: 'VO（3.4s–7.7s）：“全球每家工厂、诊所与连锁企业，都面临高频入职培训与严格安全合规刚需。”',
          },
          ar: {
            inSceneDialogue: 'Maya (مزامنة شفاه، 0.5s–3.0s): "افصل الطاقة أولاً؛ فالوضوح يمنع كل الحوادث."',
            narrationVo: 'VO (3.4s–7.7s): "يواجه كل مصنع وعيادة وامتياز تجاري حول العالم دوراناً وظيفياً ومتطلبات سلامة صارمة."',
          },
          th: {
            inSceneDialogue: 'Maya (ลิปซิงค์, 0.5s–3.0s): "ล็อกตัดไฟก่อนเสมอ ความชัดเจนช่วยป้องกันทุกอุบัติเหตุ"',
            narrationVo: 'VO (3.4s–7.7s): "ทุกโรงงาน คลินิก และแฟรนไชส์ทั่วโลกต้องรับมือพนักงานใหม่และกฎความปลอดภัยตลอดเวลา"',
          },
        },
      },
      {
        blockNumber: 2,
        title: 'Step-by-Step Visual SOP Precision',
        timecode: '0:08–0:16',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Tight over-the-shoulder to macro cinema shot inside REF: LOC_ROBOTICS_BAY. At 0.0s, a uniformed technician attaches a brass safety padlock clasp onto REF: PROP_LOCKOUT_CONSOLE under REF: CHAR_INSTRUCTOR_MAYA’s watchful guidance. From 2.5s to 5.5s, the console LED ring transitions smoothly from amber to emerald green as the technician verifies calibration with a precision torque tool. From 5.5s to 8.0s, rack focus shifts up to Maya giving an approving nod.',
        cameraAndLighting:
          '50mm macro-capable cinema prime, smooth tilt-and-rack focus from hands on console to Maya’s approving expression.',
        sfxAndMix:
          'Solid brass padlock snap, subtle reassuring emerald tone chime, articulate strings pulse at 25%.',
        settleOn:
          'Crisp medium close-up of Maya nodding approval beside the green-lit safety console.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Yet live training shoots cost three thousand dollars and disrupt operations—leaving companies stuck with unread PDF manuals."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Pero grabar en planta cuesta tres mil dólares y frena la operación, dejando a los equipos con manuales que nadie lee."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Mas gravações presenciais custam três mil dólares e param a operação, deixando equipes com manuais que ninguém lê."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "पर तीन हज़ार डॉलर के लाइव शूट काम रोक देते हैं—जिससे कंपनियाँ उबाऊ पीडीएफ़ मैनुअल तक सीमित रह जाती हैं।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“传统实拍动辄三千美元还要停工配合，迫使大多数企业只能发枯燥的文档手册。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "لكن التصوير الميداني يكلف ثلاثة آلاف دولار ويعطّل العمل، فتكتفي الشركات بملفات نصية لا يقرؤها أحد."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "แต่การจ้างกองถ่ายสามพันดอลลาร์ต้องหยุดหน้างาน ทำให้หลายองค์กรยังติดอยู่กับคู่มือเอกสารที่ไม่มีใครอ่าน"',
          },
        },
      },
      {
        blockNumber: 3,
        title: 'Clinical & Multi-Industry Continuity (~$150 Cost)',
        timecode: '0:16–0:24',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside sunlit REF: LOC_CLINICAL_SUITE. At 0.0s, smooth lateral Steadicam shot reveals REF: CHAR_CLINICAL_PRIYA in deep-teal scrubs demonstrating a sterile diagnostic sensor workflow to two engaged onboarding nurses in matching uniforms. From 2.5s to 6.0s, one nurse performs the exact hand-off cleanly while Dr. Priya smiles and confirms proper positioning. From 6.0s to 8.0s, gentle push-in highlights the warm, trustworthy clinical realism.',
        cameraAndLighting:
          '40mm cinema prime, smooth lateral glide to medium three-shot, bright natural daylight + clean 4600K clinical fill.',
        sfxAndMix:
          'Quiet clinical suite ambience, soft instrument click, confident staccato strings build at 25%.',
        settleOn:
          'Warm, authoritative clinical training tableau of Dr. Priya and two confident nurses.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow locks instructors, uniforms, and sets in Continuity Vault—delivering modules for around one hundred fifty dollars total."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow fija instructores, uniformes y escenarios en Continuidad, entregando módulos por unos ciento cincuenta dólares totales."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "O SceneFlow trava instrutores, uniformes e cenários na Continuidade, entregando módulos por cerca de cento e cinquenta dólares."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow प्रशिक्षक, यूनिफ़ॉर्म और कार्यस्थल लॉक कर केवल एक सौ पचास डॉलर की कुल लागत में मॉड्यूल तैयार करता है।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“SceneFlow 锁定讲师、制服与标准场景，综合交付成本仅约一百五十美元，直降百分之七十。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "يثبّت SceneFlow المدربين والزي الموحد وبيئة العمل، لتسليم الوحدة بتكلفة كاملة تقارب مئة وخمسين دولاراً فقط."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow ล็อกผู้สอน ยูนิฟอร์ม และสถานที่ทำงานไว้ครบ ส่งมอบบทเรียนด้วยต้นทุนรวมเพียงราวร้อยห้าสิบดอลลาร์"',
          },
        },
      },
      {
        blockNumber: 4,
        title: '70+ Workforce Languages Across Every Shift',
        timecode: '0:24–0:32',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside REF: LOC_LOGISTICS_HUB. At 0.0s, dynamic Steadicam tracking shot follows a diverse frontline team supervisor walking past clean stainless workstations where three staff members wear wireless earpieces watching the visual SOP video on mounted tablets (clean imagery on screen, zero text). From 3.0s to 8.0s, each worker completes their safety check in sync and gives a confident thumbs-up as camera glides forward.',
        cameraAndLighting:
          '35mm cinema lens, energetic forward tracking glide, bright balanced 4800K commercial key lighting.',
        sfxAndMix:
          'Clean modern facility hum, crisp latch clicks in rhythm, driving enterprise piano & strings at 25%.',
        settleOn:
          'Smiling diverse frontline team executing synchronized safety checks.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Publish every lesson in over seventy native workforce languages—so every shift understands procedures on day one."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Publica cada curso en más de setenta idiomas laborales para que cada turno domine el protocolo desde el primer día."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Publique cada aula em mais de setenta idiomas de trabalho para que todo turno domine o padrão desde o primeiro dia."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "सत्तर से अधिक भाषाओं में हर कोर्स तुरंत जारी करें—ताकि हर शिफ़्ट का कर्मचारी पहले ही दिन नियम समझे।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“一键输出七十多种一线员工母语版本，让全球不同班次的新员工入职首日即刻上手。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "انشر كل درس بأكثر من سبعين لغة للعاملين، ليفهم كل فريق الإجراءات بدقة منذ اليوم الأول."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "เผยแพร่บทเรียนได้กว่าเจ็ดสิบภาษา เพื่อให้พนักงานทุกกะเข้าใจขั้นตอนตรงกันตั้งแต่วันแรกที่เริ่มงาน"',
          },
        },
      },
      {
        blockNumber: 5,
        title: 'Instant Regulation Update Without Reshooting',
        timecode: '0:32–0:40',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Return to REF: LOC_ROBOTICS_BAY with 100% identical lighting, set, blazer, and hair on REF: CHAR_INSTRUCTOR_MAYA beside REF: PROP_LOCKOUT_CONSOLE. At 0.0s, Maya holds up a secondary brass dual-verification key alongside the primary safety lock, demonstrating an updated compliance rule seamlessly. From 2.5s to 6.0s, she inserts the secondary key and turns it until dual emerald indicators illuminate. From 6.0s to 8.0s, Maya smiles confidently toward camera.',
        cameraAndLighting:
          '50mm cinema lens, exact continuity framing matching Block 1, crisp 5000K clean-tech lighting.',
        sfxAndMix:
          'Crisp dual-key turn click, clean harmonic confirmation tone, uplifting strings swell at 25%.',
        settleOn:
          'Exact continuity portrait of Maya beside the updated dual-key console.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "When regulations change, FlowDirector regenerates just that single scene in minutes—zero reshoots, zero plant downtime."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Cuando cambia una norma, FlowDirector actualiza solo esa escena en minutos, sin volver a grabar ni detener la planta."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Quando uma norma muda, o FlowDirector atualiza apenas aquela cena em minutos, sem regravar nem parar a operação."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "नियम बदलने पर FlowDirector बिना दोबारा शूटिंग मिनटों में सिर्फ़ वही दृश्य अपडेट कर देता है—बिना काम रोके।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“当合规政策更新时，FlowDirector 几分钟即可单独重制该镜头，零重拍、零停工损耗。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "وعندما تتغير اللوائح، يحدّث FlowDirector ذلك المشهد وحده في دقائق دون إعادة تصوير أو توقف للعمل."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "เมื่อกฎระเบียบเปลี่ยน FlowDirector อัปเดตเฉพาะซีนนั้นได้ในไม่กี่นาที โดยไม่ต้องถ่ายใหม่และไม่ต้องหยุดสายการผลิต"',
          },
        },
      },
      {
        blockNumber: 6,
        title: 'Scalable B2B Training Retainer Close',
        timecode: '0:40–0:48',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Wide confident hero shot inside REF: LOC_ROBOTICS_BAY. At 0.0s, REF: CHAR_INSTRUCTOR_MAYA stands centered with her two certified technicians as the sleek robotic assembly arm operates smoothly behind the safety glass. From 0.0s to 8.0s, smooth symmetrical dolly pull-back reveals the spotless high-tech facility operating in harmony while Maya and her team smile with pride.',
        cameraAndLighting:
          '35mm commercial cinema lens, poised symmetrical pull-back, clean 5000K daylight facility glow.',
        sfxAndMix:
          'Smooth precision robotics hum, decisive C-major orchestral-tech chord resolves cleanly at 7.9s.',
        settleOn:
          'Authoritative wide enterprise hero frame of Maya and her certified operations team.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.4s–7.6s): "Charge six hundred to eighteen hundred per module plus quarterly update retainers—scaling twenty-plus enterprise clients on SceneFlow."',
          },
          es: {
            narrationVo: 'VO (0.4s–7.6s): "Cobra entre seiscientos y mil ochocientos por módulo más igualas trimestrales, gestionando veinte cuentas B2B en SceneFlow."',
          },
          pt: {
            narrationVo: 'VO (0.4s–7.6s): "Cobre de seiscentos a mil e oitocentos por módulo mais contratos trimestrais, gerenciando vinte clientes B2B no SceneFlow."',
          },
          hi: {
            narrationVo: 'VO (0.4s–7.6s): "प्रति मॉड्यूल छह सौ से अठारह सौ डॉलर और तिमाही रिटेनर कमाएँ—SceneFlow पर बीस से अधिक कॉर्पोरेट क्लाइंट संभालें।"',
          },
          zh: {
            narrationVo: 'VO（0.4s–7.6s）：“每门课程报价六百至一千八百美元并绑定季度维护年费，用 SceneFlow 轻松并行服务二十多家企业客户。”',
          },
          ar: {
            narrationVo: 'VO (0.4s–7.6s): "سعّر الوحدة بين ستمئة وألف وثمانمئة دولار مع عقود تحديث ربع سنوية، وأدِر عشرين عميلاً مؤسسياً عبر SceneFlow."',
          },
          th: {
            narrationVo: 'VO (0.4s–7.6s): "คิดราคาหกร้อยถึงพันแปดร้อยดอลลาร์ต่อบทเรียนพร้อมสัญญาดูแลรายไตรมาส บริหารลูกค้าองค์กรกว่ายี่สิบรายสบายๆ บน SceneFlow"',
          },
        },
      },
    ],
  },

  // ============================================================================
  // 4. BRAND STORIES & SOCIAL AD PACKS — "Main Street Cinema"
  // ============================================================================
  brand: {
    verticalId: 'brand',
    verticalLabel: 'Local Brand Stories & 9:16 Social Ad Packs',
    promoTitle: 'Main Street Cinema',
    formatBadge: '48s SMB Brand Film + Social Ad Business Promo · 6 × 8s Shots',
    runtimeLabel: '0:48',
    durationSeconds: 48,
    aspectRatio: '16:9 (with 9:16 Social Safe-Zone)',
    logline:
      'From a sun-drenched specialty coffee roastery to a boutique wellness clinic and bustling neighborhood bistro, see how operators deliver agency-caliber homepage brand films + 9:16 social ad packs to 30M+ local businesses for ~$110 total cost.',
    blueprintIntakePrompt:
      'Create a 48-second (6 scenes × 8 seconds) anamorphic commercial brand promo trailer titled "Main Street Cinema" for a Local Brand Story & Social Ad Pack service powered by SceneFlow. Showcase passionate craft coffee roaster Leo in golden morning sunbeams speaking an authentic founder hook, velvety espresso pour-over craft, a serene Scandinavian dental & wellness clinic welcome, an open-flame bistro chef plating a signature dish, smiling customers arriving with a vertical 9:16 social video reel on their phone, and Leo welcoming a full café—while narration sells the 30M+ global SMB market and ~$110 SceneFlow delivery cost.',
    artStyleLock:
      '35mm Anamorphic Commercial Brand Cinema · Golden-Hour Sunbeams, Rich Tactile Steam & Shallow Depth of Field · Authentic Human Warmth · Zero Logos or Signage Text',
    unitEconomicsHook:
      'Global need: 30M+ local clinics, law firms, roasters & restaurants priced out of $5,000 agencies -> ~$110 SceneFlow cost -> $399–$1,200 packs across 20+ active SMB accounts.',
    backgroundMusic: {
      title: 'Main Street Craft (48s Warm Indie-Acoustic & Soulful Cinematic Groove)',
      bpmAndKey: '98 BPM · G Major warm, organic, handcrafted commercial uplift',
      mixLevel: '25% volume (-12 dB) punchy yet warm beneath founder hook and VO',
      generationPrompt:
        'Instrumental boutique brand anthem and craft commercial score, 48 seconds, 98 BPM, G major. 0:00-0:16 warm fingerpicked acoustic guitar, upright bass, and brushed snare rim-clicks with organic room warmth. 0:16-0:34 soulful Wurlitzer electric piano, handclaps-free warm percussion groove, and uplifting chamber strings building Main Street pride. 0:34-0:48 triumphant, heartwarming cinematic acoustic-orchestral swell resolving on a resonant G-major chord. Instrumental only, no vocals.',
    },
    referenceLocks: [
      {
        token: 'REF: CHAR_FOUNDER_LEO',
        category: 'Cast',
        name: 'Leo Morales (40)',
        role: 'Craft Coffee Roaster & Café Founder',
        promptDescription:
          'Passionate, charismatic 40-year-old artisan coffee roaster with short wavy dark hair, trimmed beard, warm expressive brown eyes, wearing a weathered olive canvas apron over a rolled-sleeve chambray shirt.',
      },
      {
        token: 'REF: CHAR_DR_ELENA',
        category: 'Cast',
        name: 'Dr. Elena Lindqvist (39)',
        role: 'Boutique Wellness & Dental Studio Founder',
        promptDescription:
          'Warm, trustworthy 39-year-old female doctor with shoulder-length blonde hair, genuine reassuring smile, crisp tailored white clinical coat over soft sage silk blouse.',
      },
      {
        token: 'REF: LOC_COFFEE_ROASTERY',
        category: 'Location',
        name: 'Sunbeam Brick-and-Timber Craft Coffee Roastery',
        role: 'Hero Founder Story Set',
        promptDescription:
          'Inviting brick-and-timber neighborhood coffee roastery at dawn, gleaming copper-and-cast-iron drum roaster, dramatic golden morning sunbeams slicing through aromatic espresso steam, warm oak pour-over bar, zero text.',
      },
      {
        token: 'REF: LOC_WELLNESS_CLINIC',
        category: 'Location',
        name: 'Scandinavian Travertine Dental & Wellness Lounge',
        role: 'High-Ticket Local Service Trust Set',
        promptDescription:
          'Architectural Scandinavian-inspired boutique clinic reception bathed in soft morning sunlight, natural travertine stone counter, warm vertical oak slats, indoor olive tree, zero signage words.',
      },
      {
        token: 'REF: LOC_BISTRO_KITCHEN',
        category: 'Location',
        name: 'Open-Flame Artisan Neighborhood Bistro Kitchen',
        role: 'Hospitality & Culinary Craft Set',
        promptDescription:
          'Intimate open-flame neighborhood bistro kitchen pass at evening service, gleaming copper pans, ceramic stoneware under warm 2800K pass lamps, candlelit dining room bokeh beyond, zero signage text.',
      },
      {
        token: 'REF: PROP_BRASS_TRYER',
        category: 'Prop',
        name: 'Artisan Brass Roaster Sample Tryer',
        role: 'Tactile Craft Hero Prop',
        promptDescription:
          'Polished vintage brass coffee roaster sample tryer wooden handle filled with glossy, freshly roasted dark-mahogany espresso beans releasing wisps of warm aromatic smoke.',
      },
    ],
    blocks: [
      {
        blockNumber: 1,
        title: 'Authentic Founder Hook & 30M+ Priced-Out SMBs',
        timecode: '0:00–0:08',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside REF: LOC_COFFEE_ROASTERY as golden morning sunbeams slice through warm aromatic steam. At 0.0s, medium close-up of REF: CHAR_FOUNDER_LEO pulling REF: PROP_BRASS_TRYER from the gleaming copper drum roaster and inhaling the fresh roast aroma. From 0.6s to 3.2s, Leo looks warmly into the lens with authentic pride and speaks. From 3.2s to 8.0s, he pours golden-brown beans into the cooling tray with swirling motion as camera arcs smoothly right.',
        cameraAndLighting:
          '35mm anamorphic cinema lens, warm 3200K golden sunbeams against deep roastery shadows, rich shallow bokeh.',
        sfxAndMix:
          'Roaster drum gentle spin, cascading roasted coffee beans, warm fingerpicked acoustic groove enters at 25%.',
        settleOn:
          'Hero medium portrait of Leo smiling beside the swirling copper cooling tray.',
        localizedCues: {
          en: {
            inSceneDialogue: 'Leo (lip-sync, 0.6s–3.1s): "Big chains buy speed. We roast every batch at dawn."',
            narrationVo: 'VO (3.5s–7.7s): "Thirty million local businesses need video to win trust—yet five-thousand-dollar agencies lock them out."',
          },
          es: {
            inSceneDialogue: 'Leo (sincronía labial, 0.6s–3.1s): "Las cadenas compran prisa. Nosotros tostamos cada lote al amanecer."',
            narrationVo: 'VO (3.5s–7.7s): "Treinta millones de negocios locales necesitan video para ganar confianza, pero agencias de cinco mil dólares los excluyen."',
          },
          pt: {
            inSceneDialogue: 'Leo (sincronia labial, 0.6s–3.1s): "Grandes redes compram pressa. Nós torramos cada lote ao amanhecer."',
            narrationVo: 'VO (3.5s–7.7s): "Trinta milhões de negócios locais precisam de vídeo para gerar confiança, mas agências de cinco mil dólares são inviáveis."',
          },
          hi: {
            inSceneDialogue: 'Leo (लिप-सिंक, 0.6s–3.1s): "बड़ी चेन रफ़्तार चुनती हैं। हम हर बैच सुबह खुद भूनते हैं।"',
            narrationVo: 'VO (3.5s–7.7s): "तीन करोड़ स्थानीय व्यवसायों को भरोसा जीतने के लिए वीडियो चाहिए, पर पाँच हज़ार डॉलर की एजेंसियाँ उन्हें रोक देती हैं।"',
          },
          zh: {
            inSceneDialogue: 'Leo（口型同步，0.6s–3.1s）：“大连锁追求流水线速度，而我们坚持在黎明手工慢烘每一炉豆子。”',
            narrationVo: 'VO（3.5s–7.7s）：“全球三千万本地商户亟需视频建立信任，却被五千美元起步的广告公司拒之门外。”',
          },
          ar: {
            inSceneDialogue: 'Leo (مزامنة شفاه، 0.6s–3.1s): "السلاسل الكبرى تشتري السرعة، أما نحن فنحمّص كل دفعة فجراً."',
            narrationVo: 'VO (3.5s–7.7s): "ثلاثون مليون مشروع محلي يحتاج للفيديو لبناء الثقة، لكن تكلفة الوكالات البالغة خمسة آلاف دولار تمنعهم."',
          },
          th: {
            inSceneDialogue: 'Leo (ลิปซิงค์, 0.6s–3.1s): "แบรนด์ใหญ่เน้นความเร็ว แต่เราคั่วกาแฟสดด้วยมือทุกหม้อตั้งแต่รุ่งสาง"',
            narrationVo: 'VO (3.5s–7.7s): "ธุรกิจท้องถิ่นกว่าสามสิบล้านแห่งต้องการวิดีโอสร้างความเชื่อมั่น แต่สู้ราคาเอเจนซี่ห้าพันดอลลาร์ไม่ไหว"',
          },
        },
      },
      {
        blockNumber: 2,
        title: 'Sensory Craft Commercial Quality',
        timecode: '0:08–0:16',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. At the warm oak bar of REF: LOC_COFFEE_ROASTERY. At 0.0s, tactile close-up of rich hazelnut-gold espresso crema streaming into a stoneware cup. From 2.5s to 6.5s, camera tilts and pulls back smoothly as REF: CHAR_FOUNDER_LEO pours silky micro-foam latte art and slides the steaming cup across the counter to a smiling neighborhood regular. From 6.5s to 8.0s, warm eye contact and genuine laughter.',
        cameraAndLighting:
          '50mm anamorphic prime, fluid macro-to-medium pull-back, golden morning backlight illuminating rising steam.',
        sfxAndMix:
          'Velvety espresso extraction hiss, ceramic saucer set-down, upright bass & brushed snare groove at 25%.',
        settleOn:
          'Warm human connection across the sunlit oak coffee counter.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow gives independent businesses Super Bowl-caliber storytelling—without shutting down their shop for a camera crew."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow brinda a los comercios independientes calidad de gran cine comercial, sin cerrar su local por un rodaje."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "O SceneFlow entrega aos negócios locais qualidade de grande comercial de cinema, sem fechar as portas para filmagens."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow स्थानीय व्यवसायों को बड़े ब्रांड जैसी सिनेमाई कहानी देता है—वह भी बिना दुकान बंद किए या कैमरा क्रू बुलाए।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“SceneFlow 让街边独立品牌也能拥有顶级TVC质感的电影故事，且无需停业配合剧组拍摄。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "يمنح SceneFlow المشاريع المستقلة إعلانات بجودة سينمائية عالمية، دون إغلاق المتجر لاستقبال طاقم تصوير."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "SceneFlow มอบหนังโฆษณาระดับภาพยนตร์ให้ธุรกิจอิสระ โดยไม่ต้องปิดหน้าร้านเพื่อรับกองถ่าย"',
          },
        },
      },
      {
        blockNumber: 3,
        title: 'Boutique Clinic Trust Film (~$110 Total Cost)',
        timecode: '0:16–0:24',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside sunlit REF: LOC_WELLNESS_CLINIC. At 0.0s, smooth gimbal glide past travertine stone and indoor olive branches as REF: CHAR_DR_ELENA in her crisp white coat steps into the serene lounge. From 2.0s to 6.0s, she warmly greets a smiling female client with a reassuring two-hand welcome gesture and guides her toward a sunlit consultation suite. From 6.0s to 8.0s, gentle push-in captures instant trust and calm.',
        cameraAndLighting:
          '50mm cinema lens, airy Scandinavian morning daylight, soft 4400K bounce fill on natural skin tones.',
        sfxAndMix:
          'Serene boutique lounge ambience, warm footsteps on stone, soulful Wurlitzer & strings lift at 25%.',
        settleOn:
          'Warm medium two-shot of Dr. Elena welcoming her relaxed, smiling patient.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Deliver homepage trust films for clinics, law firms, and studios at roughly one hundred ten dollars in total SceneFlow cost."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Entrega videos de confianza para clínicas, despachos y estudios con un costo total cercano a ciento diez dólares."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Entregue filmes de confiança para clínicas, escritórios e estúdios com custo total em torno de cento e dez dólares."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "क्लिनिक, लॉ फ़र्म और स्टूडियो के लिए होमपेज ब्रांड फ़िल्म केवल एक सौ दस डॉलर की कुल लागत में डिलीवर करें।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“为诊所、律所与美学空间定制官网信任大片，算上积分与人工，综合成本仅约一百一十美元。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "سلّم أفلام ثقة للموقع الإلكتروني للعيادات ومكاتب المحاماة بتكلفة كاملة تقارب مئة وعشرة دولارات فقط."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "ส่งมอบหนังสร้างความน่าเชื่อถือบนหน้าเว็บให้คลินิกและสำนักงานกฎหมาย ด้วยต้นทุนรวมเพียงราวร้อยสิบดอลลาร์"',
          },
        },
      },
      {
        blockNumber: 4,
        title: 'Culinary & Main Street Energy',
        timecode: '0:24–0:32',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Inside REF: LOC_BISTRO_KITCHEN at evening service. At 0.0s, dynamic anamorphic tracking shot passes copper pans as a passionate chef sears a glaze with a brief golden flame flare. From 3.0s to 6.5s, the chef plates fresh micro-herbs with tweezers onto ceramic stoneware under warm pass lamps. From 6.5s to 8.0s, a server lifts the dish toward a glowing candlelit dining room.',
        cameraAndLighting:
          '35mm anamorphic lens, dynamic left-to-right pass glide, dramatic 2800K warm pass lights and golden culinary flame.',
        sfxAndMix:
          'Crisp pan sizzle, gentle kitchen energy, uplifting acoustic-orchestral groove swells at 25%.',
        settleOn:
          'Artisan dish lifted from the glowing chef’s pass toward candlelit guests.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "One master production automatically outputs both widescreen website stories and vertical nine-by-sixteen Reels, TikTok, and Shorts."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Una sola producción genera automáticamente el video horizontal para web y cortes verticales para Reels, TikTok y Shorts."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Uma única produção gera automaticamente o filme horizontal para o site e cortes verticais para Reels, TikTok e Shorts."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "एक ही मास्टर प्रोडक्शन से वेबसाइट की वाइडस्क्रीन फ़िल्म और Reels, TikTok व Shorts के वर्टिकल विज्ञापन स्वतः बनते हैं।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“一次主片制作即可自动输出官网横屏故事片，以及适配抖音、TikTok 与 Reels 的竖屏广告包。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "إنتاج رئيسي واحد يولّد تلقائياً فيلم الموقع الأفقي مع مقاطع عمودية جاهزة لـ Reels وTikTok وShorts."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "ผลิตเพียงครั้งเดียว ได้ครบทั้งหนังแนวนอนขึ้นเว็บไซต์ และคลิปแนวตั้งเก้าต่อสิบหกสำหรับ Reels, TikTok และ Shorts"',
          },
        },
      },
      {
        blockNumber: 5,
        title: '9:16 Social Ad Driving Real Foot Traffic',
        timecode: '0:32–0:40',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Sunny morning sidewalk outside REF: LOC_COFFEE_ROASTERY with warm brick facade and potted olive trees. At 0.0s, close over-the-shoulder shot on a young couple’s smartphone displaying a vibrant vertical 9:16 video clip of REF: CHAR_FOUNDER_LEO roasting espresso (zero text on phone screen). From 2.5s to 6.5s, camera tilts up smoothly as the smiling couple lowers the phone and pushes open the glass café door into the bustling roastery. From 6.5s to 8.0s, Leo waves warmly from behind the bar.',
        cameraAndLighting:
          '35mm cinema lens, fluid tilt-and-follow from vertical phone screen through sunlit café entrance.',
        sfxAndMix:
          'Cheerful brass shop-door bell jingle at 4.2s, lively café murmur, warm commercial swell peaks at 25%.',
        settleOn:
          'New customers stepping into the lively sunlit café as Leo welcomes them.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.5s–7.6s): "Clients review cuts on their phone in Screening Room while FlowDirector automates quality checks across twenty active accounts."',
          },
          es: {
            narrationVo: 'VO (0.5s–7.6s): "Tus clientes aprueban desde el móvil en Screening Room mientras FlowDirector automatiza el control en veinte cuentas activas."',
          },
          pt: {
            narrationVo: 'VO (0.5s–7.6s): "Seus clientes aprovam pelo celular na Screening Room enquanto o FlowDirector revisa vinte contas ativas com um clique."',
          },
          hi: {
            narrationVo: 'VO (0.5s–7.6s): "क्लाइंट फ़ोन पर Screening Room में मंज़ूरी देते हैं और FlowDirector एक साथ बीस सक्रिय खातों की गुणवत्ता सँभालता है।"',
          },
          zh: {
            narrationVo: 'VO（0.5s–7.6s）：“客户在手机端 Screening Room 即可审片签字，配合 FlowDirector 智能质检轻松并行交付二十个客户。”',
          },
          ar: {
            narrationVo: 'VO (0.5s–7.6s): "يعتمد العملاء النسخ من هواتفهم في غرفة العرض، بينما يضبط FlowDirector الجودة عبر عشرين حساباً نشطاً."',
          },
          th: {
            narrationVo: 'VO (0.5s–7.6s): "ลูกค้าตรวจอนุมัติผ่านมือถือใน Screening Room ขณะที่ FlowDirector ช่วยคุมคุณภาพให้คุณดูแลลูกค้ากว่ายี่สิบรายพร้อมกัน"',
          },
        },
      },
      {
        blockNumber: 6,
        title: 'Main Street Agency Scale Close',
        timecode: '0:40–0:48',
        durationSeconds: 8,
        videoPrompt:
          'Single continuous take, no cuts. Golden-hour portrait at the open timber doorway of REF: LOC_COFFEE_ROASTERY. At 0.0s, REF: CHAR_FOUNDER_LEO stands proudly in his olive canvas apron with warm amber café lights and happy guests blurred behind him. From 0.0s to 8.0s, Leo folds his arms with a genuine fulfilled smile as the camera executes a smooth cinematic dolly pull-back onto the sunlit neighborhood street.',
        cameraAndLighting:
          '35mm anamorphic cinema lens, classic commercial hero dolly pull-back, golden sunset rim light + warm 2900K interior café bokeh.',
        sfxAndMix:
          'Warm café ambience, resonant G-major acoustic-orchestral chord resolves cleanly at 7.9s.',
        settleOn:
          'Iconic wide Main Street founder portrait framed by the glowing roastery doorway.',
        localizedCues: {
          en: {
            narrationVo: 'VO (0.4s–7.6s): "Sell four-hundred to twelve-hundred-dollar brand and social ad packages—and build a high-margin local agency on SceneFlow."',
          },
          es: {
            narrationVo: 'VO (0.4s–7.6s): "Vende paquetes de marca y anuncios entre cuatrocientos y mil doscientos dólares y crea tu agencia rentable en SceneFlow."',
          },
          pt: {
            narrationVo: 'VO (0.4s–7.6s): "Venda pacotes de marca e anúncios de quatrocentos a mil e duzentos dólares e crie sua agência lucrativa no SceneFlow."',
          },
          hi: {
            narrationVo: 'VO (0.4s–7.6s): "चार सौ से बारह सौ डॉलर के ब्रांड व सोशल एड पैकेज बेचें—और SceneFlow पर अपनी उच्च-लाभ एजेंसी बनाएँ।"',
          },
          zh: {
            narrationVo: 'VO（0.4s–7.6s）：“以四百至一千二百美元的爆款套餐打通本地商业街，用 SceneFlow 打造高利润品牌视频机构。”',
          },
          ar: {
            narrationVo: 'VO (0.4s–7.6s): "قدّم باقات علامة وإعلانات بين أربعمئة وألف ومئتي دولار، وابنِ وكالتك المحلية عالية الربحية عبر SceneFlow."',
          },
          th: {
            narrationVo: 'VO (0.4s–7.6s): "ขายแพ็กเกจหนังแบรนด์และโฆษณาโซเชียลสี่ร้อยถึงพันสองร้อยดอลลาร์ สร้างเอเจนซี่กำไรสูงของคุณบน SceneFlow"',
          },
        },
      },
    ],
  },
}
