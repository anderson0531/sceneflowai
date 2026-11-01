#!/usr/bin/env npx tsx
/**
 * Synthesizes 8 time-aligned multi-character dub segments per locale
 * (Spanish, Portuguese, Hindi, Chinese, Arabic, Thai) for "Five Plates"
 * Training Series trailer using ElevenLabs v3 multilingual voices with automatic
 * fallback to Replicate minimax/speech-02-turbo (Wise_Woman / Deep_Voice_Man)
 * when ElevenLabs quota is exhausted.
 */

import * as dotenv from 'dotenv'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { synthesizeElevenLabsMp3 } from '../src/lib/elevenlabs/textToSpeech'

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

export const TRAINING_VOICES = {
  LILA: 'XrExE9yKIg1WjnnlVkGX', // Matilda — Chef Lila Mensah (warm, authoritative female executive chef)
  NARRATOR: 'pNInz6obpgDQGcFmaJgB', // Adam — Training series narrator
} as const

export type SpeakerRole = keyof typeof TRAINING_VOICES

export const MINIMAX_TRAINING_VOICES: Record<SpeakerRole, string> = {
  LILA: 'Wise_Woman',
  NARRATOR: 'Deep_Voice_Man',
}

export interface TrainingDubCue {
  blockNumber: number
  speaker: SpeakerRole
  startSec: number
  maxDurSec: number
  textByLocale: Record<DubLocaleId, string>
}

