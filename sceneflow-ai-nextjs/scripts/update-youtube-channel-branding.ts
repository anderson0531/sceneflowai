#!/usr/bin/env npx tsx
/**
 * Generate a 2560×1440 YouTube Channel Banner (strictly aligned to YouTube's
 * 1546×423 Mobile Safe Zone, 2560×423 Desktop Strip, and 2560×1440 TV canvas)
 * and update @sceneflowaistudio brandingSettings (banner, description, keywords)
 * + localized About descriptions for EN, ES, PT, HI, ZH, AR, TH (plus Markdown cleanup
 * across all existing channel localizations).
 *
 * Usage:
 *   npx tsx scripts/update-youtube-channel-branding.ts --generate-only
 *   npx tsx scripts/update-youtube-channel-branding.ts --publish --env-file ...
 */

import * as dotenv from 'dotenv'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

const OUT_DIR = join(ROOT, 'tmp', 'youtube-channel-branding')
const BANNER_PATH = join(OUT_DIR, 'sceneflow-youtube-banner-2560x1440.jpg')
const DESKTOP_PREVIEW_PATH = join(OUT_DIR, 'preview-desktop-2560x423.jpg')
const MOBILE_PREVIEW_PATH = join(OUT_DIR, 'preview-mobile-1546x423.jpg')

const HERO_ANA_PATH = join(ROOT, 'public', 'landing', 'hero', 'sceneflow-hero-en-poster.jpg')
const STUDIO_DESK_PATH = join(ROOT, 'tmp', 'social-promos-build', 'svc-01', 'thumbnails', '_base-frame.png')

const CHANNEL_TITLE = 'SceneFlow Studio'

const CHANNEL_KEYWORDS = [
  '"SceneFlow Studio"',
  '"SceneFlow AI Studio"',
  '"AI video production platform"',
  '"automated 4K video studio"',
  '"white label video agency"',
  '"AI filmmaking"',
  '"consistent AI characters"',
  '"Continuity Vault"',
  '"Production Agent"',
  '"multi-language AI dubbing"',
  '"build worlds not clips"',
  '"video production automation"',
].join(' ')

const DESCRIPTION_EN = [
  'Build Worlds. Not Just Clips.',
  '',
  'SceneFlow Studio is the end-to-end automated 4K video production platform built for creators, showrunners, and white-label video agencies.',
  '',
  'Start your $9 Explorer Test Flight → https://sceneflowai.studio/?utm_source=youtube&utm_medium=channel_about',
  '',
  'WHY CREATORS & AGENCIES SWITCH:',
  '• Continuity Vault™ — Lock faces, outfits, voices, and sets across every scene.',
  '• Direct Before You Render — Approve your Blueprint & voiced animatic before spending video credits.',
  '• Walk-Away Production Agent — Build full 4K films autonomously with synced audio and self-healing shots.',
  '• 100% White-Label Client Portals — Deliver Memoirs, Real Estate & Corporate Training with zero client login and up to 90% margins.',
  '• 7+ Global Languages — Produce once and dub worldwide with original music & SFX intact.',
  '',
  'Explore the Studio: https://sceneflowai.studio',
].join('\n')

