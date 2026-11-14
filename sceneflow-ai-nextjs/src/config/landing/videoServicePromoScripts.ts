/**
 * Production-ready Google Omni 1.2 Flash (Standard mode · 10.0s per block ·
 * 10–12 blocks · 1:40–2:00) Promo Demonstration Trailer Scripts for the 4
 * SceneFlow Video Business client service verticals across all 7 priority
 * landing languages (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`).
 *
 * Runtimes by vertical:
 *   - memoir:     12 × 10.0s = 120s (2:00)
 *   - realestate: 10 × 10.0s = 100s (1:40)
 *   - training:   11 × 10.0s = 110s (1:50)
 *   - brand:      11 × 10.0s = 110s (1:50)
 *
 * Prompts use SceneFlow's native Google Omni 1.2 Flash timed phase headers
 * (`0s–2s (Start frame):`, `2s–8s (Action):`, `8s–10s (End frame):`, `Camera:`,
 * plus `No spoken dialogue.` / `The only spoken line is:`) and exact Continuity
 * Library item names so `cleanOmniRefScenePrompt` and `rewriteVisualNamesToTokens`
 * preserve 100% of every shot and auto-bind `person [N]`, `location [N]`, `prop [N]`.
 */

import type {
  FeaturePanLocaleId,
  VideoServiceVerticalId,
} from './videoServicesNarratedPan'

export type PromoReferenceLock = {
  /** Multimodal Google Omni 1.2 Flash binding token (`person [1]`, `location [1]`, `prop [1]`) */
  token: string
  category: 'Cast' | 'Location' | 'Prop'
  /** Exact Continuity Library display name auto-rewritten by `rewriteVisualNamesToTokens` */
  name: string
  role: string
  promptDescription: string
}

export type PromoLocalizedCue = {
  /** Optional lip-synced on-camera character line (~0.6s–3.4s) */
  inSceneDialogue?: string
  /** Studio executive voiceover line timed cleanly within the 10.0s block */
  narrationVo: string
}

