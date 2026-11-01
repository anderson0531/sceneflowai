#!/usr/bin/env npx tsx
/**
 * Synthesizes 9 time-aligned multi-character dub segments per locale
 * (Spanish, Portuguese, Hindi, Chinese, Arabic, Thai) for "The White City Current"
 * Cinematic Drama trailer using ElevenLabs v3 multilingual voices.
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

export const DRAMA_VOICES = {
  NARRATOR: 'pNInz6obpgDQGcFmaJgB', // Adam — Deep cinematic trailer narrator
  PIPER: 'EXAVITQu4vr4xnSDxMaL', // Bella/Sarah — Urgent female investigative reporter
  VANE: 'VR6AewLTigWG4xSOukaG', // Arnold — Authoritative male antagonist
  GIDEON: 'ErXwobaYiN019PkySvjV', // Antoni — Resolute male baritone protagonist
} as const

export type SpeakerRole = keyof typeof DRAMA_VOICES

export interface DramaDubCue {
  blockNumber: number
  speaker: SpeakerRole
  startSec: number
  maxDurSec: number
  textByLocale: Record<DubLocaleId, string>
}

export const CINEMATIC_DRAMA_DUB_CUES: readonly DramaDubCue[] = [
  {
    blockNumber: 1,
    speaker: 'NARRATOR',
    startSec: 1.55,
    maxDurSec: 6.55,
    textByLocale: {
      es: 'Cuando diseñan una ciudad para congelarse a oscuras, la verdad se oculta doce metros bajo el hielo.',
      pt: 'Quando uma cidade é projetada para congelar no escuro, a verdade se esconde doze metros sob o gelo.',
      hi: 'जब एक शहर को अंधेरे में जमने के लिए रचा जाए, तो सच बर्फ़ के चालीस फ़ीट नीचे छिपता है।',
      zh: '当一座城市被蓄意推入冰封与黑暗，真相就藏在冰层下四十英尺深处。',
      ar: 'حين تُصمَّم مدينة لتتجمّد في الظلام، تختبئ الحقيقة على عمق أربعين قدماً تحت الجليد.',
      th: 'เมื่อทั้งเมืองถูกกำหนดให้เหน็บหนาวในความมืด ความจริงจึงซ่อนอยู่ลึกลงไปสี่สิบฟุตใต้น้ำแข็ง',
    },
  },
  {
    blockNumber: 2,
    speaker: 'PIPER',
    startSec: 12.90,
    maxDurSec: 4.95,
    textByLocale: {
      es: 'Tu esposa no murió en un incendio, Gideon. Vane Calhoun la mató para ocultar esto.',
      pt: 'Sua esposa não morreu num incêndio, Gideon. Vane Calhoun a matou para enterrar isto.',
      hi: 'तुम्हारी पत्नी आग में नहीं मरी, गिडियन। वेन कैलहून ने इसे छिपाने के लिए उसे मारा।',
      zh: '你妻子不是死于实验室大火，吉迪恩。是维恩·卡尔霍恩为了掩埋它害死了她。',
      ar: 'زوجتك لم تمت في حريق المختبر يا غيديون. فين كالهون قتلها ليدفن هذا السر.',
      th: 'ภรรยาคุณไม่ได้ตายเพราะไฟไหม้แล็บ กิเดียน เวน แคลฮูนฆ่าเธอเพื่อฝังสิ่งนี้ไว้',
    },
  },
  {
    blockNumber: 3,
    speaker: 'NARRATOR',
    startSec: 18.25,
    maxDurSec: 7.90,
    textByLocale: {
      es: 'En mil ochocientos noventa y tres, crearon energía inalámbrica para todos. Esta noche... despierta.',
      pt: 'Em mil oitocentos e noventa e três, criaram uma corrente sem fio para todos. Esta noite... ela desperta.',
      hi: 'अठारह सौ तिरानबे में, उन्होंने सबके लिए एक वायरलेस धारा बनाई थी। आज रात... वह जाग उठेगी।',
      zh: '1893年，人们建造了属于所有人的无线电流。今夜，它彻底苏醒。',
      ar: 'في عام ألف وثمانمئة وثلاثة وتسعين، بنوا تياراً لاسلكياً للجميع. الليلة... يستيقظ من جديد.',
      th: 'ในปี 1893 พวกเขาสร้างกระแสไฟฟ้าไร้สายเพื่อทุกคน และคืนนี้... มันกำลังตื่นขึ้น',
    },
  },
  {
    blockNumber: 4,
    speaker: 'VANE',
    startSec: 29.55,
    maxDurSec: 6.70,
    textByLocale: {
      es: 'Pulso armónico bajo el Sector Cuatro. Sellen las esclusas. Nadie sale vivo de esos túneles.',
      pt: 'Pulso harmônico sob o Setor Quatro. Trancafiem as comportas. Ninguém sai vivo daqueles túneis.',
      hi: 'सेक्टर चार के नीचे अठारह सौ तिरानबे की तरंग। द्वार बंद करो। उन सुरंगों से कोई ज़िंदा न निकले।',
      zh: '四号扇区下方出现1893谐波峰值。封死水闸，绝不让任何人活着离开隧道。',
      ar: 'نبضة توافقية تحت القطاع الرابع. أغلقوا البوابات. لا يخرج أحد من تلك الأنفاق حياً.',
      th: 'พบคลื่นฮาร์มอนิกใต้เซกเตอร์สี่ ปิดประตูระบายน้ำ อย่าให้ใครรอดออกจากอุโมงค์นั้นได้',
    },
  },
  {
    blockNumber: 5,
    speaker: 'NARRATOR',
    startSec: 36.50,
    maxDurSec: 5.65,
    textByLocale: {
      es: 'Perseguidos por un directorio privado a través de corredores subterráneos olvidados.',
      pt: 'Caçados por uma diretoria privada através de corredores subterrâneos esquecidos.',
      hi: 'भूली हुई भूमिगत सुरंगों में, एक निजी निदेशालय उनके पीछे पड़ा है।',
      zh: '在被遗忘的地下长廊深处，私人封锁局正对他们展开追猎。',
      ar: 'مطارَدين من مديرية احتواء خاصة عبر ممرات جوفية منسية.',
      th: 'ถูกไล่ล่าโดยหน่วยควบคุมลับ ผ่านอุโมงค์ใต้ดินที่ถูกลืมเลือน',
    },
  },
  {
    blockNumber: 6,
    speaker: 'GIDEON',
    startSec: 46.00,
    maxDurSec: 6.95,
    textByLocale: {
      es: 'Dos millas de hielo hasta la estación. Conectamos su colector a la red del lago, o la ciudad muere a oscuras.',
      pt: 'Duas milhas de gelo até a estação. Acoplamos o coletor dela à rede do lago, ou a cidade morre no escuro.',
      hi: 'हमारे और स्टेशन के बीच दो मील बर्फ़ है। हमें उसका मैनिफोल्ड झील के जाल से जोड़ना होगा, वरना शहर अंधेरे में दम तोड़ देगा।',
      zh: '我们离湖心站还有两英里浮冰。必须把她的歧管接入湖底阵列，否则整座城市将在黑暗中死去。',
      ar: 'ميلان من الجليد يفصلاننا عن المحطة. إما أن نربط جهازها بشبكة البحيرة، أو تموت المدينة في الظلام.',
      th: 'มีน้ำแข็งขวางเราอีกสองไมล์ ต้องเชื่อมแมนิโฟลด์ของเธอเข้ากับโครงข่ายทะเลสาบ ไม่งั้นทั้งเมืองจะดับสูญ',
    },
  },
  {
    blockNumber: 7,
    speaker: 'NARRATOR',
    startSec: 55.45,
    maxDurSec: 7.50,
    textByLocale: {
      es: 'Dos millas bajo el hielo del lago Míchigan, cada cuadro mantiene su elenco, su vestuario y su luz.',
      pt: 'Duas milhas sob o gelo do Lago Michigan, cada quadro mantém seu elenco, seu figurino e sua luz.',
      hi: 'लेक मिशिगन की बर्फ़ के दो मील नीचे, हर फ्रेम अपने कलाकारों, पहनावे और रोशनी को सहेजे रखता है।',
      zh: '在密歇根湖冰层下两英里，每一帧都精准锁定演员、服装与光影。',
      ar: 'على عمق ميلين تحت جليد بحيرة ميشيغان، يحتفظ كل إطار بأبطاله وأزيائه وإضاءته.',
      th: 'สองไมล์ใต้แผ่นน้ำแข็งทะเลสาบมิชิแกน ทุกเฟรมคงคาแรกเตอร์ เครื่องแต่งกาย และแสงเงาไว้อย่างแม่นยำ',
    },
  },
  {
    blockNumber: 8,
    speaker: 'PIPER',
    startSec: 63.80,
    maxDurSec: 3.15,
    textByLocale: {
      es: '¡Transmisión activa! ¡Enciéndelo, Gideon, ahora!',
      pt: 'Transmissão ao vivo! Acenda, Gideon, agora!',
      hi: 'प्रसारण चालू है! इसे जलाओ गिडियन, अभी!',
      zh: '广播已接通！快点亮它，吉迪恩，现在！',
      ar: 'البث مباشر! أشعلها يا غيديون الآن!',
      th: 'สัญญาณสดแล้ว! เดินเครื่องเลยกิเดียน เดี๋ยวนี้!',
    },
  },
  {
    blockNumber: 9,
    speaker: 'NARRATOR',
    startSec: 72.40,
    maxDurSec: 9.20,
    textByLocale: {
      es: 'The White City Current. Seis episodios, cero deriva de personajes, dirigido del guion al máster en SceneFlow. Imagina las posibilidades.',
      pt: 'The White City Current. Seis episódios, zero deriva de personagens, dirigido do roteiro ao master no SceneFlow. Imagine as possibilidades.',
      hi: 'The White City Current. छह एपिसोड, शून्य कैरेक्टर ड्रिफ्ट — SceneFlow में स्क्रिप्ट से मास्टर तक निर्देशित। संभावनाओं की कल्पना करें।',
      zh: '《白城电流》。六集篇幅，零角色漂移——在 SceneFlow 中从剧本直达母带。想象无限可能。',
      ar: 'تيار المدينة البيضاء. ست حلقات، دون أي انحراف للشخصيات — أُخرجت من النص إلى الماستر في SceneFlow. تخيّل الإمكانيات.',
      th: 'The White City Current หกตอนเต็ม คาแรกเตอร์ไม่เพี้ยน กำกับจากบทสู่มาสเตอร์ใน SceneFlow จินตนาการถึงความเป็นไปได้',
    },
  },
]

const SEGMENTS_DIR = join(ROOT, 'tmp', 'cinematic-drama-dub', 'segments')

async function main() {
  const force = process.argv.includes('--force')
  const jobs: Array<{
    locale: DubLocaleId
    cue: DramaDubCue
    outPath: string
    text: string
    voiceId: string
  }> = []

  for (const locale of TARGET_LOCALES) {
    const dir = join(SEGMENTS_DIR, locale)
    mkdirSync(dir, { recursive: true })
    for (const cue of CINEMATIC_DRAMA_DUB_CUES) {
      const outPath = join(dir, `block-${cue.blockNumber}.mp3`)
      if (!force && existsSync(outPath) && statSync(outPath).size > 1500) {
        continue
      }
      jobs.push({
        locale,
        cue,
        outPath,
        text: cue.textByLocale[locale],
        voiceId: DRAMA_VOICES[cue.speaker],
      })
    }
  }

  console.log(`Synthesizing ${jobs.length} dub segments across 6 languages...`)
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
  console.log('All 54 multi-character dub segments synthesized!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
