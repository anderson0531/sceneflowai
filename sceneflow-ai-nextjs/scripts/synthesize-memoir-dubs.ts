import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

type DubLocale = 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'
type SpeakerRole = 'ELENA' | 'NARRATOR'

interface BlockCue {
  blockNumber: number
  speaker: SpeakerRole
  startSec: number
  maxDurSec: number
  translations: Record<DubLocale, string>
}

export const VIDEO_MEMOIR_DUB_CUES: BlockCue[] = [
  {
    blockNumber: 1,
    speaker: 'ELENA',
    startSec: 2.10,
    maxDurSec: 6.60,
    translations: {
      es: 'Cuando estuve en el Muelle catorce en mil novecientos sesenta y seis, no había cámara para grabarnos, solo la lluvia y el recetario de mi madre.',
      pt: 'Quando estive no Píer quatorze em mil novecentos e sessenta e seis, não havia câmera para nos filmar, apenas a chuva e o caderno de receitas da minha mãe.',
      hi: 'जब मैं उन्नीस सौ छियासठ में पियर चौदह पर खड़ी थी, तब हमें फ़िल्माने के लिए कोई कैमरा नहीं था—सिर्फ़ बारिश और मेरी माँ की रेसिपी की किताब थी।',
      zh: '一九六六年我站在十四号码头时，没有摄影机记录我们，只有雨水和母亲的食谱笔记本。',
      ar: 'عندما وقفتُ على الرصيف الرابع عشر عام ألفٍ وتسعمئةٍ وستةٍ وستين، لم تكن هناك كاميرا لتصويرنا، فقط المطر ودفتر وصفات والدتي.',
      th: 'ตอนที่ฉันยืนอยู่ที่ท่าเรือสิบสี่ในปีหนึ่งเก้าหกหก ไม่มีกล้องถ่ายพวกเราเลย มีเพียงสายฝนและสมุดสูตรอาหารของแม่',
    },
  },
  {
    blockNumber: 2,
    speaker: 'NARRATOR',
    startSec: 8.85,
    maxDurSec: 8.25,
    translations: {
      es: 'Sube una entrevista familiar y unas cuantas fotos, y da vida a recuerdos nunca filmados con continuidad de edad bloqueada.',
      pt: 'Envie uma entrevista de família e algumas fotos, e dê vida a memórias nunca filmadas com continuidade de idade preservada.',
      hi: 'एक पारिवारिक इंटरव्यू और कुछ तस्वीरें अपलोड करें—और उम्र की निरंतरता के साथ अनदेखी यादों को जीवंत करें।',
      zh: '上传一段家庭访谈和几张老照片，以跨年代锁定的一致性，让未曾拍下的记忆重现银幕。',
      ar: 'ارفع مقابلة عائلية وبضع صور، وأعد الحياة إلى ذكريات لم تُصوَّر من قبل مع ثبات الملامح عبر السنين.',
      th: 'อัปโหลดบทสัมภาษณ์ครอบครัวและภาพถ่ายเพียงไม่กี่ใบ แล้วปลุกความทรงจำที่ไม่เคยถูกถ่ายทำไว้ให้มีชีวิตด้วยความต่อเนื่องของใบหน้าในทุกช่วงวัย',
    },
  },
  {
    blockNumber: 3,
    speaker: 'NARRATOR',
    startSec: 17.70,
    maxDurSec: 8.80,
    translations: {
      es: 'Recrea el momento exacto en que comenzó la historia familiar, con rostros, reliquias y escenarios de época consistentes.',
      pt: 'Recrie os momentos exatos em que a história da família começou, com rostos, relíquias e cenários de época fiéis.',
      hi: 'परिवार की कहानी शुरू होने के सटीक पलों को फिर से रचें—स्थिर चेहरों, धरोहरों और उस दौर के सेट के साथ।',
      zh: '精准重现家族故事开启的瞬间——锁定人物面容、传家宝与年代布景。',
      ar: 'أعد تجسيد اللحظات الدقيقة التي بدأت فيها قصة العائلة، بملامح ثابتة ومقتنياتٍ موروثة وديكوراتٍ تاريخية.',
      th: 'สร้างช่วงเวลาเริ่มต้นของเรื่องราวครอบครัวขึ้นมาใหม่ พร้อมใบหน้า ของรักประจำตระกูล และฉากย้อนยุคที่คงเดิม',
    },
  },
  {
    blockNumber: 4,
    speaker: 'ELENA',
    startSec: 27.40,
    maxDurSec: 8.70,
    translations: {
      es: 'Nuestro primer invierno en Mulberry Street se rompió el radiador, así que Mateo encendió el horno de ladrillo a las cuatro de la mañana para salvar la masa madre.',
      pt: 'No nosso primeiro inverno na Mulberry Street, o aquecedor quebrou, então Mateo acendeu o forno de tijolos às quatro da manhã só para manter o fermento vivo.',
      hi: 'मलबेरी स्ट्रीट पर हमारी पहली सर्दी में हीटर खराब हो गया—इसलिए मातेओ ने सुबह चार बजे ईंटों की भट्ठी जलाई ताकि खमीर ज़िंदा रहे।',
      zh: '我们在桑树街的第一个冬天，暖气坏了，马特奥在凌晨四点点燃砖炉，只为保住那罐酵种。',
      ar: 'في شتائنا الأول بشارع مالبيري تعطلت المدفأة، فأشعل ماتيو فرن الطوب في الرابعة فجراً فقط ليُبقي الخميرة الأم حية.',
      th: 'ฤดูหนาวแรกของเราบนถนนมัลเบอร์รี ฮีตเตอร์เสีย มาเตโอจึงจุดเตาอิฐตั้งแต่ตีสี่เพื่อรักษาหัวเชื้อขนมปังไว้',
    },
  },
  {
    blockNumber: 5,
    speaker: 'NARRATOR',
    startSec: 38.10,
    maxDurSec: 7.40,
    translations: {
      es: 'Lanza un estudio de memorias en video de alto margen, entregando películas de legado con calidad televisiva en una sola tarde.',
      pt: 'Lance um estúdio de memórias em vídeo de alta margem, entregando filmes de legado com qualidade de cinema em uma única tarde.',
      hi: 'एक उच्च-मार्जिन वीडियो मेमॉयर स्टूडियो शुरू करें—एक ही दोपहर में प्रसारण-स्तर की विरासत फ़िल्में तैयार करें।',
      zh: '打造高利润的视频回忆录工作室，在一个下午内交付广播级的家族传记电影。',
      ar: 'أطلق استوديو أفلام مذكرات عالي الربحية، وقدّم أفلام إرثٍ عائلي بجودة سينمائية في ظهيرةٍ واحدة.',
      th: 'เปิดตัวสตูดิโอภาพยนตร์อัตชีวประวัติมูลค่าสูง ส่งมอบภาพยนตร์มรดกครอบครัวระดับออกอากาศได้ภายในบ่ายเดียว',
    },
  },
  {
    blockNumber: 6,
    speaker: 'NARRATOR',
    startSec: 46.20,
    maxDurSec: 7.80,
    translations: {
      es: 'Cada reliquia, cada época y cada voz, preservadas para la próxima generación en cualquier idioma.',
      pt: 'Cada relíquia, cada época e cada voz, preservadas para a próxima geração em qualquer idioma.',
      hi: 'हर धरोहर, हर दौर और हर आवाज़—अगली पीढ़ी के लिए किसी भी भाषा में सुरक्षित।',
      zh: '每一件传家宝、每一个年代、每一种声音，都以任何语言为下一代永久珍藏。',
      ar: 'كلُّ إرثٍ عائلي، وكلُّ حقبة، وكلُّ صوت، محفوظةٌ للجيل القادم بأي لغة.',
      th: 'ทุกของรักประจำตระกูล ทุกยุคสมัย และทุกน้ำเสียง ถูกเก็บรักษาไว้ให้คนรุ่นต่อไปในทุกภาษา',
    },
  },
  {
    blockNumber: 7,
    speaker: 'ELENA',
    startSec: 54.50,
    maxDurSec: 5.10,
    translations: {
      es: 'Dos océanos, tres generaciones y el mismo pan en nuestra mesa esta noche.',
      pt: 'Dois oceanos, três gerações e o mesmo pão em nossa mesa esta noite.',
      hi: 'दो महासागर, तीन पीढ़ियाँ, और आज रात हमारी मेज़ पर वही रोटी।',
      zh: '跨越两片大洋，历经三代人，今晚我们的餐桌上依然是同一款面包。',
      ar: 'محيطان، وثلاثة أجيال، والخبز نفسه على مائدتنا الليلة.',
      th: 'สองมหาสมุทร สามเจเนอเรชัน และขนมปังก้อนเดิมบนโต๊ะอาหารของเราในค่ำคืนนี้',
    },
  },
  {
    blockNumber: 8,
    speaker: 'NARRATOR',
    startSec: 62.70,
    maxDurSec: 10.10,
    translations: {
      es: 'Cartas sobre el agua. Convierte recuerdos hablados en cine y crea un estudio de video a medida en SceneFlow. Imagina las posibilidades.',
      pt: 'Cartas sobre a água. Transforme memórias contadas em cinema e crie um estúdio de vídeo sob medida no SceneFlow. Imagine as possibilidades.',
      hi: 'लेटर्स अक्रॉस द वॉटर। बोली गई यादों को सिनेमा में बदलें और सीनफ़्लो में अपना वीडियो स्टूडियो बनाएं। संभावनाओं की कल्पना करें।',
      zh: '《漂洋过海的家书》。将口述记忆化作电影，在 SceneFlow 打造专属视频工作室。想象无限可能。',
      ar: 'رسائل عبر الماء. حوّل الذكريات المروية إلى سينما، وأنشئ استوديو فيديو مخصصاً في سين فلو. تخيّل الإمكانيات.',
      th: 'จดหมายข้ามผืนน้ำ เปลี่ยนความทรงจำที่บอกเล่าให้เป็นภาพยนตร์ และสร้างสตูดิโอวิดีโอเฉพาะตัวใน SceneFlow จินตนาการถึงความเป็นไปได้',
    },
  },
]