const LOCALIZED_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  en_US: {
    title: CHANNEL_TITLE,
    description: DESCRIPTION_EN,
  },
  es_ES: {
    title: CHANNEL_TITLE,
    description: [
      'Crea Mundos. No Solo Clips.',
      '',
      'SceneFlow Studio es la plataforma integral de producción de video 4K automatizada para creadores, showrunners y agencias marca blanca.',
      '',
      'Empieza tu prueba por MX$170 → https://sceneflowai.studio/?locale=es&utm_source=youtube&utm_medium=channel_about',
      '',
      'POR QUÉ ELIGEN SCENEFLOW STUDIO:',
      '• Continuity Vault™ — Bloquea rostros, vestuario, voces y locaciones sin inconsistencias.',
      '• Dirige Antes de Renderizar — Aprueba tu Blueprint y animatic con voces antes de gastar créditos.',
      '• Production Agent Autónomo — Genera películas 4K completas con audio mezclado y corrección automática.',
      '• Portales 100% Marca Blanca — Entrega Memorias, Tours Inmobiliarios y Capacitación sin registro y hasta 90% de margen.',
      '• 7+ Idiomas Globales — Produce una vez y dobla al mundo entero conservando música y SFX.',
      '',
      'Explora el estudio: https://sceneflowai.studio/?locale=es',
    ].join('\n'),
  },
  es_419: {
    title: CHANNEL_TITLE,
    description: [
      'Crea Mundos. No Solo Clips.',
      '',
      'SceneFlow Studio es la plataforma integral de producción de video 4K automatizada para creadores, showrunners y agencias marca blanca.',
      '',
      'Empieza tu prueba por MX$170 → https://sceneflowai.studio/?locale=es&utm_source=youtube&utm_medium=channel_about',
      '',
      'POR QUÉ ELIGEN SCENEFLOW STUDIO:',
      '• Continuity Vault™ — Bloquea rostros, vestuario, voces y locaciones sin cambios.',
      '• Dirige Antes de Renderizar — Aprueba tu Blueprint y animatic con voces antes de gastar créditos.',
      '• Production Agent Autónomo — Construye producciones 4K completas con audio mezclado y reparación automática.',
      '• Portales 100% Marca Blanca — Entrega Memorias, Tours Inmobiliarios y Capacitación sin contraseñas.',
      '• 7+ Idiomas Globales — Multiplica tu audiencia sin volver a renderizar el video.',
      '',
      'Explora el estudio: https://sceneflowai.studio/?locale=es',
    ].join('\n'),
  },
  pt_BR: {
    title: CHANNEL_TITLE,
    description: [
      'Construa Mundos. Não Apenas Clipes.',
      '',
      'O SceneFlow Studio é a plataforma completa de produção de vídeo 4K automatizada para criadores, roteiristas e produtoras marca própria.',
      '',
      'Comece seu teste por R$53 → https://sceneflowai.studio/?locale=pt&utm_source=youtube&utm_medium=channel_about',
      '',
      'POR QUE ESCOLHEM O SCENEFLOW STUDIO:',
      '• Continuity Vault™ — Trave rostos, figurinos, vozes e cenários em todas as cenas.',
      '• Dirija Antes de Renderizar — Aprove o Blueprint e animatic com vozes antes de gastar créditos.',
      '• Production Agent Autônomo — Produza filmes 4K completos com áudio mixado e correção automática.',
      '• Portais 100% com a Sua Marca — Entregue Memórias, Tours Imobiliários e Treinamentos sem login e até 90% de margem.',
      '• 7+ Idiomas Globais — Produza uma vez e duble preservando trilha e efeitos sonoros.',
      '',
      'Explore o estúdio: https://sceneflowai.studio/?locale=pt',
    ].join('\n'),
  },
  hi_IN: {
    title: CHANNEL_TITLE,
    description: [
      'सिर्फ़ क्लिप नहीं, पूरी दुनिया बनाएँ।',
      '',
      'SceneFlow Studio क्रिएटर्स, फ़िल्ममेकर्स और व्हाइट-लेबल वीडियो एजेंसियों के लिए बना ऑटोमेटेड 4K वीडियो प्रोडक्शन प्लेटफ़ॉर्म है।',
      '',
      '₹845 में टेस्ट फ़्लाइट शुरू करें → https://sceneflowai.studio/?locale=hi&utm_source=youtube&utm_medium=channel_about',
      '',
      'क्यों चुनें SceneFlow Studio:',
      '• Continuity Vault™ — हर सीन में चेहरे, पहनावा, आवाज़ और सेट लॉक रखें।',
      '• रेंडर से पहले डायरेक्ट करें — वीडियो क्रेडिट खर्च करने से पहले Blueprint और वॉइस एनिमेटिक देखें।',
      '• ऑटोनॉमस Production Agent — पूरी 4K फ़िल्म, सिंक्ड ऑडियो और सेल्फ़-हीलिंग शॉट्स अपने आप तैयार करें।',
      '• 100% आपका ब्रांड पोर्टल — बिना लॉगिन मेमॉयर, रियल एस्टेट और कॉर्पोरेट फ़िल्में डिलीवर करें (90% तक मार्जिन)।',
      '• 7+ ग्लोबल भाषाएँ — एक बार बनाएँ और दुनिया भर में पब्लिश करें।',
      '',
      'स्टूडियो देखें: https://sceneflowai.studio/?locale=hi',
    ].join('\n'),
  },
  zh_CN: {
    title: CHANNEL_TITLE,
    description: [
      '构建世界，而非零散片段。',
      '',
      'SceneFlow Studio 是专为创作者、剧集制片人与白标商业影视机构打造的全流程自动化 4K 视频制片平台。',
      '',
      '仅需 ¥60 开启全功能试用 → https://sceneflowai.studio/?locale=zh-CN&utm_source=youtube&utm_medium=channel_about',
      '',
      '为什么专业创作者与影视机构选择 SceneFlow Studio：',
      '• 连续性资产库（Continuity Vault™）—— 跨镜头锁定角色面孔、服装、音色与场景。',
      '• 先导演，再渲染 —— 在蓝图室锁定剧本并观看完整配音预演后再消耗算力。',
      '• 自动制片代理 —— 一键构建 4K 成片，自动混音并智能修复失败镜头。',
      '• 100% 白标客户门户 —— 免登录在线审片，交付人生传记、房产巡礼与企业培训片，净利率高达 90%。',
      '• 全球 7+ 语种配音 —— 保留原片音乐与音效，无需重新渲染画面。',
      '',
      '立即体验：https://sceneflowai.studio/?locale=zh-CN',
    ].join('\n'),
  },
  ar_EG: {
    title: CHANNEL_TITLE,
    description: [
      'ابنِ عوالم متكاملة، لا مجرد مقاطع عشوائية.',
      '',
      'SceneFlow Studio هو منصة الإنتاج الآلي المتكاملة بدقة 4K للمبدعين ووكالات الفيديو بعلامة تجارية خاصة.',
      '',
      'ابدأ تجربتك مقابل 34 ر.س ← https://sceneflowai.studio/?locale=ar&utm_source=youtube&utm_medium=channel_about',
      '',
      'لماذا يختار المبدعون والوكالات SceneFlow Studio:',
      '• خزنة الاستمرارية (Continuity Vault™) — تثبيت كامل للوجوه والأزياء والأصوات والمواقع.',
      '• أخرج قبل الرندر — اعتمد السيناريو وشاهد النسخة الأولية بالصوت قبل إنفاق الرصيد.',
      '• وكيل الإنتاج الآلي — يبني أفلام 4K كاملة ويمزج الصوت ويصلح اللقطات تلقائياً.',
      '• بوابات عملاء بعلامتك 100% — سلّم أفلام السيرة والعقارات والتدريب دون تسجيل دخول وبأرباح حتى 90%.',
      '• 7+ لغات عالمية — أنتج مرة واحدة وضاعف جمهورك عالمياً.',
      '',
      'اكتشف الاستوديو: https://sceneflowai.studio/?locale=ar',
    ].join('\n'),
  },
  th_TH: {
    title: CHANNEL_TITLE,
    description: [
      'สร้างโลกทั้งใบ ไม่ใช่แค่คลิปสุ่มสั้นๆ',
      '',
      'SceneFlow Studio แพลตฟอร์มผลิตวิดีโอ 4K อัตโนมัติครบวงจร สำหรับครีเอเตอร์และเอเจนซี่วิดีโอ White-Label',
      '',
      'ทดลองระบบเพียง ฿306 → https://sceneflowai.studio/?locale=th&utm_source=youtube&utm_medium=channel_about',
      '',
      'ทำไมครีเอเตอร์และเอเจนซี่เลือก SceneFlow Studio:',
      '• Continuity Vault™ — ล็อกใบหน้าตัวละคร ชุด เสียง และฉากต่อเนื่องทุกซีน',
      '• กำกับก่อนเรนเดอร์ — ตรวจ Blueprint และ Animatic เสียงครบก่อนใช้เครดิตสร้างวิดีโอ',
      '• Production Agent อัตโนมัติ — สร้างหนัง 4K เต็มเรื่อง มิกซ์เสียง และแก้ช็อตล้มเหลวเอง',
      '• พอร์ทัลแบรนด์คุณ 100% — ส่งมอบงานชีวประวัติ อสังหา และสื่อองค์กรแบบไม่ต้องล็อกอิน กำไรสูงสุด 90%',
      '• พากย์เสียง 7+ ภาษา — สร้างครั้งเดียวขยายผู้ชมทั่วโลกโดยคงดนตรีและ SFX ครบ',
      '',
      'เข้าชมสตูดิโอ: https://sceneflowai.studio/?locale=th',
    ].join('\n'),
  },
}