export type PromoTrailerShotBlock = {
  blockNumber: number
  title: string
  timecode: string
  durationSeconds: 10
  videoModel: 'Google Omni 1.2 Flash (10s)'
  /** Native SceneFlow Google Omni 1.2 Flash timed prompt (`0s–2s` / `2s–8s` / `8s–10s`) */
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
  durationSeconds: number
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
  blocks: readonly PromoTrailerShotBlock[]
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
  "memoir": {
    "verticalId": "memoir",
    "verticalLabel": "Video Memoirs & Family Tributes",
    "promoTitle": "The Coastline We Built",
    "formatBadge": "2:00 Client Deliverable + Business Opportunity Demo · 12 × 10s Google Omni 1.2 Flash Blocks",
    "runtimeLabel": "2:00",
    "durationSeconds": 120,
    "aspectRatio": "16:9 (with 9:16 Social Safe-Zone)",
    "logline": "A shoebox of faded 1974 Big Sur snapshots awakens into a 2-minute multi-decade cinema biography across locked Reference Likeness eras—proving how one operator turns a 100M+ family market into $300–$950 heirloom films at ~$100 total delivery cost.",
    "blueprintIntakePrompt": "Create a 2-minute (12 scenes × 10 seconds, Google Omni 1.2 Flash) promo demonstration film titled \"The Coastline We Built\" for a Family Video Memoir service powered by SceneFlow. Use independent era characters generated via Reference Likeness—Arthur 78 and Eleanor 76 in Craftsman Living Room opening Vintage Shoebox Album, Arthur 26 and Eleanor 24 laughing beside their 1974 wood-paneled station wagon at Pacific Cliffside 1974, Arthur 33 and Eleanor 31 building a crib in Harbor Nursery 1981, Arthur 41 and Eleanor 39 unlocking Neighborhood Woodshop in 1989 rain, adult daughter Claire 44 uploading vintage photos on her phone for instant Continuity approval, Arthur 51 working late in 1999, Arthur 60 dancing under 2008 wedding lanterns, overseas relatives watching in native languages, and three generations moved to joyful tears at their 50th anniversary premiere—while executive narration sells the 100M+ family global market, ~$100 SceneFlow cost, and $300–$950 high-margin studio model.",
    "artStyleLock": "Anamorphic Cinema Realism · Golden Kodak Portra Nostalgia for 1974–2008 Eras vs Warm 3000K Documentary Naturalism for Present Day · Zero Text Overlays",
    "unitEconomicsHook": "100M+ families worldwide want parents' and grandparents' life stories preserved before memories fade, yet $2,000–$5,000 documentary crews price out 90% of households → ~$100 SceneFlow total delivery cost (~$22 compute credits + <2 hrs guided direction) → $300–$950 heirloom packages (70%–85% net margin) + senior living & estate-planner referral pipelines.",
    "backgroundMusic": {
      "title": "Golden Coastline Heirloom (2:00 Three-Act Felt Piano, Cello & Orchestra Score)",
      "bpmAndKey": "84 BPM · F Major building across 3 acts to an emotional 1:20–1:50 premiere swell",
      "mixLevel": "25% volume (-12 dB) ducked cleanly under lip-sync dialogue and narration VO",
      "generationPrompt": "Instrumental cinema documentary family memoir score, 120 seconds (2:00), 84 BPM, F major. 0:00-0:40 (Act I) intimate warm felt piano and delicate fingerpicked acoustic guitar harmonics evoking 1970s coastal nostalgia and young love. 0:40-1:20 (Act II) expressive solo cello and warm chamber strings enter with gentle brushed-percussion pulse building momentum across decades of family resilience. 1:20-1:50 (Act III Climax) soaring, deeply emotional orchestral string and French horn swell full of gratitude and three-generation joy. 1:50-2:00 tender resolving felt piano and solo cello F-major chord with warm natural room decay. Instrumental only, no vocals."
    },
    "referenceLocks": [
      {
        "token": "person [1]",
        "category": "Cast",
        "name": "Arthur 78",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Base anchor portrait. Warm-hearted 78-year-old grandfather, combed silver-white hair, expressive hazel-green eyes, deep laugh lines, heather-oatmeal shawl-collar cardigan over soft chambray shirt."
      },
      {
        "token": "person [2]",
        "category": "Cast",
        "name": "Arthur 26",
        "role": "Reference Likeness from `Arthur 78`",
        "promptDescription": "Transform note: \"26-year-old 1974 version of Arthur 78 with thick tousled chestnut-brown hair, clean-shaven jawline, identical hazel-green eyes and warm smile, vintage cream cable-knit sweater under tan corduroy jacket.\""
      },
      {
        "token": "person [3]",
        "category": "Cast",
        "name": "Arthur 41",
        "role": "Reference Likeness from `Arthur 78`",
        "promptDescription": "Transform note: \"41-year-old 1989 version of Arthur 78 with chestnut hair showing subtle silver at temples, rolled-sleeve flannel work shirt under weathered canvas woodshop apron, identical hazel-green eyes.\""
      },
      {
        "token": "person [4]",
        "category": "Cast",
        "name": "Arthur 60",
        "role": "Reference Likeness from `Arthur 78`",
        "promptDescription": "Transform note: \"60-year-old 2008 version of Arthur 78 with neatly groomed salt-and-pepper hair, tailored navy linen blazer over crisp open-collar white shirt.\""
      },
      {
        "token": "person [5]",
        "category": "Cast",
        "name": "Eleanor 76",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Base anchor portrait. Graceful 76-year-old grandmother, soft silver-blonde waves, warm amber-brown eyes, terracotta cashmere wrap over ivory blouse."
      },
      {
        "token": "person [6]",
        "category": "Cast",
        "name": "Eleanor 24",
        "role": "Reference Likeness from `Eleanor 76`",
        "promptDescription": "Transform note: \"24-year-old 1974 version of Eleanor 76 with sunlit honey-blonde waves, radiant youthful complexion, identical amber-brown eyes, wearing a vintage yellow floral 1970s sundress.\""
      },
      {
        "token": "person [7]",
        "category": "Cast",
        "name": "Eleanor 39",
        "role": "Reference Likeness from `Eleanor 76`",
        "promptDescription": "Transform note: \"39-year-old 1989 version of Eleanor 76 with shoulder-length honey-blonde hair, classic trench coat over warm rust sweater, identical amber-brown eyes.\""
      },
      {
        "token": "person [8]",
        "category": "Cast",
        "name": "Claire 44",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Warm 44-year-old adult daughter inheriting Arthur’s hazel eyes and Eleanor’s cheekbones, chestnut shoulder-length hair, sage knit sweater."
      },
      {
        "token": "location [1]",
        "category": "Location",
        "name": "Craftsman Living Room",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Sunlit oak-beamed craftsman living room, cognac-and-linen sofa, glowing 2700K table lamps, framed blurred family photos, zero readable text."
      },
      {
        "token": "location [2]",
        "category": "Location",
        "name": "Pacific Cliffside 1974",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Sun-drenched 1970s Big Sur coastal pullout above crashing golden-hour Pacific surf, wild bluff grasses, parked 1974 wood-paneled station wagon."
      },
      {
        "token": "location [3]",
        "category": "Location",
        "name": "Neighborhood Woodshop",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Cozy brick-and-timber artisan woodshop with warm 2700K tungsten pendants, hand planes, oak workbenches, and rain-slicked front glass doorway, zero signage text."
      },
      {
        "token": "prop [1]",
        "category": "Prop",
        "name": "Vintage Shoebox Album",
        "role": "Hero Continuity Prop Lock",
        "promptDescription": "Worn linen photo shoebox beside an open hand-stitched chestnut leather album holding faded square 1970s coastal snapshots, zero text."
      }
    ],
    "blocks": [
      {
        "blockNumber": 1,
        "title": "The Shoebox of Unfilmed Memories",
        "timecode": "0:00–0:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Craftsman Living Room bathed in golden late-afternoon window shafts, Arthur 78 sits beside Eleanor 76 on the linen sofa holding Vintage Shoebox Album open on his lap. 2s–8s (Action): Arthur 78 looks warmly toward the camera and speaks with tender nostalgia while Eleanor 76 rests her hand affectionately over his, then the view glides smoothly toward the faded 1974 coastal snapshot in his weathered fingers. 8s–10s (End frame): Close insert on Arthur 78’s hands cradling the sunlit snapshot as golden dust motes drift gently. Camera: Smooth slow forward dolly push-in from medium two-shot to close over-shoulder insert. The only spoken line is: Arthur 78 says: \"All we owned in seventy-four was that old station wagon.\"",
        "cameraAndLighting": "Smooth slow forward dolly push-in from medium two-shot to close over-shoulder insert. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Close insert on Arthur 78’s hands cradling the sunlit snapshot as golden dust motes drift gently.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "Arthur 78 Lip-Sync (0.6s–3.4s): \"All we owned in seventy-four was that old station wagon.\"",
            "narrationVo": "VO (4.0s–9.4s): \"Over a hundred million families want parents’ life stories preserved before memories fade.\""
          },
          "es": {
            "inSceneDialogue": "Arthur 78 Lip-Sync (0.6s–3.4s): \"En el setenta y cuatro solo teníamos esa vieja camioneta.\"",
            "narrationVo": "VO (4.0s–9.4s): \"Más de cien millones de familias desean preservar la historia de sus padres antes de que se apague.\""
          },
          "pt": {
            "inSceneDialogue": "Arthur 78 Lip-Sync (0.6s–3.4s): \"Em setenta e quatro, tudo o que tínhamos era aquela perua.\"",
            "narrationVo": "VO (4.0s–9.4s): \"Mais de cem milhões de famílias querem eternizar a história dos pais antes que as memórias se percam.\""
          },
          "hi": {
            "inSceneDialogue": "Arthur 78 Lip-Sync (0.6s–3.4s): \"चौहत्तर में हमारे पास बस वही पुरानी गाड़ी और सपने थे।\"",
            "narrationVo": "VO (4.0s–9.4s): \"दस करोड़ से अधिक परिवार यादें धुँधली होने से पहले माता-पिता की जीवन गाथा सहेजना चाहते हैं।\""
          },
          "zh": {
            "inSceneDialogue": "Arthur 78 Lip-Sync (0.6s–3.4s): \"七四年那会儿，我们全部家当只有那辆旧旅行车。\"",
            "narrationVo": "VO (4.0s–9.4s): \"全球超过一亿个家庭渴望在记忆褪色前，把父母的人生故事珍藏下来。\""
          },
          "ar": {
            "inSceneDialogue": "Arthur 78 Lip-Sync (0.6s–3.4s): \"في عام أربعة وسبعين، لم نملك سوى تلك العربة القديمة.\"",
            "narrationVo": "VO (4.0s–9.4s): \"أكثر من مئة مليون عائلة حول العالم تتمنى توثيق قصص الآباء قبل أن تطويها الأيام.\""
          },
          "th": {
            "inSceneDialogue": "Arthur 78 Lip-Sync (0.6s–3.4s): \"เมื่อปีเจ็ดสี่ สมบัติชิ้นเดียวที่เรามีคือรถแวกอนคันเก่าคันนั้น\"",
            "narrationVo": "VO (4.0s–9.4s): \"กว่าหนึ่งร้อยล้านครอบครัวทั่วโลกอยากเก็บเรื่องราวชีวิตของคุณพ่อคุณแม่ไว้ก่อนความทรงจำจะเลือนหาย\""
          }
        }
      },
      {
        "blockNumber": 2,
        "title": "1974 Big Sur Cliffside Awakening",
        "timecode": "0:10–0:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): At Pacific Cliffside 1974 in warm golden sunset light, Arthur 26 and Eleanor 24 lean side by side against the wood-paneled 1974 station wagon above sparkling ocean surf. 2s–8s (Action): Coastal breeze lifts Eleanor 24’s yellow floral sundress as Arthur 26 wraps an arm around her waist, spins her playfully along the bluff, and both laugh with carefree joy. 8s–10s (End frame): Warm medium close-up of Arthur 26 and Eleanor 24 resting forehead-to-forehead smiling toward the glowing Pacific horizon. Camera: Fluid clockwise gimbal arc catching warm golden sunset backlight. No spoken dialogue.",
        "cameraAndLighting": "Fluid clockwise gimbal arc catching warm golden sunset backlight. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Warm medium close-up of Arthur 26 and Eleanor 24 resting forehead-to-forehead smiling toward the glowing Pacific horizon.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Yet traditional documentary crews charge two to five thousand dollars—pricing out ninety percent of households and leaving shoeboxes of photos silent.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Pero los equipos documentales cobran de dos mil a cinco mil dólares, dejando fuera al noventa por ciento de los hogares.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Mas produtoras tradicionais cobram de dois a cinco mil dólares, excluindo noventa por cento das famílias.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"पर पारंपरिक डॉक्यूमेंट्री क्रू दो से पाँच हज़ार डॉलर माँगते हैं—जिससे नब्बे प्रतिशत परिवार वंचित रह जाते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"但传统纪录片团队动辄收费两千至五千美元，将百分之九十的普通家庭拒之门外。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"لكن فرق التصوير الوثائقي تطلب بين ألفين وخمسة آلاف دولار، ما يستبعد تسعين بالمئة من الأسر.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"แต่กองถ่ายสารคดีทั่วไปคิดราคาสองพันถึงห้าพันดอลลาร์ ทำให้เก้าสิบเปอร์เซ็นต์ของครอบครัวเอื้อมไม่ถึง\""
          }
        }
      },
      {
        "blockNumber": 3,
        "title": "1981 First Nursery & Handcrafted Crib",
        "timecode": "0:20–0:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside a cozy 1981 upstairs nursery lit by a warm tungsten floor lamp against blue evening window light, Arthur 26 in paint-flecked denim kneels tightening the final oak spindle of a handcrafted baby crib. 2s–8s (Action): Eleanor 24 in a loose knit maternity cardigan steps gently behind him, draping a woven blanket over the crib rail as Arthur 26 rises and kisses her hand. 8s–10s (End frame): Quiet, hopeful profile two-shot of the young couple admiring the finished crib together. Camera: Gentle rising Steadicam boom from low floor level to eye-level two-shot. No spoken dialogue.",
        "cameraAndLighting": "Gentle rising Steadicam boom from low floor level to eye-level two-shot. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Quiet, hopeful profile two-shot of the young couple admiring the finished crib together.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow transforms faded snapshots and recorded memories into theatrical multi-decade cinema—bringing every era back to life.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow transforma fotos antiguas y relatos grabados en cine emotivo a través de las décadas, devolviendo vida a cada etapa.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"O SceneFlow transforma fotos antigas e relatos de voz em cinema emocionante através das décadas, revivendo cada capítulo.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow पुरानी तस्वीरों और सुनाई गई यादों को दशकों के जीवंत सिनेमा में बदलकर हर दौर को फिर जीवित कर देता है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow 将泛黄老照片与口述往事化作跨越数十年的电影传记，让青春岁月重现银幕。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يحوّل SceneFlow الصور القديمة والذكريات المروية إلى سينما مؤثرة عبر العقود تعيد الحياة لكل مرحلة.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow เปลี่ยนภาพถ่ายเก่าและเสียงเล่าความหลังให้เป็นภาพยนตร์ชีวประวัติข้ามทศวรรษที่กลับมามีชีวิตอีกครั้ง\""
          }
        }
      },
      {
        "blockNumber": 4,
        "title": "1989 Rainy Night Woodshop Grand Opening",
        "timecode": "0:30–0:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Outside Neighborhood Woodshop on a rain-slicked 1989 evening sidewalk, Arthur 41 turns a brass key in the timber front door while Eleanor 39 shelters their smiling eight-year-old daughter beneath a clear umbrella. 2s–8s (Action): Arthur 41 reaches inside and flips the wall switch, igniting warm amber pendant lamps sequentially across oak workbenches and casting golden reflections across wet pavement and all three faces. 8s–10s (End frame): Arthur 41 embraces Eleanor 39 and their daughter proudly in the glowing shop doorway. Camera: Smooth forward Steadicam push-in through gentle evening rain. No spoken dialogue.",
        "cameraAndLighting": "Smooth forward Steadicam push-in through gentle evening rain. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Arthur 41 embraces Eleanor 39 and their daughter proudly in the glowing shop doorway.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Using Reference Likeness in Continuity Vault, you lock exact eyes, facial structure, and period wardrobes seamlessly from youth to today.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Con Semejanza de Referencia en Continuidad, fijas los mismos ojos, rasgos y vestuarios de época desde la juventud hasta hoy.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Com Semelhança de Referência na Continuidade, você mantém os mesmos olhos, traços e figurinos da juventude até hoje.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"Continuity Vault के Reference Likeness से युवावस्था से आज तक वही आँखें, चेहरे की बनावट और पहनावा सटीक रहते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"借助连续性资产库的参考神似度生成，从青年到白发，精准锁定同一双眼睛、骨相与年代服饰。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"وبميزة تشابه المرجع في خزنة الاتساق، تثبّت العينين والملامح وأزياء الحقبة بدقة من الشباب حتى اليوم.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ด้วยฟีเจอร์ Reference Likeness ในคลังความต่อเนื่อง ช่วยล็อกดวงตา โครงหน้า และชุดย้อนยุคตั้งแต่วัยหนุ่มสาวจนถึงปัจจุบัน\""
          }
        }
      },
      {
        "blockNumber": 5,
        "title": "Effortless Mobile Photo Upload & Likeness Approval",
        "timecode": "0:40–0:50",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): At a sunlit morning kitchen counter inside Craftsman Living Room, Claire 44 stands beside Vintage Shoebox Album holding her smartphone above faded 1970s family photographs. 2s–8s (Action): Claire 44 snaps a crisp phone capture of a coastal snapshot, swipes on her clean visual screen to reveal the matching youthful portrait of Arthur 26 with zero text on the display, and taps once with a delighted smile. 8s–10s (End frame): Medium close-up on Claire 44 beaming with relief and excitement. Camera: Smooth over-the-shoulder tilt and arc around Claire 44. No spoken dialogue.",
        "cameraAndLighting": "Smooth over-the-shoulder tilt and arc around Claire 44. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Medium close-up on Claire 44 beaming with relief and excitement.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Families simply upload vintage photos from their phone and approve each character portrait online—without a camera crew ever visiting.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"La familia sube fotos desde su móvil y aprueba cada retrato en línea, sin que ningún equipo de grabación entre a su casa.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"A família envia fotos pelo celular e aprova cada retrato online, sem precisar receber equipe de filmagem em casa.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"परिवार फ़ोन से पुरानी फ़ोटो अपलोड कर ऑनलाइन ही किरदार मंज़ूर करते हैं—बिना किसी कैमरा क्रू को घर बुलाए।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"客户只需用手机上传老照片并在线确认角色造型，全程无需剧组上门打扰。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يرفع الأبناء الصور من هواتفهم ويعتمدون الشخصيات عبر الرابط، دون دخول أي طاقم تصوير إلى المنزل.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ลูกค้าเพียงอัปโหลดรูปเก่าจากมือถือและกดอนุมัติตัวละครออนไลน์ โดยไม่ต้องเปิดบ้านรับกองถ่าย\""
          }
        }
      },
      {
        "blockNumber": 6,
        "title": "1999 Late-Night Craft & Resilience (~$100 Cost)",
        "timecode": "0:50–1:00",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Neighborhood Woodshop late at night under a warm gooseneck workbench lamp, Arthur 41 draws a hand plane smoothly along a curved oak table leg as fine cedar shavings curl. 2s–8s (Action): Eleanor 39 enters carrying two steaming ceramic mugs, sets one on the timber bench, and traces the smooth wood grain beside Arthur 41 as they exchange a resilient, loving glance. 8s–10s (End frame): Warm intimate two-shot of Arthur 41 and Eleanor 39 leaning together beside the workbench. Camera: Slow left-to-right lateral dolly track past foreground wood curls. No spoken dialogue.",
        "cameraAndLighting": "Slow left-to-right lateral dolly track past foreground wood curls. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Warm intimate two-shot of Arthur 41 and Eleanor 39 leaning together beside the workbench.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Your fully loaded SceneFlow cost is roughly one hundred dollars—just twenty-two dollars in compute credits and under two hours of guided direction.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Tu costo total en SceneFlow ronda los cien dólares: apenas veintidós dólares en créditos y menos de dos horas de dirección guiada.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Seu custo total no SceneFlow fica em cerca de cem dólares: apenas vinte e dois em créditos e menos de duas horas de direção.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"आपकी कुल SceneFlow लागत लगभग सौ डॉलर आती है—केवल बाईस डॉलर क्रेडिट और दो घंटे से कम का निर्देशित समय।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"您的 SceneFlow 综合交付成本仅约一百美元：只需二十二美元算力积分与不到两小时统筹。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"تكلفة التسليم الكاملة عبر SceneFlow تقارب مئة دولار فقط: اثنان وعشرون دولاراً للرصيد وأقل من ساعتين.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ต้นทุนส่งมอบรวมบน SceneFlow อยู่ราวหนึ่งร้อยดอลลาร์ เป็นค่าเครดิตยี่สิบสองดอลลาร์และเวลาดูแลไม่ถึงสองชั่วโมง\""
          }
        }
      },
      {
        "blockNumber": 7,
        "title": "2008 Backyard Wedding Lantern Dance",
        "timecode": "1:00–1:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): In a twilight family garden strung overhead with warm golden bistro lights, Arthur 60 in his navy blazer raises a champagne glass beside Eleanor 76. 2s–8s (Action): Their radiant bride daughter in an ivory silk gown steps into the circle and embraces Arthur 60 in a joyful father-daughter dance while family guests applaud softly in warm candlelight. 8s–10s (End frame): Elevated medium-wide tableau of the glowing garden celebration under twilight trees. Camera: Graceful jib crane rise through warm string-light glow. No spoken dialogue.",
        "cameraAndLighting": "Graceful jib crane rise through warm string-light glow. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Elevated medium-wide tableau of the glowing garden celebration under twilight trees.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"FlowDirector checks visual continuity and emotional pacing automatically, regenerating any single beat in one click while you manage multiple families.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"FlowDirector supervisa la continuidad y el ritmo emocional automáticamente, corrigiendo cualquier toma con un clic.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"O FlowDirector valida continuidade e emoção automaticamente, recriando qualquer tomada com um clique.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"FlowDirector निरंतरता और भावनात्मक लय स्वतः परखता है और एक क्लिक में किसी भी दृश्य को सुधार देता है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"FlowDirector 自动把控画面连续性与情感节奏，单击即可重制任意镜头，助您轻松并行服务多组家庭。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يراجع FlowDirector الاتساق والإيقاع العاطفي تلقائياً، ويعيد توليد أي لقطة بنقرة واحدة.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"FlowDirector ช่วยตรวจความต่อเนื่องและอารมณ์หนังอัตโนมัติ แก้ไขเฉพาะช็อตได้ในคลิกเดียว\""
          }
        }
      },
      {
        "blockNumber": 8,
        "title": "70+ Language Family Sharing Across Continents",
        "timecode": "1:10–1:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): On a warm evening apartment balcony overlooking a Mediterranean tiled skyline, an elderly brother and two adult cousins gather around a tablet propped beside espresso cups showing Arthur 26 and Eleanor 24 at Pacific Cliffside 1974 with zero text on screen. 2s–8s (Action): Listening to the story on the tablet, the elderly uncle wipes a proud tear and points joyfully at Arthur 26 on the display while his cousins smile in recognition. 8s–10s (End frame): Warm family toast raising espresso cups toward the glowing tablet frame. Camera: Smooth lateral Steadicam glide across the balcony table. No spoken dialogue.",
        "cameraAndLighting": "Smooth lateral Steadicam glide across the balcony table. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Warm family toast raising espresso cups toward the glowing tablet frame.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Deliver every heirloom biography in over seventy native languages—connecting grandparents, children, and relatives across every continent.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Entrega cada biografía en más de setenta idiomas nativos para unir a abuelos, hijos y familiares en cualquier continente.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Entregue cada biografia em mais de setenta idiomas nativos, conectando avós, filhos e parentes em qualquer país.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"सत्तर से अधिक भाषाओं में हर बायोग्राफ़ी दें—ताकि देश-विदेश में बसे दादा-दादी, बच्चे और रिश्तेदार एक साथ जुड़ सकें।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"支持七十多种母语配音交付，让散居海内外的祖辈、儿女与亲友同屏共鸣。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"سلّم كل سيرة عائلية بأكثر من سبعين لغة أصلية لتجمع الأجداد والأحفاد والأقارب عبر القارات.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ส่งมอบหนังชีวประวัติได้กว่าเจ็ดสิบภาษา เชื่อมใจคุณปู่คุณย่า ลูกหลาน และญาติพี่น้องทั่วทุกทวีป\""
          }
        }
      },
      {
        "blockNumber": 9,
        "title": "50th Anniversary Living-Room Premiere",
        "timecode": "1:20–1:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Craftsman Living Room at dusk, warm golden cinema light from an off-screen television flickers across Eleanor 76, Arthur 78, and Claire 44 seated closely together on the sofa. 2s–8s (Action): With glistening eyes, Eleanor 76 touches her heart and speaks softly toward the screen while Arthur 78 squeezes her hand and Claire 44 rests her chin lovingly on her mother’s shoulder. 8s–10s (End frame): Intimate three-person portrait glowing with happy tears and family gratitude. Camera: Slow intimate eye-level dolly push-in. The only spoken line is: Eleanor 76 says: \"Look—that is the exact yellow sundress I wore.\"",
        "cameraAndLighting": "Slow intimate eye-level dolly push-in. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Intimate three-person portrait glowing with happy tears and family gratitude.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "Eleanor 76 Lip-Sync (0.6s–3.3s): \"Look—that is the exact yellow sundress I wore.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Every fiftieth anniversary, retirement, and milestone birthday becomes a deeply moving premiere.\""
          },
          "es": {
            "inSceneDialogue": "Eleanor 76 Lip-Sync (0.6s–3.3s): \"Mira, es exactamente el vestido amarillo que llevé.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Cada bodas de oro, jubilación o cumpleaños especial se convierte en un estreno inolvidable.\""
          },
          "pt": {
            "inSceneDialogue": "Eleanor 76 Lip-Sync (0.6s–3.3s): \"Olha só, é exatamente o vestido amarelo que usei.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Cada boda de ouro, aposentadoria e aniversário marcante vira uma estreia emocionante.\""
          },
          "hi": {
            "inSceneDialogue": "Eleanor 76 Lip-Sync (0.6s–3.3s): \"देखो, यह बिल्कुल वही पीली पोशाक है जो मैंने पहनी थी।\"",
            "narrationVo": "VO (3.9s–9.4s): \"हर पचासवीं सालगिरह, रिटायरमेंट और विशेष जन्मदिन एक भावुक पारिवारिक प्रीमियर बन जाता है।\""
          },
          "zh": {
            "inSceneDialogue": "Eleanor 76 Lip-Sync (0.6s–3.3s): \"快看，那正是我当年穿的那条黄裙子。\"",
            "narrationVo": "VO (3.9s–9.4s): \"让每一场金婚庆典、荣休仪式与寿辰聚会，都升华为热泪盈眶的家族首映礼。\""
          },
          "ar": {
            "inSceneDialogue": "Eleanor 76 Lip-Sync (0.6s–3.3s): \"انظروا، هذا هو الفستان الأصفر نفسه الذي ارتديته.\"",
            "narrationVo": "VO (3.9s–9.4s): \"كل يوبيل ذهبي أو تقاعد أو ميلاد مميز يتحول إلى عرض عائلي يفيض بدموع الفرح.\""
          },
          "th": {
            "inSceneDialogue": "Eleanor 76 Lip-Sync (0.6s–3.3s): \"ดูสิ นั่นชุดเดรสสีเหลืองตัวเดียวกับที่แม่ใส่เลย\"",
            "narrationVo": "VO (3.9s–9.4s): \"เปลี่ยนทุกงานครบรอบแต่งงาน งานเกษียณ และวันเกิดสำคัญ ให้เป็นรอบปฐมทัศน์แห่งน้ำตาความสุข\""
          }
        }
      },
      {
        "blockNumber": 10,
        "title": "Grandchildren Bonding & Vertical 9:16 Keepsake",
        "timecode": "1:30–1:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Craftsman Living Room, a nine-year-old granddaughter sits beside Arthur 78 and Eleanor 76 on the warm lamp-lit sofa. 2s–8s (Action): The granddaughter wraps both arms tightly around Arthur 78’s neck as he laughs through happy tears, while a teenage grandson beside Claire 44 holds his phone vertically showing a clean nine-by-sixteen visual clip of Pacific Cliffside 1974 with zero text. 8s–10s (End frame): Joyful multi-generation embrace across the sofa. Camera: Gentle arc from close embrace to medium family group framing. No spoken dialogue.",
        "cameraAndLighting": "Gentle arc from close embrace to medium family group framing. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Joyful multi-generation embrace across the sofa.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Each production exports both a widescreen living-room feature and vertical nine-by-sixteen keepsake reels families share instantly.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Cada proyecto exporta la película horizontal para el hogar y recuerdos verticales nueve dieciséis listos para compartir.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Cada produção gera o filme horizontal para a sala e cortes verticais nove por dezesseis que a família compartilha na hora.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"हर फ़िल्म के साथ टीवी के लिए वाइडस्क्रीन संस्करण और तुरंत साझा करने योग्य वर्टिकल रील्स तैयार मिलते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"一次制作同步输出客厅横屏正片与九比十六竖屏精华短片，方便家人随时转发珍藏。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يصدّر كل مشروع فيلماً أفقياً لشاشة المنزل ومقاطع عمودية جاهزة للمشاركة الفورية بين أفراد العائلة.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"หนึ่งโปรเจกต์ได้ครบทั้งหนังแนวนอนฉายขึ้นจอในบ้าน และคลิปแนวตั้งเก้าต่อสิบหกไว้แชร์ในครอบครัวทันที\""
          }
        }
      },
      {
        "blockNumber": 11,
        "title": "Senior Living & Milestone Event Referral Flywheel",
        "timecode": "1:40–1:50",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside an elegant sunlit conservatory anniversary reception, a large framed display plays the golden coastal scene of Arthur 26 and Eleanor 24 at Pacific Cliffside 1974 with zero screen text. 2s–8s (Action): Two distinguished older couples in evening attire watch captivated, then turn eagerly toward Claire 44 and a poised creative producer holding Vintage Shoebox Album to inquire about commissioning their own family film. 8s–10s (End frame): Warm handshake and delighted smiles between the guests and producer. Camera: Smooth Steadicam glide past floral centerpieces into medium group shot. No spoken dialogue.",
        "cameraAndLighting": "Smooth Steadicam glide past floral centerpieces into medium group shot. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Warm handshake and delighted smiles between the guests and producer.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"One emotional family screening sparks immediate referrals through estate planners, senior living communities, and milestone event hosts.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Una sola proyección familiar genera recomendaciones inmediatas en residencias sénior, eventos y asesores patrimoniales.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Uma única sessão em família gera indicações contínuas em residenciais sênior, cerimonialistas e planejadores.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"एक भावुक पारिवारिक स्क्रीनिंग ही सीनियर कम्युनिटी, इवेंट प्लानर्स और एस्टेट सलाहकारों से नए ऑर्डर दिलाती है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"一场感人放映即可带动康养社区、家族财富顾问与庆典策划方的源源转介绍。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"عرض عائلي واحد يفتح لك إحالات مستمرة مع مجتمعات كبار السن ومنظمي المناسبات ومستشاري التركات.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"การฉายเพียงครั้งเดียวต่อยอดสู่การบอกต่อ ทั้งโครงการที่พักอาศัยผู้สูงอายุ นักจัดงาน และที่ปรึกษามรดก\""
          }
        }
      },
      {
        "blockNumber": 12,
        "title": "Timeless Heirloom Portrait & Business Close",
        "timecode": "1:50–2:00",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Craftsman Living Room, Arthur 78 and Eleanor 76 sit centered on the sofa with Vintage Shoebox Album open before them, surrounded by Claire 44, her husband, and two grandchildren. 2s–8s (Action): Arthur 78 turns a page of the album as everyone leans in smiling affectionately under warm table lamps while the frame pulls steadily back through the oak living-room archway. 8s–10s (End frame): Poised, timeless three-generation family portrait framed symmetrically by warm oak beams. Camera: Slow symmetrical dolly pull-back through foreground archway. No spoken dialogue.",
        "cameraAndLighting": "Slow symmetrical dolly pull-back through foreground archway. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Poised, timeless three-generation family portrait framed symmetrically by warm oak beams.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Charge three hundred to nine hundred fifty dollars, keep up to eighty percent net profit, and launch your Video Memoir studio on SceneFlow.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Cobra entre trescientos y novecientos cincuenta dólares, gana hasta ochenta por ciento neto y lanza tu estudio con SceneFlow.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Cobre de trezentos a novecentos e cinquenta dólares, lucre até oitenta por cento líquido e lance seu estúdio no SceneFlow.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"तीन सौ से नौ सौ पचास डॉलर चार्ज करें, अस्सी प्रतिशत तक शुद्ध लाभ कमाएँ, और SceneFlow पर अपना स्टूडियो शुरू करें।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"每部报价三百至九百五十美元，净利率高达百分之八十，立即用 SceneFlow 开启家族传记工作室。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"سعّر الفيلم بين ثلاثمئة وتسعمئة وخمسين دولاراً، وحقق صافي ربح يصل لثمانين بالمئة عبر SceneFlow.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ตั้งราคาสามร้อยถึงเก้าร้อยห้าสิบดอลลาร์ ทำกำไรสุทธิถึงแปดสิบเปอร์เซ็นต์ เปิดสตูดิโอของคุณได้ทันทีบน SceneFlow\""
          }
        }
      }
    ]
  },
  "realestate": {
    "verticalId": "realestate",
    "verticalLabel": "Real Estate & Boutique Hospitality Tours",
    "promoTitle": "Villa Maris — Sold Across Borders",
    "formatBadge": "1:40 Luxury Walkthrough + Brokerage Business Demo · 10 × 10s Google Omni 1.2 Flash Blocks",
    "runtimeLabel": "1:40",
    "durationSeconds": 100,
    "aspectRatio": "16:9 (with 9:16 Social Safe-Zone)",
    "logline": "Smartphone property photos ignite into a 100-second architectural coastal villa & spa-suite tour with on-camera host presentation and instant 70+ language buyer closing—replacing $1,500 shoots with ~$60 SceneFlow tours on monthly retainers.",
    "blueprintIntakePrompt": "Create a 100-second (10 scenes × 10 seconds, Google Omni 1.2 Flash) architectural cinema promo demonstration titled \"Villa Maris — Sold Across Borders\" for a Real Estate & Boutique Hospitality Video Tour service powered by SceneFlow. Showcase Villa Maris Infinity Terrace igniting at blue hour above the ocean, a seamless foyer-to-Calacatta-kitchen glide inside Villa Maris Ocean Pavilion, luxury advisor Sofia Laurent welcoming buyers onto the sunlit Mediterranean terrace, steam rising inside Oceanfront Spa Suite, Sofia snapping mobile reference photos for ~$60 zero-travel tour creation, Twilight Wine Lounge staging, vertical 9:16 social buyer discovery, international buyers David Chen and Mei Chen approving an offer in their native language on Architectural Listing Tablet, and a brokerage signing monthly retainers.",
    "artStyleLock": "Architectural Cinema Realism · Razor-Straight Verticals · 2700K Warm Designer Interior Glow vs Deep Sapphire Blue-Hour Ocean Horizon · Zero Signage Text",
    "unitEconomicsHook": "Tens of millions of residential listings, luxury villas, and boutique hotels compete monthly worldwide, yet flat photos dominate because $1,500+ on-site video shoots require travel and clear skies → ~$60 SceneFlow cost (~$12 compute credits + ~1 hr) → $199–$549 per listing + recurring monthly brokerage & hotel retainers (75%+ net margin).",
    "backgroundMusic": {
      "title": "Blue Hour Horizon (1:40 Luxury Architectural Rhodes & Chamber Strings Score)",
      "bpmAndKey": "100 BPM · A Minor lifting into luminous F Major",
      "mixLevel": "25% volume (-12 dB) ducked cleanly under lip-sync dialogue and narration VO",
      "generationPrompt": "Instrumental luxury real estate and boutique hospitality cinema showcase score, 100 seconds (1:40), 100 BPM, A minor lifting into luminous F major. 0:00-0:40 (Act I) deep velvet sub-bass pulse, silky Rhodes electric piano chords, and crisp brushed percussion evoking million-dollar coastal twilight. 0:40-1:10 (Act II) fluid modern chamber strings and crystalline harp harmonics gliding effortlessly with architectural camera motion. 1:10-1:40 (Act III) confident, uplifting harmonic swell resolving on a shimmering acoustic piano and string chord. Instrumental only, no vocals."
    },
    "referenceLocks": [
      {
        "token": "location [1]",
        "category": "Location",
        "name": "Villa Maris Infinity Terrace",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Contemporary hillside coastal villa at blue hour, frameless glass walls glowing 2700K amber, travertine infinity-edge pool mirroring sapphire ocean horizon, recessed linear fire pit."
      },
      {
        "token": "location [2]",
        "category": "Location",
        "name": "Villa Maris Ocean Pavilion",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Sun-drenched open-concept coastal living pavilion, floating travertine stair, veined Calacatta marble waterfall island, white-oak ceiling beams, wide-open motorized glass doors to ocean terrace."
      },
      {
        "token": "location [3]",
        "category": "Location",
        "name": "Oceanfront Spa Suite",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Boutique resort-grade primary bath & bedroom carved from warm honed limestone, freestanding soaking tub with gentle rising steam overlooking sunset ocean surf."
      },
      {
        "token": "location [4]",
        "category": "Location",
        "name": "Twilight Wine Lounge",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Backlit oak-and-glass wine gallery opening onto candlelit coastal lounge seating at dusk, zero bottle label text."
      },
      {
        "token": "person [1]",
        "category": "Cast",
        "name": "Sofia Laurent",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Poised 36-year-old international luxury property advisor, sleek dark chestnut blowout hair, warm confident smile, tailored ivory linen blazer, minimalist gold earrings."
      },
      {
        "token": "person [2]",
        "category": "Cast",
        "name": "David Chen",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Sophisticated 42-year-old international investor in charcoal cashmere knit blazer inside a high-rise penthouse lounge overlooking nighttime skyline lights."
      },
      {
        "token": "person [3]",
        "category": "Cast",
        "name": "Mei Chen",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Elegant 40-year-old international investor in cream silk knitwear seated beside David Chen."
      },
      {
        "token": "prop [1]",
        "category": "Prop",
        "name": "Architectural Listing Tablet",
        "role": "Hero Continuity Prop Lock",
        "promptDescription": "Sleek bezel-free slate presentation tablet displaying clean architectural villa imagery with zero readable text."
      }
    ],
    "blocks": [
      {
        "blockNumber": 1,
        "title": "Blue-Hour Villa Awakening",
        "timecode": "0:00–0:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Wide architectural view of Villa Maris Infinity Terrace poised above a tranquil sapphire ocean at blue hour with razor-straight vertical lines. 2s–8s (Action): Warm interior chandeliers, pool cove lights, and linear travertine fire-pit flames ignite sequentially, sending golden reflections shimmering across the glassy infinity edge as the view glides smoothly over the water. 8s–10s (End frame): Balanced twilight composition of the glowing glass living pavilion mirrored in the infinity pool. Camera: Ultra-smooth low aerial gimbal push-in across the water. No spoken dialogue.",
        "cameraAndLighting": "Ultra-smooth low aerial gimbal push-in across the water. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Balanced twilight composition of the glowing glass living pavilion mirrored in the infinity pool.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Tens of millions of home listings, vacation villas, and boutique hotels compete for buyers every month—yet most still rely on static photos.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Decenas de millones de propiedades, villas vacacionales y hoteles boutique compiten cada mes, pero la mayoría sigue usando solo fotos fijas.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Dezenas de milhões de imóveis, casas de temporada e hotéis boutique disputam atenção todo mês, mas a maioria ainda usa só fotos.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"हर महीने करोड़ों प्रॉपर्टी लिस्टिंग, लक्ज़री विला और बुटीक होटल खरीदारों के लिए होड़ करते हैं, पर अधिकतर केवल स्थिर फ़ोटो दिखाते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"全球每月有数千万套住宅房源、度假别墅与精品酒店激烈抢客，但绝大多数仍只能展示静态照片。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"تتنافس عشرات الملايين من العقارات والفيلات والفنادق البوتيكية كل شهر عالمياً، لكن معظمها يكتفي بالصور الثابتة.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"บ้านประกาศขาย วิลล่าตากอากาศ และโรงแรมบูทีคหลายสิบล้านแห่งแข่งขันหาผู้ซื้อทุกเดือน แต่ส่วนใหญ่ยังมีแค่ภาพนิ่ง\""
          }
        }
      },
      {
        "blockNumber": 2,
        "title": "Grand Foyer to Calacatta Chef’s Kitchen Glide",
        "timecode": "0:10–0:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Villa Maris Ocean Pavilion bathed in crisp golden morning sunlight beside the floating travertine staircase. 2s–8s (Action): Waist-height view glides smoothly along the veined Calacatta marble waterfall island beneath white-oak ceiling beams while sheer linen curtains sway gently beside wide-open glass doors. 8s–10s (End frame): Sun-drenched Mediterranean stone terrace opening onto panoramic turquoise coastline. Camera: Effortless forward Steadicam glide from interior kitchen out toward the ocean terrace. No spoken dialogue.",
        "cameraAndLighting": "Effortless forward Steadicam glide from interior kitchen out toward the ocean terrace. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Sun-drenched Mediterranean stone terrace opening onto panoramic turquoise coastline.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Traditional property videographers charge fifteen hundred dollars, require perfect weather, and take weeks—leaving ninety percent of listings unfilmed.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Un rodaje tradicional cuesta mil quinientos dólares, depende del buen clima y tarda semanas, dejando sin video al noventa por ciento.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Gravações presenciais custam mil e quinhentos dólares, dependem de sol e levam semanas, deixando noventa por cento dos anúncios sem vídeo.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"पारंपरिक प्रॉपर्टी शूट पंद्रह सौ डॉलर लेते हैं, साफ़ मौसम माँगते हैं और हफ़्तों लगाते हैं—जिससे नब्बे प्रतिशत प्रॉपर्टी बिना वीडियो रह जाती हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"传统外景实拍收费高达一千五百美元，既要等晴天又要排期数周，导致九成房源根本拍不起视频。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"التصوير الميداني التقليدي يكلف ألفاً وخمسمئة دولار ويتطلب طقساً مثالياً وأسابيع انتظار، فيحرم تسعين بالمئة من العقارات.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"การจ้างทีมถ่ายทำคิดราคาถึงพันห้าร้อยดอลลาร์ ต้องรอลมฟ้าอากาศและคิวงานหลายสัปดาห์ ทำให้ทรัพย์ส่วนใหญ่ไม่มีวิดีโอ\""
          }
        }
      },
      {
        "blockNumber": 3,
        "title": "On-Camera Luxury Host Welcome",
        "timecode": "0:20–0:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Out on the sunlit terrace of Villa Maris Ocean Pavilion, Sofia Laurent in her ivory linen blazer walks two graceful steps along the frameless glass balustrade above sparkling blue surf. 2s–8s (Action): Sofia Laurent turns warmly toward the camera with poised eye contact, speaks clearly, and gestures smoothly toward the panoramic coastal lounge. 8s–10s (End frame): Confident medium close-up of Sofia Laurent smiling warmly against the sunlit ocean horizon. Camera: Smooth gimbal wrap-around into gentle push-in. The only spoken line is: Sofia Laurent says: \"Every suite opens directly onto uninterrupted ocean horizon.\"",
        "cameraAndLighting": "Smooth gimbal wrap-around into gentle push-in. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Confident medium close-up of Sofia Laurent smiling warmly against the sunlit ocean horizon.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "Sofia Laurent Lip-Sync (0.6s–3.3s): \"Every suite opens directly onto uninterrupted ocean horizon.\"",
            "narrationVo": "VO (3.9s–9.4s): \"SceneFlow turns ordinary listing photos into scored four-K architectural tours with poised on-camera hosts.\""
          },
          "es": {
            "inSceneDialogue": "Sofia Laurent Lip-Sync (0.6s–3.3s): \"Cada suite se abre directo al horizonte infinito del mar.\"",
            "narrationVo": "VO (3.9s–9.4s): \"SceneFlow convierte fotos del anuncio en tours cuatro K con música y presentadores elegantes en cámara.\""
          },
          "pt": {
            "inSceneDialogue": "Sofia Laurent Lip-Sync (0.6s–3.3s): \"Cada suíte se abre direto para o horizonte infinito do mar.\"",
            "narrationVo": "VO (3.9s–9.4s): \"O SceneFlow transforma fotos do anúncio em tours quatro K com trilha e apresentadores elegantes em cena.\""
          },
          "hi": {
            "inSceneDialogue": "Sofia Laurent Lip-Sync (0.6s–3.3s): \"यहाँ हर सुइट सीधे खुले समंदर के अनंत नज़ारे में खुलता है।\"",
            "narrationVo": "VO (3.9s–9.4s): \"SceneFlow साधारण लिस्टिंग फ़ोटो को संगीत और ऑन-कैमरा होस्ट वाले फ़ोर-के लक्ज़री टूर में बदल देता है।\""
          },
          "zh": {
            "inSceneDialogue": "Sofia Laurent Lip-Sync (0.6s–3.3s): \"每一间套房推门而出，皆是无遮挡的浩瀚海景。\"",
            "narrationVo": "VO (3.9s–9.4s): \"SceneFlow 将普通房源照片升级为配乐四K建筑漫游大片，并支持优雅顾问出镜讲解。\""
          },
          "ar": {
            "inSceneDialogue": "Sofia Laurent Lip-Sync (0.6s–3.3s): \"كل جناح هنا ينفتح مباشرة على أفق البحر الممتد.\"",
            "narrationVo": "VO (3.9s–9.4s): \"يحوّل SceneFlow صور الإعلان العادية إلى جولات معمارية فاخرة بدقة فور كي مع تقديم احترافي أمام الكاميرا.\""
          },
          "th": {
            "inSceneDialogue": "Sofia Laurent Lip-Sync (0.6s–3.3s): \"ทุกห้องสวีทเปิดรับวิวเส้นขอบฟ้าทะเลกว้างแบบไม่มีอะไรกั้น\"",
            "narrationVo": "VO (3.9s–9.4s): \"SceneFlow เปลี่ยนรูปถ่ายประกาศขายธรรมดาให้เป็นวิดีโอทัวร์โฟร์เคพร้อมดนตรีและผู้ดำเนินรายการระดับพรีเมียม\""
          }
        }
      },
      {
        "blockNumber": 4,
        "title": "Boutique Resort & Primary Spa Suite Versatility",
        "timecode": "0:30–0:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Oceanfront Spa Suite at golden sunset, warm honed-limestone vanities frame a sculptural freestanding soaking tub facing floor-to-ceiling ocean glass. 2s–8s (Action): Delicate wisps of warm spa steam curl upward through amber sunset rays as water ripples softly inside the limestone tub. 8s–10s (End frame): Serene five-star resort bath composition overlooking glowing sunset waves. Camera: Slow low-angle lateral gimbal glide right-to-left. No spoken dialogue.",
        "cameraAndLighting": "Slow low-angle lateral gimbal glide right-to-left. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Serene five-star resort bath composition overlooking glowing sunset waves.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Serve residential agents, luxury vacation rentals, and boutique resorts alike—showcasing every spa suite, terrace, and amenity in cinema motion.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Atiende a agentes residenciales, alquileres de lujo y hoteles boutique mostrando cada terraza, suite y spa con movimiento cinematográfico.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Atenda corretores, locações de alto padrão e hotéis boutique exibindo cada suíte, spa e varanda com movimento de cinema.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"रियल एस्टेट एजेंट, वेकेशन विला और बुटीक रिसॉर्ट—सभी के हर सुइट, स्पा और टेरेस को सिनेमाई गति में प्रस्तुत करें।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"无论是高端住宅、海景民宿还是精品度假酒店，都能用丝滑电影运镜尽显水疗套房与露台格调。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"اخدم الوسطاء العقاريين وبيوت العطلات والمنتجعات البوتيكية بإبراز كل جناح وشرفة وسبا بحركة سينمائية.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"รองรับทั้งนายหน้าบ้านหรู พูลวิลล่าปล่อยเช่า และรีสอร์ตบูทีค ถ่ายทอดทุกมุมสปาและระเบียงด้วยมุมกล้องภาพยนตร์\""
          }
        }
      },
      {
        "blockNumber": 5,
        "title": "Smartphone Listing Photos to 4K Cinema in Under an Hour",
        "timecode": "0:40–0:50",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): In the sunlit courtyard entrance of Villa Maris Ocean Pavilion, Sofia Laurent holds up her smartphone capturing bright wide-angle reference photos of the travertine archway. 2s–8s (Action): Sofia Laurent reviews the clean visual photo gallery on her screen with zero text, taps send with an effortless smile, and walks gracefully inside without tripods, lighting cases, or camera crew. 8s–10s (End frame): Sunlit architectural courtyard bathed in calm morning light. Camera: Smooth over-the-shoulder arc into clean architectural hold. No spoken dialogue.",
        "cameraAndLighting": "Smooth over-the-shoulder arc into clean architectural hold. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Sunlit architectural courtyard bathed in calm morning light.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Agents upload photos right from their phone—zero travel, zero drone permits, and roughly sixty dollars in total SceneFlow delivery cost.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"El agente sube fotos desde su móvil: sin viajes, sin permisos de dron y con un costo total cercano a sesenta dólares en SceneFlow.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"O corretor envia fotos pelo celular: sem deslocamento, sem drones e com custo total em torno de sessenta dólares no SceneFlow.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"एजेंट फ़ोन से फ़ोटो भेजते हैं—बिना यात्रा, बिना ड्रोन परमिट, केवल लगभग साठ डॉलर की कुल SceneFlow डिलीवरी लागत में।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"经纪人用手机上传实景照片即可开工：零差旅、免航拍审批，综合交付成本仅约六十美元。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يرفع الوسيط الصور من هاتفه مباشرة: بلا سفر ولا تصاريح طائرات مسيّرة، وبتكلفة كاملة تقارب ستين دولاراً فقط.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"นายหน้าส่งรูปจากมือถือได้ทันที ไม่ต้องเดินทาง ไม่ต้องขออนุญาตโดรน ด้วยต้นทุนส่งมอบรวมเพียงราวหกสิบดอลลาร์\""
          }
        }
      },
      {
        "blockNumber": 6,
        "title": "Architectural Fidelity & Twilight Cellar Ambience",
        "timecode": "0:50–1:00",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Twilight Wine Lounge at dusk, warm cove lighting illuminates custom oak-and-glass wine racks with zero label text. 2s–8s (Action): View glides smoothly past the glass cellar doors out onto the candlelit coastal lounge where two crystal glasses rest beside a warm fire table overlooking twilight surf. 8s–10s (End frame): Aspirational evening coastal lounge tableau under deep blue sky. Camera: Continuous forward Steadicam pass from wine gallery to terrace. No spoken dialogue.",
        "cameraAndLighting": "Continuous forward Steadicam pass from wine gallery to terrace. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Aspirational evening coastal lounge tableau under deep blue sky.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Continuity Vault and FlowDirector preserve true stone textures, room geometry, and staging while elevating flat daylight into twilight luxury.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Continuidad y FlowDirector respetan los materiales, muebles y proporciones reales mientras elevan cada espacio al lujo del atardecer.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Continuidade e FlowDirector preservam pedras, móveis e arquitetura reais enquanto valorizam a iluminação de fim de tarde.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"Continuity Vault और FlowDirector असली पत्थर, फ़र्नीचर और वास्तुकला को सटीक रखते हुए ट्वाइलाइट लक्ज़री आभा जोड़ते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"连续性资产库与 FlowDirector 精准保留真实石材纹理、家具陈设与空间比例，轻松呈现暮色豪宅质感。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"تحافظ خزنة الاتساق وFlowDirector على الخامات والأثاث والأبعاد الحقيقية مع إضاءة غسق فاخرة.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"คลังความต่อเนื่องและ FlowDirector รักษาพื้นผิวหิน เฟอร์นิเจอร์ และสัดส่วนห้องจริง พร้อมยกระดับแสงยามพลบค่ำสุดหรู\""
          }
        }
      },
      {
        "blockNumber": 7,
        "title": "Dual 16:9 Portal Film + 9:16 Social Discovery",
        "timecode": "1:00–1:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): At a sunlit marble table inside an upscale city espresso bar, a prospective buyer holds her smartphone vertically playing a crisp nine-by-sixteen visual clip of Villa Maris Infinity Terrace with zero screen text. 2s–8s (Action): She turns the vertical video toward her smiling partner across the table, and both nod with immediate excitement before she taps to book a private viewing. 8s–10s (End frame): Engaged couple smiling over Architectural Listing Tablet and espresso cups. Camera: Smooth tilt-up from vertical phone preview to medium two-shot. No spoken dialogue.",
        "cameraAndLighting": "Smooth tilt-up from vertical phone preview to medium two-shot. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Engaged couple smiling over Architectural Listing Tablet and espresso cups.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Every tour automatically outputs both widescreen MLS and portal films plus vertical nine-by-sixteen Reels that stop scrolling buyers.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Cada propiedad genera el tour horizontal para portales inmobiliarios y cortes verticales nueve dieciséis que captan compradores en redes.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Cada tour exporta o vídeo horizontal para portais imobiliários e Reels verticais nove por dezesseis que atraem visitas imediatas.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"हर टूर से प्रॉपर्टी पोर्टल के लिए वाइडस्क्रीन फ़िल्म और खरीदारों को रोकने वाले वर्टिकल नौ-सोलह रील्स स्वतः बनते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"一次生成即可同步输出房产平台横屏主片，以及高转化九比十六竖屏社媒短视频。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"تُخرج كل جولة تلقائياً فيلماً أفقياً للمنصات العقارية ومقاطع عمودية تجذب المشترين فوراً عبر الشبكات الاجتماعية.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ทุกทัวร์ส่งออกครบทั้งวิดีโอแนวนอนสำหรับเว็บอสังหาฯ และคลิปแนวตั้งเก้าต่อสิบหกดึงดูดผู้ซื้อบนโซเชียล\""
          }
        }
      },
      {
        "blockNumber": 8,
        "title": "International Buyers Closing in Their Native Language",
        "timecode": "1:10–1:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside a modern high-rise penthouse lounge at night with glittering skyline lights behind them, David Chen and Mei Chen watch Villa Maris Infinity Terrace on Architectural Listing Tablet. 2s–8s (Action): David Chen turns warmly to Mei Chen and speaks with confident satisfaction, then Mei Chen smiles in agreement as David Chen taps approval on Architectural Listing Tablet and raises a celebratory glass. 8s–10s (End frame): Poised two-shot of David Chen and Mei Chen toasting against nighttime city lights. Camera: Smooth lateral dolly arc across the penthouse sofa. The only spoken line is: David Chen says: \"Hearing every detail in our language makes this easy.\"",
        "cameraAndLighting": "Smooth lateral dolly arc across the penthouse sofa. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Poised two-shot of David Chen and Mei Chen toasting against nighttime city lights.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "David Chen Lip-Sync (0.6s–3.4s): \"Hearing every detail in our language makes this easy.\"",
            "narrationVo": "VO (4.0s–9.4s): \"Export instant Mandarin, Spanish, Arabic, or Portuguese versions to close high-net-worth international buyers.\""
          },
          "es": {
            "inSceneDialogue": "David Chen Lip-Sync (0.6s–3.4s): \"Escuchar cada detalle en nuestro idioma facilita la decisión.\"",
            "narrationVo": "VO (4.0s–9.4s): \"Exporta al instante versiones en mandarín, inglés, árabe o portugués para cerrar inversores internacionales.\""
          },
          "pt": {
            "inSceneDialogue": "David Chen Lip-Sync (0.6s–3.4s): \"Ouvir cada detalhe no nosso idioma torna a escolha fácil.\"",
            "narrationVo": "VO (4.0s–9.4s): \"Gere versões instantâneas em mandarim, inglês, espanhol ou árabe para fechar investidores internacionais.\""
          },
          "hi": {
            "inSceneDialogue": "David Chen Lip-Sync (0.6s–3.4s): \"अपनी भाषा में हर बारीकी सुनकर निर्णय लेना बेहद आसान हो गया।\"",
            "narrationVo": "VO (4.0s–9.4s): \"विदेशी निवेशकों के लिए तुरंत मंदारिन, स्पैनिश, अरबी या अंग्रेज़ी संस्करण तैयार कर सौदे तेज़ी से पूरे करें।\""
          },
          "zh": {
            "inSceneDialogue": "David Chen Lip-Sync (0.6s–3.4s): \"用母语听清每一处细节，让我们当场就下定决心。\"",
            "narrationVo": "VO (4.0s–9.4s): \"一键输出英、西、阿、葡等七十多种语言版本，助经纪团队跨国锁定高净值买家。\""
          },
          "ar": {
            "inSceneDialogue": "David Chen Lip-Sync (0.6s–3.4s): \"سماع كل تفصيل بلغتنا يجعل قرار الشراء سهلاً تماماً.\"",
            "narrationVo": "VO (4.0s–9.4s): \"صدّر فوراً نسخاً بالصينية أو الإسبانية أو الإنجليزية أو البرتغالية لإتمام الصفقات مع المستثمرين الدوليين.\""
          },
          "th": {
            "inSceneDialogue": "David Chen Lip-Sync (0.6s–3.4s): \"พอได้ฟังทุกรายละเอียดเป็นภาษาของเรา การตัดสินใจก็ง่ายทันที\"",
            "narrationVo": "VO (4.0s–9.4s): \"สร้างเวอร์ชันภาษาจีน อังกฤษ อาหรับ หรือสเปนได้ทันที เพื่อปิดการขายนักลงทุนต่างชาติข้ามพรมแดน\""
          }
        }
      },
      {
        "blockNumber": 9,
        "title": "Brokerage & Hospitality Portfolio Retainer Scale",
        "timecode": "1:20–1:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside a sunlit glass-walled brokerage conference room, four luxury agents sit around a white-oak table watching Villa Maris Ocean Pavilion play on a wall screen with zero text. 2s–8s (Action): Sofia Laurent stands beside Architectural Listing Tablet and shakes hands warmly across the oak table with the managing broker, sealing an ongoing monthly portfolio tour agreement. 8s–10s (End frame): Confident smiling brokerage team framed against bright city windows. Camera: Smooth Steadicam track along the conference table. No spoken dialogue.",
        "cameraAndLighting": "Smooth Steadicam track along the conference table. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Confident smiling brokerage team framed against bright city windows.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Because each tour takes under an hour and twelve dollars in credits, one operator easily serves twenty-plus agents on monthly retainers.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Como cada tour toma menos de una hora y doce dólares en créditos, puedes atender a más de veinte agentes con igualas mensuales.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Como cada vídeo leva menos de uma hora e doze dólares em créditos, você atende mais de vinte corretores em pacotes mensais.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"क्योंकि हर टूर एक घंटे से कम और बारह डॉलर क्रेडिट में बनता है, आप आसानी से बीस से अधिक एजेंटों के मासिक खाते संभाल सकते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"单套制作不到一小时、仅需十二美元积分，一人即可并行承接二十多位经纪人的包月订单。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"لأن كل جولة تستغرق أقل من ساعة واثني عشر دولاراً من الرصيد، يمكنك خدمة أكثر من عشرين وسيطاً بعقود شهرية.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"เพราะแต่ละทัวร์ใช้เวลาไม่ถึงชั่วโมงและเครดิตเพียงสิบสองดอลลาร์ คุณจึงดูแลนายหน้ากว่ายี่สิบรายแบบรายเดือนได้สบาย\""
          }
        }
      },
      {
        "blockNumber": 10,
        "title": "Iconic Twilight Horizon Pull-Back & Economics Close",
        "timecode": "1:30–1:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Out on Villa Maris Infinity Terrace at blue hour, Sofia Laurent stands poised beside the glowing infinity pool and travertine fire pit. 2s–8s (Action): Warm interior amber light reflects across the water as the view pulls smoothly back and upward over the coastal cliffside. 8s–10s (End frame): Grand architectural panorama of Villa Maris Infinity Terrace glowing jewel-like against the sapphire ocean horizon. Camera: Sweeping elevated crane pull-back toward the sea. No spoken dialogue.",
        "cameraAndLighting": "Sweeping elevated crane pull-back toward the sea. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Grand architectural panorama of Villa Maris Infinity Terrace glowing jewel-like against the sapphire ocean horizon.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Charge two hundred to five hundred fifty dollars per property, lock in recurring brokerage contracts, and scale globally on SceneFlow.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Cobra entre doscientos y quinientos cincuenta dólares por inmueble, asegura contratos recurrentes con inmobiliarias y escala con SceneFlow.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Cobre de duzentos a quinhentos e cinquenta dólares por imóvel, feche contratos recorrentes com imobiliárias e escale no SceneFlow.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"प्रति प्रॉपर्टी दो सौ से पाँच सौ पचास डॉलर चार्ज करें, ब्रोकरेज रिटेनर जोड़ें, और SceneFlow पर वैश्विक स्तर पर बढ़ें।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"每套报价二百至五百五十美元，签下房产机构长期包月合作，在 SceneFlow 打造高利地产视频业务。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"سعّر العقار بين مئتين وخمسمئة وخمسين دولاراً، ووقّع عقود وساطة متكررة، وتوسّع عالمياً عبر SceneFlow.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"คิดราคาสองร้อยถึงห้าร้อยห้าสิบดอลลาร์ต่อรายการ ผูกสัญญารายเดือนกับโบรกเกอร์ และขยายธุรกิจบน SceneFlow\""
          }
        }
      }
    ]
  },
  "training": {
    "verticalId": "training",
    "verticalLabel": "Corporate Training & Multilingual SOPs",
    "promoTitle": "Zero-Reshoot Precision",
    "formatBadge": "1:50 Enterprise SOP + Compliance Business Demo · 11 × 10s Google Omni 1.2 Flash Blocks",
    "runtimeLabel": "1:50",
    "durationSeconds": 110,
    "aspectRatio": "16:9 (with 9:16 Social Safe-Zone)",
    "logline": "Across clean-tech robotics, clinical healthcare, and commercial kitchens, Continuity-locked instructors deliver 70+ language SOP mastery and instant single-scene compliance updates—replacing $3,000 plant shoots with ~$150 SceneFlow modules.",
    "blueprintIntakePrompt": "Create a 110-second (11 scenes × 10 seconds, Google Omni 1.2 Flash) enterprise commercial promo demonstration titled \"Zero-Reshoot Precision\" for a Corporate Training & Multilingual SOP Video service powered by SceneFlow. Showcase Operations Lead Maya Lin executing a lockout-tagout protocol on Safety Lockout Console inside Robotics Assembly Bay, a new hire replacing a thick binder with a clear visual tablet guide, Clinical Lead Priya Nair demonstrating aseptic sensor calibration inside Clinical Onboarding Suite, Chef Marcus Bell verifying commercial kitchen food-safety temperature, Maya Lin returning across modules with locked Continuity Vault uniform and set fidelity, multi-shift staff inside Global Logistics Hub mastering instructions in 70+ languages, FlowDirector updating a single compliance scene in minutes with a secondary dual-key lock and zero plant downtime, QR machine-side refreshers, and enterprise retainer scale.",
    "artStyleLock": "Enterprise Commercial Cinema Realism · Crisp 5000K Clean-Tech & Clinical Key Lighting · Tactile Equipment Precision · Zero Readable Screen or Signage Text",
    "unitEconomicsHook": "Every factory, medical network, logistics hub, and franchise worldwide faces constant staff turnover and strict safety/compliance mandates, yet $3,000+ plant shoots disrupt operations—forcing teams onto unread PDF binders → ~$150 SceneFlow module cost (~$30 compute credits + <2.5 hrs) → $599–$1,800 B2B modules + recurring quarterly compliance update retainers (75%–85% net margin).",
    "backgroundMusic": {
      "title": "Precision Standard (1:50 Modern Enterprise Innovation & Chamber Pulse Score)",
      "bpmAndKey": "106 BPM · D Major",
      "mixLevel": "25% volume (-12 dB) ducked cleanly under lip-sync dialogue and narration VO",
      "generationPrompt": "Instrumental modern enterprise innovation and precision training score, 110 seconds (1:50), 106 BPM, D major. 0:00-0:40 (Act I) crisp marimba-like muted synth plucks, tight warm sub-bass pulse, and clean brushed percussion conveying clarity and focus. 0:40-1:20 (Act II) warm analog poly-synth pads and rhythmic staccato chamber strings driving confident global operational momentum. 1:20-1:50 (Act III) uplifting orchestral-electronic enterprise horizon swell resolving on a clean, authoritative D-major chord. Instrumental only, no vocals."
    },
    "referenceLocks": [
      {
        "token": "person [1]",
        "category": "Cast",
        "name": "Maya Lin",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Confident, approachable 38-year-old industrial operations instructor, sleek low ponytail, clear anti-glare safety glasses, tailored navy blazer over slate technical polo, silver ID lanyard with zero text."
      },
      {
        "token": "person [2]",
        "category": "Cast",
        "name": "Priya Nair",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Warm, authoritative 41-year-old senior clinical educator, dark wavy hair pinned neatly, tailored teal medical scrubs, clean silver stethoscope."
      },
      {
        "token": "person [3]",
        "category": "Cast",
        "name": "Chef Marcus Bell",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Composed 44-year-old franchise culinary standards instructor, crisp white double-breasted chef jacket, charcoal apron, stainless digital probe thermometer."
      },
      {
        "token": "location [1]",
        "category": "Location",
        "name": "Robotics Assembly Bay",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Spotless clean-tech manufacturing floor, articulated robotic assembly arm behind safety glass, brushed aluminum workstations, crisp 5000K overhead lighting, zero signage words."
      },
      {
        "token": "location [2]",
        "category": "Location",
        "name": "Clinical Onboarding Suite",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Sunlit modern medical procedure suite with natural daylight windows, stainless diagnostic cart, clean glass cabinetry, zero screen text."
      },
      {
        "token": "location [3]",
        "category": "Location",
        "name": "Global Logistics Hub",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Clean stainless-and-slate multi-station assembly corridor with mounted visual tablet stations and color-coded safety indicators, zero text."
      },
      {
        "token": "prop [1]",
        "category": "Prop",
        "name": "Safety Lockout Console",
        "role": "Hero Continuity Prop Lock",
        "promptDescription": "Brushed steel industrial power-isolation switchbox with heavy crimson safety padlock, brass verification key slot, and bright red-to-emerald LED status ring, zero printed words."
      }
    ],
    "blocks": [
      {
        "blockNumber": 1,
        "title": "High-Stakes Lockout Precision",
        "timecode": "0:00–0:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Robotics Assembly Bay beside Safety Lockout Console, Maya Lin stands in medium close-up with two attentive technicians in slate uniforms watching beside her. 2s–8s (Action): Maya Lin looks calmly into the camera and speaks clearly, then pulls down the isolation handle on Safety Lockout Console and clicks the crimson padlock shut as the status ring shifts from red to emerald green and the robotic arm halts smoothly behind glass. 8s–10s (End frame): Confident reassuring nod from Maya Lin beside the illuminated emerald console. Camera: Smooth gentle push-in from medium group framing to medium close-up. The only spoken line is: Maya Lin says: \"Lock out power first. Clarity prevents every accident.\"",
        "cameraAndLighting": "Smooth gentle push-in from medium group framing to medium close-up. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Confident reassuring nod from Maya Lin beside the illuminated emerald console.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "Maya Lin Lip-Sync (0.6s–3.3s): \"Lock out power first. Clarity prevents every accident.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Every factory, hospital network, and franchise battles constant turnover and strict safety compliance.\""
          },
          "es": {
            "inSceneDialogue": "Maya Lin Lip-Sync (0.6s–3.3s): \"Bloquea la energía primero. La claridad evita accidentes.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Cada fábrica, red clínica y franquicia enfrenta rotación constante y normas estrictas de seguridad.\""
          },
          "pt": {
            "inSceneDialogue": "Maya Lin Lip-Sync (0.6s–3.3s): \"Trave a energia primeiro. Clareza evita qualquer acidente.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Toda indústria, rede clínica e franquia enfrenta alta rotatividade e normas rígidas de segurança.\""
          },
          "hi": {
            "inSceneDialogue": "Maya Lin Lip-Sync (0.6s–3.3s): \"पहले पावर लॉक करें। स्पष्टता हर दुर्घटना रोकती है।\"",
            "narrationVo": "VO (3.9s–9.4s): \"हर फ़ैक्ट्री, अस्पताल नेटवर्क और फ़्रैंचाइज़ी को नए स्टाफ़ के प्रशिक्षण और कड़े सुरक्षा नियमों की चुनौती रहती है।\""
          },
          "zh": {
            "inSceneDialogue": "Maya Lin Lip-Sync (0.6s–3.3s): \"先锁定电源。清晰的标准能杜绝每一场事故。\"",
            "narrationVo": "VO (3.9s–9.4s): \"全球每一家制造工厂、医疗网络与连锁企业，都面临高频入职与严苛安全合规刚需。\""
          },
          "ar": {
            "inSceneDialogue": "Maya Lin Lip-Sync (0.6s–3.3s): \"افصل الطاقة أولاً؛ فالوضوح يمنع كل الحوادث.\"",
            "narrationVo": "VO (3.9s–9.4s): \"يواجه كل مصنع وشبكة طبية وامتياز تجاري دوراناً وظيفياً مستمراً واشتراطات سلامة صارمة.\""
          },
          "th": {
            "inSceneDialogue": "Maya Lin Lip-Sync (0.6s–3.3s): \"ล็อกตัดไฟก่อนเสมอ ความชัดเจนช่วยป้องกันทุกอุบัติเหตุ\"",
            "narrationVo": "VO (3.9s–9.4s): \"ทุกโรงงาน เครือข่ายคลินิก และแฟรนไชส์ต้องรับมือพนักงานหมุนเวียนและกฎความปลอดภัยที่เข้มงวดตลอดเวลา\""
          }
        }
      },
      {
        "blockNumber": 2,
        "title": "Unread Binders vs. Instant Visual Mastery",
        "timecode": "0:10–0:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): At a brushed-aluminum bench inside Robotics Assembly Bay, a newly hired technician frowns at a thick three-ring paper binder beside pneumatic valves. 2s–8s (Action): The technician closes the heavy binder decisively, glances up at a mounted clean tablet showing visual motion of Maya Lin demonstrating the valve sequence with zero screen text, and mirrors the exact torque turn effortlessly. 8s–10s (End frame): Emerald calibration indicator glows as the relieved technician smiles with confidence. Camera: Smooth lateral pan and push-in from binder to workstation. No spoken dialogue.",
        "cameraAndLighting": "Smooth lateral pan and push-in from binder to workstation. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Emerald calibration indicator glows as the relieved technician smiles with confidence.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Yet live training shoots cost three thousand dollars and halt operations—leaving frontline staff stuck with unread binders.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Pero grabar en planta cuesta tres mil dólares y detiene la operación, dejando al personal con carpetas que nadie lee.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Mas gravações presenciais custam três mil dólares e param a operação, deixando equipes com apostilas que ninguém lê.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"पर तीन हज़ार डॉलर के लाइव शूट काम रोक देते हैं—जिससे कर्मचारी अनपढ़े काग़ज़ी मैनुअल के भरोसे रह जाते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"传统进厂实拍动辄三千美元还要停线配合，迫使一线员工只能面对无人翻阅的厚重手册。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"لكن التصوير الميداني يكلف ثلاثة آلاف دولار ويعطّل التشغيل، فيترك الموظفين أمام ملفات ورقية لا يقرؤها أحد.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"แต่การจ้างกองถ่ายสามพันดอลลาร์ต้องสั่งหยุดหน้างาน ทำให้พนักงานต้องเปิดแฟ้มคู่มือหนาๆ ที่ไม่มีใครอ่าน\""
          }
        }
      },
      {
        "blockNumber": 3,
        "title": "Healthcare & Clinical Onboarding (~$150 Module Cost)",
        "timecode": "0:20–0:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside sunlit Clinical Onboarding Suite, Priya Nair stands beside a stainless diagnostic cart with two attentive onboarding nurses in matching scrubs. 2s–8s (Action): Priya Nair demonstrates a sterile sensor attachment workflow with calm precision, then guides the lead nurse as she repeats the exact sterile connection cleanly on the first try. 8s–10s (End frame): Warm, trustworthy clinical three-shot as Priya Nair nods with encouragement. Camera: Smooth lateral gimbal glide past clean glass cabinetry. No spoken dialogue.",
        "cameraAndLighting": "Smooth lateral gimbal glide past clean glass cabinetry. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Warm, trustworthy clinical three-shot as Priya Nair nods with encouragement.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow turns written SOPs into crystal-clear visual training for roughly one hundred fifty dollars in total delivery cost.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow convierte manuales técnicos en capacitación visual impecable con un costo total cercano a ciento cincuenta dólares.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"O SceneFlow transforma manuais técnicos em treinamento visual cristalino com custo total em torno de cento e cinquenta dólares.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow लिखित SOP को केवल लगभग एक सौ पचास डॉलर की कुल लागत में एकदम स्पष्ट विज़ुअल ट्रेनिंग में बदल देता है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow 将枯燥的书面 SOP 转化为高清实操培训片，综合交付成本仅约一百五十美元。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يحوّل SceneFlow إجراءات التشغيل المكتوبة إلى تدريب مرئي فائق الوضوح بتكلفة تسليم كاملة تقارب مئة وخمسين دولاراً.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow เปลี่ยนคู่มือ SOP ให้เป็นวิดีโอฝึกอบรมที่ชัดเจน ด้วยต้นทุนส่งมอบรวมเพียงราวร้อยห้าสิบดอลลาร์\""
          }
        }
      },
      {
        "blockNumber": 4,
        "title": "Franchise & Hospitality Food-Safety Versatility",
        "timecode": "0:30–0:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside a spotless stainless commercial kitchen adjacent to Global Logistics Hub, Chef Marcus Bell stands before two young kitchen staff holding a gleaming stainless temperature probe. 2s–8s (Action): Chef Marcus Bell sanitizes the probe tip and inserts it into a chilled stainless prep pan until a green verification indicator illuminates on the handle while both trainees observe closely. 8s–10s (End frame): Poised culinary standards portrait with clean stainless reflections. Camera: Smooth eye-level Steadicam arc across the prep counter. No spoken dialogue.",
        "cameraAndLighting": "Smooth eye-level Steadicam arc across the prep counter. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Poised culinary standards portrait with clean stainless reflections.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"From precision manufacturing and clinical care to commercial kitchens, every step is demonstrated with unmistakable visual accuracy.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Desde manufactura y protocolos clínicos hasta cocinas industriales, cada paso se demuestra con precisión absoluta.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Da indústria de precisão e saúde às cozinhas profissionais, cada etapa é demonstrada com clareza visual absoluta.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"हाई-टेक निर्माण और क्लिनिकल देखभाल से लेकर कमर्शियल किचन तक, हर प्रक्रिया पूरी सटीकता से दिखाई जाती है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"从精密智造、临床护理到连锁餐饮食安，每一个关键步骤都能直观精准地呈现。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"من التصنيع الدقيق والرعاية السريرية إلى سلامة المطابخ التجارية، يُعرض كل إجراء بدقة بصرية لا تقبل اللبس.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ตั้งแต่สายการผลิตไฮเทค คลินิกการแพทย์ ไปจนถึงครัวมาตรฐาน ทุกขั้นตอนถูกสาธิตให้เห็นภาพอย่างแม่นยำ\""
          }
        }
      },
      {
        "blockNumber": 5,
        "title": "Locked Instructor & Uniform Continuity Across Curricula",
        "timecode": "0:40–0:50",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): In the clean energy-storage aisle of Robotics Assembly Bay, Maya Lin walks forward wearing the exact same navy blazer, safety glasses, and sleek ponytail beside modular battery racks. 2s–8s (Action): Maya Lin demonstrates engaging an insulated orange safety latch to a new technician cohort with seamless series-wide visual consistency across modules. 8s–10s (End frame): Crisp medium framing of Maya Lin confirming the locked battery latch. Camera: Smooth backward eye-level Steadicam track ahead of Maya Lin. No spoken dialogue.",
        "cameraAndLighting": "Smooth backward eye-level Steadicam track ahead of Maya Lin. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Crisp medium framing of Maya Lin confirming the locked battery latch.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Continuity Vault locks the exact same instructors, uniforms, and workplaces across entire ten- or twenty-part onboarding curricula.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"La Bóveda de Continuidad fija los mismos instructores, uniformes y entornos a lo largo de programas completos de inducción.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"O Cofre de Continuidade mantém os mesmos instrutores, uniformes e cenários em trilhas completas de integração.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"Continuity Vault पूरे दस-बीस भागों के प्रशिक्षण पाठ्यक्रम में वही प्रशिक्षक, यूनिफ़ॉर्म और कार्यस्थल लॉक रखता है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"连续性资产库在整套数十节入职课程中，严密锁定同一位讲师、工装制服与标准作业空间。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"تثبّت خزنة الاتساق نفس المدربين والزي الموحد وبيئة العمل عبر سلاسل التأهيل الكاملة.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"คลังความต่อเนื่องช่วยล็อกผู้สอน ชุดยูนิฟอร์ม และสถานที่ทำงานเดิมไว้ครบตลอดหลักสูตรสิบถึงยี่สิบบทเรียน\""
          }
        }
      },
      {
        "blockNumber": 6,
        "title": "70+ Native Workforce Languages Across Every Shift",
        "timecode": "0:50–1:00",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Global Logistics Hub, four diverse frontline technicians stand along clean stainless assembly stations wearing discreet wireless earpieces facing mounted visual tablets with zero text. 2s–8s (Action): Guided by Maya Lin on the clean visual displays, each technician down the line completes their safety latch check in synchronized precision and gives a confident thumbs-up to the shift supervisor. 8s–10s (End frame): Harmonious multi-shift team operating in unison down the bright corridor. Camera: Fluid forward Steadicam tracking pass along the workstation line. No spoken dialogue.",
        "cameraAndLighting": "Fluid forward Steadicam tracking pass along the workstation line. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Harmonious multi-shift team operating in unison down the bright corridor.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Publish every module in over seventy native workforce languages—so every shift masters safety protocols on day one.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Publica cada curso en más de setenta idiomas laborales para que cada turno domine el protocolo desde el primer día.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Publique cada módulo em mais de setenta idiomas de trabalho para que todo turno domine o padrão já no primeiro dia.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"सत्तर से अधिक कामकाजी भाषाओं में हर मॉड्यूल जारी करें—ताकि हर शिफ़्ट का कर्मचारी पहले ही दिन नियम समझे।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"一键输出七十多种一线员工母语版本，让跨国工厂每个班次的新人入职首日即刻达标。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"انشر كل وحدة بأكثر من سبعين لغة للعاملين، ليتقن كل فريق قواعد السلامة منذ اليوم الأول.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"เผยแพร่ได้กว่าเจ็ดสิบภาษาของพนักงานหน้างาน เพื่อให้ทุกกะเข้าใจมาตรฐานความปลอดภัยตรงกันตั้งแต่วันแรก\""
          }
        }
      },
      {
        "blockNumber": 7,
        "title": "Instant Regulation Update via FlowDirector (Zero Reshoot)",
        "timecode": "1:00–1:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Robotics Assembly Bay with identical lighting and angle as Block 1, Maya Lin stands beside Safety Lockout Console holding a newly mandated secondary brass verification key alongside the crimson padlock. 2s–8s (Action): Maya Lin inserts the brass verification key into the secondary slot on Safety Lockout Console and turns it ninety degrees until twin emerald rings illuminate simultaneously. 8s–10s (End frame): Maya Lin smiles calmly toward the camera beside the updated dual-key lockout console. Camera: Steady locked-axis gentle push-in matching Block 1 framing. No spoken dialogue.",
        "cameraAndLighting": "Steady locked-axis gentle push-in matching Block 1 framing. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Maya Lin smiles calmly toward the camera beside the updated dual-key lockout console.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"When regulations change, FlowDirector regenerates just that single scene in minutes—zero reshoots, zero crew travel, zero plant downtime.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Cuando cambia una norma, FlowDirector regenera solo esa escena en minutos: sin volver a grabar ni frenar la planta.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Quando uma norma muda, o FlowDirector atualiza apenas aquela cena em minutos: zero regravação e zero parada na fábrica.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"जब कोई सुरक्षा नियम बदले, FlowDirector मिनटों में सिर्फ़ वही दृश्य अपडेट कर देता है—बिना रीशूट, बिना प्लांट रोके।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"当法规条款更新时，FlowDirector 几分钟即可单独重制该镜头：零重拍、零差旅、零停工损耗。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"وعندما تتغير اللوائح، يعيد FlowDirector توليد ذلك المشهد وحده في دقائق: بلا إعادة تصوير ولا توقف للمصنع.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"เมื่อกฎระเบียบเปลี่ยน FlowDirector อัปเดตเฉพาะซีนนั้นได้ในไม่กี่นาที ไม่ต้องถ่ายใหม่และไม่ต้องหยุดสายการผลิต\""
          }
        }
      },
      {
        "blockNumber": 8,
        "title": "Machine-Side 9:16 Micro-Refresher & HR Sign-Off",
        "timecode": "1:10–1:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Robotics Assembly Bay, a floor technician holds a smartphone vertically beside a CNC enclosure playing a clean nine-by-sixteen clip of Maya Lin turning the key on Safety Lockout Console with zero text. 2s–8s (Action): The technician nods and locks his station switch while focus shifts smoothly to an operations director on the glass mezzanine tapping approval on her tablet. 8s–10s (End frame): Satisfied operations director looking out over the safe floor. Camera: Smooth rack focus and subtle tilt from floor technician to glass mezzanine. No spoken dialogue.",
        "cameraAndLighting": "Smooth rack focus and subtle tilt from floor technician to glass mezzanine. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Satisfied operations director looking out over the safe floor.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Export widescreen LMS courses plus vertical nine-by-sixteen QR machine-side refreshers while safety leaders approve cuts in Screening Room.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Exporta cursos horizontales para LMS y cápsulas verticales nueve dieciséis junto a cada máquina con aprobación en Screening Room.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Gere aulas horizontais para LMS e guias rápidos verticais nove por dezesseis via QR Code, com aprovação na Screening Room.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"LMS के लिए वाइडस्क्रीन कोर्स और मशीन के पास QR वर्टिकल गाइड दें, जबकि अधिकारी Screening Room में मंज़ूरी दें।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"同步导出内训系统横屏课程与机台扫码九比十六竖屏速查卡，管理层在 Screening Room 在线签批。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"صدّر دورات أفقية لمنصات التعلم ومقاطع عمودية سريعة بجانب المعدات، مع اعتماد فوري في غرفة العرض.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ส่งออกทั้งบทเรียนแนวนอนบนระบบ LMS และคลิปสั้นแนวตั้งสแกนดูข้างเครื่องจักร พร้อมตรวจอนุมัติใน Screening Room\""
          }
        }
      },
      {
        "blockNumber": 9,
        "title": "Unified Standards Across Every Site",
        "timecode": "1:20–1:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside sunlit Clinical Onboarding Suite, Priya Nair stands proudly between her two newly certified nurses beside the prepared diagnostic station. 2s–8s (Action): Priya Nair turns warmly toward the camera and speaks with calm conviction, then hands a clean certification tablet to the smiling lead nurse. 8s–10s (End frame): Confident clinical team portrait radiating readiness and trust. Camera: Smooth gentle push-in to medium three-shot. The only spoken line is: Priya Nair says: \"Every shift, every clinic—one clear standard.\"",
        "cameraAndLighting": "Smooth gentle push-in to medium three-shot. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Confident clinical team portrait radiating readiness and trust.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "Priya Nair Lip-Sync (0.6s–3.3s): \"Every shift, every clinic—one clear standard.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Visual standardization cuts onboarding time, reduces costly errors, and proves audit readiness.\""
          },
          "es": {
            "inSceneDialogue": "Priya Nair Lip-Sync (0.6s–3.3s): \"En cada turno y cada clínica, un estándar claro.\"",
            "narrationVo": "VO (3.9s–9.4s): \"La estandarización visual acelera la inducción, reduce errores costosos y respalda cada auditoría.\""
          },
          "pt": {
            "inSceneDialogue": "Priya Nair Lip-Sync (0.6s–3.3s): \"Em cada turno e unidade, um único padrão claro.\"",
            "narrationVo": "VO (3.9s–9.4s): \"A padronização em vídeo acelera o treinamento, reduz falhas caras e comprova conformidade.\""
          },
          "hi": {
            "inSceneDialogue": "Priya Nair Lip-Sync (0.6s–3.3s): \"हर शिफ़्ट, हर क्लिनिक—एक ही स्पष्ट मानक।\"",
            "narrationVo": "VO (3.9s–9.4s): \"विज़ुअल मानकीकरण ट्रेनिंग का समय घटाता है, महँगी गलतियाँ रोकता है और ऑडिट आसान बनाता है।\""
          },
          "zh": {
            "inSceneDialogue": "Priya Nair Lip-Sync (0.6s–3.3s): \"每一个班次，每一家分院，都执行同一套清晰标准。\"",
            "narrationVo": "VO (3.9s–9.4s): \"标准化视频实训大幅缩短带教周期、降低操作失误，轻松通过各项合规审计。\""
          },
          "ar": {
            "inSceneDialogue": "Priya Nair Lip-Sync (0.6s–3.3s): \"في كل مناوبة وكل عيادة، معيار واحد واضح.\"",
            "narrationVo": "VO (3.9s–9.4s): \"التوحيد البصري يختصر وقت التأهيل ويقلل الأخطاء المكلفة ويعزز الجاهزية للتدقيق.\""
          },
          "th": {
            "inSceneDialogue": "Priya Nair Lip-Sync (0.6s–3.3s): \"ทุกกะการทำงาน ทุกสาขา ใช้มาตรฐานที่ชัดเจนเดียวกัน\"",
            "narrationVo": "VO (3.9s–9.4s): \"มาตรฐานภาพที่ชัดเจนช่วยลดเวลาเทรนงาน ลดความผิดพลาด และพร้อมรับการตรวจสอบเสมอ\""
          }
        }
      },
      {
        "blockNumber": 10,
        "title": "Scaling 20+ B2B Accounts from One Studio Desk",
        "timecode": "1:30–1:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside a sunlit modern creative studio, a poised B2B video producer sits at an oak desk reviewing visual training frames of Maya Lin, Priya Nair, and Chef Marcus Bell on a clean widescreen monitor with zero text. 2s–8s (Action): The producer clicks once to finalize a module while two smiling corporate safety directors nod in approval on a companion video screen. 8s–10s (End frame): Calm, high-margin B2B studio workflow overlooking city daylight. Camera: Gentle clockwise dolly arc behind the producer’s desk. No spoken dialogue.",
        "cameraAndLighting": "Gentle clockwise dolly arc behind the producer’s desk. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Calm, high-margin B2B studio workflow overlooking city daylight.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"At thirty dollars in compute credits and under three hours per module, one operator can serve twenty-plus enterprise clients.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Con treinta dólares en créditos y menos de tres horas por módulo, un solo operador atiende a más de veinte empresas.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Com trinta dólares em créditos e menos de três horas por módulo, você atende mais de vinte clientes corporativos.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"केवल तीस डॉलर क्रेडिट और तीन घंटे से कम समय प्रति मॉड्यूल में एक ऑपरेटर बीस से अधिक कॉर्पोरेट क्लाइंट संभाल सकता है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"单门课程仅需约三十美元算力积分与不到三小时制作，一人即可并行服务二十多家企业客户。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"برصيد يقارب ثلاثين دولاراً وأقل من ثلاث ساعات للوحدة، يدير مشغّل واحد أكثر من عشرين عميلاً مؤسسياً.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ด้วยค่าเครดิตราวสามสิบดอลลาร์และเวลาไม่ถึงสามชั่วโมงต่อบทเรียน คุณจึงดูแลลูกค้าองค์กรกว่ายี่สิบรายพร้อมกันได้\""
          }
        }
      },
      {
        "blockNumber": 11,
        "title": "Enterprise Hero Pull-Back & Retainer Economics Close",
        "timecode": "1:40–1:50",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Robotics Assembly Bay, Maya Lin stands centered with her certified technicians beside Safety Lockout Console as the articulated robotic arm operates smoothly behind safety glass. 2s–8s (Action): Technicians monitor their clean stations in calm synchronization as the view pulls steadily backward across the gleaming clean-tech facility. 8s–10s (End frame): Symmetrical wide enterprise hero frame running at peak safety and precision. Camera: Majestic symmetrical dolly pull-back down the center aisle. No spoken dialogue.",
        "cameraAndLighting": "Majestic symmetrical dolly pull-back down the center aisle. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Symmetrical wide enterprise hero frame running at peak safety and precision.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Charge six hundred to eighteen hundred dollars per module plus quarterly compliance retainers—and build a B2B powerhouse on SceneFlow.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Cobra entre seiscientos y mil ochocientos dólares por módulo más igualas trimestrales de actualización con SceneFlow.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Cobre de seiscentos a mil e oitocentos dólares por módulo mais contratos trimestrais de atualização no SceneFlow.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"प्रति मॉड्यूल छह सौ से अठारह सौ डॉलर और तिमाही अनुपालन रिटेनर लें—SceneFlow पर अपना B2B व्यवसाय बढ़ाएँ।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"每门课程报价六百至一千八百美元并绑定季度更新年费，在 SceneFlow 打造高利润企业培训机构。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"سعّر الوحدة بين ستمئة وألف وثمانمئة دولار مع عقود تحديث ربع سنوية، وابنِ شركتك المؤسسية عبر SceneFlow.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"คิดราคาหกร้อยถึงพันแปดร้อยดอลลาร์ต่อบทเรียน พร้อมสัญญาดูแลอัปเดตรายไตรมาส สร้างธุรกิจ B2B กำไรสูงบน SceneFlow\""
          }
        }
      }
    ]
  },
  "brand": {
    "verticalId": "brand",
    "verticalLabel": "Local Brand Stories & Social Ad Packs",
    "promoTitle": "Main Street Cinema",
    "formatBadge": "1:50 Local Brand Story + 9:16 Ad Agency Demo · 11 × 10s Google Omni 1.2 Flash Blocks",
    "runtimeLabel": "1:50",
    "durationSeconds": 110,
    "aspectRatio": "16:9 (with 9:16 Social Safe-Zone)",
    "logline": "Independent roasters, boutique clinics, and neighborhood bistros gain Super Bowl-caliber homepage trust films and 9:16 social ad packs without closing shop—unlocking 30M+ priced-out SMBs at ~$110 total SceneFlow delivery cost.",
    "blueprintIntakePrompt": "Create a 110-second (11 scenes × 10 seconds, Google Omni 1.2 Flash) commercial brand promo demonstration titled \"Main Street Cinema\" for a Local Brand Story & Social Ad Pack service powered by SceneFlow. Showcase artisan roaster Leo Morales inspecting Brass Sample Tryer in golden sunbeams inside Craft Coffee Roastery, tactile espresso crema craft, clinic founder Elena Lindqvist welcoming a first-time patient inside Wellness Clinic Lounge, Chef Mateo Rossi plating an open-flame dish inside Neighborhood Bistro Kitchen, five-minute mobile intake before opening doors, widescreen homepage trust conversion, a couple watching a vertical 9:16 social reel outside Craft Coffee Roastery and walking inside, FlowDirector scaling 20+ accounts, monthly seasonal refreshes, and a golden-hour Main Street hero pull-back.",
    "artStyleLock": "Anamorphic Commercial Brand Cinema · Golden-Hour Sunbeams, Rich Tactile Steam & Authentic Main Street Warmth · Zero Logos or Signage Text",
    "unitEconomicsHook": "30M+ independent clinics, law & architecture studios, craft roasters, and neighborhood restaurants worldwide need authentic homepage trust films and 9:16 social ad reels, yet $5,000+ commercial agencies price them out and disrupt business hours → ~$110 SceneFlow cost (~$22 compute credits + ~2 hrs) → $399–$1,200 brand & social ad bundles + monthly seasonal ad retainers across 20+ active SMB accounts.",
    "backgroundMusic": {
      "title": "Main Street Anthem (1:50 Warm Acoustic, Wurlitzer & Chamber Strings Score)",
      "bpmAndKey": "98 BPM · G Major",
      "mixLevel": "25% volume (-12 dB) ducked cleanly under lip-sync dialogue and narration VO",
      "generationPrompt": "Instrumental boutique brand anthem and craft Main Street commercial score, 110 seconds (1:50), 98 BPM, G major. 0:00-0:40 (Act I) warm fingerpicked acoustic guitar, upright wood bass, and brushed snare rim-clicks with intimate analog room warmth. 0:40-1:20 (Act II) soulful Wurlitzer electric piano, driving hand-percussion groove, and uplifting chamber strings building entrepreneurial momentum. 1:20-1:50 (Act III) triumphant, heartwarming cinematic acoustic-orchestral Main Street swell resolving on a resonant G-major chord. Instrumental only, no vocals."
    },
    "referenceLocks": [
      {
        "token": "person [1]",
        "category": "Cast",
        "name": "Leo Morales",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Charismatic 40-year-old artisan coffee roaster & café founder, short wavy dark hair, neatly trimmed beard, warm expressive brown eyes, weathered olive canvas apron over rolled-sleeve chambray shirt."
      },
      {
        "token": "person [2]",
        "category": "Cast",
        "name": "Elena Lindqvist",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Warm, trustworthy 39-year-old boutique dental & wellness founder, shoulder-length blonde hair, reassuring smile, crisp tailored white clinical coat over sage silk blouse."
      },
      {
        "token": "person [3]",
        "category": "Cast",
        "name": "Chef Mateo Rossi",
        "role": "Continuity & Likeness Character Lock",
        "promptDescription": "Passionate 43-year-old neighborhood bistro chef-owner, salt-and-pepper curls, charcoal linen chef shirt with rolled sleeves, brass plating tweezers."
      },
      {
        "token": "location [1]",
        "category": "Location",
        "name": "Craft Coffee Roastery",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Inviting brick-and-timber neighborhood roastery at dawn, gleaming copper drum roaster, golden sunbeams slicing through aromatic steam, warm oak espresso bar, sunny brick sidewalk entrance with olive trees, zero text."
      },
      {
        "token": "location [2]",
        "category": "Location",
        "name": "Wellness Clinic Lounge",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Architectural sunlit Scandinavian travertine clinic reception, warm vertical oak slats, indoor olive tree, serene consultation doorway, zero signage words."
      },
      {
        "token": "location [3]",
        "category": "Location",
        "name": "Neighborhood Bistro Kitchen",
        "role": "Architectural & Lighting Continuity Set",
        "promptDescription": "Intimate open-flame evening bistro pass, gleaming copper pans, handmade stoneware under warm 2800K pass lamps, glowing candlelit dining room beyond, zero signage text."
      },
      {
        "token": "prop [1]",
        "category": "Prop",
        "name": "Brass Sample Tryer",
        "role": "Hero Continuity Prop Lock",
        "promptDescription": "Polished vintage brass coffee roaster sample tryer filled with glossy freshly roasted espresso beans releasing wisps of aromatic smoke."
      }
    ],
    "blocks": [
      {
        "blockNumber": 1,
        "title": "Dawn Founder Hook & 30M+ Priced-Out SMBs",
        "timecode": "0:00–0:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Craft Coffee Roastery as golden dawn sunbeams slice through warm aromatic steam, Leo Morales slides Brass Sample Tryer out of the gleaming copper drum roaster. 2s–8s (Action): Leo Morales looks warmly into the camera with authentic craft pride and speaks clearly, then releases the roaster hatch as glossy espresso beans cascade into the spinning cooling tray. 8s–10s (End frame): Warm golden-backlit medium portrait of Leo Morales smiling beside the swirling roast. Camera: Smooth clockwise gimbal arc around the copper roaster. The only spoken line is: Leo Morales says: \"Big chains buy speed. We roast every batch at dawn.\"",
        "cameraAndLighting": "Smooth clockwise gimbal arc around the copper roaster. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Warm golden-backlit medium portrait of Leo Morales smiling beside the swirling roast.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "Leo Morales Lip-Sync (0.6s–3.3s): \"Big chains buy speed. We roast every batch at dawn.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Over thirty million local businesses need authentic video to win trust—yet five-thousand-dollar agencies lock them out.\""
          },
          "es": {
            "inSceneDialogue": "Leo Morales Lip-Sync (0.6s–3.3s): \"Las cadenas compran prisa. Nosotros tostamos cada lote al amanecer.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Más de treinta millones de negocios locales necesitan video auténtico para ganar confianza, pero agencias de cinco mil dólares los excluyen.\""
          },
          "pt": {
            "inSceneDialogue": "Leo Morales Lip-Sync (0.6s–3.3s): \"Grandes redes compram pressa. Nós torramos cada lote ao amanhecer.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Mais de trinta milhões de negócios locais precisam de vídeo autêntico para gerar confiança, mas agências de cinco mil dólares são inviáveis.\""
          },
          "hi": {
            "inSceneDialogue": "Leo Morales Lip-Sync (0.6s–3.3s): \"बड़ी चेन रफ़्तार चुनती हैं। हम हर बैच सुबह खुद भूनते हैं।\"",
            "narrationVo": "VO (3.9s–9.4s): \"तीन करोड़ से अधिक स्थानीय व्यवसायों को भरोसा जीतने के लिए वीडियो चाहिए, पर पाँच हज़ार डॉलर की एजेंसियाँ उन्हें रोक देती हैं।\""
          },
          "zh": {
            "inSceneDialogue": "Leo Morales Lip-Sync (0.6s–3.3s): \"大连锁追求流水线速度，而我们坚持在黎明手工慢烘每一炉豆子。\"",
            "narrationVo": "VO (3.9s–9.4s): \"全球超过三千万家本地商户亟需真诚视频建立信任，却被五千美元起步的广告公司拒之门外。\""
          },
          "ar": {
            "inSceneDialogue": "Leo Morales Lip-Sync (0.6s–3.3s): \"السلاسل الكبرى تشتري السرعة، أما نحن فنحمّص كل دفعة فجراً.\"",
            "narrationVo": "VO (3.9s–9.4s): \"أكثر من ثلاثين مليون مشروع محلي يحتاج لفيديو صادق يبني الثقة، لكن تكلفة الوكالات البالغة خمسة آلاف دولار تمنعهم.\""
          },
          "th": {
            "inSceneDialogue": "Leo Morales Lip-Sync (0.6s–3.3s): \"แบรนด์ใหญ่เน้นความเร็ว แต่เราคั่วกาแฟสดด้วยมือทุกหม้อตั้งแต่รุ่งสาง\"",
            "narrationVo": "VO (3.9s–9.4s): \"ธุรกิจท้องถิ่นกว่าสามสิบล้านแห่งต้องการวิดีโอสร้างความเชื่อมั่น แต่สู้ค่าเอเจนซี่ห้าพันดอลลาร์ไม่ไหว\""
          }
        }
      },
      {
        "blockNumber": 2,
        "title": "Sensory Commercial Craft Without Closing Shop",
        "timecode": "0:10–0:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): At the warm oak bar inside Craft Coffee Roastery, rich hazelnut-gold espresso crema streams smoothly into a handmade ceramic cup. 2s–8s (Action): Leo Morales pours silky micro-foam tulip art into the cup and slides it across the oak counter to a smiling neighborhood regular. 8s–10s (End frame): Genuine eye contact and warm morning connection across the espresso bar. Camera: Continuous upward tilt and smooth pull-back from macro pour to medium two-shot. No spoken dialogue.",
        "cameraAndLighting": "Continuous upward tilt and smooth pull-back from macro pour to medium two-shot. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Genuine eye contact and warm morning connection across the espresso bar.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow brings national commercial cinema to independent cafés, clinics, and studios—without ever shutting down their shop for a crew.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow lleva cine comercial de primer nivel a cafés, clínicas y estudios independientes sin cerrar jamás sus puertas por un rodaje.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"O SceneFlow leva cinema comercial de alto nível a cafeterias, clínicas e estúdios locais sem fechar as portas para filmagens.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow स्वतंत्र कैफ़े, क्लिनिक और स्टूडियो को राष्ट्रीय स्तर का कमर्शियल सिनेमा देता है—बिना दुकान बंद किए या क्रू बुलाए।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow 为街边精品咖啡馆、诊所与工作室赋予顶级商业大片质感，且全程无需停业接待剧组。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يمنح SceneFlow المقاهي والعيادات والمكاتب المستقلة إعلانات بمستوى سينمائي عالمي دون إغلاق المتجر للتصوير.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"SceneFlow มอบหนังโฆษณาระดับภาพยนตร์ให้คาเฟ่ คลินิก และสตูดิโออิสระ โดยไม่ต้องปิดร้านรับกองถ่ายแม้แต่นาทีเดียว\""
          }
        }
      },
      {
        "blockNumber": 3,
        "title": "Boutique Clinic & Professional Services Trust (~$110 Cost)",
        "timecode": "0:20–0:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside sunlit Wellness Clinic Lounge beside honed travertine stone and olive branches, Elena Lindqvist steps forward in her crisp white coat. 2s–8s (Action): Elena Lindqvist greets a slightly hesitant first-time client with a warm two-hand welcome gesture, immediately putting her at ease as they walk toward a bright consultation suite. 8s–10s (End frame): Calm, high-trust two-shot bathed in natural morning window light. Camera: Smooth lateral gimbal glide following their welcoming walk. No spoken dialogue.",
        "cameraAndLighting": "Smooth lateral gimbal glide following their welcoming walk. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Calm, high-trust two-shot bathed in natural morning window light.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Deliver high-converting homepage trust films for dental practices, law firms, and wellness clinics at roughly one hundred ten dollars total cost.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Entrega películas de confianza para clínicas dentales, despachos legales y centros de bienestar con un costo total cercano a ciento diez dólares.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Entregue filmes de confiança para clínicas odontológicas, escritórios de advocacia e estética com custo total em torno de cento e dez dólares.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"डेंटल क्लिनिक, लॉ फ़र्म और वेलनेस सेंटर के लिए होमपेज ब्रांड फ़िल्म केवल लगभग एक सौ दस डॉलर की कुल लागत में तैयार करें।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"为口腔诊所、律所与康美空间定制高转化官网信任大片，综合交付成本仅约一百一十美元。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"سلّم أفلام ثقة للموقع الإلكتروني لعيادات الأسنان ومكاتب المحاماة بتكلفة كاملة تقارب مئة وعشرة دولارات فقط.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ส่งมอบหนังสร้างความเชื่อมั่นบนหน้าเว็บให้คลินิกทันตกรรมและสำนักงานกฎหมาย ด้วยต้นทุนรวมเพียงราวร้อยสิบดอลลาร์\""
          }
        }
      },
      {
        "blockNumber": 4,
        "title": "Culinary & High-Margin Local Hospitality Range",
        "timecode": "0:30–0:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside Neighborhood Bistro Kitchen during vibrant evening service, Chef Mateo Rossi sears a pan glaze with a brief golden flame flare beneath warm pass lamps. 2s–8s (Action): Chef Mateo Rossi places delicate micro-herbs with brass tweezers onto glazed stoneware before a server lifts the finished plate toward the glowing candlelit dining room. 8s–10s (End frame): Chef Mateo Rossi inspecting the pass with quiet artisan pride. Camera: Dynamic lateral tracking pass along gleaming copper cookware. No spoken dialogue.",
        "cameraAndLighting": "Dynamic lateral tracking pass along gleaming copper cookware. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Chef Mateo Rossi inspecting the pass with quiet artisan pride.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"From neighborhood bistros to architectural design studios, every local founder gets a bespoke visual story tailored to their craft.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Desde restaurantes de autor hasta estudios de arquitectura, cada fundador local obtiene una historia hecha a la medida de su oficio.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"De bistrôs autorais a escritórios de arquitetura, cada empreendedor ganha uma narrativa visual sob medida para o seu talento.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"लोकल बिस्ट्रो से लेकर आर्किटेक्चर स्टूडियो तक, हर संस्थापक को उसके हुनर के अनुरूप विशिष्ट सिनेमाई कहानी मिलती है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"从主厨私房餐厅到建筑设计事务所，每一位独立创始人都能拥有量身定制的匠心故事。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"من المطاعم المتخصصة إلى مكاتب التصميم المعماري، يحصل كل مؤسس محلي على قصة بصرية تعكس حرفته.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ตั้งแต่ร้านอาหารโฮมเมดไปจนถึงสตูดิโอออกแบบ ผู้ก่อตั้งทุกรายจะได้หนังที่ถ่ายทอดตัวตนและความใส่ใจอย่างแท้จริง\""
          }
        }
      },
      {
        "blockNumber": 5,
        "title": "Five-Minute Smartphone Intake Before Opening Doors",
        "timecode": "0:40–0:50",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Quiet early morning inside Wellness Clinic Lounge before patients arrive, Elena Lindqvist holds her smartphone horizontally capturing sunlit reference photos of the travertine reception lounge. 2s–8s (Action): Elena Lindqvist reviews the clean visual photo on her phone with zero text, taps send with an effortless smile, and turns to greet her receptionist with zero cables, lights, or crew blocking the floor. 8s–10s (End frame): Sunlit clinic reception ready for morning patients. Camera: Smooth over-the-shoulder arc into medium framing. No spoken dialogue.",
        "cameraAndLighting": "Smooth over-the-shoulder arc into medium framing. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Sunlit clinic reception ready for morning patients.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Owners snap a few reference photos on their phone before opening—locking real storefronts, interiors, and faces in Continuity Vault.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"El dueño toma unas fotos con su móvil antes de abrir, fijando fachadas, interiores y rostros reales en la Bóveda de Continuidad.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"O proprietário tira algumas fotos pelo celular antes de abrir, travando fachada, ambiente e rostos reais no Cofre de Continuidade.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"दुकान खुलने से पहले मालिक फ़ोन से कुछ फ़ोटो भेजते हैं—जिससे असली इंटीरियर और चेहरे Continuity Vault में लॉक हो जाते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"店主只需在营业前用手机拍几张实景照片，即可在连续性资产库中锁定真实门头、空间与人物形象。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"يلتقط صاحب المشروع بضع صور بهاتفه قبل الافتتاح لتثبيت الواجهة والتصميم الداخلي والملامح في خزنة الاتساق.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"เจ้าของร้านเพียงถ่ายรูปสถานที่จริงด้วยมือถือก่อนเปิดร้าน เพื่อล็อกหน้าร้าน บรรยากาศ และใบหน้าไว้ในคลังความต่อเนื่อง\""
          }
        }
      },
      {
        "blockNumber": 6,
        "title": "Widescreen Homepage Story Winning Household Trust",
        "timecode": "0:50–1:00",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): At a sunlit neighborhood home kitchen table, a local couple watches an open laptop playing the warm widescreen film of Elena Lindqvist welcoming patients inside Wellness Clinic Lounge with zero screen text. 2s–8s (Action): The wife turns to her husband with visible relief and confidence, then taps the trackpad to book their first visit. 8s–10s (End frame): Smiling couple relaxed over morning coffee beside the laptop. Camera: Smooth arc from over-shoulder laptop view to warm two-shot. No spoken dialogue.",
        "cameraAndLighting": "Smooth arc from over-shoulder laptop view to warm two-shot. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Smiling couple relaxed over morning coffee beside the laptop.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"When local families visit a website and experience cinema-grade warmth instead of stock photos, hesitation turns into booked appointments.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Cuando las familias visitan una web y sienten calidez cinematográfica en vez de fotos genéricas, las dudas se convierten en citas.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Quando clientes visitam o site e sentem acolhimento de cinema em vez de fotos genéricas, a dúvida vira agendamento imediato.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"जब स्थानीय परिवार वेबसाइट पर स्टॉक फ़ोटो के बजाय आत्मीय सिनेमा देखते हैं, तो झिझक तुरंत अपॉइंटमेंट बुकिंग में बदल जाती है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"当周边家庭打开官网，看到电影级温暖故事而非冰冷图库时，犹豫瞬间化作到店预约。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"عندما تزور العائلات الموقع الإلكتروني وتشاهد دفئاً سينمائياً بدلاً من الصور الجاهزة، يتحول التردد إلى حجز فوري.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"เมื่อลูกค้าเข้าเว็บไซต์แล้วสัมผัสความอบอุ่นระดับภาพยนตร์แทนภาพสต็อกทั่วไป ความลังเลก็เปลี่ยนเป็นการนัดหมายทันที\""
          }
        }
      },
      {
        "blockNumber": 7,
        "title": "Vertical 9:16 Social Ad Driving Real Foot Traffic",
        "timecode": "1:00–1:10",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): On the sunny brick sidewalk outside Craft Coffee Roastery beside potted olive trees, a young couple watches a vibrant nine-by-sixteen vertical clip of Leo Morales holding Brass Sample Tryer on their smartphone with zero text. 2s–8s (Action): Smiling, the couple pockets the phone and pushes open the timber-and-glass storefront door directly into Craft Coffee Roastery as Leo Morales waves warmly from behind the bar. 8s–10s (End frame): Lively welcoming doorway framing new customers entering. Camera: Continuous upward tilt from vertical phone screen into forward Steadicam follow. No spoken dialogue.",
        "cameraAndLighting": "Continuous upward tilt from vertical phone screen into forward Steadicam follow. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Lively welcoming doorway framing new customers entering.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"One master production automatically outputs both the widescreen homepage film and vertical nine-by-sixteen Reels, TikTok, and Shorts.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Una sola producción genera automáticamente el filme horizontal para la web y anuncios verticales nueve dieciséis para Reels, TikTok y Shorts.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Uma única produção exporta automaticamente o filme horizontal do site e anúncios verticais nove por dezesseis para Reels, TikTok e Shorts.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"एक ही मास्टर प्रोडक्शन से वेबसाइट की वाइडस्क्रीन फ़िल्म और Reels, TikTok व Shorts के वर्टिकल विज्ञापन स्वतः निकलते हैं।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"一次主片制作自动同步输出官网横屏故事片，以及适配抖音、TikTok 与 Reels 的竖屏引流广告。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"إنتاج رئيسي واحد يخرج تلقائياً فيلم الموقع الأفقي مع إعلانات عمودية جاهزة لـ Reels وTikTok وShorts.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ผลิตเพียงครั้งเดียว ได้ครบทั้งหนังแนวนอนขึ้นหน้าเว็บ และคลิปแนวตั้งเก้าต่อสิบหกสำหรับ Reels, TikTok และ Shorts\""
          }
        }
      },
      {
        "blockNumber": 8,
        "title": "Multilingual Community Reach & FlowDirector 20+ Account QA",
        "timecode": "1:10–1:20",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Inside a sunlit exposed-brick creative studio, a solo local agency producer reviews clean widescreen and vertical visual frames of Leo Morales, Elena Lindqvist, and Chef Mateo Rossi on a sleek display with zero text. 2s–8s (Action): The producer clicks once to approve final polish while a smiling client thumbs-up video reaction appears on a companion mobile stand. 8s–10s (End frame): Composed solo producer managing a full Main Street client roster effortlessly. Camera: Smooth lateral dolly glide behind the desk. No spoken dialogue.",
        "cameraAndLighting": "Smooth lateral dolly glide behind the desk. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Composed solo producer managing a full Main Street client roster effortlessly.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Serve multicultural neighborhoods in seventy-plus languages while FlowDirector automates quality checks across twenty concurrent accounts.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Llega a comunidades diversas en más de setenta idiomas mientras FlowDirector automatiza el control de calidad en veinte cuentas activas.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Atenda bairros multiculturais em mais de setenta idiomas enquanto o FlowDirector automatiza a revisão em vinte contas simultâneas.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"सत्तर से अधिक भाषाओं में स्थानीय बाज़ारों तक पहुँचें, जबकि FlowDirector एक साथ बीस सक्रिय खातों की गुणवत्ता सँभालता है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"支持七十多种语言触达多元社区，配合 FlowDirector 智能质检轻松并行交付二十个本地客户。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"خاطب الأحياء متعددة الثقافات بأكثر من سبعين لغة بينما يضبط FlowDirector الجودة عبر عشرين حساباً نشطاً.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"เข้าถึงกลุ่มลูกค้าหลากหลายภาษาได้กว่าเจ็ดสิบภาษา ขณะที่ FlowDirector ช่วยตรวจคุณภาพให้คุณดูแลลูกค้ายี่สิบรายพร้อมกัน\""
          }
        }
      },
      {
        "blockNumber": 9,
        "title": "Booked-Solid Client Payoff",
        "timecode": "1:20–1:30",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): Standing in the sunlit oak archway of Wellness Clinic Lounge with happy arriving clients softly visible behind her, Elena Lindqvist faces the camera with genuine gratitude. 2s–8s (Action): Elena Lindqvist speaks warmly and naturally toward the lens while her receptionist welcomes an arriving patient in the background. 8s–10s (End frame): Luminous medium close-up of Elena Lindqvist’s trustworthy smile. Camera: Gentle forward dolly push-in. The only spoken line is: Elena Lindqvist says: \"Patients walk in feeling like they already know us.\"",
        "cameraAndLighting": "Gentle forward dolly push-in. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "Lip-Sync + VO · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Luminous medium close-up of Elena Lindqvist’s trustworthy smile.",
        "localizedCues": {
          "en": {
            "inSceneDialogue": "Elena Lindqvist Lip-Sync (0.6s–3.3s): \"Patients walk in feeling like they already know us.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Clients approve every cut from their phone inside Screening Room—turning happy owners into neighborhood referrals.\""
          },
          "es": {
            "inSceneDialogue": "Elena Lindqvist Lip-Sync (0.6s–3.3s): \"Los pacientes entran sintiendo que ya nos conocen.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Tus clientes aprueban cada corte desde su móvil en Screening Room y te recomiendan en toda su calle comercial.\""
          },
          "pt": {
            "inSceneDialogue": "Elena Lindqvist Lip-Sync (0.6s–3.3s): \"Os pacientes chegam sentindo que já nos conhecem.\"",
            "narrationVo": "VO (3.9s–9.4s): \"Seus clientes aprovam tudo pelo celular na Screening Room e geram indicações entre lojistas vizinhos.\""
          },
          "hi": {
            "inSceneDialogue": "Elena Lindqvist Lip-Sync (0.6s–3.3s): \"मरीज़ अंदर आते ही महसूस करते हैं कि वे हमें पहले से जानते हैं।\"",
            "narrationVo": "VO (3.9s–9.4s): \"क्लाइंट फ़ोन पर Screening Room में फ़िल्म पास करते हैं और पड़ोसी व्यापारियों को तुरंत आपका नाम सुझाते हैं।\""
          },
          "zh": {
            "inSceneDialogue": "Elena Lindqvist Lip-Sync (0.6s–3.3s): \"患者走进诊所时，感觉就像认识了我们很久一样安心。\"",
            "narrationVo": "VO (3.9s–9.4s): \"客户在手机端 Screening Room 即可一键审片，满意口碑自然带来整条商业街的转介绍。\""
          },
          "ar": {
            "inSceneDialogue": "Elena Lindqvist Lip-Sync (0.6s–3.3s): \"يدخل المراجعون إلينا وهم يشعرون بأنهم يعرفوننا مسبقاً.\"",
            "narrationVo": "VO (3.9s–9.4s): \"يعتمد العملاء النسخ من هواتفهم في غرفة العرض، فتتحول سعادتهم إلى إحالات في الحي بأكمله.\""
          },
          "th": {
            "inSceneDialogue": "Elena Lindqvist Lip-Sync (0.6s–3.3s): \"คนไข้เดินเข้ามาด้วยความสบายใจ เหมือนรู้จักเรามาก่อนแล้ว\"",
            "narrationVo": "VO (3.9s–9.4s): \"ลูกค้ากดอนุมัติผ่านมือถือใน Screening Room ได้ทันที และช่วยบอกต่อธุรกิจข้างเคียงในย่านเดียวกัน\""
          }
        }
      },
      {
        "blockNumber": 10,
        "title": "Seasonal Campaigns & Monthly Social Retainers",
        "timecode": "1:30–1:40",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): On a crisp golden autumn afternoon inside Craft Coffee Roastery with amber fall leaves outside the window, Leo Morales in his olive canvas apron dusts cinnamon over two seasonal cortados on a walnut tray. 2s–8s (Action): Leo Morales carries the walnut tray to a sunlit window table for two delighted guests, showcasing a fresh monthly campaign without re-shooting on location. 8s–10s (End frame): Warm seasonal café moment glowing in afternoon light. Camera: Smooth Steadicam follow alongside Leo Morales. No spoken dialogue.",
        "cameraAndLighting": "Smooth Steadicam follow alongside Leo Morales. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Warm seasonal café moment glowing in afternoon light.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Because Continuity Vault saves every character and set, launching fresh seasonal promos each month takes under two hours and twenty-two dollars in credits.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Como Continuidad guarda cada rostro y local, lanzar campañas de temporada cada mes toma menos de dos horas y veintidós dólares en créditos.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Como a Continuidade salva cada personagem e cenário, criar campanhas sazonais todo mês leva menos de duas horas e vinte e dois dólares em créditos.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"क्योंकि किरदार और सेट सेव रहते हैं, हर महीने नए सीज़नल विज्ञापन बनाना दो घंटे से कम और बाईस डॉलर क्रेडिट में पूरा हो जाता है।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"由于角色与门店资产永久留存，每月推出换季新品短片仅需不到两小时和二十二美元算力积分。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"ولأن الشخصيات والأماكن محفوظة، يستغرق إطلاق حملات موسمية كل شهر أقل من ساعتين واثنين وعشرين دولاراً من الرصيد.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"เพราะตัวละครและฉากถูกบันทึกไว้แล้ว การทำแคมเปญโปรโมชันรายเดือนจึงใช้เวลาไม่ถึงสองชั่วโมงกับเครดิตยี่สิบสองดอลลาร์\""
          }
        }
      },
      {
        "blockNumber": 11,
        "title": "Golden-Hour Main Street Hero Pull-Back & Close",
        "timecode": "1:40–1:50",
        "durationSeconds": 10,
        "videoModel": "Google Omni 1.2 Flash (10s)",
        "videoPrompt": "0s–2s (Start frame): At the open timber entrance of Craft Coffee Roastery at golden hour, Leo Morales stands proudly beside Brass Sample Tryer on the counter edge with warm Edison bulbs and happy guests behind him. 2s–8s (Action): Leo Morales folds his arms with a fulfilled founder smile as the view pulls steadily backward out onto the lively, sun-drenched neighborhood street. 8s–10s (End frame): Iconic Main Street founder portrait framed by the glowing roastery doorway. Camera: Sweeping symmetrical dolly pull-back onto the sunlit sidewalk. No spoken dialogue.",
        "cameraAndLighting": "Sweeping symmetrical dolly pull-back onto the sunlit sidewalk. Google Omni 1.2 Flash Standard REF mode (up to 8 Continuity Ingredients, omniMultiShot=false).",
        "sfxAndMix": "VO Only · Studio dialogue/VO at 0 dB (-16 LUFS) over 25% (-12 dB) external score.",
        "settleOn": "Iconic Main Street founder portrait framed by the glowing roastery doorway.",
        "localizedCues": {
          "en": {
            "narrationVo": "VO (0.5s–9.4s): \"Sell four-hundred to twelve-hundred-dollar brand packs plus monthly social ad retainers—and build a thriving Main Street agency on SceneFlow.\""
          },
          "es": {
            "narrationVo": "VO (0.5s–9.4s): \"Vende paquetes de cuatrocientos a mil doscientos dólares más igualas mensuales de anuncios y crea tu agencia local con SceneFlow.\""
          },
          "pt": {
            "narrationVo": "VO (0.5s–9.4s): \"Venda pacotes de quatrocentos a mil e duzentos dólares mais planos mensais de anúncios e construa sua agência local no SceneFlow.\""
          },
          "hi": {
            "narrationVo": "VO (0.5s–9.4s): \"चार सौ से बारह सौ डॉलर के ब्रांड पैकेज और मासिक एड रिटेनर बेचें—SceneFlow पर अपनी उच्च-लाभ एजेंसी बनाएँ।\""
          },
          "zh": {
            "narrationVo": "VO (0.5s–9.4s): \"销售四百至一千二百美元的品牌套餐并绑定包月社媒广告，在 SceneFlow 打造高利润本地视频机构。\""
          },
          "ar": {
            "narrationVo": "VO (0.5s–9.4s): \"قدّم باقات بين أربعمئة وألف ومئتي دولار مع عقود إعلانات شهرية، وابنِ وكالتك المحلية الرابحة عبر SceneFlow.\""
          },
          "th": {
            "narrationVo": "VO (0.5s–9.4s): \"ขายแพ็กเกจสี่ร้อยถึงพันสองร้อยดอลลาร์พร้อมสัญญาโฆษณารายเดือน สร้างเอเจนซี่ท้องถิ่นกำไรสูงของคุณบน SceneFlow\""
          }
        }
      }
    ]
  }
}
