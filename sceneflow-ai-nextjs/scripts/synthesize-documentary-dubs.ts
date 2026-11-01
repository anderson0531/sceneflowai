#!/usr/bin/env npx tsx
/**
 * Synthesizes 9 time-aligned multi-character dub segments per locale
 * (Spanish, Portuguese, Hindi, Chinese, Arabic, Thai) for "The Long Thought"
 * Documentary trailer using ElevenLabs v3 multilingual voices with automatic
 * fallback to Replicate minimax/speech-02-turbo (Deep_Voice_Man / Wise_Woman / Patient_Man)
 * when ElevenLabs quota is exhausted.
 */

import * as dotenv from 'dotenv'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { synthesizeElevenLabsMp3 } from '../src/lib/elevenlabs/textToSpeech'
import { synthesizeEdgeMp3 } from '../src/lib/tts/synthesizeEdgeMp3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

export type DubLocaleId = 'es' | 'pt' | 'hi' | 'zh' | 'ar' | 'th'

export const TARGET_LOCALES: readonly DubLocaleId[] = [
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

export const DOCUMENTARY_VOICES = {
  NARRATOR: 'pNInz6obpgDQGcFmaJgB', // Adam — Prestige documentary narrator
  AMIRA: 'XrExE9yKIg1WjnnlVkGX', // Matilda — Dr. Amira Hassan (authoritative female logician)
  KENJI: 'ErXwobaYiN019PkySvjV', // Antoni — Kenji Sato (reflective male robotics engineer)
} as const

export type SpeakerRole = keyof typeof DOCUMENTARY_VOICES

export const OPENAI_DOCUMENTARY_VOICES: Record<SpeakerRole, string> = {
  NARRATOR: 'onyx', // Deep authoritative documentary narrator
  AMIRA: 'nova', // Articulate female logician / professor
  KENJI: 'echo', // Calm, reflective male robotics engineer
}

export const MINIMAX_DOCUMENTARY_VOICES: Record<SpeakerRole, string> = {
  NARRATOR: 'Deep_Voice_Man',
  AMIRA: 'Wise_Woman',
  KENJI: 'Patient_Man',
}

export interface DocumentaryDubCue {
  blockNumber: number
  speaker: SpeakerRole
  startSec: number
  maxDurSec: number
  textByLocale: Record<DubLocaleId, string>
}

export const DOCUMENTARY_DUB_CUES: readonly DocumentaryDubCue[] = [
  {
    blockNumber: 1,
    speaker: 'NARRATOR',
    startSec: 1.40,
    maxDurSec: 7.45,
    textByLocale: {
      es: 'Antes de que la inteligencia fuera una nube, era una sala del tamaño de un gimnasio... y un interruptor encendido toda la noche.',
      pt: 'Antes de a inteligência ser uma nuvem, era uma sala do tamanho de um ginásio... e um único interruptor aceso pela noite.',
      hi: 'जब बुद्धिमत्ता कोई क्लाउड नहीं थी, तब वह एक व्यायामशाला जितना बड़ा कमरा थी... और रात भर जलता हुआ एक अकेला स्विच।',
      zh: '在智能成为云端之前，它是一间体育馆大小的机房——以及彻夜亮着的一枚开关。',
      ar: 'قبل أن يصبح الذكاء سحابة، كان غرفة بحجم صالة رياضية... ومفتاحاً واحداً يُترك مضاءً طوال الليل.',
      th: 'ก่อนที่ปัญญาประดิษฐ์จะเป็นระบบคลาวด์ มันเคยเป็นห้องขนาดเท่าโรงยิม... และสวิตช์เพียงตัวเดียวที่เปิดทิ้งไว้ข้ามคืน',
    },
  },
  {
    blockNumber: 2,
    speaker: 'AMIRA',
    startSec: 10.25,
    maxDurSec: 8.00,
    textByLocale: {
      es: 'No buscábamos construir una mente. Queríamos probar si una máquina podía sostener una regla... y cambiar su propio siguiente paso.',
      pt: 'Não planejamos construir uma mente. Queríamos testar se uma máquina podia manter uma regra... e mudar seu próprio próximo passo.',
      hi: 'हमने कोई दिमाग़ बनाने की नहीं सोची थी। हम बस यह परखना चाहते थे कि क्या मशीन एक नियम थामे रखकर अपना अगला क़दम ख़ुद बदल सकती है।',
      zh: '我们起初并非要造出心智，只是想测试机器能否遵循一条规则——并自行改变下一步行动。',
      ar: 'لم نكن نسعى لبناء عقل، بل أردنا اختبار ما إذا كانت الآلة قادرة على حفظ قاعدة... وتغيير خطوتها التالية بنفسها.',
      th: 'เราไม่ได้ตั้งใจจะสร้างจิตใจ เราเพียงต้องการทดสอบว่าเครื่องจักรจะรักษากฎหนึ่งข้อ... แล้วเปลี่ยนก้าวต่อไปของตัวเองได้หรือไม่',
    },
  },
  {
    blockNumber: 3,
    speaker: 'NARRATOR',
    startSec: 20.15,
    maxDurSec: 6.75,
    textByLocale: {
      es: 'A finales de los ochenta, la regla salió del laboratorio... y empezó a discutir con los expertos a su lado.',
      pt: 'No fim dos anos oitenta, a regra saiu do laboratório... e começou a discutir com os especialistas ao seu lado.',
      hi: 'अस्सी के दशक के अंत तक, वह नियम प्रयोगशाला से बाहर निकला... और अपने पास खड़े विशेषज्ञों से बहस करने लगा।',
      zh: '到了八十年代末，这条规则走出实验室——开始与身旁的专家展开争辩。',
      ar: 'بحلول أواخر الثمانينيات، غادرت القاعدة المختبر... وبدأت تجادل الخبراء الواقفين بجانبها.',
      th: 'ปลายทศวรรษแปดศูนย์ กฎนั้นก้าวออกจากห้องทดลอง... และเริ่มโต้เถียงกับผู้เชี่ยวชาญที่ยืนอยู่ข้างๆ',
    },
  },
  {
    blockNumber: 4,
    speaker: 'KENJI',
    startSec: 28.05,
    maxDurSec: 6.95,
    textByLocale: {
      es: 'La línea se detuvo sola a las tres de la mañana. Por primera vez, el sensor confió más en su propio umbral que en el capataz.',
      pt: 'A linha parou sozinha às três da manhã. Pela primeira vez, o sensor confiou no próprio limite mais do que no supervisor.',
      hi: 'सुबह तीन बजे लाइन अपने आप रुक गई। पहली बार, सेंसर ने फ़ोरमैन से ज़्यादा अपनी ख़ुद की सीमा पर भरोसा किया।',
      zh: '凌晨三点，生产线自动停下。传感器第一次越过工头，相信了自己设定的阈值。',
      ar: 'توقّف خط الإنتاج تلقائياً عند الثالثة فجراً. ولأول مرة، وثق المستشعر بحدّه الخاص أكثر من رئيس العمال.',
      th: 'สายการผลิตหยุดเองตอนตีสาม เป็นครั้งแรกที่เซนเซอร์เชื่อค่าขีดจำกัดของตัวเองมากกว่าหัวหน้างาน',
    },
  },
  {
    blockNumber: 5,
    speaker: 'NARRATOR',
    startSec: 37.05,
    maxDurSec: 6.20,
    textByLocale: {
      es: 'Entonces el modelo cruzó el umbral hacia cada redacción, aula y cocina de la Tierra.',
      pt: 'Então o modelo cruzou a fronteira para cada redação, sala de aula e cozinha da Terra.',
      hi: 'फिर उस मॉडल ने धरती के हर न्यूज़-रूम, हर कक्षा और हर रसोई की दहलीज़ पार कर ली।',
      zh: '随后，模型跨过门槛，走进了地球上的每一间新闻室、教室与厨房。',
      ar: 'ثم عبر النموذج العتبة إلى كل غرفة أخبار وفصل دراسي ومطبخ على وجه الأرض.',
      th: 'จากนั้นโมเดลก็ก้าวข้ามธรณีประตู สู่ทุกห้องข่าว ห้องเรียน และห้องครัวบนโลกใบนี้',
    },
  },
  {
    blockNumber: 6,
    speaker: 'NARRATOR',
    startSec: 46.50,
    maxDurSec: 6.60,
    textByLocale: {
      es: 'Hoy, a través de continentes y océanos, los sistemas coordinan el trabajo que manos humanas comenzaron.',
      pt: 'Hoje, através de continentes e oceanos, sistemas coordenam o trabalho que mãos humanas começaram.',
      hi: 'आज महाद्वीपों और महासागरों के पार, ये प्रणालियाँ उस काम को संभालती हैं जिसे इंसानी हाथों ने शुरू किया था।',
      zh: '如今，跨越大陆与大洋，系统正协同运转着由人类双手开启的事业。',
      ar: 'اليوم، عبر القارات والمحيطات، تنسّق الأنظمة أعمالاً بدأتها أيدي البشر.',
      th: 'วันนี้ ข้ามผ่านทวีปและมหาสมุทร ระบบได้ประสานงานที่มือมนุษย์เป็นผู้ริเริ่มไว้',
    },
  },
  {
    blockNumber: 7,
    speaker: 'NARRATOR',
    startSec: 54.75,
    maxDurSec: 8.40,
    textByLocale: {
      es: 'Cada década fiel a sus lentes, su vestuario y sus máquinas... sincronizada automáticamente con la voz del narrador.',
      pt: 'Cada década fiel às suas lentes, figurinos e máquinas... sincronizada automaticamente com a transcrição do narrador.',
      hi: 'हर दशक अपने असली लेंस, पहनावे और मशीनों में पिरोया हुआ... कथावाचक की आवाज़ से अपने आप जुड़ा हुआ।',
      zh: '每一个年代都精准还原真实的镜头、服饰与机器——并与旁白文稿自动同步。',
      ar: 'كل عقد مضبوط بعدساته الحقيقية وأزيائه وآلاته... متزامناً تلقائياً مع نص الراوي.',
      th: 'ทุกทศวรรษคงเอกลักษณ์เลนส์ เครื่องแต่งกาย และเครื่องจักรตามยุคสมัย ซิงค์เข้ากับบทบรรยายโดยอัตโนมัติ',
    },
  },
  {
    blockNumber: 8,
    speaker: 'KENJI',
    startSec: 64.45,
    maxDurSec: 8.65,
    textByLocale: {
      es: '¿Qué le debe un sistema más inteligente que sus creadores a la enfermera, al compositor y a los mil millones que nunca votaron?',
      pt: 'O que um sistema mais inteligente que seus criadores deve à enfermeira, ao compositor e ao bilhão de pessoas que nunca votaram?',
      hi: 'अपने निर्माताओं से भी समझदार प्रणाली, एक नर्स, एक संगीतकार और उन अरबों लोगों की क्या ऋणी है जिन्हें कभी वोट नहीं मिला?',
      zh: '一个比创造者更聪明的系统，究竟欠护士、作曲家，以及那十亿从未拥有投票权的人什么？',
      ar: 'ماذا يدين نظام أذكى من صانعيه للممرضة والمؤلف الموسيقي، ولمليار إنسان لم يحصلوا يوماً على صوت؟',
      th: 'ระบบที่ฉลาดกว่าผู้สร้าง ติดค้างอะไรต่อพยาบาล นักแต่งเพลง และผู้คนอีกพันล้านคนที่ไม่เคยมีสิทธิ์ออกเสียง?',
    },
  },
  {
    blockNumber: 9,
    speaker: 'NARRATOR',
    startSec: 73.50,
    maxDurSec: 8.30,
    textByLocale: {
      es: 'The Long Thought. Cinco episodios, doce ciudades, setenta años de historia, dirigido en SceneFlow. Imagina las posibilidades.',
      pt: 'The Long Thought. Cinco episódios, doze cidades, setenta anos de história, dirigido no SceneFlow. Imagine as possibilidades.',
      hi: 'The Long Thought. पाँच एपिसोड, बारह शहर, सत्तर साल का इतिहास — SceneFlow में निर्देशित। संभावनाओं की कल्पना करें।',
      zh: '《漫长思考》。五集篇幅，十二座城市，七十年历史——在 SceneFlow 中执导。想象无限可能。',
      ar: 'الفكرة الطويلة. خمس حلقات، اثنتا عشرة مدينة، سبعون عاماً من التاريخ — أُخرجت في SceneFlow. تخيّل الإمكانيات.',
      th: 'The Long Thought ห้าตอน สิบสองเมือง เจ็ดสิบปีแห่งประวัติศาสตร์ กำกับใน SceneFlow จินตนาการถึงความเป็นไปได้',
    },
  },
]

const SEGMENTS_DIR = join(ROOT, 'tmp', 'documentary-dub', 'segments')

let elevenLabsQuotaExhausted = false
let openAiUnavailable = false
let replicateChain = Promise.resolve()

async function synthesizeOpenAiMp3(args: {
  text: string
  speaker: SpeakerRole
}): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^["']|["']$/g, '')
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY')
  }
  const voice = OPENAI_DOCUMENTARY_VOICES[args.speaker]
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: args.text,
      voice,
      response_format: 'mp3',
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI TTS failed (${res.status}): ${errText.slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function synthesizeMinimaxSerializedMp3(args: {
  text: string
  speaker: SpeakerRole
}): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN?.trim().replace(/^["']|["']$/g, '')
  if (!token) {
    throw new Error('Missing REPLICATE_API_TOKEN')
  }
  const voiceId = MINIMAX_DOCUMENTARY_VOICES[args.speaker]

  const runTask = async (): Promise<Buffer> => {
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
              text: args.text,
              voice_id: voiceId,
              emotion: 'neutral',
            },
          }),
        }
      )

      if (createRes.status === 429) {
        const bodyText = await createRes.text().catch(() => '')
        let waitSec = 11
        try {
          const parsed = JSON.parse(bodyText) as { retry_after?: number }
          if (typeof parsed.retry_after === 'number' && parsed.retry_after > 0) {
            waitSec = parsed.retry_after + 1
          }
        } catch {
          /* default 11s */
        }
        await new Promise((r) => setTimeout(r, waitSec * 1000))
        continue
      }

      if (!createRes.ok) {
        throw new Error(`Replicate minimax failed (${createRes.status}): ${await createRes.text()}`)
      }

      let pred = (await createRes.json()) as {
        id: string
        status: string
        output?: string
        error?: unknown
      }

      while (
        pred.status !== 'succeeded' &&
        pred.status !== 'failed' &&
        pred.status !== 'canceled'
      ) {
        await new Promise((r) => setTimeout(r, 2000))
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        pred = (await pollRes.json()) as typeof pred
      }

      if (pred.status !== 'succeeded' || !pred.output) {
        throw new Error(`Minimax prediction failed: ${JSON.stringify(pred.error)}`)
      }

      const mp3Res = await fetch(pred.output)
      if (!mp3Res.ok) {
        throw new Error(`Failed to download Minimax MP3 (${mp3Res.status})`)
      }
      return Buffer.from(await mp3Res.arrayBuffer())
    }
    throw new Error('Exhausted Replicate minimax retries')
  }

  const next = replicateChain.then(runTask, runTask)
  replicateChain = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