export const TRAINING_DUB_CUES: readonly TrainingDubCue[] = [
  {
    blockNumber: 1,
    speaker: 'LILA',
    startSec: 1.20,
    maxDurSec: 8.20,
    textByLocale: {
      es: 'Cinco platos. Una cocina. Cada plato enseña a tus manos lo que el siguiente plato exigirá.',
      pt: 'Cinco pratos. Uma cozinha. Cada prato ensina às suas mãos o que o próximo prato vai exigir.',
      hi: 'पाँच व्यंजन। एक रसोई। हर पकवान आपके हाथों को वह सिखाता है जिसकी अगली प्लेट को ज़रूरत होगी।',
      zh: '五道菜，一间厨房。每一道菜都在教会你的双手，下一道菜所需要的技艺。',
      ar: 'خمسة أطباق. مطبخ واحد. كل طبق يعلّم يديك ما سيتطلّبه الطبق التالي.',
      th: 'ห้าจาน หนึ่งห้องครัว ทุกจานจะสอนมือของคุณให้พร้อมสำหรับสิ่งที่จานต่อไปเรียกร้อง',
    },
  },
  {
    blockNumber: 2,
    speaker: 'NARRATOR',
    startSec: 10.55,
    maxDurSec: 8.95,
    textByLocale: {
      es: 'Olvida las diapositivas estáticas. Dirige demostraciones físicas multicámara sincronizadas con cada paso de enseñanza.',
      pt: 'Esqueça slides estáticos. Dirija demonstrações físicas multicâmera sincronizadas com cada passo do ensino.',
      hi: 'स्थिर स्लाइड्स को भूल जाइए। हर शिक्षण चरण के साथ सिंक किए गए मल्टी-कैमरा भौतिक प्रदर्शन निर्देशित करें।',
      zh: '告别静态幻灯片。执导与每一个教学节拍精准同步的多机位实操演示。',
      ar: 'انسَ الشرائح الثابتة. أخرج عروضاً عملية متعدّدة الكاميرات متزامنة مع كل خطوة تعليمية.',
      th: 'ลืมสไลด์นิ่งๆ ไปได้เลย กำกับการสาธิตจริงหลายมุมกล้องที่ซิงค์เข้ากับทุกจังหวะการสอน',
    },
  },
  {
    blockNumber: 3,
    speaker: 'LILA',
    startSec: 20.10,
    maxDurSec: 7.40,
    textByLocale: {
      es: 'No mires el reloj, lee la masa. Cuando vuelve a la mitad, la hogaza está lista para la cuchilla.',
      pt: 'Não olhe para o relógio, leia a massa. Quando ela volta até a metade, o pão está pronto para a lâmina.',
      hi: 'घड़ी मत देखिए—आटे को पढ़िए। जब वह आधा वापस उठे, तो समझो लोफ़ ब्लेड के लिए तैयार है।',
      zh: '别看时钟——去读懂面团。当它回弹一半时，面团就可以下刀割包了。',
      ar: 'لا تنظر إلى الساعة—اقرأ العجين. عندما يرتدّ إلى النصف، يكون الرغيف جاهزاً للشفرة.',
      th: 'อย่ามองนาฬิกา แต่อ่านแป้งโดว์ เมื่อมันเด้งกลับขึ้นมาครึ่งหนึ่ง ก้อนขนมปังก็พร้อมสำหรับใบมีด',
    },
  },
  {
    blockNumber: 4,
    speaker: 'NARRATOR',
    startSec: 28.15,
    maxDurSec: 8.40,
    textByLocale: {
      es: 'El rostro de la instructora, su vestuario y la geometría del estudio permanecen fijos de la lección uno a la cinco.',
      pt: 'O rosto da instrutora, o figurino e a geometria do estúdio permanecem fixos da lição um à lição cinco.',
      hi: 'प्रशिक्षक का चेहरा, पोशाक और स्टूडियो की बनावट पहले पाठ से पाँचवें पाठ तक बिल्कुल स्थिर रहते हैं।',
      zh: '从第一课到第五课，导师的面容、着装与厨房空间结构始终保持锁定一致。',
      ar: 'وجه المدرّبة، وملابسها، وهندسة الاستوديو تبقى ثابتة تماماً من الدرس الأول إلى الدرس الخامس.',
      th: 'ใบหน้าของผู้สอน เครื่องแต่งกาย และโครงสร้างสตูดิโอถูกล็อกคงที่ตั้งแต่บทเรียนที่หนึ่งถึงบทเรียนที่ห้า',
    },
  },
  {
    blockNumber: 5,
    speaker: 'NARRATOR',
    startSec: 37.30,
    maxDurSec: 7.80,
    textByLocale: {
      es: 'La voz, los subtítulos y la técnica en pantalla aterrizan exactamente en el mismo pulso.',
      pt: 'A voz, as legendas e a técnica na tela acontecem exatamente no mesmo compasso.',
      hi: 'आवाज़, कैप्शन और स्क्रीन पर दिखने वाली तकनीक बिल्कुल एक ही धड़कन पर साथ चलते हैं।',
      zh: '人声、字幕与画面中的手法，在同一个节拍上精准落点。',
      ar: 'الصوت، والترجمة النصية، والتقنية على الشاشة تلتقي في اللحظة ذاتها تماماً.',
      th: 'เสียงพากย์ คำบรรยาย และเทคนิคบนหน้าจอ ลงจังหวะเดียวกันอย่างแม่นยำ',
    },
  },
  {
    blockNumber: 6,
    speaker: 'NARRATOR',
    startSec: 46.30,
    maxDurSec: 7.80,
    textByLocale: {
      es: 'Cada módulo construye sobre el anterior: control del fuego, tiempo, sazón y temple.',
      pt: 'Cada módulo constrói sobre o anterior: controle de fogo, tempo, tempero e serenidade.',
      hi: 'हर मॉड्यूल पिछले अध्याय को आगे बढ़ाता है—ताप नियंत्रण, समय, सीज़निंग और संयम।',
      zh: '每个模块层层递进——火候控制、时间把握、调味功底与从容心态。',
      ar: 'كل وحدة تبني على ما قبلها—التحكّم بالحرارة، والتوقيت، والتتبيل، ورباطة الجأش.',
      th: 'ทุกโมดูลต่อยอดจากบทก่อนหน้า การคุมไฟ จังหวะเวลา การปรุงรส และความนิ่ง',
    },
  },
  {
    blockNumber: 7,
    speaker: 'LILA',
    startSec: 54.95,
    maxDurSec: 8.80,
    textByLocale: {
      es: 'No solo aprendieron cinco recetas. Construyeron un sistema que se mantiene firme cuando la cocina arde.',
      pt: 'Vocês não aprenderam apenas cinco receitas. Construíram um sistema que se mantém firme quando a cozinha esquenta.',
      hi: 'आपने सिर्फ़ पाँच रेसिपी नहीं सीखीं। आपने एक ऐसी प्रणाली बनाई है जो रसोई के गर्म होने पर भी टिकी रहती है।',
      zh: '你们学到的不只是五道食谱，而是建立了一套在厨房最繁忙时依然稳固的体系。',
      ar: 'لم تتعلّموا مجرّد خمس وصفات، بل بنيتم نظاماً يصمد عندما تشتدّ حرارة المطبخ.',
      th: 'คุณไม่ได้แค่เรียนรู้ห้าสูตรอาหาร แต่คุณสร้างระบบที่ยืนหยัดได้เมื่อห้องครัวร้อนระอุ',
    },
  },
  {
    blockNumber: 8,
    speaker: 'NARRATOR',
    startSec: 64.55,
    maxDurSec: 8.20,
    textByLocale: {
      es: 'Five Plates. Una serie de formación completa—dirigida, sincronizada y masterizada en SceneFlow. Imagina las posibilidades.',
      pt: 'Five Plates. Uma série de treinamento completa—dirigida, sincronizada e masterizada no SceneFlow. Imagine as possibilidades.',
      hi: 'Five Plates. एक संपूर्ण मल्टी-मॉड्यूल प्रशिक्षण शृंखला — SceneFlow में निर्देशित, सिंक और मास्टर की गई। संभावनाओं की कल्पना करें।',
      zh: '《五道菜》。一套完整的多模块培训系列——在 SceneFlow 中执导、同步与母带制作。想象无限可能。',
      ar: 'الأطباق الخمسة. سلسلة تدريبية متكاملة متعدّدة الوحدات — أُخرجت وزُومنت في SceneFlow. تخيّل الإمكانيات.',
      th: 'Five Plates ซีรีส์ฝึกอบรมหลายโมดูลฉบับสมบูรณ์ กำกับ ซิงค์ และมาสเตอร์ใน SceneFlow จินตนาการถึงความเป็นไปได้',
    },
  },
]

