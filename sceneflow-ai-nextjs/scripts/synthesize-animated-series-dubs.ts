#!/usr/bin/env npx tsx
/**
 * Synthesizes 8 time-aligned multi-character dub segments per locale
 * (Spanish, Portuguese, Hindi, Chinese, Arabic, Thai) for "Hart House"
 * Animated Series trailer using ElevenLabs v3 multilingual voices.
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

export const ANIMATION_VOICES = {
  NARRATOR: 'pNInz6obpgDQGcFmaJgB', // Adam — Warm trailer narrator
  ELLIS: 'ErXwobaYiN019PkySvjV', // Antoni — Enthusiastic father / mechanic
  INEZ: 'XrExE9yKIg1WjnnlVkGX', // Matilda — Warm, authoritative grandmother
  MILO: 'jBpfuIE2acCO8z3wKNLl', // Gigi — Youthful energetic child voice
  RUTH: 'EXAVITQu4vr4xnSDxMaL', // Bella/Sarah — Warm, decisive mother voice
} as const

export type SpeakerRole = keyof typeof ANIMATION_VOICES

export interface AnimationDubCue {
  blockNumber: number
  speaker: SpeakerRole
  startSec: number
  maxDurSec: number
  textByLocale: Record<DubLocaleId, string>
}

export const ANIMATED_SERIES_DUB_CUES: readonly AnimationDubCue[] = [
  {
    blockNumber: 1,
    speaker: 'NARRATOR',
    startSec: 1.55,
    maxDurSec: 7.45,
    textByLocale: {
      es: 'En el pueblo de Millwick, hay una ordenanza municipal para todo... excepto para cómo cinco Hart comparten un mismo techo.',
      pt: 'Na cidade de Millwick, há uma lei municipal para tudo... exceto para como cinco Harts dividem o mesmo teto.',
      hi: 'मिलविक शहर में हर बात के लिए एक सरकारी नियम है... सिवाय इसके कि पाँच हार्ट एक ही छत के नीचे कैसे रहें।',
      zh: '在米尔威克镇，万事都有市政条例——唯独管不了哈特一家五口如何同住一个屋檐下。',
      ar: 'في بلدة ميلويك، هناك قانون بلدي لكل شيء... باستثناء كيف يتقاسم خمسة من عائلة هارت سقفاً واحداً.',
      th: 'ในเมืองมิลวิก มีเทศบัญญัติสำหรับทุกเรื่อง... ยกเว้นวิธีที่ครอบครัวฮาร์ตทั้งห้าคนจะอยู่ร่วมชายคาเดียวกัน',
    },
  },
  {
    blockNumber: 2,
    speaker: 'ELLIS',
    startSec: 12.75,
    maxDurSec: 5.75,
    textByLocale: {
      es: '¿Para qué usar doce contenedores si el motor de un autobús puede clasificar el desayuno a sesenta por hora?',
      pt: 'Por que usar doze cestos plásticos quando um motor de porta de ônibus separa o café da manhã a sessenta por hora?',
      hi: 'बारह प्लास्टिक के डिब्बे क्यों इस्तेमाल करें, जब बस के दरवाज़े की मोटर चालीस मील प्रति घंटे की रफ़्तार से नाश्ता छाँट सकती है?',
      zh: '既然报废公交车门马达能以四十英里时速分拣早餐，干嘛还要用十二个塑料桶？',
      ar: 'لماذا نستخدم اثني عشر صندوقاً بلاستيكياً بينما محرك باب حافلة يفرز الفطور بسرعة أربعين ميلاً في الساعة؟',
      th: 'จะใช้ถังพลาสติกสิบสองใบไปทำไม ในเมื่อมอเตอร์ประตูรถเมล์เก่าแยกขยะมื้อเช้าได้เร็วสี่สิบไมล์ต่อชั่วโมง?',
    },
  },
  {
    blockNumber: 3,
    speaker: 'NARRATOR',
    startSec: 19.60,
    maxDurSec: 6.30,
    textByLocale: {
      es: 'Dirige física animada y ritmo cómico pulso a pulso, sin que un solo cuadro pierda su diseño.',
      pt: 'Dirija física de desenho animado e tempo cômico batida por batida, sem um único quadro sair do modelo.',
      hi: 'दमदार कार्टून फ़िज़िक्स और कॉमेडी टाइमिंग को हर बीट पर निर्देशित करें—बिना एक भी फ़्रेम भटके।',
      zh: '逐拍掌控鲜活的卡通物理与喜剧节奏——没有一帧偏离角色设定。',
      ar: 'أخرج فيزياء الكرتون الحيوية والتوقيت الكوميدي نبضة بنبضة، دون أن ينحرف إطار واحد عن التصميم.',
      th: 'กำกับฟิสิกส์การ์ตูนสุดฮาและจังหวะคอมเมดี้แบบเป๊ะทุกบีต โดยไม่มีแม้แต่เฟรมเดียวที่หลุดคาแรกเตอร์',
    },
  },
  {
    blockNumber: 4,
    speaker: 'INEZ',
    startSec: 30.70,
    maxDurSec: 5.50,
    textByLocale: {
      es: 'Apunta esa etiquetadora a mi sillón de mimbre, mijito, y este porche se independiza del municipio.',
      pt: 'Aponte essa etiquetadora para a minha cadeira de vime, meu filho, e esta varanda declara independência.',
      hi: 'अगर उस लेबल गन को मेरी बुनी हुई कुर्सी की तरफ़ किया, बेटा, तो यह बरामदा इस कस्बे से अलग हो जाएगा।',
      zh: '小乖乖，再把贴标枪对准我的藤椅，这间门廊就要宣布独立了。',
      ar: 'وجّه مسدس الملصقات هذا نحو كرسي الخيزران يا صغيري، وستنفصل هذه الشرفة عن البلدة.',
      th: 'หันปืนติดป้ายนั่นมาที่เก้าอี้หวายของย่าสิหลานรัก แล้วระเบียงนี้จะประกาศแยกตัวจากเทศบาลทันที',
    },
  },
  {
    blockNumber: 5,
    speaker: 'NARRATOR',
    startSec: 38.95,
    maxDurSec: 6.45,
    textByLocale: {
      es: 'Cinco episodios, una paleta animada consistente, a través de cada crisis vecinal.',
      pt: 'Cinco episódios, uma paleta flat-cel travada, em cada crise da vizinhança.',
      hi: 'पाँच एपिसोड, एक स्थिर फ़्लैट-सेल रंगों की दुनिया—हर मोहल्ले के संकट के पार।',
      zh: '五集故事，统一锁定的赛璐珞画风——贯穿每一场邻里风波。',
      ar: 'خمس حلقات، ولوحة ألوان كرتونية ثابتة عبر كل أزمة في الحي.',
      th: 'ห้าตอนเต็ม ด้วยโทนสีแอนิเมชันที่คงที่ ตลอดทุกวิกฤตของเพื่อนบ้าน',
    },
  },
  {
    blockNumber: 6,
    speaker: 'MILO',
    startSec: 45.65,
    maxDurSec: 4.10,
    textByLocale: {
      es: '¡Yo no inventé la palabra! ¡Todos lo llaman el porche temporal de la abuela!',
      pt: 'Eu não inventei a palavra! Todo mundo chama de varanda temporária da vovó!',
      hi: 'मैंने यह शब्द नहीं बनाया! सब इसे नानी का अस्थायी बरामदा ही कहते हैं!',
      zh: '这词又不是我编的！大家都叫它奶奶的临时门廊！',
      ar: 'أنا لم أخترع الكلمة! الجميع يسمونها شرفة جدتي المؤقتة!',
      th: 'ผมไม่ได้คิดคำนี้เองนะ! ใครๆ ก็เรียกว่าระเบียงชั่วคราวของคุณย่าทั้งนั้น!',
    },
  },
  {
    blockNumber: 7,
    speaker: 'RUTH',
    startSec: 55.30,
    maxDurSec: 5.45,
    textByLocale: {
      es: 'Olviden el ayuntamiento. ¿Quién vota por derribar el muro y hacer del porche el verdadero cuarto de la abuela?',
      pt: 'Esqueçam a prefeitura. Quem apoia derrubar a parede e transformar a varanda no quarto de verdade da vovó?',
      hi: 'टाउन हॉल को भूल जाओ। दीवार गिराकर बरामदे को नानी का असली कमरा बनाने के पक्ष में कौन-कौन है?',
      zh: '别管市政厅了。赞成拆掉那面墙、把门廊改成奶奶真正房间的请举手？',
      ar: 'انسوا البلدية. من يؤيد هدم الجدار وتحويل الشرفة إلى غرفة حقيقية لجدتنا؟',
      th: 'ลืมศาลาว่าการไปเลย ใครเห็นด้วยที่จะทุบกำแพงทำระเบียงให้เป็นห้องจริงๆ ของคุณย่าบ้าง?',
    },
  },
  {
    blockNumber: 8,
    speaker: 'NARRATOR',
    startSec: 63.40,
    maxDurSec: 8.80,
    textByLocale: {
      es: 'Hart House. Una temporada animada completa sin deriva de estilo, creada en SceneFlow. Imagina las posibilidades.',
      pt: 'Hart House. Uma temporada animada inteira sem deriva de estilo, criada no SceneFlow. Imagine as possibilidades.',
      hi: 'Hart House. शून्य स्टाइल ड्रिफ़्ट के साथ एक पूरा एनिमेटेड सीज़न — SceneFlow में निर्मित। संभावनाओं की कल्पना करें।',
      zh: '《哈特之家》。整季动画，零画风漂移——由 SceneFlow 倾力打造。想象无限可能。',
      ar: 'بيت عائلة هارت. موسم كرتوني كامل دون أي انحراف في الأسلوب — صُنع في SceneFlow. تخيّل الإمكانيات.',
      th: 'Hart House แอนิเมชันทั้งซีซันที่ลายเส้นไม่เพี้ยน สร้างสรรค์ใน SceneFlow จินตนาการถึงความเป็นไปได้',
    },
  },
]

const SEGMENTS_DIR = join(ROOT, 'tmp', 'animated-series-dub', 'segments')

async function main() {
  const force = process.argv.includes('--force')
  const jobs: Array<{
    locale: DubLocaleId
    cue: AnimationDubCue
    outPath: string
    text: string
    voiceId: string
  }> = []

  for (const locale of TARGET_LOCALES) {
    const dir = join(SEGMENTS_DIR, locale)
    mkdirSync(dir, { recursive: true })
    for (const cue of ANIMATED_SERIES_DUB_CUES) {
      const outPath = join(dir, `block-${cue.blockNumber}.mp3`)
      if (!force && existsSync(outPath) && statSync(outPath).size > 1500) {
        continue
      }
      jobs.push({
        locale,
        cue,
        outPath,
        text: cue.textByLocale[locale],
        voiceId: ANIMATION_VOICES[cue.speaker],
      })
    }
  }

  console.log(`Synthesizing ${jobs.length} Hart House dub segments across 6 languages...`)
  let idx = 0
  const concurrency = 3

  async function worker() {
    while (idx < jobs.length) {
      const job = jobs[idx++]
      if (!job) break
      let buffer: Buffer | null = null
      let lastErr: unknown
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          buffer = await synthesizeElevenLabsMp3({
            text: job.text,
            voiceId: job.voiceId,
            modelId: 'eleven_v3',
            stability: 0.5,
          })
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
        `  [${job.locale}] block-${job.cue.blockNumber} (${job.cue.speaker}) -> ${buffer.length} bytes`
      )
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  console.log('All 48 multi-character Hart House dub segments synthesized!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