const MINIMAX_VOICE_MAP: Record<SpeakerRole, string> = {
  ELENA: 'Wise_Woman',
  NARRATOR: 'Deep_Voice_Man',
}

const MINIMAX_LANG_BOOST: Record<DubLocale, string> = {
  es: 'Spanish',
  pt: 'Portuguese',
  hi: 'Hindi',
  zh: 'Chinese',
  ar: 'Arabic',
  th: 'Thai',
}

async function synthesizeWithMinimax(
  text: string,
  locale: DubLocale,
  speaker: SpeakerRole
): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) {
    throw new Error('Missing REPLICATE_API_TOKEN in .env.local')
  }
  const voiceId = MINIMAX_VOICE_MAP[speaker]

  let createJson: any = null
  for (let attempt = 1; attempt <= 8; attempt++) {
    const createRes = await fetch(
      'https://api.replicate.com/v1/models/minimax/speech-02-turbo/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=60',
        },
        body: JSON.stringify({
          input: {
            text,
            voice_id: voiceId,
            language_boost: MINIMAX_LANG_BOOST[locale],
            speed: 1.0,
            emotion: 'neutral',
          },
        }),
      }
    )

    if (createRes.status === 429) {
      const body = await createRes.json().catch(() => ({}))
      const waitSec = (Number(body.retry_after) || 10) + 2
      await new Promise((r) => setTimeout(r, waitSec * 1000))
      continue
    }

    if (!createRes.ok) {
      throw new Error(`Minimax create failed (${createRes.status}): ${await createRes.text()}`)
    }
    createJson = await createRes.json()
    break
  }

  if (!createJson) {
    throw new Error('Minimax rate limit exhausted')
  }

  let pred = createJson
  while (pred.status === 'starting' || pred.status === 'processing') {
    await new Promise((r) => setTimeout(r, 1500))
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    pred = await pollRes.json()
  }

  if (pred.status !== 'succeeded' || !pred.output) {
    throw new Error(`Minimax prediction failed: ${JSON.stringify(pred)}`)
  }

  const audioUrl = typeof pred.output === 'string' ? pred.output : pred.output.audio || pred.output[0]
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) {
    throw new Error(`Failed to fetch Minimax output audio: ${audioRes.status}`)
  }
  return Buffer.from(await audioRes.arrayBuffer())
}