function cleanLegacyMarkdown(text: string): string {
  const cleaned = text
    .replace(/^#{1,4}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$2')
    .replace(/^\*\s+/gm, '• ')
    .trim()
  return cleaned.length > 980 ? `${cleaned.slice(0, 977)}...` : cleaned
}

async function generateBannerAssets() {
  mkdirSync(OUT_DIR, { recursive: true })

  // 1. Right-side Hero Ana (full face + glowing golden matchstick cleanly inside 423px Desktop & 1546px Mobile safe zone!)
  // Safe zone: x=507..2053, y=508..931. Place Ana (780×440) at left=1440, top=498 -> Ana's center sits at x=1830 (well inside 2053!)
  const anaW = 820
  const anaH = 462
  const anaBuf = await sharp(HERO_ANA_PATH)
    .resize(anaW, anaH, { fit: 'cover', position: 'top' })
    .toBuffer()

  // 2. Outer-left Desktop/TV automated studio flank (x=0..640, fades out completely BEFORE Mobile safe zone x=507!)
  let leftFlankBuf: Buffer | null = null
  if (existsSync(STUDIO_DESK_PATH)) {
    leftFlankBuf = await sharp(STUDIO_DESK_PATH)
      .resize(740, 440, { fit: 'cover', position: 'left' })
      .toBuffer()
  }

  // 3. Base 2560×1440 velvety obsidian cinema canvas (for TV top & bottom bands)
  const bgSvg = `<svg width="2560" height="1440" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="baseGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#040812"/>
        <stop offset="50%" stop-color="#071020"/>
        <stop offset="100%" stop-color="#040914"/>
      </linearGradient>
    </defs>
    <rect width="2560" height="1440" fill="url(#baseGrad)"/>
  </svg>`

  // 4. Seamless feathering scrims + ambient lighting + crisp typography 100% inside Mobile Safe Zone (x=548..1540, y=544..898)
  const fgSvg = `<svg width="2560" height="1440" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Smoothly melts outer-left studio photo (x=0..740) into pure obsidian BEFORE x=520 -->
      <linearGradient id="leftBlend" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#040812" stop-opacity="0.35"/>
        <stop offset="52%" stop-color="#040812" stop-opacity="0.88"/>
        <stop offset="72%" stop-color="#040812" stop-opacity="1"/>
        <stop offset="100%" stop-color="#040812" stop-opacity="1"/>
      </linearGradient>
      <!-- Smoothly melts Ana's left edge (x=1440..1760) seamlessly from pure obsidian -->
      <linearGradient id="anaLeftBlend" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#040812" stop-opacity="1"/>
        <stop offset="35%" stop-color="#040812" stop-opacity="0.86"/>
        <stop offset="72%" stop-color="#040812" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#040812" stop-opacity="0"/>
      </linearGradient>
      <!-- Smoothly melts Ana's right edge (x=2060..2265) back into deep twilight navy -->
      <linearGradient id="anaRightBlend" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#040812" stop-opacity="0"/>
        <stop offset="55%" stop-color="#040812" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="#040812" stop-opacity="1"/>
      </linearGradient>
      <!-- Smooth vertical top & bottom fades into TV canvas -->
      <linearGradient id="topEdgeFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#040812" stop-opacity="1"/>
        <stop offset="100%" stop-color="#040812" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="botEdgeFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#040812" stop-opacity="0"/>
        <stop offset="100%" stop-color="#040812" stop-opacity="1"/>
      </linearGradient>
      <radialGradient id="cyanAura" cx="38%" cy="50%" r="28%">
        <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.22"/>
        <stop offset="60%" stop-color="#06b6d4" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="amberAura" cx="73%" cy="52%" r="22%">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#22d3ee"/>
        <stop offset="52%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#fbbf24"/>
      </linearGradient>
      <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#10b981"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.7"/>
      </filter>
    </defs>

    <!-- Feather overlays eliminating ALL hard rectangular seams -->
    <rect x="0" y="480" width="760" height="480" fill="url(#leftBlend)"/>
    <rect x="740" y="480" width="720" height="480" fill="#040812"/>
    <rect x="1420" y="480" width="380" height="480" fill="url(#anaLeftBlend)"/>
    <rect x="2040" y="480" width="240" height="480" fill="url(#anaRightBlend)"/>
    <rect x="2250" y="480" width="310" height="480" fill="#040812"/>
    <rect x="0" y="478" width="2560" height="75" fill="url(#topEdgeFade)"/>
    <rect x="0" y="885" width="2560" height="85" fill="url(#botEdgeFade)"/>

    <!-- Subtle ambient brand lighting -->
    <rect width="2560" height="1440" fill="url(#cyanAura)"/>
    <rect width="2560" height="1440" fill="url(#amberAura)"/>

    <!-- Thin signature cinema accent hairline framing desktop/TV strip -->
    <rect x="0" y="508" width="2560" height="4" fill="url(#brandGrad)" opacity="0.85"/>
    <rect x="0" y="928" width="2560" height="4" fill="url(#brandGrad)" opacity="0.45"/>

    <!-- ALL CORE BRAND CONTENT STRICTLY INSIDE MOBILE SAFE ZONE (x=548..1540, y=542..900) -->

    <!-- Eyebrow Pill -->
    <rect x="548" y="544" width="526" height="38" rx="19" fill="#0a1628" fill-opacity="0.95" stroke="#22d3ee" stroke-opacity="0.65" stroke-width="1.8"/>
    <text x="811" y="569" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="800" letter-spacing="1.5" fill="#67e8f9">AUTOMATED 4K VIDEO PRODUCTION PLATFORM</text>

    <!-- Main Wordmark -->
    <text x="548" y="672" font-family="sans-serif" font-size="90" font-weight="900" letter-spacing="-1.5" fill="#ffffff" filter="url(#shadow)">SceneFlow <tspan fill="url(#brandGrad)">Studio</tspan></text>

    <!-- Flagship Tagline -->
    <text x="548" y="736" font-family="sans-serif" font-size="42" font-weight="800" fill="#f8fafc" filter="url(#shadow)">Build Worlds. <tspan fill="#fbbf24">Not Just Clips.</tspan></text>

    <!-- Differentiator Line -->
    <text x="548" y="788" font-family="sans-serif" font-size="22" font-weight="600" fill="#cbd5e1" filter="url(#shadow)">Continuity Vault™  ·  Production Agent  ·  100% White-Label  ·  7+ Languages</text>

    <!-- Bottom CTA Row -->
    <rect x="548" y="824" width="310" height="56" rx="12" fill="url(#ctaGrad)" filter="url(#shadow)"/>
    <text x="703" y="861" text-anchor="middle" font-family="sans-serif" font-size="25" font-weight="900" fill="#03111c">sceneflowai.studio</text>

    <rect x="878" y="824" width="420" height="56" rx="12" fill="#0d182b" fill-opacity="0.92" stroke="#fbbf24" stroke-opacity="0.7" stroke-width="2"/>
    <text x="1088" y="860" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#fde68a">Creators · Showrunners · Agencies</text>
  </svg>`

  const composites: sharp.OverlayOptions[] = []
  if (leftFlankBuf) {
    composites.push({ input: leftFlankBuf, top: 500, left: 0 })
  }
  composites.push({ input: anaBuf, top: 492, left: 1440 })
  composites.push({ input: Buffer.from(fgSvg), top: 0, left: 0 })

  await sharp(Buffer.from(bgSvg))
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(BANNER_PATH)

  await sharp(BANNER_PATH)
    .extract({ left: 0, top: 508, width: 2560, height: 423 })
    .jpeg({ quality: 90 })
    .toFile(DESKTOP_PREVIEW_PATH)

  await sharp(BANNER_PATH)
    .extract({ left: 507, top: 508, width: 1546, height: 423 })
    .jpeg({ quality: 90 })
    .toFile(MOBILE_PREVIEW_PATH)

  console.log(`Generated banner: ${BANNER_PATH.replace(`${ROOT}/`, '')}`)
  console.log(`Generated desktop preview: ${DESKTOP_PREVIEW_PATH.replace(`${ROOT}/`, '')}`)
  console.log(`Generated mobile safe-zone preview: ${MOBILE_PREVIEW_PATH.replace(`${ROOT}/`, '')}`)
}

async function getAccessToken(): Promise<string> {
  const direct = process.env.YOUTUBE_ACCESS_TOKEN?.trim()
  if (direct) return direct
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim()
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing YOUTUBE_REFRESH_TOKEN or client credentials.')
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const d = (await res.json()) as { access_token?: string }
  if (!res.ok || !d.access_token) {
    throw new Error(`OAuth token refresh failed (${res.status}): ${JSON.stringify(d)}`)
  }
  return d.access_token
}

async function publishChannelBranding() {
  const token = await getAccessToken()

  // 1. Fetch existing channel object so we preserve all other localizations & settings cleanly
  const curRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings,localizations&mine=true',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!curRes.ok) {
    throw new Error(`channels.list failed (${curRes.status}): ${await curRes.text()}`)
  }
  const curData = (await curRes.json()) as { items?: Array<Record<string, any>> }
  const channel = curData.items?.[0]
  if (!channel) throw new Error('No YouTube channel found')
  console.log(`Authenticated channel: ${channel.snippet?.title} (${channel.id}) ${channel.snippet?.customUrl}`)

  // 2. Upload new 2560×1440 channel banner image
  const bannerBuf = readFileSync(BANNER_PATH)
  console.log(`Uploading 2560×1440 banner (${(bannerBuf.length / 1024).toFixed(0)} KB)...`)
  const banRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/channelBanners/insert?uploadType=media',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bannerBuf.length),
      },
      body: bannerBuf,
    }
  )
  if (!banRes.ok) {
    throw new Error(`channelBanners.insert failed (${banRes.status}): ${await banRes.text()}`)
  }
  const banData = (await banRes.json()) as { url?: string }
  if (!banData.url) throw new Error('channelBanners.insert returned no banner url')
  console.log(`  [banner uploaded] ${banData.url}`)

  // 3. Build cleaned + upgraded localizations map
  const mergedLocalizations: Record<string, { title: string; description: string }> = {}
  const existingLocs = (channel.localizations || {}) as Record<
    string,
    { title?: string; description?: string }
  >
  for (const [k, v] of Object.entries(existingLocs)) {
    mergedLocalizations[k] = {
      title: (v.title || CHANNEL_TITLE).trim(),
      description: cleanLegacyMarkdown(v.description || ''),
    }
  }
  for (const [k, v] of Object.entries(LOCALIZED_DESCRIPTIONS)) {
    mergedLocalizations[k] = v
  }

  // 4. Update channel brandingSettings (must be its own channels.update call; omit read-only title)
  const existingChannel = { ...(channel.brandingSettings?.channel || {}) }
  delete existingChannel.title
  const nextBrandingSettings = {
    channel: {
      ...existingChannel,
      description: DESCRIPTION_EN,
      keywords: CHANNEL_KEYWORDS,
      defaultLanguage: 'en',
      country: existingChannel.country || 'US',
    },
    image: {
      bannerExternalUrl: banData.url,
    },
  }

  const updBrandRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=brandingSettings',
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channel.id,
        brandingSettings: nextBrandingSettings,
      }),
    }
  )
  if (!updBrandRes.ok) {
    throw new Error(
      `channels.update(brandingSettings) failed (${updBrandRes.status}): ${await updBrandRes.text()}`
    )
  }
  const updatedBrand = (await updBrandRes.json()) as Record<string, any>
  console.log('  [brandingSettings] Updated banner, description, keywords, and defaultLanguage=en')

  // 5. Update localized channel About descriptions in a separate channels.update(localizations) call
  const updLocRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=localizations',
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channel.id,
        localizations: mergedLocalizations,
      }),
    }
  )
  if (!updLocRes.ok) {
    throw new Error(
      `channels.update(localizations) failed (${updLocRes.status}): ${await updLocRes.text()}`
    )
  }
  const updatedLoc = (await updLocRes.json()) as Record<string, any>

  writeFileSync(
    join(OUT_DIR, 'channel-branding-result.json'),
    JSON.stringify(
      {
        channelId: updatedBrand.id,
        title: updatedBrand.brandingSettings?.channel?.title,
        keywords: updatedBrand.brandingSettings?.channel?.keywords,
        bannerExternalUrl: updatedBrand.brandingSettings?.image?.bannerExternalUrl,
        localizationsCount: Object.keys(updatedLoc.localizations || {}).length,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  )
  console.log(
    `\nChannel branding + banner + ${Object.keys(updatedLoc.localizations || {}).length} localizations updated LIVE on @sceneflowaistudio!`
  )
}

async function verifyChannelBranding() {
  const token = await getAccessToken()
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings,localizations&mine=true',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw new Error(`channels.list failed (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as { items?: Array<Record<string, any>> }
  const ch = data.items?.[0]
  if (!ch) throw new Error('No YouTube channel found')

  const locs = (ch.localizations || {}) as Record<string, { title?: string; description?: string }>
  const markdownHits = Object.entries(locs)
    .filter(([, v]) => /(\*\*|^#{1,4}\s|\]\(https?:\/\/)/m.test(v.description || ''))
    .map(([k]) => k)

  console.log(`Channel: ${ch.snippet?.title} (${ch.id}) ${ch.snippet?.customUrl}`)
  console.log(`Default language: ${ch.brandingSettings?.channel?.defaultLanguage}`)
  console.log(`Banner URL: ${ch.brandingSettings?.image?.bannerExternalUrl}`)
  console.log(`Keywords (${(ch.brandingSettings?.channel?.keywords || '').length} chars): ${ch.brandingSettings?.channel?.keywords}`)
  console.log(`Snippet description (${(ch.snippet?.description || '').length} chars):`)
  console.log(ch.snippet?.description)
  console.log(`\nLocalizations (${Object.keys(locs).length}): ${Object.keys(locs).sort().join(', ')}`)
  console.log(`Remaining legacy Markdown hits: ${markdownHits.length === 0 ? 'NONE (0)' : markdownHits.join(', ')}`)
}

async function main() {
  const argv = process.argv.slice(2)
  const envIdx = argv.indexOf('--env-file')
  if (envIdx >= 0 && argv[envIdx + 1] && existsSync(argv[envIdx + 1]!)) {
    dotenv.config({ path: argv[envIdx + 1]!, override: true })
  }

  if (argv.includes('--verify')) {
    await verifyChannelBranding()
    return
  }

  await generateBannerAssets()

  if (argv.includes('--publish')) {
    await publishChannelBranding()
  }
}

main().catch((err) => {
  console.error('\nERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