async function main() {
  const force = process.argv.includes('--force')
  const jobs: Array<{
    locale: DubLocaleId
    cue: DocumentaryDubCue
    outPath: string
    text: string
    voiceId: string
  }> = []

  for (const locale of TARGET_LOCALES) {
    const dir = join(SEGMENTS_DIR, locale)
    mkdirSync(dir, { recursive: true })
    for (const cue of DOCUMENTARY_DUB_CUES) {
      const outPath = join(dir, `block-${cue.blockNumber}.mp3`)
      if (!force && existsSync(outPath) && statSync(outPath).size > 1500) {
        continue
      }
      jobs.push({
        locale,
        cue,
        outPath,
        text: cue.textByLocale[locale],
        voiceId: DOCUMENTARY_VOICES[cue.speaker],
      })
    }
  }

  console.log(`Synthesizing ${jobs.length} Long Thought dub segments...`)
  let idx = 0
  const concurrency = 4

  async function worker() {
    while (idx < jobs.length) {
      const job = jobs[idx++]
      if (!job) break
      let buffer: Buffer | null = null
      let provider = 'ElevenLabs'
      let lastErr: unknown

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          if (!elevenLabsQuotaExhausted) {
            try {
              buffer = await synthesizeElevenLabsMp3({
                text: job.text,
                voiceId: job.voiceId,
                modelId: 'eleven_v3',
                stability: 0.5,
              })
              provider = 'ElevenLabs'
              break
            } catch (elErr) {
              const msg = elErr instanceof Error ? elErr.message : String(elErr)
              if (msg.includes('quota_exceeded') || msg.includes('HTTP 401')) {
                console.warn('  [ElevenLabs quota reached -> switching to fallback TTS]')
                elevenLabsQuotaExhausted = true
              } else {
                throw elErr
              }
            }
          }

          if (!openAiUnavailable) {
            try {
              buffer = await synthesizeOpenAiMp3({
                text: job.text,
                speaker: job.cue.speaker,
              })
              provider = `OpenAI-${OPENAI_DOCUMENTARY_VOICES[job.cue.speaker]}`
              break
            } catch (oaErr) {
              const msg = oaErr instanceof Error ? oaErr.message : String(oaErr)
              console.warn(`  [OpenAI TTS unavailable (${msg.slice(0, 120)}) -> switching to Minimax]`)
              openAiUnavailable = true
            }
          }

          buffer = await synthesizeMinimaxSerializedMp3({
            text: job.text,
            speaker: job.cue.speaker,
          })
          provider = `Minimax-${MINIMAX_DOCUMENTARY_VOICES[job.cue.speaker]}`
          break
        } catch (err) {
          lastErr = err
          console.warn(
            `  [retry ${attempt}/4] ${job.locale} block-${job.cue.blockNumber}:`,
            err instanceof Error ? err.message : err
          )
          await new Promise((r) => setTimeout(r, 1500 * attempt))
        }
      }
      if (!buffer) throw lastErr
      writeFileSync(job.outPath, buffer)
      console.log(
        `  [${job.locale}] block-${job.cue.blockNumber} (${job.cue.speaker}, ${provider}) -> ${buffer.length} bytes`
      )
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  console.log('All 54 multi-character Long Thought dub segments synthesized!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
