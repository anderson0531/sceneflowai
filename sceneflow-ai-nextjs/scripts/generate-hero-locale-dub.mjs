#!/usr/bin/env node
/**
 * Generate interim hero locale MP4: English video + edge-tts narration.
 * Hindi uses pro VO on Blob (`SceneFlow Hero (Hindi) .mp4`) — run watermark-hero-video.mjs instead.
 * Portuguese still interim until `SceneFlow Hero (Portuguese).mp4` is available.
 *
 * Usage: node scripts/generate-hero-locale-dub.mjs --locale hi|pt [--input path/to/en-source.mp4]
 */

import { spawnSync } from 'child_process'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import ffmpegStatic from 'ffmpeg-static'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

config({ path: join(PROJECT_ROOT, '.env.vercel.local') })
config({ path: join(PROJECT_ROOT, '.env.local') })

const HERO_NARRATION_EN = `You already have the story in your head. But turning that idea into a finished video still means jumping between prompts, tools, and tabs — hoping the next generation finally looks right.

What if one studio carried you from first concept all the way to a publish-ready master — with a clear path at every step, instead of creative chaos?

SceneFlow AI is that studio. Start in Blueprint — shape your logline, beats, and characters, test audience resonance, and approve the story before you spend heavy credits on production.

Then move into Production the beat-first way: review your Express storyboard, lock Beat Frames for continuity, and only then generate video — so you're refining the look, not gambling on random regenerations.

Script becomes streams. The Mixer handles timing and audio. Final Cut assembles your master MP4. Premiere gets you distribution-ready — all in one guided workflow, with control when you want it.

From concept to publish-ready video — one automated studio. Imagine. Generate. Flow. Scroll down and see the full pipeline in action. Your next project starts here.`

const LOCALE_CONFIG = {
  hi: {
    translateTarget: 'hi',
    edgeVoice: 'hi-IN-MadhurNeural',
    outName: 'hero-hi-source.mp4',
  },
  pt: {
    translateTarget: 'pt',
    edgeVoice: 'pt-BR-AntonioNeural',
    outName: 'hero-pt-source.mp4',
  },
}

function parseArgs(argv) {
  let locale = null
  let input = join(PROJECT_ROOT, 'tmp/hero-watermark/hero-en-source.mp4')
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--locale' && argv[i + 1]) locale = argv[++i]
    else if (argv[i] === '--input' && argv[i + 1]) input = argv[++i]
  }
  return { locale, input }
}

const HERO_NARRATION_BY_LOCALE = {
  hi: `आपके दिमाग में कहानी पहले से है। लेकिन उस विचार को तैयार वीडियो में बदलना अभी भी मतलब है प्रॉम्प्ट, टूल और टैब के बीच कूदना — इस उम्मीद में कि अगली जनरेशन आखिरकार सही दिखेगी।

क्या होगा अगर एक स्टूडियो आपको पहले कॉन्सेप्ट से लेकर पब्लिश-रेडी मास्टर तक ले जाए — हर कदम पर साफ रास्ते के साथ, बजाय रचनात्मक अराजकता के?

SceneFlow AI वही स्टूडियो है। Blueprint में शुरू करें — अपनी लॉगलाइन, बीट्स और कैरेक्टर्स को आकार दें, ऑडियंस रेज़ोनेंस टेस्ट करें, और भारी प्रोडक्शन क्रेडिट खर्च करने से पहले कहानी को मंज़ूर करें।

फिर Production में beat-first तरीके से आगे बढ़ें: Express storyboard की समीक्षा करें, Beat Frames को कंटिन्युटी के लिए लॉक करें, और तभी वीडियो जनरेट करें — ताकि आप लुक को refine करें, random regenerations पर दांव न लगाएं।

स्क्रिप्ट streams बन जाती है। Mixer टाइमिंग और ऑडियो संभालता है। Final Cut आपका master MP4 असेंबल करता है। Premiere आपको distribution-ready बनाता है — सब एक guided workflow में, जब चाहें तब नियंत्रण के साथ।

कॉन्सेप्ट से publish-ready वीडियो तक — एक automated studio। Imagine. Generate. Flow. नीचे स्क्रॉल करें और पूरा pipeline एक्शन में देखें। आपका अगला प्रोजेक्ट यहीं से शुरू होता है।`,

  pt: `Você já tem a história na cabeça. Mas transformar essa ideia em um vídeo finalizado ainda significa pular entre prompts, ferramentas e abas — na esperança de que a próxima geração finalmente fique certa.

E se um estúdio te levasse do primeiro conceito até um master pronto para publicar — com um caminho claro em cada etapa, em vez de caos criativo?

O SceneFlow AI é esse estúdio. Comece no Blueprint — defina sua logline, beats e personagens, teste a ressonância com o público e aprove a história antes de gastar créditos pesados em produção.

Depois avance para Production do jeito beat-first: revise seu storyboard Express, trave Beat Frames para continuidade e só então gere o vídeo — para refinar o visual, não apostar em regenerações aleatórias.

O roteiro vira streams. O Mixer cuida de timing e áudio. O Final Cut monta seu MP4 master. O Premiere deixa tudo pronto para distribuição — tudo em um fluxo guiado, com controle quando você quiser.

Do conceito ao vídeo pronto para publicar — um estúdio automatizado. Imagine. Generate. Flow. Role para baixo e veja o pipeline completo em ação. Seu próximo projeto começa aqui.`,
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (result.status !== 0) {
    throw new Error(`${cmd} exited with ${result.status}`)
  }
}

async function main() {
  const { locale, input } = parseArgs(process.argv.slice(2))
  const cfg = LOCALE_CONFIG[locale]
  if (!cfg) {
    console.error('Usage: node scripts/generate-hero-locale-dub.mjs --locale hi|pt')
    process.exit(1)
  }
  if (!existsSync(input)) {
    console.error('Input video not found:', input)
    process.exit(1)
  }

  const outDir = join(PROJECT_ROOT, 'tmp/hero-watermark')
  mkdirSync(outDir, { recursive: true })

  const textPath = join(outDir, `hero-${locale}-narration.txt`)
  const audioPath = join(outDir, `hero-${locale}-narration.mp3`)
  const muxedPath = join(outDir, cfg.outName)

  console.log(`Using ${locale} narration script...`)
  const translated = HERO_NARRATION_BY_LOCALE[locale]
  if (!translated) {
    throw new Error(`No embedded narration for locale "${locale}"`)
  }
  writeFileSync(textPath, translated, 'utf8')
  console.log('Wrote:', textPath)

  console.log(`Synthesizing with edge-tts (${cfg.edgeVoice})...`)
  run('python3', ['-m', 'edge_tts', '--voice', cfg.edgeVoice, '--file', textPath, '--write-media', audioPath])

  const ffmpeg = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg'
  console.log('Muxing video + narration...')
  run(ffmpeg, [
    '-y',
    '-i',
    input,
    '-i',
    audioPath,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    muxedPath,
  ])

  console.log('Done:', muxedPath)
  console.log(`Next: node scripts/watermark-hero-video.mjs ${muxedPath} --locale ${locale} --upload`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