const SEGMENTS_DIR = join(ROOT, 'tmp', 'training-dub', 'segments')

let elevenLabsQuotaExhausted = true // Use Minimax directly if ElevenLabs has 18 credits left
let replicateChain = Promise.resolve()

async function synthesizeMinimaxSerializedMp3(args: {
  text: string
  speaker: SpeakerRole
}): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN?.trim().replace(/^["']|["']$/g, '')
  if (!token) {
    throw new Error('Missing REPLICATE_API_TOKEN')
  }
  const voiceId = MINIMAX_TRAINING_VOICES[args.speaker]

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
    cue: TrainingDubCue
    outPath: string
    text: string
    voiceId: string
  }> = []

  for (const locale of TARGET_LOCALES) {
    const dir = join(SEGMENTS_DIR, locale)
    mkdirSync(dir, { recursive: true })
    for (const cue of TRAINING_DUB_CUES) {
      const outPath = join(dir, `block-${cue.blockNumber}.mp3`)
      if (!force && existsSync(outPath) && statSync(outPath).size > 1500) {
        continue
      }
      jobs.push({
        locale,
        cue,
        outPath,
        text: cue.textByLocale[locale],
        voiceId: TRAINING_VOICES[cue.speaker],
      })
    }
  }

  console.log(`Synthesizing ${jobs.length} Five Plates dub segments...`)
  let idx = 0
  const concurrency = 2

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
                elevenLabsQuotaExhausted = true
              } else {
                throw elErr
              }
            }
          }

          buffer = await synthesizeMinimaxSerializedMp3({
            text: job.text,
            speaker: job.cue.speaker,
          })
          provider = `Minimax-${MINIMAX_TRAINING_VOICES[job.cue.speaker]}`
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
  console.log('All 48 multi-character Five Plates dub segments synthesized!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