const LOCALES: DubLocale[] = ['es', 'pt', 'hi', 'zh', 'ar', 'th']
const OUT_ROOT = join(process.cwd(), 'tmp/memoir-dub/segments')

async function runTask(locale: DubLocale, cue: BlockCue) {
  const dir = join(OUT_ROOT, locale)
  mkdirSync(dir, { recursive: true })
  const outPath = join(dir, `block-${cue.blockNumber}.mp3`)
  if (existsSync(outPath)) {
    console.log(`  [skip] ${locale} block-${cue.blockNumber} already exists`)
    return
  }

  const text = cue.translations[locale]
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const buf = await synthesizeWithMinimax(text, locale, cue.speaker)
      writeFileSync(outPath, buf)
      console.log(
        `  [${locale}] block-${cue.blockNumber} (${cue.speaker}, Minimax-${MINIMAX_VOICE_MAP[cue.speaker]}) -> ${buf.length} bytes`
      )
      return
    } catch (err) {
      console.warn(`  [retry ${attempt}/4] ${locale} block-${cue.blockNumber}: ${(err as Error).message}`)
      if (attempt === 4) throw err
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
}

async function main() {
  const tasks: Array<() => Promise<void>> = []
  for (const locale of LOCALES) {
    for (const cue of VIDEO_MEMOIR_DUB_CUES) {
      tasks.push(() => runTask(locale, cue))
    }
  }

  console.log(`Synthesizing ${tasks.length} Letters Across the Water dub segments...`)
  for (const t of tasks) {
    await t()
  }
  console.log('All 48 multi-character Letters Across the Water dub segments synthesized!')
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
