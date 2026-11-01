#!/usr/bin/env npx tsx
/**
 * Synthesizes 8 time-aligned multi-character dub segments per locale
 * (Spanish, Portuguese, Hindi, Chinese, Arabic, Thai) for "The Midnight Frequency"
 * Creator & Podcasts trailer using ElevenLabs v3 multilingual voices with automatic
 * fallback to Replicate minimax/speech-02-turbo (Patient_Man / Deep_Voice_Man)
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

export const PODCAST_VOICES = {
  DEVON: 'ErXwobaYiN019PkySvjV', // Antoni — Devon Vance (investigative podcast host)
  NARRATOR: 'pNInz6obpgDQGcFmaJgB', // Adam — Cinematic trailer narrator
} as const

export type SpeakerRole = keyof typeof PODCAST_VOICES

export const MINIMAX_PODCAST_VOICES: Record<SpeakerRole, string> = {
  DEVON: 'Patient_Man',
  NARRATOR: 'Deep_Voice_Man',
}

export interface PodcastDubCue {
  blockNumber: number
  speaker: SpeakerRole
  startSec: number
  maxDurSec: number
  textByLocale: Record<DubLocaleId, string>
}

export const PODCAST_DUB_CUES: readonly PodcastDubCue[] = [
  {
    blockNumber: 1,
    speaker: 'DEVON',
    startSec: 0.40,
    maxDurSec: 9.80,
    textByLocale: {
      es: 'En noviembre de 1928, seis ingenieros acústicos en Svalbard grabaron una campana metálica dos millas bajo el hielo sólido... y dejaron su cena.',
      pt: 'Em novembro de 1928, seis engenheiros acústicos em Svalbard gravaram um sino metálico três quilômetros sob o gelo sólido... e largaram o jantar.',
      hi: 'नवंबर 1928 में, स्वालबार्ड में छह ध्वनि इंजीनियरों ने ठोस बर्फ़ के दो मील नीचे एक धातु की घंटी रिकॉर्ड की—और अपना रात का खाना छोड़कर चले गए।',
      zh: '1928年11月，斯瓦尔巴群岛的六名声学工程师在两英里厚的坚冰下录到了一阵金属钟声——随后便丢下晚餐匆匆离去。',
      ar: 'في نوفمبر عام 1928، سجّل ستة مهندسي صوتيات في سفالبارد جرساً معدنياً على عمق ميلين تحت الجليد الصلب—ثم تركوا عشاءهم وغادروا.',
      th: 'ในเดือนพฤศจิกายน ปี 1928 วิศวกรเสียงหกคนในสฟาลบาร์ดบันทึกเสียงระฆังโลหะลึกลงไปสองไมล์ใต้น้ำแข็งทึบ แล้วลุกหนีจากมื้อค่ำทันที',
    },
  },
  {
    blockNumber: 2,
    speaker: 'NARRATOR',
    startSec: 12.20,
    maxDurSec: 7.40,
    textByLocale: {
      es: 'Sube tus tomas de estudio en vivo y deja que SceneFlow genere el mundo cinematográfico alrededor de tu voz.',
      pt: 'Envie suas gravações de estúdio ao vivo e deixe o SceneFlow gerar o mundo cinematográfico ao redor da sua voz.',
      hi: 'अपने लाइव स्टूडियो कैमरा टेक अपलोड करें—और SceneFlow को आपकी आवाज़ के चारों ओर सिनेमाई दुनिया रचने दें।',
      zh: '上传你的演播室实拍镜头——让 SceneFlow 围绕你的声音生成电影级世界。',
      ar: 'ارفع لقطات كاميرا الاستوديو الحية—ودع SceneFlow يبني العالم السينمائي حول صوتك.',
      th: 'อัปโหลดคลิปหน้ากล้องจากสตูดิโอของคุณ แล้วให้ SceneFlow สร้างโลกภาพยนตร์รอบเสียงของคุณ',
    },
  },
  {
    blockNumber: 3,
    speaker: 'NARRATOR',
    startSec: 20.20,
    maxDurSec: 7.50,
    textByLocale: {
      es: 'Corta sin fisuras desde tu mesa de pódcast hacia reconstrucciones históricas fotorrealistas.',
      pt: 'Corte perfeitamente da sua bancada de podcast para reconstruções históricas fotorrealistas.',
      hi: 'अपनी पॉडकास्ट डेस्क से सीधे फ़ोटोरियलिस्टिक ऐतिहासिक दृश्यों में सहजता से कट करें।',
      zh: '从你的播客桌无缝切换到逼真的历史重现画面。',
      ar: 'انتقل بسلاسة من طاولة البودكاست إلى إعادات تمثيل تاريخية واقعية للغاية.',
      th: 'ตัดสลับอย่างลื่นไหลจากโต๊ะพอดแคสต์ของคุณ สู่ภาพจำลองเหตุการณ์ประวัติศาสตร์ที่สมจริง',
    },
  },
  {
    blockNumber: 4,
    speaker: 'NARRATOR',
    startSec: 31.50,
    maxDurSec: 6.20,
    textByLocale: {
      es: 'Mantén el vestuario, la utilería de época y la iluminación atmosférica en cada escena.',
      pt: 'Mantenha o figurino, os objetos de época e a iluminação atmosférica em cada cena.',
      hi: 'हर दृश्य में किरदारों की पोशाक, दौर के प्रॉप्स और माहौल की रोशनी को स्थिर रखें।',
      zh: '在每一个故事节拍中，保持角色服装、年代道具与氛围光影的一致。',
      ar: 'حافظ على أزياء الشخصيات، ومقتنيات الحقبة، والإضاءة الغامرة عبر كل مشهد.',
      th: 'คงความต่อเนื่องของเครื่องแต่งกาย อุปกรณ์ประกอบฉากยุคเก่า และแสงบรรยากาศในทุกจังหวะเรื่องราว',
    },
  },
  {
    blockNumber: 5,
    speaker: 'DEVON',
    startSec: 38.15,
    maxDurSec: 9.80,
    textByLocale: {
      es: 'Ahora, antes de que Orson culpe a los alienígenas ancestrales, miren el mapa geológico de 1928 desclasificado cincuenta años después.',
      pt: 'Agora, antes que o Orson culpe alienígenas antigos, vejam o mapa geológico de 1928 que foi aberto cinquenta anos depois.',
      hi: 'अब इससे पहले कि ऑर्सन प्राचीन एलियंस को दोष दे—1928 का वह भूवैज्ञानिक नक़्शा देखिए जिसे पचास साल बाद खोला गया।',
      zh: '在奥森把一切归咎于远古外星人之前——先看看五十年后解密的1928年地质勘测图。',
      ar: 'وقبل أن يلوم أورسون الكائنات الفضائية القديمة—انظروا إلى خريطة المسح الجيولوجي لعام 1928 التي كُشفت بعد خمسين عاماً.',
      th: 'แต่ก่อนที่ออร์สันจะโทษมนุษย์ต่างดาวโบราณ ลองดูแผนที่สำรวจธรณีวิทยาปี 1928 ที่เพิ่งเปิดเผยเมื่อห้าสิบปีให้หลัง',
    },
  },
  {
    blockNumber: 6,
    speaker: 'NARRATOR',
    startSec: 51.40,
    maxDurSec: 7.50,
    textByLocale: {
      es: 'Convierte explicaciones científicas e históricas complejas en cine visual inolvidable.',
      pt: 'Transforme explicações científicas e históricas complexas em cinema visual inesquecível.',
      hi: 'जटिल वैज्ञानिक और ऐतिहासिक व्याख्याओं को अविस्मरणीय विज़ुअल सिनेमा में बदल दें।',
      zh: '将复杂的科学与历史解析，转化为令人难忘的视觉电影。',
      ar: 'حوّل التفسيرات العلمية والتاريخية المعقّدة إلى سينما بصرية لا تُنسى.',
      th: 'เปลี่ยนคำอธิบายทางวิทยาศาสตร์และประวัติศาสตร์ที่ซับซ้อน ให้เป็นภาพยนตร์ที่ตราตรึงใจ',
    },
  },
  {
    blockNumber: 7,
    speaker: 'NARRATOR',
    startSec: 60.30,
    maxDurSec: 9.20,
    textByLocale: {
      es: 'Luego publica tu episodio en español, portugués, hindi, árabe y mandarín, convirtiendo un canal en una red global.',
      pt: 'Depois publique seu episódio em espanhol, português, hindi, árabe e mandarim, transformando um canal em uma rede global.',
      hi: 'फिर अपने एपिसोड को स्पैनिश, पुर्तगाली, हिंदी, अरबी और मैंडरिन में प्रकाशित करें—एक चैनल को वैश्विक नेटवर्क में बदलते हुए।',
      zh: '随后以西班牙语、葡萄牙语、印地语、阿拉伯语和普通话发布节目——将一个频道拓展为全球网络。',
      ar: 'ثم انشر حلقتك بالإسبانية والبرتغالية والهندية والعربية والماندرين—لتنمو قناتك إلى شبكة عالمية.',
      th: 'จากนั้นเผยแพร่ตอนของคุณในภาษาสเปน โปรตุเกส ฮินดี อาหรับ และจีนกลาง ขยายช่องเดียวสู่เครือข่ายระดับโลก',
    },
  },
  {
    blockNumber: 8,
    speaker: 'DEVON',
    startSec: 70.30,
    maxDurSec: 4.60,
    textByLocale: {
      es: 'Sigan curiosos, no cambien el dial y nos vemos en la próxima frecuencia.',
      pt: 'Continuem curiosos, mantenham a sintonia e até a próxima frequência.',
      hi: 'जिज्ञासु बने रहें, अपना डायल लॉक रखें—मिलते हैं अगली फ़्रीक्वेंसी पर।',
      zh: '保持好奇，锁定频道——我们下一段频率再见。',
      ar: 'ابقوا متشوّقين، واضبطوا مؤشّركم—ونلتقي على التردّد القادم.',
      th: 'รักษาความอยากรู้ ล็อกคลื่นของคุณไว้ แล้วพบกันใหม่ในความถี่หน้า',
    },
  },
]

const SEGMENTS_DIR = join(ROOT, 'tmp', 'podcast-dub', 'segments')

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
  const voiceId = MINIMAX_PODCAST_VOICES[args.speaker]

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
    cue: PodcastDubCue
    outPath: string
    text: string
    voiceId: string
  }> = []

  for (const locale of TARGET_LOCALES) {
    const dir = join(SEGMENTS_DIR, locale)
    mkdirSync(dir, { recursive: true })
    for (const cue of PODCAST_DUB_CUES) {
      const outPath = join(dir, `block-${cue.blockNumber}.mp3`)
      if (!force && existsSync(outPath) && statSync(outPath).size > 1500) {
        continue
      }
      jobs.push({
        locale,
        cue,
        outPath,
        text: cue.textByLocale[locale],
        voiceId: PODCAST_VOICES[cue.speaker],
      })
    }
  }

  console.log(`Synthesizing ${jobs.length} Midnight Frequency dub segments...`)
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
          provider = `Minimax-${MINIMAX_PODCAST_VOICES[job.cue.speaker]}`
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
  console.log('All 48 multi-character Midnight Frequency dub segments synthesized!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
