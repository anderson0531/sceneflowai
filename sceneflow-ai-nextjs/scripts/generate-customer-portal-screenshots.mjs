#!/usr/bin/env node
/**
 * Generates 8 crisp 2560x1440 (16:9 QHD) application experience screenshots across all
 * 7 languages (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`) for the Customer & Provider
 * Experience Film:
 *   - Canonical `en` plates -> `public/landing/video-services/portal-screens/01..08.{png,webp}`
 *   - All 7 localized QHD plate sets -> `tmp/customer-portal-build/screens/<locale>/01..08.png`
 *
 * `scripts/build-customer-portal-film.ts` automatically renders per-locale 24fps Lanczos3
 * camera-panned masters from `tmp/customer-portal-build/screens/<locale>/` so every
 * localized video (`portal-en` .. `portal-th`) displays UI aligned with its narration language.
 */

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC_OUT_DIR = join(ROOT, 'public', 'landing', 'video-services', 'portal-screens')
const BUILD_SCREENS_ROOT = join(ROOT, 'tmp', 'customer-portal-build', 'screens')

const W = 2560
const H = 1440

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Kohinoor Devanagari', 'Devanagari Sangam MN', 'Geeza Pro', 'Thonburi', 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"

const ARABIC_RE = /[\u0600-\u06FF]/

function esc(str) {
  let out = String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  // Prevent Thonburi / SF Pro negative kerning collision between ฿ and a following digit
  out = out.replace(/฿\s*(?=\d)/g, '฿\u2005')
  if (ARABIC_RE.test(out)) {
    out = out.replace(
      /(\b\d+K\b|\b\d+:\d+\b|[+\-−~]?(?:MX\$|R\$|[$₹¥฿])?[\d,.]+(?:\s*[–-]\s*[+\-−~]?(?:MX\$|R\$|[$₹¥฿])?[\d,.]+)?%?)/g,
      '\u2066$1\u2069'
    )
    out = `\u202B${out}\u200F\u202C`
  }
  return out
}

async function thumbDataUri(absPath, width = 800, height = 450) {
  const buf = await sharp(absPath)
    .resize(width, height, { fit: 'cover' })
    .jpeg({ quality: 86 })
    .toBuffer()
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

function browserFrame({ stepPill, title, domain, rightBadge, rightColor = '#10b981', bodySvg }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="${FONT_STACK}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="50%" stop-color="#0b1329"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
    <linearGradient id="amberGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <linearGradient id="cardDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#090e1c"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Window Shell -->
  <rect x="48" y="40" width="2464" height="1360" rx="28" fill="#080d1a" stroke="#1e293b" stroke-width="3"/>
  <rect x="48" y="40" width="2464" height="86" rx="28" fill="#0f172a"/>
  <rect x="48" y="94" width="2464" height="32" fill="#0f172a"/>
  <line x1="48" y1="126" x2="2512" y2="126" stroke="#1e293b" stroke-width="2"/>

  <circle cx="96" cy="83" r="10" fill="#f43f5e"/>
  <circle cx="128" cy="83" r="10" fill="#f59e0b"/>
  <circle cx="160" cy="83" r="10" fill="#10b981"/>

  <rect x="196" y="59" width="276" height="48" rx="12" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
  <text x="334" y="90" fill="#6ee7b7" font-size="18" font-weight="800" text-anchor="middle">${esc(stepPill)}</text>

  <text x="492" y="91" fill="#f8fafc" font-size="21" font-weight="700">${esc(title)}</text>

  <rect x="1240" y="59" width="748" height="48" rx="14" fill="#020617" stroke="#334155" stroke-width="2"/>
  <text x="1614" y="90" fill="#38bdf8" font-size="17" font-weight="600" text-anchor="middle">HTTPS // ${esc(domain)}</text>

  <rect x="2012" y="59" width="464" height="48" rx="24" fill="${rightColor}" fill-opacity="0.18" stroke="${rightColor}" stroke-width="2"/>
  <text x="2244" y="90" fill="#f8fafc" font-size="17" font-weight="700" text-anchor="middle">${esc(rightBadge)}</text>

  ${bodySvg}
</svg>`
}

const SCREEN_I18N = {
  en: {
    s1: {
      pill: 'STAGE 01 · PORTAL',
      title: 'Harborlight Video Studio — White-Label Storefront',
      domain: 'portal.harborlightfilms.com · 100% White-Label',
      badge: '$29 Paid Discovery · 83% Net Margin',
      agencySub: 'Bespoke Cinema Production · Preview Your Illustrated Storyboard Blueprint in Minutes',
      poweredBy: 'Powered Invisibly by SceneFlow',
      services: [
        ['Video Memoirs & Tributes', '$349 – $1,250', 'Multi-Era Family Biographies · Selected ✓'],
        ['Real Estate Cinema Tours', '$199 – $599', '48-Hour Architectural Listing Films'],
        ['Education & SOP Training', '$399 – $1,499', '70+ Language Workforce Modules'],
        ['Founder & Brand Stories', '$499 – $1,999', 'High-Converting Commercial Films'],
      ],
      passTag: 'SELF-FUNDING DISCOVERY',
      passTitle: 'Storyboard Blueprint Pass',
      passSub: 'See & hear your custom film Blueprint before committing to production.',
      passPriceHero: '$29',
      passCredit: '100% Credited Toward Production',
      passCompute: 'Max AI compute ~$3.90 → +$23.96 net (83% margin)',
      passZero: 'Zero Unpaid Sales Calls · Zero Tire-Kickers',
      bullets: [
        '✓ Automated magic-link email into Guided AI Story Intake',
        '✓ 6 Illustrated 16:9 Beat Storyboards + Narrated Audio Overview',
        '✓ Up to 4 AI-Filtered Blueprint Director Revisions included',
        '✓ Up to 3 Automated Audience Resonance score passes emailed',
      ],
      cta: 'Start My Storyboard Blueprint — $29 →',
      payNote: 'Apple Pay · Stripe · Whop · Instant Automated Email Link',
    },
    s2: {
      pill: 'STAGE 02 · AUTO INTAKE',
      title: 'Automated Magic-Link Email → Guided Vision & Story Interview',
      badge: '0 PM Minutes · 24/7 Voice or Text',
      inboxTag: 'CLIENT INBOX · SENT INSTANTLY ON $29 CHECKOUT',
      inboxTitle: 'Automated Magic-Link Delivery',
      fromLine: 'From: Harborlight Video Studio <concierge@harborlightfilms.com>',
      toLine: 'To: Elena Morales <elena.morales@email.com> · Delivered in 2s',
      emailHeading: 'Welcome Elena! Start your 5-minute Story Intake',
      emailBody1: 'Your $29 Blueprint Pass is active and credited toward your film.',
      emailBody2: 'Speak naturally or type in any of 7 languages—no password needed.',
      emailBtn: 'Open Guided Vision & Story Interview →',
      emailFoot: 'Includes 4 Blueprint Iterations + 3 Audience Resonance Passes',
      consentTitle: '✓ Clickwrap Media, Likeness & Voice Consent Verified',
      consentBullets: [
        '• Automatic EXIF GPS stripping on all family uploads',
        '• Isolated customer quarantine protects Producer standing',
        '• 7 Native Languages: EN · ES · PT · HI · ZH · AR · TH',
      ],
      computeTitle: 'STAGE COMPUTE COST: ~$0.55 · OPERATOR TIME: 0 MIN',
      computeSub: 'Vision confirmed in 2 passes + 4-turn story interview completed at 9:42 PM',
      rightTag: 'GUIDED VISION & 4-TURN STORY INTERVIEW · 96% COMPLETE',
      rightTitle: '“Mateo’s 80th Birthday Harbor Memoir”',
      quoteTag: 'VOICE / TEXT INPUT · ELENA MORALES (TRANSCRIBED)',
      quoteLines: [
        '“We want a 12-minute tribute for Dad’s 80th birthday—from learning cedar boatbuilding',
        'in 1958 Oaxaca, to opening his 1972 San Diego boatshop, to handing his scorched cedar',
        'compass box to his grandson at our harbor dinner.”',
      ],
      extractedHeading: 'AUTO-EXTRACTED MULTI-ERA CAST, LOCATIONS & PROPS',
      extracted: [
        ['CAST · ERA 1972', 'Mateo Morales (Age 28)', 'Master boatwright · 1972 cedar boatshop likeness anchor'],
        ['CAST · ERA 2026', 'Mateo Morales (Age 80)', '80th birthday honoree · Exclusive era beat casting locked'],
        ['HERO PROP LOCK', 'Scorched Cedar Compass Box', 'Hand-carved 1958 heirloom passed across three generations'],
      ],
      rightBtn: 'Complete Intake & Auto-Generate Illustrated Blueprint →',
      rightFoot: 'Illustrated Storyboards + Voiceover Narration Emailed Automatically in ~3 Minutes',
    },
    s3: {
      pill: 'STAGE 03 · BLUEPRINT',
      title: 'Illustrated Storyboard Blueprint + Studio Narrated Overview',
      badge: 'Emailed in ~3 Min · Audience Resonance 88/100',
      audioTitle: 'Narrated Blueprint Overview · Studio Voice (Charon · 0:48)',
      audioQuote: '“In 1972 San Diego, fragrant cedar shavings curl beneath twenty-eight-year-old Mateo’s hand plane...”',
      arBadge: 'Audience Resonance: 88 / 100',
      cards: [
        ['BEAT 01 · 1958 OAXACA (0:00–2:15)', 'The Scorched Cedar Compass', 'Young Mateo rescues a brass compass in warm sierra', 'workshop light, carving his first dovetail box.'],
        ['BEAT 03 · 1972 BOATSHOP (4:30–7:40)', 'Opening Harborlight Joinery', 'Mateo (Age 28) & Rosa unlock their San Diego cedar', 'boatyard in golden coastal morning mist.'],
        ['BEAT 06 · 2026 HARBOR (9:50–12:00)', 'Three-Generation Toast', 'Mateo (Age 80) passes the scorched cedar compass', 'box to grandson Leo beneath harbor lanterns.'],
      ],
      voReady: '▶ Beat Voiceover Ready',
      botTitle: 'Delivered Automatically via Branded Email in ~3 Minutes',
      botLine1: '6 Beat Storyboard Stills (60 cr) + Section Audio Narration (40 cr) + AR Pass 1/3 (25 cr) = ~$1.25 Compute',
      botLine2: 'Customer can now self-refine up to 4 Blueprint Revisions + 3 Audience Resonance Passes—or click Approve.',
      botBtn: 'Refine or Approve Blueprint →',
    },
    s4: {
      pill: 'STAGE 04 · AI REVISIONS',
      title: '4 AI-Filtered Blueprint Revisions + 3 Audience Resonance Passes',
      badge: 'Revisions: 2 of 4 · AR Passes: 2 of 3',
      leftTag: 'STEP 1 · AI FEEDBACK FILTER & CLARIFIER',
      leftTitle: 'Client Feedback Confirmed Before Rewrite',
      noteTag: 'CLIENT RAW NOTE (ELENA MORALES)',
      note1: '“Can Beat 6 happen at golden sunset on the harbor deck, and have Dad',
      note2: 'read the inscription inside the lid of the cedar compass box?”',
      planTag: '★ AI CLARIFIED REVISION PLAN (ROUTED TO BLUEPRINT DIRECTOR)',
      planBullets: [
        '• Update Beat 06 lighting & setting to golden-hour San Diego harbor deck',
        '• Add close-up emotional beat of Mateo (Age 80) reading 1958 lid inscription',
        '• Re-illustrate Beat 06 storyboard keyframe while preserving Beats 01–05',
        '• Auto-run Audience Resonance Pass 2 of 3 & email updated review link',
      ],
      leftBtn: '✓ Confirmed & Applied via Blueprint Director',
      leftFoot: 'Quarantine Protected · Capped at 4 Blueprint Revisions & 3 AR Iterations',
      rightTag: 'STEP 2 · UPDATED AUDIENCE RESONANCE & CLIENT SIGN-OFF',
      rightTitle: 'Resonance Score Jumped: 88 → 95 / 100',
      readyTag: 'READY FOR PROD',
      metrics: ['Emotional Payoff: 98 / 100', 'Era Pacing & Structure: 95 / 100', 'Character Continuity Arc: 96 / 100'],
      emailedNote: '✓ Updated AR Share Link Emailed Automatically',
      zeroPmNote: 'Producer Time Spent So Far: Still 0 Minutes',
      lockTitle: 'Ready to Lock Blueprint & Request Production Quote?',
      lockLine1: 'Approving locks your 6 illustrated beats, cast eras, and prop checklist,',
      lockLine2: 'and notifies your Harborlight Producer to send your $29-credited checkout link.',
      rightBtn: '✓ Approve Blueprint & Request Production Link',
    },
    s5: {
      pill: 'STAGE 05 · PM QUOTE',
      title: 'Producer Console — 3-Minute Cost Review & Stripe / Whop Link',
      badge: 'PM Gate · ~3 Min Review · 82% Margin',
      approvedPill: '✓ CLIENT APPROVED BLUEPRINT (AR 95)',
      estTitle: 'SceneFlow Automatic Cost & Scope Estimator',
      estSub: '12-Minute Multi-Era Family Video Memoir · 6 Chapters · 24 Scenes · 4K Master + 60s Trailer',
      rows: [
        ['30-Min AR-Optimized Multi-Scene Script + Studio Cast Voices', '$4.80 (480 cr)'],
        ['Multi-Age Reference Likeness + 48 Scene Keyframes', '$5.40 (540 cr)'],
        ['Pre-Vis Gate + Cinema Video Generation + 4K Upscale', '$24.00 (2,400 cr)'],
        ['Estimated Producer Active Collaboration & Polish (~75 Min)', '~$62.00 labor eq.'],
      ],
      totalCompute: 'Total SceneFlow Compute Credits: $34.20 (3,420 cr)',
      netProfit: 'Projected Net Profit on $649 Package: +$530.10 (82% Net Margin)',
      rightTag: 'PACKAGED DELIVERABLES & PAYMENT LINK',
      rightTitle: 'Send Production Checkout in 1 Click',
      checks: [
        '☑ Pre-Vis Storyboard Approval Gate (before heavy video rendering)',
        '☑ Continuity Library Client Upload Link (Cast, Locations & Props)',
        '☑ 6 Chapter Previews + 12-Minute 4K Archival Master Film',
        '☑ 60-Second Vertical & Landscape Family Reunion Trailer',
      ],
      pkgPriceLabel: 'Heirloom Memoir Package Price:',
      pkgPriceVal: '$649.00',
      creditLabel: 'Less Paid Storyboard Blueprint Pass Credit:',
      creditVal: '− $29.00',
      dueLabel: 'Net Production Balance Due:',
      dueVal: '$620.00',
      sendBtn: 'Send Stripe / Whop Checkout Link ($620) →',
      sendFoot: 'Auto-launches 30-Min Optimized Script + Continuity Upload Link upon payment',
    },
    s6: {
      pill: 'STAGE 06 · PRODUCTION',
      title: '30-Min AR-Optimized Script + Shared Continuity Library Portal',
      badge: 'Script Ready in 30m · Likeness Locked',
      leftTag: 'SHARED PRODUCTION · STEP 1 (GENERATED IN 28 MIN)',
      leftTitle: 'AR-Optimized Script & Dialogue',
      scriptScore: '✓ Script Audience Resonance: 96 / 100 · 24 Scenes · 12:00 Runtime',
      sc1Head: 'SCENE 09 — INT. SAN DIEGO CEDAR BOATSHOP — MORNING (1972)',
      sc1Lines: [
        'Golden coastal mist filters through tall timber doors. MATEO (AGE 28)',
        'draws a hand plane along a fragrant hull plank beside the open',
        'SCORCHED CEDAR COMPASS BOX.',
      ],
      voHead: 'SOFIA (V.O. · WARM NARRATION)',
      voLines: [
        '“Every boat my grandfather built carried the grain of Oaxaca',
        'and that brass compass from fifty-eight...”',
      ],
      sc2Head: 'SCENE 22 — EXT. SAN DIEGO HARBOR DECK — SUNSET (2026)',
      sc2Lines: [
        'String lanterns glow above harbor water. MATEO (AGE 80) opens the',
        'compass lid and places it into grandson LEO’s hands.',
      ],
      exclBadge: '✓ Multi-Age Beat Exclusivity Verified (Zero Duplicate Era Cast)',
      rightTag: 'SHARED PRODUCTION · STEP 2 (CLIENT CONTINUITY PORTAL)',
      rightTitle: 'Client Uploads & Approves Reference Anchors',
      anchors: [
        ['CHARACTER ANCHOR', 'Mateo Morales (Age 80)', 'Client Photo Uploaded · EXIF Stripped · Approved ✓'],
        ['1972 ERA LIKENESS', 'Mateo Morales (Age 28)', '1972 Snapshot + Likeness Lock · Approved ✓'],
        ['LOCATION ANCHOR', '1972 Harbor Boatshop', 'Archival Timber Boatyard · Approved ✓'],
        ['HERO PROP ANCHOR', 'Cedar Compass Box', 'Smartphone Macro Upload · Approved ✓'],
      ],
      signBtn: '✓ Continuity Library Signed Off by Elena Morales',
    },
    s7: {
      pill: 'STAGE 07 · SCREENING',
      title: 'White-Label Screening Room — Staged Deliverable Review & Approval',
      badge: 'Pre-Vis Gate Protects Video Credits',
      tabs: ['✓ 1. Pre-Vis Cut', '✓ 2. Key Clips', '✓ 3. Scenes', '✓ 4. Chapters', '● 5. 12-Min 4K Master', '● 6. 60s Social Trailer'],
      uhdBadge: '4K UHD PREVIEW · 04:18 / 12:00',
      chapTitle: 'Chapter 3: 1972 Harborlight Joinery · Frame-Accurate Review',
      chapSub: 'Packaged deliverables customized per client tier · Watermarked until final sign-off',
      rightTag: 'TIMECODED CLIENT REVIEW · ROUND 1 OF 2',
      rightTitle: 'Staged Sign-Off Ledger',
      pin1Tag: '● PIN @ 04:18 · ELENA MORALES',
      pin1L1: '“Dad’s 1972 smile and the cedar shavings look',
      pin1L2: 'unbelievable! My sister cried watching this.”',
      pin2Tag: '● PIN @ 09:54 · ELENA MORALES',
      pin2L1: '“Harbor sunset toast and the 60s trailer cut are',
      pin2L2: '100% ready for Saturday’s dinner!”',
      guardTitle: 'Why Pre-Vis Gate Protects Margins:',
      guardL1: 'Pacing & voiceover approved on Pre-Vis first',
      guardL2: 'before spending 4K cinema generation credits.',
      approveBtn: '✓ Approve 4K Master & 60s Trailer',
    },
    s8: {
      pill: 'STAGE 08 · SIGN-OFF & ROI',
      title: 'Client 4K Delivery Unlocked + Studio Unit Economics Payoff',
      badge: '+$530 Net / Film · 82% Net Margin',
      leftTag: 'WHAT YOUR CUSTOMER SEES · LUXURY DELIVERY',
      leftTitle: '4K Master & Trailer Unlocked ✓',
      deliv1: '✓ 12-Minute 4K UHD Archival Master (MP4 + ProRes)',
      deliv2: '✓ 60-Second Social & Family Share Trailer (16:9 + 9:16)',
      deliv3: '✓ Multi-Language Dub Pack Ready (ES · EN Family Share Link)',
      dlBtn: '✓ Download 4K Master & Share Family Link',
      rightTag: 'WHAT YOU EARN · AUTOMATED STUDIO ECONOMICS',
      rightTitle: '90% Automated · Scale 8–15 Films / Month',
      cards: [
        ['1. Self-Funding $29 Blueprint Pass', '83% Margin', '~$3.90 max compute · 0 PM min · Zero tire-kickers'],
        ['2. Full Memoir Order ($649 Package)', '+$530 Net', '$34.20 SceneFlow compute · 82% net profit margin'],
        ['3. Active Producer Time per Film', '~75 Min', '3 min quote + guided Pre-Vis & Screening Room sign-off'],
      ],
      runRateTag: 'SOLO OPERATOR MONTHLY PROFIT RUN-RATE (ACROSS 4 VERTICALS)',
      runRateVal: '$4,240 – $7,950 / mo',
      runRateSub1: '8 to 15 Client Films / Month · ~12–18 Active Producer Hours Total',
      runRateSub2: 'Memoirs · Real Estate Tours · Education & Training · Brand Stories',
    },
  },

  es: {
    s1: {
      pill: 'ETAPA 01 · PORTAL',
      title: 'Harborlight Video Studio — Portal Marca Blanca',
      domain: 'portal.harborlightfilms.com · 100% Marca Blanca',
      badge: 'Descubrimiento MX$547 · 83% Margen',
      agencySub: 'Producción de Cine a Medida · Previsualiza tu Blueprint Ilustrado en Minutos',
      poweredBy: 'Impulsado Invisiblemente por SceneFlow',
      services: [
        ['Memorias y Tributos en Video', 'MX$6,590 – MX$23,600', 'Biografías Familiares Multi-Época · Seleccionado ✓'],
        ['Tours de Cine Inmobiliario', 'MX$3,750 – MX$11,300', 'Propiedades Arquitectónicas en 48 Horas'],
        ['Educación y Capacitación SOP', 'MX$7,530 – MX$28,280', 'Módulos Laborales en 70+ Idiomas'],
        ['Historias de Marca y Fundadores', 'MX$9,410 – MX$37,700', 'Películas Comerciales de Alta Conversión'],
      ],
      passTag: 'DESCUBRIMIENTO AUTOFINANCIADO',
      passTitle: 'Pase de Blueprint (MX$547)',
      passSub: 'Mira y escucha el Blueprint de tu película antes de contratar la producción.',
      passPriceHero: 'MX$547',
      passCredit: '100% Acreditado a tu Producción',
      passCompute: 'Cómputo IA máx ~MX$74 → +MX$452 neto (83%)',
      passZero: 'Cero Llamadas Gratis · Solo Compradores Reales',
      bullets: [
        '✓ Correo automático con enlace mágico a la Entrevista IA',
        '✓ 6 Storyboards 16:9 Ilustrados + Resumen Narrado en Audio',
        '✓ Hasta 4 Revisiones Filtradas por IA con Blueprint Director',
        '✓ Hasta 3 Análisis Audience Resonance enviados por correo',
      ],
      cta: 'Iniciar Mi Blueprint con Storyboard — MX$547 →',
      payNote: 'Apple Pay · Stripe · Whop · Enlace Automático al Instante',
    },
    s2: {
      pill: 'ETAPA 02 · ADMISIÓN IA',
      title: 'Correo con Enlace Mágico → Visión y Entrevista de 4 Turnos',
      badge: '0 Min PM · 24/7 por Voz o Texto',
      inboxTag: 'BANDEJA DEL CLIENTE · ENVIADO AL INSTANTE TRAS PAGAR MX$547',
      inboxTitle: 'Entrega Automática con Enlace Mágico',
      fromLine: 'De: Harborlight Video Studio <concierge@harborlightfilms.com>',
      toLine: 'Para: Elena Morales <elena.morales@email.com> · Entregado en 2s',
      emailHeading: '¡Bienvenida Elena! Inicia tu entrevista de 5 minutos',
      emailBody1: 'Tu Pase de Blueprint de MX$547 está activo y acreditado a tu película.',
      emailBody2: 'Habla con naturalidad o escribe en 7 idiomas, sin contraseñas.',
      emailBtn: 'Abrir Entrevista Guiada de Visión e Historia →',
      emailFoot: 'Incluye 4 Iteraciones de Blueprint + 3 Pases Audience Resonance',
      consentTitle: '✓ Consentimiento de Imagen, Voz y Medios Verificado',
      consentBullets: [
        '• Eliminación automática de GPS EXIF en fotos familiares',
        '• Cuarentena aislada por cliente protege la cuenta del Productor',
        '• 7 Idiomas Nativos: EN · ES · PT · HI · ZH · AR · TH',
      ],
      computeTitle: 'CÓMPUTO DE ETAPA: ~MX$10 · TIEMPO DEL PRODUCTOR: 0 MIN',
      computeSub: 'Visión confirmada en 2 pasos + entrevista de 4 turnos completada a las 9:42 PM',
      rightTag: 'VISIÓN GUIADA Y ENTREVISTA DE 4 TURNOS · 96% COMPLETADO',
      rightTitle: '“Memoria del Puerto — 80 Años de Mateo”',
      quoteTag: 'VOZ / TEXTO · ELENA MORALES (TRANSCRITO)',
      quoteLines: [
        '“Queremos un tributo de 12 minutos por los 80 años de papá: desde carpintería',
        'de ribera en Oaxaca 1958 y su astillero en San Diego 1972, hasta entregar su',
        'caja de brújula de cedro a su nieto en la cena del puerto.”',
      ],
      extractedHeading: 'ELENCO MULTI-ÉPOCA, LOCACIONES Y UTILERÍA EXTRAÍDOS',
      extracted: [
        ['ELENCO · 1972', 'Mateo Morales (28 Años)', 'Maestro carpintero · Identidad anclada al astillero de 1972'],
        ['ELENCO · 2026', 'Mateo Morales (80 Años)', 'Homenajeado · Exclusividad de edad bloqueada por escena'],
        ['UTILERÍA CLAVE', 'Caja de Brújula de Cedro', 'Reliquia tallada en 1958 transmitida por tres generaciones'],
      ],
      rightBtn: 'Completar Entrevista y Generar Blueprint Ilustrado →',
      rightFoot: 'Storyboards Ilustrados + Narración de Voz Enviados por Correo en ~3 Minutos',
    },
    s3: {
      pill: 'ETAPA 03 · BLUEPRINT',
      title: 'Blueprint con Storyboards Ilustrados + Resumen Narrado',
      badge: 'Enviado en ~3 Min · Audience Resonance 88/100',
      audioTitle: 'Resumen Narrado del Blueprint · Voz de Estudio (Charon · 0:48)',
      audioQuote: '“En el San Diego de 1972, virutas de cedro se curvan bajo el cepillo del joven Mateo de veintiocho años...”',
      arBadge: 'Audience Resonance: 88 / 100',
      cards: [
        ['BEAT 01 · OAXACA 1958 (0:00–2:15)', 'La Brújula de Cedro', 'El joven Mateo rescata una brújula de bronce bajo', 'la luz cálida del taller y talla su primera caja.'],
        ['BEAT 03 · ASTILLERO 1972 (4:30–7:40)', 'Astillero Harborlight', 'Mateo (28) y Rosa abren su taller de barcos en', 'San Diego entre la bruma dorada del amanecer.'],
        ['BEAT 06 · PUERTO 2026 (9:50–12:00)', 'Brindis de Tres Generaciones', 'Mateo (80) entrega la caja de brújula de cedro', 'a su nieto Leo bajo los faroles del muelle.'],
      ],
      voReady: '▶ Voz en Off Lista',
      botTitle: 'Entregado Automáticamente por Correo con tu Marca en ~3 Minutos',
      botLine1: '6 Cuadros Storyboard (60 cr) + Narración de Voz (40 cr) + Pase AR 1/3 (25 cr) = ~MX$24 Cómputo',
      botLine2: 'El cliente dispone de hasta 4 Revisiones de Blueprint + 3 Pases Audience Resonance—o clic en Aprobar.',
      botBtn: 'Refinar o Aprobar Blueprint →',
    },
    s4: {
      pill: 'ETAPA 04 · REVISIONES IA',
      title: '4 Revisiones Filtradas por IA + 3 Pases de Audience Resonance',
      badge: 'Revisiones: 2 de 4 · Pases AR: 2 de 3',
      leftTag: 'PASO 1 · FILTRO Y ACLARACIÓN IA DE COMENTARIOS',
      leftTitle: 'Notas Confirmadas Antes de Reescribir',
      noteTag: 'NOTA DEL CLIENTE (ELENA MORALES)',
      note1: '“¿Puede ocurrir el Beat 6 al atardecer dorado en el muelle y que papá',
      note2: 'lea la inscripción grabada dentro de la tapa de la brújula de cedro?”',
      planTag: '★ PLAN DE REVISIÓN IA (ENVIADO A BLUEPRINT DIRECTOR)',
      planBullets: [
        '• Ajustar iluminación y escenario del Beat 06 al atardecer en el muelle',
        '• Añadir primer plano emotivo de Mateo (80) leyendo la inscripción de 1958',
        '• Reilustrar storyboard del Beat 06 conservando intactos los Beats 01–05',
        '• Ejecutar Pase Audience Resonance 2 de 3 y enviar enlace por correo',
      ],
      leftBtn: '✓ Confirmado y Aplicado vía Blueprint Director',
      leftFoot: 'Protección de Cuarentena · Límite de 4 Revisiones y 3 Iteraciones AR',
      rightTag: 'PASO 2 · AUDIENCE RESONANCE ACTUALIZADO Y APROBACIÓN',
      rightTitle: 'Puntaje de Resonancia Subió: 88 → 95 / 100',
      readyTag: 'LISTO PARA PROD',
      metrics: ['Impacto Emocional: 98 / 100', 'Ritmo y Estructura: 95 / 100', 'Continuidad de Personajes: 96 / 100'],
      emailedNote: '✓ Enlace Actualizado Enviado Automáticamente por Correo',
      zeroPmNote: 'Tiempo Invertido por el Productor: 0 Minutos',
      lockTitle: '¿Lista para Aprobar el Blueprint y Solicitar Cotización?',
      lockLine1: 'Al aprobar se bloquean tus 6 beats ilustrados, épocas y lista de utilería,',
      lockLine2: 'y se notifica al Productor para enviarte el enlace con tus MX$547 acreditados.',
      rightBtn: '✓ Aprobar Blueprint y Solicitar Enlace de Pago',
    },
    s5: {
      pill: 'ETAPA 05 · COTIZACIÓN PM',
      title: 'Consola del Productor — Costos en 3 Min y Enlace Stripe / Whop',
      badge: 'Compuerta PM · ~3 Min · 82% Margen',
      approvedPill: '✓ BLUEPRINT APROBADO POR CLIENTE (AR 95)',
      estTitle: 'Estimador Automático de Costos y Alcance SceneFlow',
      estSub: 'Memoria Familiar de 12 Min · 6 Capítulos · 24 Escenas · Máster 4K + Tráiler 60s',
      rows: [
        ['Guion Multi-Escena Optimizado (30 Min) + Voces de Estudio', 'MX$91 (480 cr)'],
        ['Identidad Multi-Edad + 48 Cuadros Clave de Escena', 'MX$102 (540 cr)'],
        ['Compuerta Pre-Vis + Generación de Video Cine + Escalado 4K', 'MX$453 (2,400 cr)'],
        ['Colaboración Activa y Pulido del Productor (~75 Min)', '~MX$1,170 eq. hora'],
      ],
      totalCompute: 'Total Créditos de Cómputo SceneFlow: MX$646 (3,420 cr)',
      netProfit: 'Ganancia Neta (Paquete MX$12,240): +MX$10,010 (82% Margen)',
      rightTag: 'ENTREGABLES DEL PAQUETE Y ENLACE DE COBRO',
      rightTitle: 'Enviar Pago de Producción en 1 Clic',
      checks: [
        '☑ Aprobación Pre-Vis antes de renderizar video pesado',
        '☑ Enlace de Biblioteca de Continuidad (Elenco, Locaciones y Utilería)',
        '☑ 6 Avances de Capítulo + Película Máster 4K de 12 Minutos',
        '☑ Tráiler Familiar de 60 Segundos (Horizontal y Vertical)',
      ],
      pkgPriceLabel: 'Precio del Paquete Memoria Familiar:',
      pkgPriceVal: 'MX$12,240',
      creditLabel: 'Menos Crédito Pagado del Pase Blueprint:',
      creditVal: '− MX$547',
      dueLabel: 'Saldo Neto de Producción a Pagar:',
      dueVal: 'MX$11,693',
      sendBtn: 'Enviar Enlace Stripe / Whop (MX$11,693) →',
      sendFoot: 'Inicia automáticamente el Guion en 30 Min + Enlace de Fotos tras el pago',
    },
    s6: {
      pill: 'ETAPA 06 · PRODUCCIÓN',
      title: 'Guion Optimizado en 30 Min + Biblioteca de Continuidad',
      badge: 'Guion en 30m · Rostros Bloqueados',
      leftTag: 'PRODUCCIÓN COMPARTIDA · PASO 1 (GENERADO EN 28 MIN)',
      leftTitle: 'Guion y Diálogos Optimizados con AR',
      scriptScore: '✓ Audience Resonance del Guion: 96 / 100 · 24 Escenas · 12:00 Duración',
      sc1Head: 'ESCENA 09 — INT. ASTILLERO DE SAN DIEGO — MAÑANA (1972)',
      sc1Lines: [
        'La bruma dorada entra por los portones de madera. MATEO (28 AÑOS)',
        'desliza el cepillo sobre un tablón de cedro junto a la abierta',
        'CAJA DE BRÚJULA DE CEDRO.',
      ],
      voHead: 'SOFÍA (V.O. · NARRACIÓN CÁLIDA)',
      voLines: [
        '“Cada barco que construyó mi abuelo llevaba la veta de Oaxaca',
        'y aquella brújula de bronce del cincuenta y ocho...”',
      ],
      sc2Head: 'ESCENA 22 — EXT. MUELLE DE SAN DIEGO — ATARDECER (2026)',
      sc2Lines: [
        'Brillan guirnaldas sobre el agua. MATEO (80 AÑOS) abre la tapa',
        'de la brújula y la deposita en manos de su nieto LEO.',
      ],
      exclBadge: '✓ Exclusividad Multi-Edad Verificada (Cero Duplicados por Época)',
      rightTag: 'PRODUCCIÓN COMPARTIDA · PASO 2 (PORTAL DE CONTINUIDAD)',
      rightTitle: 'El Cliente Sube y Aprueba Referencias Visuales',
      anchors: [
        ['ANCLA DE PERSONAJE', 'Mateo Morales (80 Años)', 'Foto Subida · Sin EXIF · Aprobado ✓'],
        ['IDENTIDAD 1972', 'Mateo Morales (28 Años)', 'Foto de 1972 + Bloqueo Facial · Aprobado ✓'],
        ['ANCLA DE LOCACIÓN', 'Astillero del Puerto 1972', 'Taller Histórico de Madera · Aprobado ✓'],
        ['UTILERÍA CLAVE', 'Caja de Brújula de Cedro', 'Foto Macro desde Celular · Aprobado ✓'],
      ],
      signBtn: '✓ Biblioteca de Continuidad Aprobada por Elena Morales',
    },
    s7: {
      pill: 'ETAPA 07 · PROYECCIÓN',
      title: 'Sala de Proyección Marca Blanca — Revisión y Aprobación',
      badge: 'Pre-Vis Protege Créditos de Video',
      tabs: ['✓ 1. Corte Pre-Vis', '✓ 2. Clips Clave', '✓ 3. Escenas', '✓ 4. Capítulos', '● 5. Máster 4K 12m', '● 6. Tráiler 60s'],
      uhdBadge: 'VISTA 4K UHD · 04:18 / 12:00',
      chapTitle: 'Capítulo 3: Astillero Harborlight 1972 · Revisión por Cuadro',
      chapSub: 'Entregables por paquete · Con marca de agua hasta la aprobación final',
      rightTag: 'COMENTARIOS CON CÓDIGO DE TIEMPO · RONDA 1 DE 2',
      rightTitle: 'Registro de Aprobación por Etapas',
      pin1Tag: '● NOTA @ 04:18 · ELENA MORALES',
      pin1L1: '“¡La sonrisa de papá en 1972 y las virutas de cedro',
      pin1L2: 'se ven increíbles! Mi hermana lloró al verlo.”',
      pin2Tag: '● NOTA @ 09:54 · ELENA MORALES',
      pin2L1: '“¡El brindis al atardecer y el tráiler de 60s están',
      pin2L2: '100% listos para la cena del sábado!”',
      guardTitle: 'Cómo Protege tu Margen el Pre-Vis:',
      guardL1: 'Ritmo y voz aprobados primero en Pre-Vis antes',
      guardL2: 'de consumir créditos de renderizado 4K de cine.',
      approveBtn: '✓ Aprobar Máster 4K y Tráiler 60s',
    },
    s8: {
      pill: 'ETAPA 08 · ENTREGA Y ROI',
      title: 'Descarga 4K Desbloqueada + Rentabilidad de tu Estudio',
      badge: '+MX$10,010 Neto / Film · 82% Margen',
      leftTag: 'LO QUE RECIBE TU CLIENTE · ENTREGA DE LUJO',
      leftTitle: 'Máster 4K y Tráiler Desbloqueados ✓',
      deliv1: '✓ Máster de Archivo 4K UHD de 12 Minutos (MP4 + ProRes)',
      deliv2: '✓ Tráiler Familiar y Social de 60 Segundos (16:9 + 9:16)',
      deliv3: '✓ Paquete Multi-Idioma Listo (Enlace Familiar ES · EN)',
      dlBtn: '✓ Descargar Máster 4K y Compartir con la Familia',
      rightTag: 'LO QUE TÚ GANAS · ECONOMÍA AUTOMATIZADA',
      rightTitle: '90% Automatizado · Escala 8–15 Films / Mes',
      cards: [
        ['1. Pase Blueprint Autofinanciado (MX$547)', '83% Margen', '~MX$74 cómputo máx · 0 min PM · Sin curiosos'],
        ['2. Orden Completa Memoria (MX$12,240)', '+MX$10,010', 'MX$646 cómputo SceneFlow · 82% margen neto'],
        ['3. Tiempo Activo por Película', '~75 Min', '3 min cotización + aprobación guiada en Sala'],
      ],
      runRateTag: 'GANANCIA MENSUAL DE UN OPERADOR (4 VERTICALES)',
      runRateVal: 'MX$80,158 – MX$149,943 / mes',
      runRateSub1: '8 a 15 Películas / Mes · ~12–18 Horas Activas Totales',
      runRateSub2: 'Memorias · Inmobiliaria · Capacitación · Historias de Marca',
    },
  },

  pt: {
    s1: {
      pill: 'ETAPA 01 · PORTAL',
      title: 'Harborlight Video Studio — Portal White-Label',
      domain: 'portal.harborlightfilms.com · 100% White-Label',
      badge: 'Descoberta R$170 · 83% Margem',
      agencySub: 'Produção de Cinema Sob Medida · Veja seu Blueprint Ilustrado em Minutos',
      poweredBy: 'Operado Invisivelmente pelo SceneFlow',
      services: [
        ['Memórias e Tributos em Vídeo', 'R$2,050 – R$7,340', 'Biografias Familiares Multi-Época · Selecionado ✓'],
        ['Tours Imobiliários de Cinema', 'R$1,170 – R$3,520', 'Filmes de Imóveis em 48 Horas'],
        ['Educação e Treinamento SOP', 'R$2,340 – R$8,805', 'Módulos Corporativos em 70+ Idiomas'],
        ['Histórias de Marca e Fundadores', 'R$2,930 – R$11,740', 'Filmes Comerciais de Alta Conversão'],
      ],
      passTag: 'DESCOBERTA AUTOFINANCIADA',
      passTitle: 'Passe de Blueprint (R$170)',
      passSub: 'Veja e ouça o Blueprint do seu filme antes de contratar a produção.',
      passPriceHero: 'R$170',
      passCredit: '100% Abatido na Produção Final',
      passCompute: 'Computação IA máx ~R$23 → +R$141 líquido (83%)',
      passZero: 'Zero Reuniões Grátis · Apenas Compradores Reais',
      bullets: [
        '✓ E-mail automático com link mágico para Entrevista IA',
        '✓ 6 Storyboards 16:9 Ilustrados + Resumo Narrado em Áudio',
        '✓ Até 4 Revisões Filtradas por IA no Blueprint Director',
        '✓ Até 3 Análises Audience Resonance enviadas por e-mail',
      ],
      cta: 'Iniciar Meu Blueprint com Storyboard — R$170 →',
      payNote: 'Apple Pay · Stripe · Whop · Link Automático Instantâneo',
    },
    s2: {
      pill: 'ETAPA 02 · ENTREVISTA IA',
      title: 'E-mail com Link Mágico → Visão e Entrevista de 4 Etapas',
      badge: '0 Min PM · 24/7 por Voz ou Texto',
      inboxTag: 'CAIXA DO CLIENTE · ENVIADO INSTANTANEAMENTE APÓS R$170',
      inboxTitle: 'Entrega Automática com Link Mágico',
      fromLine: 'De: Harborlight Video Studio <concierge@harborlightfilms.com>',
      toLine: 'Para: Elena Morales <elena.morales@email.com> · Entregue em 2s',
      emailHeading: 'Bem-vinda Elena! Inicie sua entrevista de 5 minutos',
      emailBody1: 'Seu Passe de Blueprint de R$170 está ativo e creditado ao seu filme.',
      emailBody2: 'Fale naturalmente ou digite em 7 idiomas — sem precisar de senha.',
      emailBtn: 'Abrir Entrevista Guiada de Visão e História →',
      emailFoot: 'Inclui 4 Iterações de Blueprint + 3 Passes Audience Resonance',
      consentTitle: '✓ Termo de Imagem, Voz e Mídia Verificado',
      consentBullets: [
        '• Remoção automática de GPS EXIF em todas as fotos da família',
        '• Quarentena isolada protege a conta do Produtor',
        '• 7 Idiomas Nativos: EN · ES · PT · HI · ZH · AR · TH',
      ],
      computeTitle: 'CUSTO DE COMPUTAÇÃO: ~R$3.20 · TEMPO DO PRODUTOR: 0 MIN',
      computeSub: 'Visão confirmada em 2 etapas + entrevista de 4 turnos concluída às 21:42',
      rightTag: 'VISÃO GUIADA E ENTREVISTA DE 4 ETAPAS · 96% CONCLUÍDO',
      rightTitle: '“Memória do Porto — 80 Anos de Mateo”',
      quoteTag: 'VOZ / TEXTO · ELENA MORALES (TRANSCRITO)',
      quoteLines: [
        '“Queremos um tributo de 12 minutos pelos 80 anos do papai — da carpintaria naval',
        'em Oaxaca 1958 ao estaleiro em San Diego 1972, até entregar sua bússola de cedro',
        'ao neto durante o nosso jantar no porto.”',
      ],
      extractedHeading: 'ELENCO MULTI-ÉPOCA, LOCAÇÕES E OBJETOS EXTRAÍDOS',
      extracted: [
        ['ELENCO · 1972', 'Mateo Morales (28 Anos)', 'Mestre carpinteiro · Semelhança travada no estaleiro de 1972'],
        ['ELENCO · 2026', 'Mateo Morales (80 Anos)', 'Homenageado · Exclusividade de idade por cena garantida'],
        ['OBJETO CHAVE', 'Caixa de Bússola em Cedro', 'Relíquia entalhada em 1958 passada por três gerações'],
      ],
      rightBtn: 'Concluir Entrevista e Gerar Blueprint Ilustrado →',
      rightFoot: 'Storyboards Ilustrados + Narração em Áudio Enviados por E-mail em ~3 Minutos',
    },
    s3: {
      pill: 'ETAPA 03 · BLUEPRINT',
      title: 'Blueprint com Storyboards Ilustrados + Narração em Áudio',
      badge: 'Enviado em ~3 Min · Audience Resonance 88/100',
      audioTitle: 'Resumo Narrado do Blueprint · Voz de Estúdio (Charon · 0:48)',
      audioQuote: '“Na San Diego de 1972, aparas de cedro perfumado curvam-se sob a plaina do jovem Mateo de vinte e oito anos...”',
      arBadge: 'Audience Resonance: 88 / 100',
      cards: [
        ['BEAT 01 · OAXACA 1958 (0:00–2:15)', 'A Bússola de Cedro', 'O jovem Mateo resgata uma bússola de latão sob', 'a luz quente da oficina e entalha sua primeira caixa.'],
        ['BEAT 03 · ESTALEIRO 1972 (4:30–7:40)', 'Estaleiro Harborlight', 'Mateo (28) e Rosa abrem seu estaleiro em San', 'Diego sob a névoa dourada da manhã costeira.'],
        ['BEAT 06 · PORTO 2026 (9:50–12:00)', 'Brinde de Três Gerações', 'Mateo (80) entrega a caixa da bússola de cedro', 'ao neto Leo sob as lanternas do cais.'],
      ],
      voReady: '▶ Narração Pronta',
      botTitle: 'Entregue Automaticamente por E-mail com Sua Marca em ~3 Minutos',
      botLine1: '6 Quadros Storyboard (60 cr) + Narração em Áudio (40 cr) + Passe AR 1/3 (25 cr) = ~R$7.35 Computação',
      botLine2: 'O cliente pode refinar até 4 Revisões de Blueprint + 3 Passes Audience Resonance — ou clicar em Aprovar.',
      botBtn: 'Refinar ou Aprovar Blueprint →',
    },
    s4: {
      pill: 'ETAPA 04 · REVISÕES IA',
      title: '4 Revisões Filtradas por IA + 3 Passes Audience Resonance',
      badge: 'Revisões: 2 de 4 · Passes AR: 2 de 3',
      leftTag: 'PASSO 1 · FILTRO E CONFIRMAÇÃO IA DE FEEDBACK',
      leftTitle: 'Feedback Confirmado Antes da Reescrita',
      noteTag: 'NOTA DA CLIENTE (ELENA MORALES)',
      note1: '“O Beat 6 pode acontecer no pôr do sol dourado no cais, com meu pai',
      note2: 'lendo a inscrição gravada dentro da tampa da bússola de cedro?”',
      planTag: '★ PLANO DE REVISÃO IA (ENVIADO AO BLUEPRINT DIRECTOR)',
      planBullets: [
        '• Ajustar luz e cenário do Beat 06 para pôr do sol no cais de San Diego',
        '• Adicionar close emocionante de Mateo (80) lendo a inscrição de 1958',
        '• Reilustrar storyboard do Beat 06 preservando intactos os Beats 01–05',
        '• Rodar Passe Audience Resonance 2 de 3 e enviar link atualizado',
      ],
      leftBtn: '✓ Confirmado e Aplicado via Blueprint Director',
      leftFoot: 'Protegido por Quarentena · Limite de 4 Revisões e 3 Iterações AR',
      rightTag: 'PASSO 2 · AUDIENCE RESONANCE ATUALIZADO E APROVAÇÃO',
      rightTitle: 'Nota de Ressonância Subiu: 88 → 95 / 100',
      readyTag: 'PRONTO P/ PROD',
      metrics: ['Impacto Emocional: 98 / 100', 'Ritmo e Estrutura: 95 / 100', 'Arco de Continuidade: 96 / 100'],
      emailedNote: '✓ Novo Link AR Enviado Automaticamente por E-mail',
      zeroPmNote: 'Tempo Gasto pelo Produtor Até Aqui: 0 Minutos',
      lockTitle: 'Pronta para Travar o Blueprint e Pedir Orçamento?',
      lockLine1: 'Aprovar trava seus 6 beats ilustrados, épocas do elenco e objetos,',
      lockLine2: 'e avisa seu Produtor Harborlight para enviar o link com R$170 abatidos.',
      rightBtn: '✓ Aprovar Blueprint e Solicitar Link de Produção',
    },
    s5: {
      pill: 'ETAPA 05 · COTAÇÃO PM',
      title: 'Console do Produtor — Custos em 3 Min e Link Stripe / Whop',
      badge: 'Gate PM · ~3 Min · 82% Margem',
      approvedPill: '✓ BLUEPRINT APROVADO PELO CLIENTE (AR 95)',
      estTitle: 'Estimador Automático de Custos e Escopo SceneFlow',
      estSub: 'Memória Familiar de 12 Min · 6 Capítulos · 24 Cenas · Master 4K + Trailer 60s',
      rows: [
        ['Roteiro Multi-Cena Otimizado (30 Min) + Vozes de Estúdio', 'R$28 (480 cr)'],
        ['Semelhança Multi-Idade + 48 Quadros-Chave de Cena', 'R$32 (540 cr)'],
        ['Gate Pre-Vis + Geração de Vídeo Cinema + Upscale 4K', 'R$141 (2,400 cr)'],
        ['Colaboração Ativa e Refinamento do Produtor (~75 Min)', '~R$364 eq. hora'],
      ],
      totalCompute: 'Total de Créditos de Computação SceneFlow: R$201 (3,420 cr)',
      netProfit: 'Lucro Líquido Projetado (Pacote R$3,812): +R$3,113 (82% Margem)',
      rightTag: 'ENTREGÁVEIS DO PACOTE E LINK DE PAGAMENTO',
      rightTitle: 'Enviar Checkout de Produção em 1 Clique',
      checks: [
        '☑ Gate de Aprovação Pre-Vis (antes da renderização pesada)',
        '☑ Link da Biblioteca de Continuidade (Elenco, Locações e Objetos)',
        '☑ 6 Prévias de Capítulo + Filme Master 4K de 12 Minutos',
        '☑ Trailer Familiar de 60 Segundos (Horizontal e Vertical)',
      ],
      pkgPriceLabel: 'Preço do Pacote Memória de Família:',
      pkgPriceVal: 'R$3,812',
      creditLabel: 'Menos Crédito Pago do Passe Blueprint:',
      creditVal: '− R$170',
      dueLabel: 'Saldo Líquido de Produção:',
      dueVal: 'R$3,642',
      sendBtn: 'Enviar Link Stripe / Whop (R$3,642) →',
      sendFoot: 'Inicia automaticamente o Roteiro em 30 Min + Link de Fotos após pagamento',
    },
    s6: {
      pill: 'ETAPA 06 · PRODUÇÃO',
      title: 'Roteiro Otimizado em 30 Min + Biblioteca de Continuidade',
      badge: 'Roteiro em 30m · Semelhança Travada',
      leftTag: 'PRODUÇÃO COMPARTILHADA · PASSO 1 (GERADO EM 28 MIN)',
      leftTitle: 'Roteiro e Diálogos Otimizados com AR',
      scriptScore: '✓ Audience Resonance do Roteiro: 96 / 100 · 24 Cenas · 12:00 Duração',
      sc1Head: 'CENA 09 — INT. ESTALEIRO DE SAN DIEGO — MANHÃ (1972)',
      sc1Lines: [
        'A névoa dourada entra pelas portas de madeira. MATEO (28 ANOS)',
        'passa a plaina manual sobre uma prancha de cedro ao lado da',
        'CAIXA DE BÚSSOLA EM CEDRO.',
      ],
      voHead: 'SOFIA (V.O. · NARRAÇÃO ACOLHEDORA)',
      voLines: [
        '“Cada barco que meu avô construiu trazia o veio de Oaxaca',
        'e aquela bússola de latão de cinquenta e oito...”',
      ],
      sc2Head: 'CENA 22 — EXT. CAIS DE SAN DIEGO — PÔR DO SOL (2026)',
      sc2Lines: [
        'Lanternas brilham sobre a água do porto. MATEO (80 ANOS) abre',
        'a tampa da bússola e a entrega nas mãos do neto LEO.',
      ],
      exclBadge: '✓ Exclusividade Multi-Idade Verificada (Zero Duplicidade por Época)',
      rightTag: 'PRODUÇÃO COMPARTILHADA · PASSO 2 (PORTAL DE CONTINUIDADE)',
      rightTitle: 'Cliente Envia e Aprova Âncoras de Referência',
      anchors: [
        ['ÂNCORA DE PERSONAGEM', 'Mateo Morales (80 Anos)', 'Foto Enviada · EXIF Removido · Aprovado ✓'],
        ['SEMELHANÇA 1972', 'Mateo Morales (28 Anos)', 'Foto de 1972 + Trava Facial · Aprovado ✓'],
        ['ÂNCORA DE LOCAÇÃO', 'Estaleiro do Porto 1972', 'Oficina Naval Histórica · Aprovado ✓'],
        ['OBJETO CHAVE', 'Caixa de Bússola em Cedro', 'Foto Macro pelo Celular · Aprovado ✓'],
      ],
      signBtn: '✓ Biblioteca de Continuidade Aprovada por Elena Morales',
    },
    s7: {
      pill: 'ETAPA 07 · EXIBIÇÃO',
      title: 'Sala de Exibição White-Label — Revisão e Aprovação',
      badge: 'Pre-Vis Protege Créditos de Vídeo',
      tabs: ['✓ 1. Corte Pre-Vis', '✓ 2. Clipes', '✓ 3. Cenas', '✓ 4. Capítulos', '● 5. Master 4K 12m', '● 6. Trailer 60s'],
      uhdBadge: 'PRÉVIA 4K UHD · 04:18 / 12:00',
      chapTitle: 'Capítulo 3: Estaleiro Harborlight 1972 · Revisão Quadro a Quadro',
      chapSub: 'Entregáveis sob medida · Com marca d’água até a aprovação final',
      rightTag: 'REVISÃO COM TIMECODE · RODADA 1 DE 2',
      rightTitle: 'Painel de Aprovação por Etapa',
      pin1Tag: '● PIN @ 04:18 · ELENA MORALES',
      pin1L1: '“O sorriso do papai em 1972 e as aparas de cedro',
      pin1L2: 'ficaram inacreditáveis! Minha irmã chorou assistindo.”',
      pin2Tag: '● PIN @ 09:54 · ELENA MORALES',
      pin2L1: '“O brinde ao pôr do sol e o trailer de 60s estão',
      pin2L2: '100% prontos para o jantar de sábado!”',
      guardTitle: 'Por Que o Pre-Vis Protege sua Margem:',
      guardL1: 'Ritmo e voz aprovados primeiro no Pre-Vis antes',
      guardL2: 'de gastar créditos de geração de cinema em 4K.',
      approveBtn: '✓ Aprovar Master 4K e Trailer 60s',
    },
    s8: {
      pill: 'ETAPA 08 · ENTREGA E ROI',
      title: 'Download 4K Liberado + Retorno Financeiro do Estúdio',
      badge: '+R$3,113 Líquido / Filme · 82% Margem',
      leftTag: 'O QUE SEU CLIENTE VÊ · ENTREGA DE LUXO',
      leftTitle: 'Master 4K e Trailer Liberados ✓',
      deliv1: '✓ Master de Arquivo 4K UHD de 12 Minutos (MP4 + ProRes)',
      deliv2: '✓ Trailer Familiar e Social de 60 Segundos (16:9 + 9:16)',
      deliv3: '✓ Pacote Multi-Idioma Pronto (Link Familiar PT · EN)',
      dlBtn: '✓ Baixar Master 4K e Compartilhar Link Familiar',
      rightTag: 'O QUE VOCÊ GANHA · ECONOMIA AUTOMATIZADA',
      rightTitle: '90% Automatizado · Escale 8–15 Filmes / Mês',
      cards: [
        ['1. Passe Blueprint Autofinanciado (R$170)', '83% Margem', '~R$23 computação máx · 0 min PM · Sem curiosos'],
        ['2. Pedido Completo de Memória (R$3,812)', '+R$3,113', 'R$201 computação SceneFlow · 82% margem líquida'],
        ['3. Tempo Ativo por Filme', '~75 Min', '3 min cotação + aprovação guiada na Sala'],
      ],
      runRateTag: 'LUCRO MENSAL DE UM OPERADOR SOLO (4 VERTICAIS)',
      runRateVal: 'R$24,906 – R$46,699 / mês',
      runRateSub1: '8 a 15 Filmes / Mês · ~12–18 Horas Ativas Totais',
      runRateSub2: 'Memórias · Imóveis · Treinamento · Histórias de Marca',
    },
  },

  hi: {
    s1: {
      pill: 'चरण 01 · बिज़नेस पोर्टल',
      title: 'Harborlight Video Studio — व्हाइट-लेबल स्टोरफ़्रंट',
      domain: 'portal.harborlightfilms.com · 100% व्हाइट-लेबल',
      badge: '₹2,720 पेड डिस्कवरी · 83% शुद्ध मार्जिन',
      agencySub: 'कस्टम सिनेमा प्रोडक्शन · मिनटों में अपनी फ़िल्म का सचित्र Blueprint देखें और सुनें',
      poweredBy: 'SceneFlow द्वारा अदृश्य रूप से संचालित',
      services: [
        ['वीडियो मेमॉयर और श्रद्धांजलि', '₹32,610 – ₹116,810', 'बहु-दशक पारिवारिक जीवनियाँ · चयनित ✓'],
        ['रियल एस्टेट सिनेमा टूर', '₹18,600 – ₹55,980', '48-घंटे प्रॉपर्टी लिस्टिंग फ़िल्में'],
        ['शिक्षा और SOP प्रशिक्षण', '₹37,290 – ₹140,080', '70+ भाषाओं में प्रशिक्षण मॉड्यूल'],
        ['फ़ाउंडर और ब्रांड स्टोरीज़', '₹46,630 – ₹186,810', 'उच्च-कन्वर्ज़न कमर्शियल फ़िल्में'],
      ],
      passTag: 'स्व-वित्तपोषित डिस्कवरी',
      passTitle: 'स्टोरीबोर्ड Blueprint पास',
      passSub: 'प्रोडक्शन बुक करने से पहले अपनी कस्टम फ़िल्म का Blueprint देखें व सुनें।',
      passPriceHero: '₹2,720',
      passCredit: 'अंतिम प्रोडक्शन में 100% समायोजित',
      passCompute: 'अधिकतम AI कम्प्यूट ~₹365 → +₹2,240 शुद्ध (83%)',
      passZero: 'शून्य मुफ़्त सेल्स कॉल · केवल गंभीर ग्राहक',
      bullets: [
        '✓ गाइडेड AI स्टोरी इनटेक हेतु स्वचालित मैजिक-लिंक ईमेल',
        '✓ 6 सचित्र 16:9 बीट स्टोरीबोर्ड + स्टूडियो ऑडियो नैरेशन',
        '✓ Blueprint Director द्वारा 4 AI-फ़िल्टर्ड संशोधन शामिल',
        '✓ 3 स्वचालित Audience Resonance स्कोर ईमेल पास',
      ],
      cta: 'मेरा स्टोरीबोर्ड Blueprint शुरू करें — ₹2,720 →',
      payNote: 'Apple Pay · Stripe · Whop · तुरंत स्वचालित ईमेल लिंक',
    },
    s2: {
      pill: 'चरण 02 · ऑटो इनटेक',
      title: 'स्वचालित मैजिक-लिंक ईमेल → विज़न और 4-टर्न स्टोरी इंटरव्यू',
      badge: '0 PM मिनट · 24/7 वॉइस या टेक्स्ट',
      inboxTag: 'क्लाइंट इनबॉक्स · ₹2,720 भुगतान पर तुरंत भेजा गया',
      inboxTitle: 'स्वचालित मैजिक-लिंक डिलीवरी',
      fromLine: 'प्रेषक: Harborlight Video Studio <concierge@harborlightfilms.com>',
      toLine: 'प्रति: Elena Morales <elena.morales@email.com> · 2 सेकंड में प्राप्त',
      emailHeading: 'स्वागत है एलेना! अपना 5-मिनट स्टोरी इनटेक शुरू करें',
      emailBody1: 'आपका ₹2,720 Blueprint पास सक्रिय है और आपकी फ़िल्म में क्रेडिट होगा।',
      emailBody2: '7 भाषाओं में सहज रूप से बोलें या टाइप करें—पासवर्ड आवश्यक नहीं।',
      emailBtn: 'गाइडेड विज़न और स्टोरी इंटरव्यू खोलें →',
      emailFoot: '4 Blueprint संशोधन + 3 Audience Resonance पास शामिल',
      consentTitle: '✓ मीडिया, चेहरा और वॉइस सहमति सत्यापित',
      consentBullets: [
        '• सभी पारिवारिक तस्वीरों से स्वचालित EXIF GPS हटाना',
        '• पृथक क्लाइंट क्वारंटीन प्रोड्यूसर अकाउंट की सुरक्षा करता है',
        '• 7 भाषाएँ उपलब्ध: EN · ES · PT · HI · ZH · AR · TH',
      ],
      computeTitle: 'चरण कम्प्यूट लागत: ~₹51 · ऑपरेटर समय: 0 मिनट',
      computeSub: '2 चरणों में विज़न पुष्टि + 4-टर्न इंटरव्यू रात 9:42 पर पूर्ण',
      rightTag: 'गाइडेड विज़न और 4-टर्न इंटरव्यू · 96% पूर्ण',
      rightTitle: '“मातेओ के 80वें जन्मदिन का हार्बर मेमॉयर”',
      quoteTag: 'वॉइस / टेक्स्ट इनपुट · एलेना मोरालेस',
      quoteLines: [
        '“हम पापा के 80वें जन्मदिन के लिए 12-मिनट की श्रद्धांजलि चाहते हैं—1958 ओआहाका में',
        'नाव बनाना सीखने से लेकर 1972 सैन डिएगो बोटशॉप और हार्बर डिनर में पोते को अपना',
        'देवदार का कंपास बॉक्स सौंपने तक।”',
      ],
      extractedHeading: 'स्वतः निकाले गए बहु-दशक पात्र, लोकेशन और प्रॉप्स',
      extracted: [
        ['पात्र · 1972', 'मातेओ मोरालेस (उम्र 28)', 'युवा नाव निर्माता · 1972 बोटशॉप चेहरा लॉक'],
        ['पात्र · 2026', 'मातेओ मोरालेस (उम्र 80)', '80वाँ जन्मदिन · युग-विशेष कास्टिंग लॉक'],
        ['प्रमुख प्रॉप', 'सीडर कंपास बॉक्स', '1958 की हस्तनिर्मित पारिवारिक धरोहर'],
      ],
      rightBtn: 'इनटेक पूरा करें और सचित्र Blueprint बनाएँ →',
      rightFoot: 'सचित्र स्टोरीबोर्ड + वॉइसओवर ~3 मिनट में ईमेल द्वारा भेजा जाएगा',
    },
    s3: {
      pill: 'चरण 03 · BLUEPRINT',
      title: 'सचित्र स्टोरीबोर्ड Blueprint + स्टूडियो नैरेटेड ऑडियो',
      badge: '~3 मिनट में ईमेल · Audience Resonance 88/100',
      audioTitle: 'नैरेटेड Blueprint सारांश · स्टूडियो वॉइस (Charon · 0:48)',
      audioQuote: '“1972 के सैन डिएगो में अट्ठाईस वर्षीय मातेओ के रंदे के नीचे सुगंधित देवदार की छीलन मुड़ती है...”',
      arBadge: 'Audience Resonance: 88 / 100',
      cards: [
        ['बीट 01 · 1958 ओआहाका (0:00–2:15)', 'सीडर कंपास बॉक्स', 'युवा मातेओ कार्यशाला की गर्म रोशनी में पीतल का', 'कंपास सहेजता है और पहला देवदार बॉक्स गढ़ता है।'],
        ['बीट 03 · 1972 बोटशॉप (4:30–7:40)', 'हार्बरलाइट बोटयार्ड की शुरुआत', 'मातेओ (28) और रोज़ा सुनहरी सुबह की धुंध में', 'अपनी सैन डिएगो नाव कार्यशाला खोलते हैं।'],
        ['बीट 06 · 2026 हार्बर (9:50–12:00)', 'तीन पीढ़ियों का उत्सव', 'मातेओ (80) बंदरगाह की लालटेनों के नीचे पोते लियो', 'को अपना सीडर कंपास बॉक्स सौंपते हैं।'],
      ],
      voReady: '▶ बीट वॉइसओवर तैयार',
      botTitle: '~3 मिनट में ब्रांडेड ईमेल द्वारा स्वचालित रूप से डिलीवर',
      botLine1: '6 स्टोरीबोर्ड चित्र (60 cr) + ऑडियो नैरेशन (40 cr) + AR पास 1/3 (25 cr) = ~₹117 कम्प्यूट',
      botLine2: 'ग्राहक स्वयं 4 Blueprint संशोधन + 3 Audience Resonance पास कर सकते हैं—या अप्रूव दबाएँ।',
      botBtn: 'Blueprint सुधारें या अप्रूव करें →',
    },
    s4: {
      pill: 'चरण 04 · AI संशोधन',
      title: '4 AI-फ़िल्टर्ड Blueprint संशोधन + 3 Audience Resonance पास',
      badge: 'संशोधन: 2 / 4 · AR पास: 2 / 3',
      leftTag: 'चरण 1 · AI फ़ीडबैक फ़िल्टर और स्पष्टीकरण',
      leftTitle: 'बदलाव से पहले क्लाइंट फ़ीडबैक की पुष्टि',
      noteTag: 'क्लाइंट नोट (एलेना मोरालेस)',
      note1: '“क्या बीट 6 बंदरगाह डेक पर सुनहरे सूर्यास्त में हो सकता है, और पापा',
      note2: 'कंपास बॉक्स के ढक्कन के भीतर लिखा संदेश पढ़कर सुनाएँ?”',
      planTag: '★ AI स्पष्ट संशोधन योजना (BLUEPRINT DIRECTOR को प्रेषित)',
      planBullets: [
        '• बीट 06 की रोशनी व सेटिंग को सैन डिएगो हार्बर सूर्यास्त में बदलें',
        '• मातेओ (80) द्वारा 1958 का संदेश पढ़ने का भावुक क्लोज़-अप जोड़ें',
        '• बीट 01–05 सुरक्षित रखते हुए बीट 06 स्टोरीबोर्ड पुनः चित्रित करें',
        '• Audience Resonance पास 2/3 चलाएँ और अपडेटेड लिंक ईमेल करें',
      ],
      leftBtn: '✓ Blueprint Director द्वारा पुष्ट और लागू',
      leftFoot: 'क्वारंटीन सुरक्षित · अधिकतम 4 Blueprint संशोधन और 3 AR पास',
      rightTag: 'चरण 2 · अपडेटेड AUDIENCE RESONANCE और मंज़ूरी',
      rightTitle: 'रेज़ोनेंस स्कोर बढ़ा: 88 → 95 / 100',
      readyTag: 'प्रोडक्शन तैयार',
      metrics: ['भावनात्मक प्रभाव: 98 / 100', 'गति और संरचना: 95 / 100', 'पात्र निरंतरता: 96 / 100'],
      emailedNote: '✓ अपडेटेड AR शेयर लिंक स्वचालित ईमेल किया गया',
      zeroPmNote: 'अब तक लगा प्रोड्यूसर समय: शून्य मिनट',
      lockTitle: 'Blueprint लॉक करें और प्रोडक्शन कोटेशन मँगाएँ?',
      lockLine1: 'अप्रूव करने पर आपके 6 सचित्र बीट्स, पात्र और प्रॉप सूची लॉक हो जाती है,',
      lockLine2: 'और प्रोड्यूसर को ₹2,720 क्रेडिट घटाकर भुगतान लिंक भेजने की सूचना मिलती है।',
      rightBtn: '✓ Blueprint अप्रूव करें और प्रोडक्शन लिंक माँगें',
    },
    s5: {
      pill: 'चरण 05 · PM कोटेशन',
      title: 'प्रोड्यूसर कंसोल — 3-मिनट लागत समीक्षा व Stripe / Whop लिंक',
      badge: 'PM गेट · ~3 मि. समीक्षा · 82% मार्जिन',
      approvedPill: '✓ क्लाइंट द्वारा अप्रूव्ड BLUEPRINT (AR 95)',
      estTitle: 'SceneFlow स्वचालित लागत और स्कोप अनुमानक',
      estSub: '12-मिनट पारिवारिक वीडियो मेमॉयर · 6 चैप्टर्स · 24 सीन · 4K मास्टर + 60s ट्रेलर',
      rows: [
        ['30-मिनट AR-अनुकूलित स्क्रिप्ट + स्टूडियो वॉइस', '₹449 (480 cr)'],
        ['बहु-उम्र रेफ़रेंस समानता + 48 सीन कीफ़्रेम', '₹505 (540 cr)'],
        ['Pre-Vis गेट + सिनेमा वीडियो रेंडर + 4K अपस्केल', '₹2,242 (2,400 cr)'],
        ['अनुमानित सक्रिय प्रोड्यूसर सहयोग व पॉलिश (~75 मिनट)', '~₹5,794 श्रम समतुल्य'],
      ],
      totalCompute: 'कुल SceneFlow कम्प्यूट क्रेडिट: ₹3,196 (3,420 cr)',
      netProfit: '₹60,650 पैकेज पर अनुमानित शुद्ध लाभ: +₹49,529 (82% मार्जिन)',
      rightTag: 'पैकेज्ड डिलीवरेबल्स और भुगतान लिंक',
      rightTitle: '1 क्लिक में प्रोडक्शन भुगतान लिंक भेजें',
      checks: [
        '☑ Pre-Vis अनुमोदन गेट (भारी वीडियो रेंडर से पहले)',
        '☑ कंटिन्यूटी लाइब्रेरी क्लाइंट फ़ोटो अपलोड लिंक',
        '☑ 6 चैप्टर प्रीव्यू + 12-मिनट 4K आर्काइवल मास्टर फ़िल्म',
        '☑ 60-सेकंड वर्टिकल और लैंडस्केप पारिवारिक ट्रेलर',
      ],
      pkgPriceLabel: 'हेयरलूम मेमॉयर पैकेज मूल्य:',
      pkgPriceVal: '₹60,650',
      creditLabel: 'घटाएँ भुगतान किया गया Blueprint पास क्रेडिट:',
      creditVal: '− ₹2,720',
      dueLabel: 'देय शुद्ध प्रोडक्शन शेष राशि:',
      dueVal: '₹57,930',
      sendBtn: 'Stripe / Whop भुगतान लिंक भेजें (₹57,930) →',
      sendFoot: 'भुगतान होते ही 30-मिनट स्क्रिप्ट + कंटिन्यूटी अपलोड लिंक स्वतः शुरू',
    },
    s6: {
      pill: 'चरण 06 · प्रोडक्शन',
      title: '30-मिनट AR स्क्रिप्ट + साझा कंटिन्यूटी लाइब्रेरी पोर्टल',
      badge: '30 मि. में स्क्रिप्ट · चेहरा लॉक',
      leftTag: 'साझा प्रोडक्शन · चरण 1 (28 मिनट में तैयार)',
      leftTitle: 'AR-अनुकूलित स्क्रिप्ट और संवाद',
      scriptScore: '✓ स्क्रिप्ट Audience Resonance: 96 / 100 · 24 सीन · 12:00 अवधि',
      sc1Head: 'सीन 09 — भीतर. सैन डिएगो सीडर बोटशॉप — सुबह (1972)',
      sc1Lines: [
        'ऊँचे लकड़ी के दरवाज़ों से सुनहरी धूप आती है। मातेओ (उम्र 28)',
        'खुले सीडर कंपास बॉक्स के पास देवदार के तख्ते पर रंदा चलाता है।',
        '',
      ],
      voHead: 'सोफ़िया (V.O. · सौम्य नैरेशन)',
      voLines: [
        '“दादाजी की बनाई हर नाव में ओआहाका की लकड़ी की खुशबू',
        'और अट्ठावन का वह पीतल का कंपास शामिल था...”',
      ],
      sc2Head: 'सीन 22 — बाहर. सैन डिएगो हार्बर डेक — सूर्यास्त (2026)',
      sc2Lines: [
        'पानी के ऊपर लालटेनें चमकती हैं। मातेओ (उम्र 80) कंपास का ढक्कन',
        'खोलकर उसे पोते लियो के हाथों में सौंपते हैं।',
      ],
      exclBadge: '✓ बहु-उम्र बीट विशिष्टता सत्यापित (शून्य डुप्लिकेट पात्र)',
      rightTag: 'साझा प्रोडक्शन · चरण 2 (क्लाइंट कंटिन्यूटी पोर्टल)',
      rightTitle: 'क्लाइंट रेफ़रेंस फ़ोटो अपलोड और मंज़ूरी',
      anchors: [
        ['पात्र रेफ़रेंस', 'मातेओ मोरालेस (उम्र 80)', 'फ़ोटो अपलोड · EXIF हटाया · स्वीकृत ✓'],
        ['1972 चेहरा लॉक', 'मातेओ मोरालेस (उम्र 28)', '1972 फ़ोटो + समानता लॉक · स्वीकृत ✓'],
        ['लोकेशन रेफ़रेंस', '1972 हार्बर बोटशॉप', 'ऐतिहासिक लकड़ी कार्यशाला · स्वीकृत ✓'],
        ['प्रमुख प्रॉप', 'सीडर कंपास बॉक्स', 'स्मार्टफ़ोन मैक्रो फ़ोटो · स्वीकृत ✓'],
      ],
      signBtn: '✓ एलेना मोरालेस द्वारा कंटिन्यूटी लाइब्रेरी स्वीकृत',
    },
    s7: {
      pill: 'चरण 07 · स्क्रीनिंग रूम',
      title: 'व्हाइट-लेबल स्क्रीनिंग रूम — चरणबद्ध समीक्षा और मंज़ूरी',
      badge: 'Pre-Vis गेट क्रेडिट बचाता है',
      tabs: ['✓ 1. Pre-Vis कट', '✓ 2. क्लिप्स', '✓ 3. सीन्स', '✓ 4. चैप्टर्स', '● 5. 12m 4K मास्टर', '● 6. 60s ट्रेलर'],
      uhdBadge: '4K UHD प्रीव्यू · 04:18 / 12:00',
      chapTitle: 'अध्याय 3: 1972 हार्बरलाइट बोटशॉप · फ़्रेम-सटीक समीक्षा',
      chapSub: 'पैकेज अनुसार डिलीवरेबल्स · अंतिम साइन-ऑफ़ तक वॉटरमार्क सुरक्षित',
      rightTag: 'टाइमकोडेड क्लाइंट समीक्षा · राउंड 1 / 2',
      rightTitle: 'चरणबद्ध साइन-ऑफ़ लेजर',
      pin1Tag: '● पिन @ 04:18 · एलेना मोरालेस',
      pin1L1: '“पापा की 1972 की मुस्कान और लकड़ी की छीलन',
      pin1L2: 'अविश्वसनीय लग रही है! मेरी बहन देखकर रो पड़ी।”',
      pin2Tag: '● पिन @ 09:54 · एलेना मोरालेस',
      pin2L1: '“सूर्यास्त का दृश्य और 60-सेकंड ट्रेलर शनिवार',
      pin2L2: 'के पारिवारिक डिनर के लिए 100% तैयार हैं!”',
      guardTitle: 'Pre-Vis गेट मार्जिन कैसे बचाता है:',
      guardL1: '4K सिनेमा क्रेडिट खर्च करने से पहले Pre-Vis पर',
      guardL2: 'कहानी की गति और वॉइसओवर की मंज़ूरी ली जाती है।',
      approveBtn: '✓ 4K मास्टर और 60s ट्रेलर स्वीकृत करें',
    },
    s8: {
      pill: 'चरण 08 · डिलीवरी व ROI',
      title: 'क्लाइंट 4K डाउनलोड अनलॉक + स्टूडियो शुद्ध लाभ',
      badge: '+₹49,529 शुद्ध / फ़िल्म · 82% मार्जिन',
      leftTag: 'आपके ग्राहक का अनुभव · प्रीमियम डिलीवरी',
      leftTitle: '4K मास्टर और ट्रेलर अनलॉक ✓',
      deliv1: '✓ 12-मिनट 4K UHD आर्काइवल मास्टर (MP4 + ProRes)',
      deliv2: '✓ 60-सेकंड सोशल और फ़ैमिली शेयर ट्रेलर (16:9 + 9:16)',
      deliv3: '✓ बहु-भाषा डब पैक तैयार (परिवार शेयर लिंक)',
      dlBtn: '✓ 4K मास्टर डाउनलोड करें और परिवार संग साझा करें',
      rightTag: 'आपकी कमाई · स्वचालित स्टूडियो अर्थशास्त्र',
      rightTitle: '90% स्वचालित · 8–15 फ़िल्में / माह स्केल करें',
      cards: [
        ['1. स्व-वित्तपोषित ₹2,720 Blueprint पास', '83% मार्जिन', '~₹365 अधिकतम कम्प्यूट · 0 PM मिनट'],
        ['2. पूर्ण मेमॉयर ऑर्डर (₹60,650 पैकेज)', '+₹49,529', '₹3,196 SceneFlow कम्प्यूट · 82% शुद्ध लाभ'],
        ['3. प्रति फ़िल्म सक्रिय समय', '~75 मिनट', '3 मि. कोटेशन + गाइडेड स्क्रीनिंग साइन-ऑफ़'],
      ],
      runRateTag: 'एकल ऑपरेटर मासिक शुद्ध लाभ (4 सेवाओं में)',
      runRateVal: '₹396,228 – ₹742,928 / माह',
      runRateSub1: '8 से 15 क्लाइंट फ़िल्में / माह · कुल ~12–18 सक्रिय घंटे',
      runRateSub2: 'मेमॉयर · रियल एस्टेट · प्रशिक्षण · ब्रांड स्टोरीज़',
    },
  },

  zh: {
    s1: {
      pill: '阶段 01 · 品牌门户',
      title: 'Harborlight Video Studio — 白标商业门户',
      domain: 'portal.harborlightfilms.com · 100% 纯白标门户',
      badge: '¥193 付费立项 · 83% 净毛利',
      agencySub: '高定电影级视频制作 · 数分钟内在线预览您的专属图文配音分镜蓝图',
      poweredBy: '由 SceneFlow 幕后隐形驱动',
      services: [
        ['人物传记与家族回忆录', '¥2,327 – ¥8,335', '跨年代家族致敬大片 · 已选择 ✓'],
        ['高端房产电影导览', '¥1,327 – ¥3,994', '48 小时极速交付房源大片'],
        ['企业培训与标准 SOP', '¥2,660 – ¥9,995', '支持 70+ 语种员工培训课程'],
        ['创始人与品牌故事大片', '¥3,327 – ¥13,329', '高转化商业广告与品牌纪录片'],
      ],
      passTag: '自负盈亏立项筛选',
      passTitle: '分镜蓝图通行证 (¥193)',
      passSub: '在决定正式投产前，先直观看到并听到您的专属影片分镜蓝图。',
      passPriceHero: '¥193',
      passCredit: '100% 全额抵扣正式成片制作费',
      passCompute: '最高 AI 算力 ~¥26 → 净赚 +¥160 (83% 毛利)',
      passZero: '零免费陪聊电话 · 自动精准筛选高意向客户',
      bullets: [
        '✓ 自动发送品牌专属邮件链接进入 AI 引导访谈',
        '✓ 6 幅 16:9 电影级分镜插图 + 录音棚级语音导览',
        '✓ 含最多 4 次 AI 提炼 Blueprint Director 自助改稿',
        '✓ 含最多 3 次 Audience Resonance 受众共鸣评分邮件',
      ],
      cta: '立即开启我的分镜蓝图 — ¥193 →',
      payNote: 'Apple Pay · Stripe · Whop · 付款即刻自动发送邮件链接',
    },
    s2: {
      pill: '阶段 02 · 自动访谈',
      title: '自动专属链接邮件 → 愿景确认与四轮 AI 故事访谈',
      badge: '0 制片人工 · 24/7 语音或文字',
      inboxTag: '客户收件箱 · ¥193 付款后秒级自动送达',
      inboxTitle: '自动发送专属免登录访谈链接',
      fromLine: '发件人: Harborlight Video Studio <concierge@harborlightfilms.com>',
      toLine: '收件人: Elena Morales <elena.morales@email.com> · 2 秒内送达',
      emailHeading: '欢迎您 Elena！点击开启 5 分钟故事访谈',
      emailBody1: '您的 ¥193 分镜蓝图通行证已激活，可全额抵扣后续成片费用。',
      emailBody2: '支持 7 种语言自然语音口述或打字输入——无需注册密码。',
      emailBtn: '开启 AI 引导愿景确认与故事访谈 →',
      emailFoot: '包含 4 次分镜蓝图自助修改 + 3 次受众共鸣评估',
      consentTitle: '✓ 肖像、声音与素材在线授权签署已验证',
      consentBullets: [
        '• 客户上传家庭老照片自动抹除 EXIF GPS 位置隐私',
        '• 独立客户安全沙箱隔离机制，保护制片方账号信誉',
        '• 原生支持 7 大语种：EN · ES · PT · HI · ZH · AR · TH',
      ],
      computeTitle: '本阶段算力成本：~¥3.7 · 制片人工耗时：0 分钟',
      computeSub: '两轮愿景确认 + 四轮故事访谈已于 21:42 自动完成',
      rightTag: 'AI 愿景确认与四轮故事访谈 · 完成度 96%',
      rightTitle: '《父亲 Mateo 八十寿辰海港回忆录》',
      quoteTag: '语音 / 文字输入 · ELENA MORALES（自动转写）',
      quoteLines: [
        '“我们想为父亲 80 岁寿辰定制一部 12 分钟纪念片——从 1958 年在瓦哈卡学习雪松造船，',
        '到 1972 年在圣地亚哥创办船坊，再到海港寿宴上把那只焦木雪松罗盘盒传给孙子。”',
        '',
      ],
      extractedHeading: 'AI 自动提取跨年代角色、关键场景与传家道具',
      extracted: [
        ['角色 · 1972 年代', 'Mateo Morales（28 岁）', '青年造船匠 · 1972 雪松船坊容貌锚点已锁定'],
        ['角色 · 2026 今昔', 'Mateo Morales（80 岁）', '八十寿辰主人公 · 跨年代同场互斥规则已锁定'],
        ['核心道具锚点', '焦木雪松罗盘盒', '1958 年手工雕刻传家宝 · 贯穿三代人'],
      ],
      rightBtn: '完成访谈并自动生成图文配音分镜蓝图 →',
      rightFoot: '6 幅分镜插图 + 全程语音导览将在约 3 分钟内自动发送至客户邮箱',
    },
    s3: {
      pill: '阶段 03 · 共享蓝图',
      title: '图文分镜蓝图分享页 + 录音棚级语音导览',
      badge: '约 3 分钟送达 · 受众共鸣 88/100',
      audioTitle: '分镜蓝图全程语音导览 · 录音棚男声 (Charon · 0:48)',
      audioQuote: '“1972 年的圣地亚哥清晨，芳香的雪松木刨花在二十八岁 Mateo 的手刨下轻盈卷起……”',
      arBadge: '受众共鸣评分：88 / 100',
      cards: [
        ['节拍 01 · 1958 瓦哈卡 (0:00–2:15)', '雪松木黄铜罗盘', '少年 Mateo 在温暖木坊灯光下珍藏黄铜罗盘，', '亲手雕出人生第一只燕尾榫木盒。'],
        ['节拍 03 · 1972 船坊 (4:30–7:40)', '创办海港造船坊', '28 岁的 Mateo 与妻子在金色海雾中推开', '圣地亚哥雪松造船坊的大门。'],
        ['节拍 06 · 2026 海港 (9:50–12:00)', '三代同堂海港祝酒', '80 岁的 Mateo 在海港灯火下将雪松罗盘盒', '郑重交到孙子 Leo 手中。'],
      ],
      voReady: '▶ 分镜配音已就绪',
      botTitle: '约 3 分钟通过您的品牌专属邮件全自动交付客户',
      botLine1: '6 幅分镜插图 (60 cr) + 章节语音导览 (40 cr) + 受众共鸣评估 1/3 (25 cr) = 算力仅 ~¥8.3',
      botLine2: '客户可自助发起最多 4 次分镜修改 + 3 次受众共鸣重评——或直接点击批准立项。',
      botBtn: '自助修改或批准分镜蓝图 →',
    },
    s4: {
      pill: '阶段 04 · AI 自助改稿',
      title: '4 次 AI 提炼分镜改稿 + 3 次受众共鸣自动评估',
      badge: '自助改稿：2 / 4 · 共鸣评估：2 / 3',
      leftTag: '步骤 1 · AI 客户反馈提炼与改稿前确认',
      leftTitle: '先确认修改意图，再自动执行改稿',
      noteTag: '客户原始留言（ELENA MORALES）',
      note1: '“能不能把第 6 节拍改在金色夕阳下的海港甲板，并让父亲',
      note2: '亲口读出雪松罗盘盒盖内侧刻着的那行字？”',
      planTag: '★ AI 提炼改稿方案（确认后路由至 BLUEPRINT DIRECTOR）',
      planBullets: [
        '• 将节拍 06 场景与光线更新为圣地亚哥海港金色夕阳甲板',
        '• 新增 80 岁 Mateo 品读 1958 年盒盖铭文的感动特写镜头',
        '• 重新绘制节拍 06 分镜图，同时完整保留节拍 01–05',
        '• 自动运行第 2/3 次受众共鸣评估并邮件发送最新审阅链接',
      ],
      leftBtn: '✓ 已确认并由 Blueprint Director 自动更新',
      leftFoot: '安全沙箱隔离保护 · 上限 4 次分镜修改与 3 次受众共鸣评估',
      rightTag: '步骤 2 · 最新受众共鸣评分与客户立项签收',
      rightTitle: '受众共鸣评分跃升：88 → 95 / 100',
      readyTag: '达到投产标准',
      metrics: ['情感共鸣张力：98 / 100', '年代节奏与结构：95 / 100', '人物连贯弧光：96 / 100'],
      emailedNote: '✓ 最新评分分享链接已自动发送至客户邮箱',
      zeroPmNote: '截至目前制片人投入时间：依然为 0 分钟',
      lockTitle: '确认锁定分镜蓝图并获取正式制作报价？',
      lockLine1: '点击批准将锁定 6 幅分镜、跨年代选角与道具清单，',
      lockLine2: '并通知制片人向您发送已抵扣 ¥193 定金的正式付款链接。',
      rightBtn: '✓ 批准分镜蓝图并获取正式付款链接',
    },
    s5: {
      pill: '阶段 05 · 制片台核价',
      title: '制片人控制台 — 3 分钟成本核算与一键发送 Stripe / Whop',
      badge: '制片把关 · ~3 分钟 · 82% 净毛利',
      approvedPill: '✓ 客户已正式批准蓝图 (AR 95)',
      estTitle: 'SceneFlow 自动算力成本与交付范围测算器',
      estSub: '12 分钟跨年代家族视频回忆录 · 6 章节 · 24 场戏 · 4K 母带 + 60 秒预告片',
      rows: [
        ['30 分钟受众共鸣优化多场剧本 + 角色配音合成', '¥32 (480 cr)'],
        ['跨年龄容貌一致性锁定 + 48 张场次关键帧', '¥36 (540 cr)'],
        ['Pre-Vis 动态预演把关 + 电影视频生成 + 4K 超分', '¥160 (2,400 cr)'],
        ['制片人有效协同与精修预估耗时（约 75 分钟）', '~¥413 人工折算'],
      ],
      totalCompute: 'SceneFlow 预计总算力消耗：¥228 (3,420 cr)',
      netProfit: '¥4,327 客户套餐预计净利润：+¥3,534（82% 净毛利率）',
      rightTag: '打包交付内容与一键收款链接',
      rightTitle: '一键发送正式制作收款链接',
      checks: [
        '☑ Pre-Vis 动态预演签收把关（先审节奏再消耗渲染算力）',
        '☑ 共享连续性资产库客户上传链接（角色、场景与道具）',
        '☑ 6 个章节预览 + 12 分钟 4K 典藏级母带成片',
        '☑ 60 秒横竖屏双版本家族聚会精华预告片',
      ],
      pkgPriceLabel: '传家回忆录定制套餐总价：',
      pkgPriceVal: '¥4,327',
      creditLabel: '抵扣已付分镜蓝图通行证定金：',
      creditVal: '− ¥193',
      dueLabel: '本次应付正式制作尾款：',
      dueVal: '¥4,134',
      sendBtn: '一键发送 Stripe / Whop 收款链接 (¥4,134) →',
      sendFoot: '客户付款后系统自动启动 30 分钟剧本生成并发送资产上传链接',
    },
    s6: {
      pill: '阶段 06 · 协同制片',
      title: '30 分钟自动优化剧本 + 共享连续性资产库确认门户',
      badge: '30 分钟出剧本 · 跨年代容貌锁定',
      leftTag: '协同制片 · 步骤 1（28 分钟自动生成完毕）',
      leftTitle: '受众共鸣优化剧本与对白台词',
      scriptScore: '✓ 剧本受众共鸣评分：96 / 100 · 共 24 场 · 总时长 12:00',
      sc1Head: '第 09 场 — 内景 圣地亚哥雪松造船坊 — 清晨 (1972)',
      sc1Lines: [
        '金色晨雾透过高大的木门洒入工坊。28 岁的 MATEO 站在敞开的',
        '焦木雪松罗盘盒旁，稳稳推着手刨刨平芳香的船体木板。',
        '',
      ],
      voHead: 'SOFIA（画外音 · 温暖旁白）',
      voLines: [
        '“外公亲手建造的每一艘船，都刻着瓦哈卡的木纹，',
        '也装着一九五八年那只黄铜罗盘……”',
      ],
      sc2Head: '第 22 场 — 外景 圣地亚哥海港甲板 — 日落 (2026)',
      sc2Lines: [
        '海港水面灯火摇曳。80 岁的 MATEO 缓缓打开罗盘盒盖，',
        '将传家罗盘郑重交到孙子 LEO 手中。',
      ],
      exclBadge: '✓ 跨年龄同场互斥校验通过（杜绝同一角色不同年代同框）',
      rightTag: '协同制片 · 步骤 2（客户连续性资产上传门户）',
      rightTitle: '客户手机拍照上传并签收视觉锚点',
      anchors: [
        ['角色视觉锚点', 'Mateo Morales（80 岁）', '客户照片已上传 · EXIF 隐私已抹除 · 已确认 ✓'],
        ['1972 年代容貌', 'Mateo Morales（28 岁）', '1972 老照片 + 跨代容貌锁定 · 已确认 ✓'],
        ['核心场景锚点', '1972 海港木船坊', '复古木结构造船工坊 · 已确认 ✓'],
        ['核心道具锚点', '焦木雪松罗盘盒', '手机微距实拍上传 · 已确认 ✓'],
      ],
      signBtn: '✓ Elena Morales 已正式签收连续性资产库',
    },
    s7: {
      pill: '阶段 07 · 白标审片室',
      title: '白标专属审片室 — 分阶段交付审阅与逐帧签收',
      badge: 'Pre-Vis 预演把关保护视频算力',
      tabs: ['✓ 1. Pre-Vis 预演', '✓ 2. 精选片段', '✓ 3. 分场成片', '✓ 4. 章节预览', '● 5. 12分钟 4K 母带', '● 6. 60秒预告片'],
      uhdBadge: '4K UHD 高清预览 · 04:18 / 12:00',
      chapTitle: '第 3 章：1972 海港造船坊 · 帧级精准审片',
      chapSub: '按套餐灵活组合交付物 · 最终签收前全程自动携带防盗水印',
      rightTag: '时间码精准批注审阅 · 第 1 / 2 轮修改',
      rightTitle: '分阶段签收台账',
      pin1Tag: '● 时间码批注 @ 04:18 · ELENA MORALES',
      pin1L1: '“父亲 1972 年年轻时的笑容和飞舞的木刨花太真实了！',
      pin1L2: '我妹妹看这一段时直接感动哭了。”',
      pin2Tag: '● 时间码批注 @ 09:54 · ELENA MORALES',
      pin2L1: '“海港夕阳祝酒镜头和 60 秒精华预告片完美无瑕，',
      pin2L2: '完全赶得上周六晚上的家族寿宴首映！”',
      guardTitle: '为什么 Pre-Vis 预演能锁住高毛利：',
      guardL1: '先在低成本动态预演上确认节奏与配音，',
      guardL2: '再启动高算力 4K 电影渲染，彻底杜绝废片返工。',
      approveBtn: '✓ 正式签收 4K 母带与 60 秒预告片',
    },
    s8: {
      pill: '阶段 08 · 交付与净利',
      title: '客户 4K 母带自动解锁 + 工作室单人规模收益看板',
      badge: '单部净赚 +¥3,534 · 82% 净毛利',
      leftTag: '客户侧看到的画面 · 尊享电影级交付',
      leftTitle: '4K 母带与预告片下载已解锁 ✓',
      deliv1: '✓ 12 分钟 4K UHD 典藏级母带（MP4 + ProRes）',
      deliv2: '✓ 60 秒横竖屏社交媒体家族分享预告片（16:9 + 9:16）',
      deliv3: '✓ 多语种家庭配音包已就绪（专属亲友分享链接）',
      dlBtn: '✓ 下载 4K 超清母带并分享家族放映链接',
      rightTag: '运营者侧收益看板 · 自动化工作室商业模型',
      rightTitle: '90% 流程自动化 · 单人月产 8–15 部大片',
      cards: [
        ['1. 自负盈亏 ¥193 蓝图通行证', '83% 毛利', '最高 ~¥26 算力 · 0 制片人工 · 零废单损耗'],
        ['2. 家族回忆录正式订单 (¥4,327)', '净赚 +¥3,534', '¥228 SceneFlow 算力 · 82% 净利润率'],
        ['3. 单部影片制片人有效投入', '~75 分钟', '3 分钟核价 + 预演与审片室引导签收'],
      ],
      runRateTag: '单人运营工作室月度净利润测算（覆盖四大高毛利垂类）',
      runRateVal: '¥28,271 – ¥53,008 / 月',
      runRateSub1: '每月稳健交付 8 至 15 部客户影片 · 每月仅需约 12–18 小时有效投入',
      runRateSub2: '人物回忆录 · 房产导览 · 企业培训 SOP · 品牌故事大片',
    },
  },

  ar: {
    s1: {
      pill: 'المرحلة 01 · البوابة',
      title: 'Harborlight Video Studio — بوابة الأعمال بعلامتك الخاصة',
      domain: 'portal.harborlightfilms.com · علامة بيضاء 100%',
      badge: 'اكتشاف مدفوع 108 ر.س · هامش 83%',
      agencySub: 'إنتاج سينمائي مخصص · شاهد واستمع إلى مخطط فيلمك المصوّر خلال دقائق',
      poweredBy: 'مدعوم في الخفاء بواسطة SceneFlow',
      services: [
        ['أفلام السيرة والذكريات العائلية', '1,310 – 4,690 ر.س', 'وثائقيات عائلية عبر العقود · مختار ✓'],
        ['جولات العقارات السينمائية', '747 – 2,248 ر.س', 'أفلام عقارية احترافية خلال 48 ساعة'],
        ['التعليم والتدريب المؤسسي', '1,497 – 5,625 ر.س', 'وحدات تدريبية بأكثر من 70 لغة'],
        ['قصص العلامات والمؤسسين', '1,872 – 7,500 ر.س', 'أفلام إعلانية عالية التحويل'],
      ],
      passTag: 'اكتشاف يموّل نفسه ذاتياً',
      passTitle: 'باقة مخطط القصة المصوّر (108 ر.س)',
      passSub: 'شاهد واستمع إلى مخطط فيلمك المخصص قبل الالتزام بالإنتاج الكامل.',
      passPriceHero: '108 ر.س',
      passCredit: 'تُخصم 100% من تكلفة الإنتاج النهائي',
      passCompute: 'أقصى حوسبة ~14.6 ر.س ← صافي +90 ر.س (هامش 83%)',
      passZero: 'صفر مكالمات مجانية · تصفية المشترين الجادين فقط',
      bullets: [
        '✓ بريد تلقائي برابط ذكي لبدء مقابلة القصة بالذكاء الاصطناعي',
        '✓ 6 لوحات مشاهد مصوّرة 16:9 + ملخص صوتي احترافي',
        '✓ حتى 4 مراجعات مفلترة ذكياً عبر Blueprint Director',
        '✓ حتى 3 تقييمات Audience Resonance مرسلة بالبريد',
      ],
      cta: 'ابدأ مخطط القصة المصوّر الآن — 108 ر.س ←',
      payNote: 'Apple Pay · Stripe · Whop · رابط بريد إلكتروني فوري تلقائياً',
    },
    s2: {
      pill: 'المرحلة 02 · المقابلة الذكية',
      title: 'بريد الرابط الذكي التلقائي ← توضيح الرؤية ومقابلة من 4 جولات',
      badge: '0 دقيقة إدارة · 24/7 صوت أو نص',
      inboxTag: 'بريد العميل · يُرسل فوراً عند دفع 108 ر.س',
      inboxTitle: 'تسليم تلقائي عبر الرابط الذكي',
      fromLine: 'من: Harborlight Video Studio <concierge@harborlightfilms.com>',
      toLine: 'إلى: Elena Morales <elena.morales@email.com> · وصل خلال ثانيتين',
      emailHeading: 'أهلاً إيلينا! ابدئي مقابلة القصة خلال 5 دقائق',
      emailBody1: 'باقة الـ Blueprint بقيمة 108 ر.س مفعّلة ومخصومة من قيمة فيلمك.',
      emailBody2: 'تحدّثي بعفوية أو اكتبي بأي من اللغات السبع دون كلمة مرور.',
      emailBtn: 'افتحي مقابلة الرؤية والقصة الموجّهة ←',
      emailFoot: 'تشمل 4 تعديلات Blueprint + 3 جولات Audience Resonance',
      consentTitle: '✓ تم توثيق الموافقة على الصور والملامح والصوت',
      consentBullets: [
        '• إزالة تلقائية لبيانات الموقع EXIF GPS من جميع الصور العائلية',
        '• عزل آمن لكل عميل يحمي حساب المنتج التجاري',
        '• 7 لغات أصلية: EN · ES · PT · HI · ZH · AR · TH',
      ],
      computeTitle: 'تكلفة حوسبة المرحلة: ~2.1 ر.س · وقت المنتج: 0 دقيقة',
      computeSub: 'تأكيد الرؤية في جولتين + إتمام المقابلة الساعة 9:42 مساءً',
      rightTag: 'توضيح الرؤية ومقابلة القصة من 4 جولات · مكتمل 96%',
      rightTitle: '«فيلم ذكريات الميناء — عيد ميلاد ماتيو الثمانين»',
      quoteTag: 'إدخال صوتي / نصي · إيلينا موراليس',
      quoteLines: [
        '«نريد فيلماً تكريمياً مدته 12 دقيقة لعيد ميلاد والدي الثمانين — من تعلّم صناعة',
        'القوارب في أواكساكا 1958 وافتتاح ورشته في سان دييغو 1972، حتى إهداء صندوق',
        'البوصلة الخشبي لحفيده في عشاء الميناء.»',
      ],
      extractedHeading: 'استخراج تلقائي للشخصيات عبر العقود والمواقع والدعائم',
      extracted: [
        ['شخصية · 1972', 'ماتيو موراليس (28 عاماً)', 'صانع قوارب شاب · تثبيت ملامح ورشة 1972'],
        ['شخصية · 2026', 'ماتيو موراليس (80 عاماً)', 'صاحب العيد الثمانين · فصل زمني حصري للمشاهد'],
        ['دعامة رئيسية', 'صندوق البوصلة من خشب الأرز', 'إرث عائلي منحوت عام 1958 عبر ثلاثة أجيال'],
      ],
      rightBtn: 'إتمام المقابلة وتوليد المخطط المصوّر تلقائياً ←',
      rightFoot: 'تُرسل اللوحات المصوّرة والتعليق الصوتي تلقائياً بالبريد خلال ~3 دقائق',
    },
    s3: {
      pill: 'المرحلة 03 · المخطط المشترك',
      title: 'مخطط القصة المصوّر + ملخص صوتي بصوت الاستوديو',
      badge: 'يُرسل في ~3 دقائق · صدى الجمهور 88/100',
      audioTitle: 'ملخص المخطط الصوتي · صوت الاستوديو (Charon · 0:48)',
      audioQuote: '«في سان دييغو عام 1972، تتثنّى نشارة خشب الأرز العطرة تحت فارة الشاب ماتيو ذي الثمانية والعشرين عاماً...»',
      arBadge: 'Audience Resonance: 88 / 100',
      cards: [
        ['مشهد 01 · أواكساكا 1958 (0:00–2:15)', 'بوصلة خشب الأرز', 'ينقذ الشاب ماتيو بوصلة نحاسية في ضوء الورشة', 'الدافئ وينحت أول صندوق خشبي له.'],
        ['مشهد 03 · ورشة 1972 (4:30–7:40)', 'افتتاح ورشة الميناء', 'يفتح ماتيو (28) وروزا ورشة القوارب في سان', 'دييغو وسط ضباب الصباح الذهبي.'],
        ['مشهد 06 · الميناء 2026 (9:50–12:00)', 'نخب ثلاثة أجيال', 'يهدي ماتيو (80) صندوق البوصلة الخشبي لحفيده', 'ليو تحت فوانيس الميناء الدافئة.'],
      ],
      voReady: '▶ التعليق الصوتي جاهز',
      botTitle: 'يُسلَّم تلقائياً عبر بريد يحمل علامتك التجارية خلال ~3 دقائق',
      botLine1: '6 لوحات مصوّرة (60 cr) + تعليق صوتي (40 cr) + تقييم صدى الجمهور 1/3 (25 cr) = ~4.7 ر.س حوسبة',
      botLine2: 'يمكن للعميل إجراء 4 تعديلات ذاتية + 3 جولات Audience Resonance — أو الضغط على اعتماد.',
      botBtn: 'تعديل أو اعتماد الـ Blueprint ←',
    },
    s4: {
      pill: 'المرحلة 04 · مراجعات ذكية',
      title: '4 تعديلات مفلترة بالذكاء الاصطناعي + 3 جولات صدى الجمهور',
      badge: 'التعديلات: 2 من 4 · جولات AR: 2 من 3',
      leftTag: 'الخطوة 1 · تصفية وتأكيد ملاحظات العميل ذكياً',
      leftTitle: 'تأكيد ملاحظات العميل قبل إعادة الصياغة',
      noteTag: 'ملاحظة العميل (إيلينا موراليس)',
      note1: '«هل يمكن أن يدور المشهد 6 وقت الغروب الذهبي على رصيف الميناء، وأن يقرأ',
      note2: 'والدي العبارة المنقوشة داخل غطاء صندوق البوصلة؟»',
      planTag: '★ خطة التعديل المؤكدة (موجّهة إلى BLUEPRINT DIRECTOR)',
      planBullets: [
        '• تحديث إضاءة وموقع المشهد 06 إلى غروب ذهبي في رصيف سان دييغو',
        '• إضافة لقطة قريبة مؤثرة لماتيو (80) يقرأ نقش عام 1958 داخل الغطاء',
        '• إعادة رسم لوحة المشهد 06 مع الحفاظ الكامل على المشاهد 01–05',
        '• تشغيل جولة صدى الجمهور 2 من 3 وإرسال الرابط المحدّث تلقائياً',
      ],
      leftBtn: '✓ تم التأكيد والتطبيق عبر Blueprint Director',
      leftFoot: 'حماية عزل آمنة · سقف 4 تعديلات Blueprint و3 جولات صدى الجمهور',
      rightTag: 'الخطوة 2 · تقييم صدى الجمهور المحدّث واعتماد العميل',
      rightTitle: 'قفز تقييم الصدى: 88 ← 95 / 100',
      readyTag: 'جاهز للإنتاج',
      metrics: ['الأثر العاطفي: 98 / 100', 'الإيقاع والبنية: 95 / 100', 'ترابط الشخصيات: 96 / 100'],
      emailedNote: '✓ تم إرسال رابط التقييم المحدّث تلقائياً بالبريد',
      zeroPmNote: 'وقت المنتج المستغرق حتى الآن: صفر دقيقة',
      lockTitle: 'هل أنتِ مستعدة لتثبيت المخطط وطلب عرض السعر؟',
      lockLine1: 'يؤدي الاعتماد إلى تثبيت المشاهد الستة والعصور وقائمة الدعائم،',
      lockLine2: 'وإشعار المنتج لإرسال رابط الدفع مخصوماً منه رصيد الـ 108 ر.س.',
      rightBtn: '✓ اعتماد المخطط وطلب رابط الإنتاج',
    },
    s5: {
      pill: 'المرحلة 05 · تسعير المنتج',
      title: 'لوحة المنتج — مراجعة التكلفة في 3 دقائق ورابط Stripe / Whop',
      badge: 'بوابة المنتج · ~3 دقائق · هامش 82%',
      approvedPill: '✓ اعتمد العميل المخطط (AR 95)',
      estTitle: 'مُقدِّر التكلفة والنطاق التلقائي من SceneFlow',
      estSub: 'فيلم ذكريات عائلي 12 دقيقة · 6 فصول · 24 مشهداً · نسخة 4K + إعلان 60 ثانية',
      rows: [
        ['سيناريو محسّن في 30 دقيقة + أصوات استوديو للشخصيات', '18 ر.س (480 cr)'],
        ['تطابق الملامح عبر الأعمار + 48 إطاراً مرجعياً للمشاهد', '20 ر.س (540 cr)'],
        ['بوابة Pre-Vis + توليد فيديو سينمائي + ترقية 4K', '90 ر.س (2,400 cr)'],
        ['وقت التعاون واللمسات الإخراجية للمنتج (~75 دقيقة)', '~233 ر.س قيمة جهد'],
      ],
      totalCompute: 'إجمالي رصيد حوسبة SceneFlow المقدّر: 128 ر.س (3,420 cr)',
      netProfit: 'صافي الربح المتوقع لباقة 2,435 ر.س: +1,989 ر.س (هامش صافي 82%)',
      rightTag: 'المخرجات المجمّعة ورابط الدفع',
      rightTitle: 'أرسل رابط دفع الإنتاج بنقرة واحدة',
      checks: [
        '☑ بوابة اعتماد Pre-Vis قبل تصيير الفيديو الثقيل',
        '☑ رابط مكتبة الاستمرارية لرفع صور الشخصيات والمواقع والدعائم',
        '☑ 6 معاينات فصول + الفيلم الرئيسي 4K بطول 12 دقيقة',
        '☑ إعلان عائلي مدته 60 ثانية بالوضعين الأفقي والعمودي',
      ],
      pkgPriceLabel: 'سعر باقة فيلم الذكريات العائلي:',
      pkgPriceVal: '2,435 ر.س',
      creditLabel: 'ناقص رصيد باقة الـ Blueprint المدفوع:',
      creditVal: '− 108 ر.س',
      dueLabel: 'صافي الرصيد المستحق للإنتاج:',
      dueVal: '2,327 ر.س',
      sendBtn: 'إرسال رابط دفع Stripe / Whop (2,327 ر.س) ←',
      sendFoot: 'يبدأ تلقائياً توليد السيناريو في 30 دقيقة وإرسال رابط رفع الصور فور الدفع',
    },
    s6: {
      pill: 'المرحلة 06 · الإنتاج المشترك',
      title: 'سيناريو محسّن في 30 دقيقة + بوابة مكتبة الاستمرارية',
      badge: 'سيناريو في 30 د · الملامح مثبّتة',
      leftTag: 'الإنتاج المشترك · الخطوة 1 (توليد في 28 دقيقة)',
      leftTitle: 'السيناريو والحوار المحسّن لصدى الجمهور',
      scriptScore: '✓ صدى الجمهور للسيناريو: 96 / 100 · 24 مشهداً · المدة 12:00',
      sc1Head: 'مشهد 09 — داخلي. ورشة قوارب سان دييغو — صباحاً (1972)',
      sc1Lines: [
        'يتسلل الضباب الذهبي عبر الأبواب الخشبية العالية. يمرر ماتيو (28 عاماً)',
        'الفارة اليدوية على لوح أرز عطري بجوار صندوق البوصلة المفتوح.',
        '',
      ],
      voHead: 'صوفيا (تعليق صوتي دافئ)',
      voLines: [
        '«كل قارب بناه جدي كان يحمل عروق خشب أواكساكا',
        'وتلك البوصلة النحاسية من عام ثمانية وخمسين...»',
      ],
      sc2Head: 'مشهد 22 — خارجي. رصيف ميناء سان دييغو — الغروب (2026)',
      sc2Lines: [
        'تتلألأ الفوانيس فوق مياه الميناء. يفتح ماتيو (80 عاماً) غطاء',
        'البوصلة ويضعه برفق في يدي حفيده ليو.',
      ],
      exclBadge: '✓ تم التحقق من الفصل الحصري للأعمار (صفر تكرار لنفس الشخصية)',
      rightTag: 'الإنتاج المشترك · الخطوة 2 (بوابة استمرارية العميل)',
      rightTitle: 'يرفع العميل الصور المرجعية ويعتمدها',
      anchors: [
        ['مرجع الشخصية', 'ماتيو موراليس (80 عاماً)', 'تم رفع الصورة · أُزيل EXIF · معتمد ✓'],
        ['ملامح حقبة 1972', 'ماتيو موراليس (28 عاماً)', 'صورة 1972 + تثبيت الملامح · معتمد ✓'],
        ['مرجع الموقع', 'ورشة قوارب الميناء 1972', 'ورشة أخشاب تاريخية · معتمد ✓'],
        ['مرجع الدعامة', 'صندوق البوصلة الخشبي', 'صورة قريبة بالهاتف · معتمد ✓'],
      ],
      signBtn: '✓ اعتمدت إيلينا موراليس مكتبة الاستمرارية',
    },
    s7: {
      pill: 'المرحلة 07 · غرفة العرض',
      title: 'غرفة العرض بعلامتك التجارية — مراجعة واعتماد المخرجات',
      badge: 'بوابة Pre-Vis تحمي رصيد الفيديو',
      tabs: ['✓ 1. عرض Pre-Vis', '✓ 2. اللقطات', '✓ 3. المشاهد', '✓ 4. الفصول', '● 5. نسخة 4K (12 د)', '● 6. إعلان 60 ث'],
      uhdBadge: 'معاينة 4K UHD · 04:18 / 12:00',
      chapTitle: 'الفصل 3: ورشة هاربرلايت 1972 · مراجعة دقيقة بالإطار',
      chapSub: 'مخرجات مخصصة لكل باقة · محمية بعلامة مائية حتى الاعتماد النهائي',
      rightTag: 'ملاحظات العميل بالرمز الزمني · الجولة 1 من 2',
      rightTitle: 'سجل الاعتماد المرحلي',
      pin1Tag: '● ملاحظة @ 04:18 · إيلينا موراليس',
      pin1L1: '«ابتسامة والدي عام 1972 ونشارة خشب الأرز تبدو',
      pin1L2: 'مذهلة! بكت أختي تأثراً عند مشاهدة هذا المشهد.»',
      pin2Tag: '● ملاحظة @ 09:54 · إيلينا موراليس',
      pin2L1: '«مشهد نخب الغروب وإعلان الـ 60 ثانية جاهزان',
      pin2L2: 'بنسبة 100% لعشاء العائلة يوم السبت!»',
      guardTitle: 'كيف تحمي بوابة Pre-Vis هامش ربحك:',
      guardL1: 'يُعتمد الإيقاع والصوت أولاً على Pre-Vis قبل',
      guardL2: 'إنفاق رصيد تصيير المشاهد السينمائية بدقة 4K.',
      approveBtn: '✓ اعتماد نسخة 4K الرئيسية وإعلان 60 ثانية',
    },
    s8: {
      pill: 'المرحلة 08 · التسليم والعائد',
      title: 'فتح تحميل 4K للعميل + عائد الربح الصافي للاستوديو',
      badge: '+1,989 ر.س صافي / فيلم · هامش 82%',
      leftTag: 'ما يراه عميلك · تسليم فاخر بعلامتك',
      leftTitle: 'تم فتح النسخة الرئيسية 4K والإعلان ✓',
      deliv1: '✓ نسخة أرشيفية 4K UHD مدتها 12 دقيقة (MP4 + ProRes)',
      deliv2: '✓ إعلان عائلي واجتماعي مدته 60 ثانية (16:9 + 9:16)',
      deliv3: '✓ حزمة دبلجة متعددة اللغات جاهزة للمشاركة العائلية',
      dlBtn: '✓ تحميل نسخة 4K ومشاركة الرابط العائلي',
      rightTag: 'ما تحققه أنت · اقتصاديات الاستوديو المؤتمتة',
      rightTitle: 'أتمتة 90% · أنتج 8–15 فيلماً شهرياً',
      cards: [
        ['1. باقة Blueprint مموّلة ذاتياً (108 ر.س)', 'هامش 83%', 'أقصى حوسبة ~14.6 ر.س · 0 دقيقة إدارة'],
        ['2. طلب فيلم الذكريات الكامل (2,435 ر.س)', '+1,989 ر.س', 'حوسبة SceneFlow بـ 128 ر.س · صافي هامش 82%'],
        ['3. وقت المنتج الفعلي لكل فيلم', '~75 دقيقة', '3 دقائق تسعير + اعتماد موجّه في غرفة العرض'],
      ],
      runRateTag: 'صافي الربح الشهري لمشغّل منفرد (عبر 4 قطاعات)',
      runRateVal: '15,909 – 29,830 ر.س / شهرياً',
      runRateSub1: '8 إلى 15 فيلماً شهرياً · ~12–18 ساعة عمل فعلية إجمالاً',
      runRateSub2: 'أفلام الذكريات · العقارات · التدريب · قصص العلامات',
    },
  },

  th: {
    s1: {
      pill: 'ขั้นที่ 01 · พอร์ทัลธุรกิจ',
      title: 'Harborlight Video Studio — หน้าเว็บ White-Label ของคุณ',
      domain: 'portal.harborlightfilms.com · White-Label 100%',
      badge: 'มัดจำ ฿985 · กำไรสุทธิ 83%',
      agencySub: 'บริการผลิตภาพยนตร์เฉพาะบุคคล · ชมและฟัง Storyboard Blueprint ของคุณได้ในไม่กี่นาที',
      poweredBy: 'ขับเคลื่อนเบื้องหลังโดย SceneFlow',
      services: [
        ['วิดีโอชีวประวัติและรำลึกครอบครัว', '฿11,860 – ฿42,480', 'สารคดีครอบครัวข้ามยุคสมัย · เลือกอยู่ ✓'],
        ['ทัวร์อสังหาริมทรัพย์ระดับภาพยนตร์', '฿6,760 – ฿20,350', 'วิดีโอพรีเซนต์โครงการภายใน 48 ชั่วโมง'],
        ['สื่อการสอนและอบรมพนักงาน SOP', '฿13,560 – ฿50,940', 'บทเรียนองค์กรรองรับกว่า 70+ ภาษา'],
        ['วิดีโอผู้ก่อตั้งและแบรนด์สตอรี่', '฿16,960 – ฿67,930', 'ภาพยนตร์โฆษณาสร้างยอดขายสูง'],
      ],
      passTag: 'คัดกรองลูกค้าจริงแบบคุ้มทุนตัวเอง',
      passTitle: 'แพ็กเกจ Storyboard Blueprint (฿985)',
      passSub: 'ชมภาพและฟังเสียงบรรยายโครงเรื่องก่อนตัดสินใจสั่งผลิตจริง',
      passPriceHero: '฿985',
      passCredit: 'นำมาหักส่วนลดค่าผลิตจริงได้เต็ม 100%',
      passCompute: 'ค่าคอมพิวต์สูงสุด ~฿133 → กำไรสุทธิ +฿814 (83%)',
      passZero: 'ไม่ต้องคุยงานฟรี · คัดกรองเฉพาะลูกค้าที่พร้อมซื้อจริง',
      bullets: [
        '✓ ส่งอีเมลเมจิกลิงก์เข้าสู่บทสัมภาษณ์ AI อัตโนมัติทันที',
        '✓ ภาพสตอรี่บอร์ด 16:9 จำนวน 6 บีต + เสียงบรรยายระดับสตูดิโอ',
        '✓ ปรับแก้ผ่าน AI Blueprint Director ได้สูงสุด 4 รอบ',
        '✓ ประเมินคะแนน Audience Resonance ส่งทางอีเมล 3 รอบ',
      ],
      cta: 'เริ่มสร้าง Storyboard Blueprint — ฿985 →',
      payNote: 'Apple Pay · Stripe · Whop · รับลิงก์ทางอีเมลอัตโนมัติทันที',
    },
    s2: {
      pill: 'ขั้นที่ 02 · สัมภาษณ์ AI',
      title: 'อีเมลเมจิกลิงก์อัตโนมัติ → ยืนยันวิสัยทัศน์และสัมภาษณ์ 4 รอบ',
      badge: 'PM 0 นาที · พูดหรือพิมพ์ได้ 24 ชม.',
      inboxTag: 'กล่องจดหมายลูกค้า · ส่งทันทีหลังชำระ ฿985',
      inboxTitle: 'ส่งเมจิกลิงก์อัตโนมัติภายใต้แบรนด์คุณ',
      fromLine: 'จาก: Harborlight Video Studio <concierge@harborlightfilms.com>',
      toLine: 'ถึง: Elena Morales <elena.morales@email.com> · ส่งถึงใน 2 วินาที',
      emailHeading: 'ยินดีต้อนรับ Elena! เริ่มเล่าเรื่องราว 5 นาทีได้เลย',
      emailBody1: 'แพ็กเกจ Blueprint ฿985 ของคุณพร้อมใช้งานและใช้ลดค่าผลิตจริงได้เต็มจำนวน',
      emailBody2: 'พูดเล่าอย่างเป็นธรรมชาติหรือพิมพ์ได้ 7 ภาษา โดยไม่ต้องตั้งรหัสผ่าน',
      emailBtn: 'เปิดหน้าสัมภาษณ์วิสัยทัศน์และเรื่องราว →',
      emailFoot: 'รวมสิทธิ์ปรับแก้ Blueprint 4 รอบ + วิเคราะห์ Audience Resonance 3 รอบ',
      consentTitle: '✓ ยืนยันคำยินยอมการใช้ภาพ ใบหน้า และเสียงเรียบร้อย',
      consentBullets: [
        '• ลบพิกัด GPS EXIF ออกจากรูปถ่ายครอบครัวอัตโนมัติทุกไฟล์',
        '• ระบบแยกพื้นที่ปลอดภัยรายลูกค้า ปกป้องบัญชีโปรดิวเซอร์',
        '• รองรับ 7 ภาษาหลัก: EN · ES · PT · HI · ZH · AR · TH',
      ],
      computeTitle: 'ต้นทุนคอมพิวต์ขั้นนี้: ~฿19 · เวลาโปรดิวเซอร์: 0 นาที',
      computeSub: 'ยืนยันวิสัยทัศน์ 2 รอบ + สัมภาษณ์ 4 รอบเสร็จสิ้นเวลา 21:42 น.',
      rightTag: 'สรุปวิสัยทัศน์และบทสัมภาษณ์ 4 รอบ · ครบ 96%',
      rightTitle: '“ภาพยนตร์รำลึกท่าเรือ — ฉลอง 80 ปี คุณพ่อ Mateo”',
      quoteTag: 'เสียงพูด / ข้อความ · ELENA MORALES (ถอดความอัตโนมัติ)',
      quoteLines: [
        '“เราอยากทำวิดีโอ 12 นาทีฉลองวันเกิด 80 ปีให้คุณพ่อ ตั้งแต่เรียนต่อเรือไม้ซีดาร์ที่',
        'โออาซากาปี 1958 เปิดอู่ต่อเรือที่ซานดิเอโกปี 1972 จนถึงมอบกล่องเข็มทิศไม้ซีดาร์',
        'ให้หลานชายในงานเลี้ยงมื้อค่ำริมท่าเรือค่ะ”',
      ],
      extractedHeading: 'สกัดข้อมูลตัวละครข้ามยุค สถานที่ และพร็อพสำคัญอัตโนมัติ',
      extracted: [
        ['ตัวละคร · ปี 1972', 'Mateo Morales (วัย 28 ปี)', 'ช่างต่อเรือหนุ่ม · ล็อกใบหน้ายุคอู่ต่อเรือปี 1972'],
        ['ตัวละคร · ปี 2026', 'Mateo Morales (วัย 80 ปี)', 'เจ้าของวันเกิด 80 ปี · แยกช่วงวัยรายซีนชัดเจน'],
        ['พร็อพสำคัญ', 'กล่องเข็มทิศไม้ซีดาร์', 'มรดกแกะสลักมือปี 1958 ส่งต่อถึงสามรุ่น'],
      ],
      rightBtn: 'ส่งข้อมูลและสร้าง Blueprint พร้อมภาพประกอบอัตโนมัติ →',
      rightFoot: 'ภาพสตอรี่บอร์ด + เสียงบรรยายจะถูกส่งไปยังอีเมลลูกค้าอัตโนมัติใน ~3 นาที',
    },
    s3: {
      pill: 'ขั้นที่ 03 · BLUEPRINT',
      title: 'หน้าแชร์ Storyboard Blueprint + เสียงบรรยายระดับสตูดิโอ',
      badge: 'ส่งอีเมลใน ~3 นาที · คะแนน AR 88/100',
      audioTitle: 'เสียงบรรยายภาพรวม Blueprint · เสียงสตูดิโอ (Charon · 0:48)',
      audioQuote: '“ซานดิเอโกปี 1972 เศษไม้ซีดาร์หอมกรุ่นม้วนตัวใต้กบไสไม้ของ Mateo ในวัยยี่สิบแปดปี...”',
      arBadge: 'Audience Resonance: 88 / 100',
      cards: [
        ['บีต 01 · โออาซากา 1958 (0:00–2:15)', 'เข็มทิศในกล่องไม้ซีดาร์', 'Mateo วัยหนุ่มเก็บรักษาเข็มทิศทองเหลืองใต้แสงไฟ', 'โรงไม้ และแกะสลักกล่องไม้ใบแรกของเขา'],
        ['บีต 03 · อู่ต่อเรือ 1972 (4:30–7:40)', 'เปิดอู่ต่อเรือ Harborlight', 'Mateo (วัย 28) และ Rosa เปิดประตูอู่ต่อเรือไม้ซีดาร์', 'ท่ามกลางสายหมอกสีทองยามเช้าริมทะเล'],
        ['บีต 06 · ท่าเรือ 2026 (9:50–12:00)', 'คำอวยพรสามเจเนอเรชัน', 'Mateo (วัย 80) ส่งมอบกล่องเข็มทิศไม้ซีดาร์ให้', 'หลานชาย Leo ใต้แสงโคมไฟริมท่าเรือ'],
      ],
      voReady: '▶ เสียงบรรยายพร้อมฟัง',
      botTitle: 'ส่งถึงลูกค้าอัตโนมัติทางอีเมลแบรนด์ของคุณภายใน ~3 นาที',
      botLine1: 'ภาพสตอรี่บอร์ด 6 บีต (60 cr) + เสียงบรรยาย (40 cr) + คะแนน AR รอบ 1/3 (25 cr) = ต้นทุน ~฿42',
      botLine2: 'ลูกค้าปรับแก้ Blueprint เองได้ 4 รอบ + วิเคราะห์ Audience Resonance 3 รอบ หรือกดอนุมัติทันที',
      botBtn: 'ปรับแก้หรือกดอนุมัติ Blueprint →',
    },
    s4: {
      pill: 'ขั้นที่ 04 · ปรับแก้ด้วย AI',
      title: 'ปรับแก้ผ่าน AI 4 รอบ + วิเคราะห์ Audience Resonance 3 รอบ',
      badge: 'แก้ไข: 2 จาก 4 · คะแนน AR: 2 จาก 3',
      leftTag: 'ขั้นที่ 1 · ตัวกรองและยืนยันคำขอแก้ไขด้วย AI',
      leftTitle: 'ยืนยันความต้องการลูกค้าก่อนปรับแก้จริง',
      noteTag: 'ข้อความจากลูกค้า (ELENA MORALES)',
      note1: '“ช่วยให้บีต 6 เกิดขึ้นตอนพระอาทิตย์ตกสีทองบนดาดฟ้าท่าเรือ และให้คุณพ่อ',
      note2: 'อ่านข้อความที่สลักไว้ด้านในฝากล่องเข็มทิศไม้ซีดาร์ได้ไหมคะ?”',
      planTag: '★ แผนการแก้ไขที่ AI สรุปแล้ว (ส่งต่อให้ BLUEPRINT DIRECTOR)',
      planBullets: [
        '• ปรับแสงและฉากบีต 06 เป็นยามเย็นสีทองบนดาดฟ้าท่าเรือซานดิเอโก',
        '• เพิ่มช็อตโคลสอัพซึ้งๆ ขณะ Mateo (วัย 80) อ่านคำสลักปี 1958',
        '• วาดภาพสตอรี่บอร์ดบีต 06 ใหม่โดยคงบีต 01–05 เดิมไว้ครบถ้วน',
        '• คำนวณคะแนน Audience Resonance รอบ 2/3 และส่งอีเมลอัตโนมัติ',
      ],
      leftBtn: '✓ ยืนยันและอัปเดตผ่าน Blueprint Director แล้ว',
      leftFoot: 'ระบบแยกความปลอดภัย · จำกัดสูงสุด 4 รอบแก้ไข และ 3 รอบ AR',
      rightTag: 'ขั้นที่ 2 · คะแนนความโดนใจผู้ชมล่าสุดและการกดอนุมัติ',
      rightTitle: 'คะแนนความโดนใจพุ่งขึ้น: 88 → 95 / 100',
      readyTag: 'พร้อมผลิตจริง',
      metrics: ['อารมณ์ร่วมผู้ชม: 98 / 100', 'จังหวะและโครงสร้าง: 95 / 100', 'ความต่อเนื่องตัวละคร: 96 / 100'],
      emailedNote: '✓ ส่งลิงก์คะแนน AR ล่าสุดทางอีเมลอัตโนมัติแล้ว',
      zeroPmNote: 'เวลาที่โปรดิวเซอร์ใช้ไปจนถึงตอนนี้: 0 นาที',
      lockTitle: 'พร้อมล็อก Blueprint และขอใบเสนอราคาผลิตจริงหรือยัง?',
      lockLine1: 'การกดอนุมัติจะล็อกสตอรี่บอร์ดทั้ง 6 บีต ช่วงวัยนักแสดง และรายการพร็อพ',
      lockLine2: 'พร้อมแจ้งโปรดิวเซอร์ให้ส่งลิงก์ชำระเงินที่หักส่วนลด ฿985 ให้คุณทันที',
      rightBtn: '✓ อนุมัติ Blueprint และขอลิงก์ชำระเงิน',
    },
    s5: {
      pill: 'ขั้นที่ 05 · ใบเสนอราคา PM',
      title: 'คอนโซลโปรดิวเซอร์ — ตรวจต้นทุน 3 นาที & ส่งลิงก์ Stripe / Whop',
      badge: 'PM Gate · ~3 นาที · กำไร 82%',
      approvedPill: '✓ ลูกค้าอนุมัติ BLUEPRINT แล้ว (AR 95)',
      estTitle: 'ระบบคำนวณต้นทุนคอมพิวต์และขอบเขตงานอัตโนมัติ',
      estSub: 'ภาพยนตร์ชีวประวัติครอบครัว 12 นาที · 6 บท · 24 ซีน · 4K Master + เทรลเลอร์ 60 วิ',
      rows: [
        ['บทภาพยนตร์ปรับจูน AR ใน 30 นาที + เสียงพากย์สตูดิโอ', '฿163 (480 cr)'],
        ['ล็อกใบหน้าหลายช่วงวัย + ภาพคีย์เฟรม 48 ซีน', '฿184 (540 cr)'],
        ['ด่านตรวจ Pre-Vis + เรนเดอร์วิดีโอภาพยนตร์ + อัปสเกล 4K', '฿815 (2,400 cr)'],
        ['เวลาดูแลและขัดเกลาโดยโปรดิวเซอร์ (~75 นาที)', '~฿2,107 เทียบค่าแรง'],
      ],
      totalCompute: 'เครดิตคอมพิวต์ SceneFlow รวมทั้งหมด: ฿1,162 (3,420 cr)',
      netProfit: 'กำไรสุทธิคาดการณ์จากแพ็กเกจ ฿22,055: +฿18,011 (อัตรากำไร 82%)',
      rightTag: 'ชุดผลงานส่งมอบและลิงก์ชำระเงิน',
      rightTitle: 'ส่งลิงก์ชำระเงินผลิตจริงในคลิกเดียว',
      checks: [
        '☑ ด่านอนุมัติ Pre-Vis ก่อนเรนเดอร์วิดีโอจริง',
        '☑ ลิงก์คลังภาพ Continuity ให้ลูกค้าอัปโหลดรูปอ้างอิง',
        '☑ พรีวิว 6 บท + ภาพยนตร์ 4K Master ความยาว 12 นาที',
        '☑ เทรลเลอร์ครอบครัว 60 วินาที (ทั้งแนวนอนและแนวตั้ง)',
      ],
      pkgPriceLabel: 'ราคาแพ็กเกจภาพยนตร์มรดกครอบครัว:',
      pkgPriceVal: '฿22,055',
      creditLabel: 'หักส่วนลดแพ็กเกจ Blueprint ที่ชำระแล้ว:',
      creditVal: '− ฿985',
      dueLabel: 'ยอดชำระค่าผลิตสุทธิคงเหลือ:',
      dueVal: '฿21,070',
      sendBtn: 'ส่งลิงก์ชำระเงิน Stripe / Whop (฿21,070) →',
      sendFoot: 'เริ่มสร้างบท 30 นาที + ส่งลิงก์อัปโหลดรูปอ้างอิงอัตโนมัติทันทีหลังชำระเงิน',
    },
    s6: {
      pill: 'ขั้นที่ 06 · ผลิตร่วมกัน',
      title: 'สร้างบทพร้อมถ่ายใน 30 นาที + พอร์ทัลคลังภาพ Continuity',
      badge: 'บทเสร็จใน 30 นาที · ล็อกใบหน้าเป๊ะ',
      leftTag: 'การผลิตร่วมกัน · ขั้นที่ 1 (สร้างเสร็จใน 28 นาที)',
      leftTitle: 'บทภาพยนตร์และบทพูดที่ปรับจูน AR แล้ว',
      scriptScore: '✓ คะแนน AR ของบท: 96 / 100 · 24 ซีน · ความยาว 12:00 นาที',
      sc1Head: 'ซีน 09 — ภายใน. อู่ต่อเรือซานดิเอโก — ยามเช้า (1972)',
      sc1Lines: [
        'ไอหมอกสีทองส่องผ่านประตูไม้บานใหญ่ MATEO (วัย 28 ปี) ไสกบมือ',
        'ไปตามแผ่นไม้ซีดาร์หอมกรุ่นข้างกล่องเข็มทิศไม้ซีดาร์ที่เปิดอยู่',
        '',
      ],
      voHead: 'SOFIA (เสียงบรรยายอบอุ่น)',
      voLines: [
        '“เรือทุกลำที่คุณตาสร้าง ล้วนมีลายไม้จากโออาซากา',
        'และเข็มทิศทองเหลืองเรือนนั้นจากปีห้าแปด...”',
      ],
      sc2Head: 'ซีน 22 — ภายนอก. ดาดฟ้าท่าเรือซานดิเอโก — ยามเย็น (2026)',
      sc2Lines: [
        'โคมไฟส่องประกายเหนือผืนน้ำท่าเรือ MATEO (วัย 80 ปี) เปิดฝากล่อง',
        'เข็มทิศแล้ววางลงในมือของหลานชาย LEO อย่างอบอุ่น',
      ],
      exclBadge: '✓ ตรวจสอบการแยกช่วงวัยรายบีตแล้ว (ไม่มีตัวละครต่างวัยซ้ำซีน)',
      rightTag: 'การผลิตร่วมกัน · ขั้นที่ 2 (พอร์ทัลอัปโหลดภาพลูกค้า)',
      rightTitle: 'ลูกค้าอัปโหลดและกดอนุมัติภาพอ้างอิง',
      anchors: [
        ['ภาพตัวละครหลัก', 'Mateo Morales (วัย 80 ปี)', 'อัปโหลดแล้ว · ลบพิกัด EXIF · อนุมัติ ✓'],
        ['ใบหน้ายุค 1972', 'Mateo Morales (วัย 28 ปี)', 'ภาพถ่ายปี 1972 + ล็อกโครงหน้า · อนุมัติ ✓'],
        ['สถานที่หลัก', 'อู่ต่อเรือริมท่า 1972', 'โรงต่อเรือไม้คลาสสิก · อนุมัติ ✓'],
        ['พร็อพสำคัญ', 'กล่องเข็มทิศไม้ซีดาร์', 'ถ่ายภาพมาโครจากมือถือ · อนุมัติ ✓'],
      ],
      signBtn: '✓ Elena Morales อนุมัติคลังภาพ Continuity เรียบร้อย',
    },
    s7: {
      pill: 'ขั้นที่ 07 · ห้องฉายตรวจงาน',
      title: 'ห้องฉาย White-Label — ตรวจรับผลงานเป็นลำดับขั้น',
      badge: 'ด่าน Pre-Vis ช่วยเซฟเครดิตวิดีโอ',
      tabs: ['✓ 1. Pre-Vis', '✓ 2. คลิปเด่น', '✓ 3. รายซีน', '✓ 4. รายบท', '● 5. 4K Master 12m', '● 6. เทรลเลอร์ 60s'],
      uhdBadge: 'พรีวิว 4K UHD · 04:18 / 12:00',
      chapTitle: 'บทที่ 3: อู่ต่อเรือ Harborlight 1972 · ตรวจละเอียดรายเฟรม',
      chapSub: 'จัดชุดส่งมอบตามแพ็กเกจ · ติดลายน้ำอัตโนมัติจนกว่าจะอนุมัติขั้นสุดท้าย',
      rightTag: 'คอมเมนต์ระบุเวลา · รอบแก้ไข 1 จาก 2',
      rightTitle: 'บันทึกการอนุมัติรายขั้นตอน',
      pin1Tag: '● ปักหมุด @ 04:18 · ELENA MORALES',
      pin1L1: '“รอยยิ้มคุณพ่อตอนปี 1972 กับเศษไม้ซีดาร์ดูสมจริง',
      pin1L2: 'เหลือเชื่อเลยค่ะ! น้องสาวดูแล้วน้ำตาซึมเลย”',
      pin2Tag: '● ปักหมุด @ 09:54 · ELENA MORALES',
      pin2L1: '“ฉากชนแก้วยามเย็นกับเทรลเลอร์ 60 วินาทีพร้อม',
      pin2L2: '100% สำหรับงานเลี้ยงวันเสาร์นี้แล้วค่ะ!”',
      guardTitle: 'ทำไมด่าน Pre-Vis ถึงปกป้องกำไรของคุณ:',
      guardL1: 'ลูกค้าอนุมัติจังหวะและเสียงบน Pre-Vis ก่อนเสมอ',
      guardL2: 'จึงไม่เสียเครดิตเรนเดอร์ 4K ฟรีจากการแก้บททีหลัง',
      approveBtn: '✓ อนุมัติไฟล์ 4K Master และเทรลเลอร์ 60s',
    },
    s8: {
      pill: 'ขั้นที่ 08 · ส่งมอบ & กำไร',
      title: 'ปลดล็อกดาวน์โหลด 4K ให้ลูกค้า + สรุปกำไรสุทธิสตูดิโอ',
      badge: 'กำไร +฿18,011 / เรื่อง · มาร์จิ้น 82%',
      leftTag: 'สิ่งที่ลูกค้าของคุณได้รับ · ประสบการณ์ส่งมอบระดับหรู',
      leftTitle: 'ปลดล็อกไฟล์ 4K Master และเทรลเลอร์แล้ว ✓',
      deliv1: '✓ ภาพยนตร์ 4K UHD Master ความยาว 12 นาที (MP4 + ProRes)',
      deliv2: '✓ เทรลเลอร์แชร์โซเชียลและครอบครัว 60 วินาที (16:9 + 9:16)',
      deliv3: '✓ ชุดเสียงพากย์หลายภาษาพร้อมลิงก์แชร์ให้ญาติพี่น้อง',
      dlBtn: '✓ ดาวน์โหลด 4K Master และแชร์ลิงก์ให้ครอบครัว',
      rightTag: 'สิ่งที่คุณได้รับ · โมเดลรายได้สตูดิโออัตโนมัติ',
      rightTitle: 'อัตโนมัติ 90% · ขยายสู่ 8–15 เรื่อง / เดือน',
      cards: [
        ['1. แพ็กเกจ Blueprint คุ้มทุนตัวเอง (฿985)', 'กำไร 83%', 'คอมพิวต์สูงสุด ~฿133 · PM 0 นาที'],
        ['2. แพ็กเกจภาพยนตร์ชีวประวัติ (฿22,055)', '+฿18,011', 'คอมพิวต์ SceneFlow ฿1,162 · กำไรสุทธิ 82%'],
        ['3. เวลาทำงานจริงต่อเรื่อง', '~75 นาที', 'ออกใบเสนอราคา 3 นาที + ดูแลตรวจรับงาน'],
      ],
      runRateTag: 'กำไรสุทธิรายเดือนสำหรับผู้ดูแลคนเดียว (ครบ 4 บริการ)',
      runRateVal: '฿144,091 – ฿270,172 / เดือน',
      runRateSub1: 'ส่งมอบ 8 ถึง 15 เรื่อง / เดือน · ใช้เวลาทำงานจริงรวมเพียง ~12–18 ชม.',
      runRateSub2: 'ชีวประวัติ · อสังหาริมทรัพย์ · สื่อฝึกอบรม · แบรนด์สตอรี่',
    },
  },
}

function buildScreensForLocale(t, imgs) {
  const { imgMemoir1, imgMemoir2, imgRealEstate, imgTraining, imgBrand1, imgBrand2, imgCharOlder, imgCharYoung, imgPropCompass } = imgs
  const heroPrice = t.s1.passPriceHero || '$29'
  const effHeroLen = heroPrice.includes('฿') ? heroPrice.length + 1 : heroPrice.length
  const heroFontSize = effHeroLen <= 3 ? 82 : effHeroLen <= 4 ? 66 : effHeroLen <= 5 ? 58 : 50
  const heroRightX = effHeroLen <= 3 ? 1868 : effHeroLen <= 4 ? 1884 : effHeroLen <= 5 ? 1908 : 1924
  const heroCreditFontSize = heroRightX >= 1910 ? 21 : 23
  const heroSubFontSize = heroRightX >= 1910 ? 17.5 : 19
  const s5NetProfitFontSize = t.s5.netProfit.length > 52 ? 25 : 29
  const s5DueFontSize = (t.s5.dueVal || '').length > 8 ? 38 : 42
  const s8RunRateFontSize = t.s8.runRateVal.length > 26 ? 52 : t.s8.runRateVal.length > 21 ? 58 : 72

  return [
    {
      slug: '01-business-portal',
      svg: browserFrame({
        stepPill: t.s1.pill,
        title: t.s1.title,
        domain: t.s1.domain,
        rightBadge: t.s1.badge,
        bodySvg: `
          <rect x="88" y="158" width="2384" height="128" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
          <rect x="120" y="186" width="72" height="72" rx="18" fill="url(#emeraldGrad)"/>
          <text x="156" y="233" fill="#022c22" font-size="30" font-weight="900" text-anchor="middle">HV</text>
          <text x="216" y="216" fill="#ffffff" font-size="34" font-weight="800">Harborlight Video Studio</text>
          <text x="216" y="254" fill="#94a3b8" font-size="21">${esc(t.s1.agencySub)}</text>
          <rect x="1950" y="188" width="488" height="68" rx="18" fill="#064e3b" fill-opacity="0.55" stroke="#10b981" stroke-width="2"/>
          <text x="2194" y="230" fill="#a7f3d0" font-size="20" font-weight="700" text-anchor="middle">${esc(t.s1.poweredBy)}</text>

          ${[
            { x: 88, y: 316, img: imgMemoir1, s: t.s1.services[0], active: true },
            { x: 844, y: 316, img: imgRealEstate, s: t.s1.services[1], active: false },
            { x: 88, y: 856, img: imgTraining, s: t.s1.services[2], active: false },
            { x: 844, y: 856, img: imgBrand1, s: t.s1.services[3], active: false },
          ]
            .map(
              (c) => {
                const svcTitleFs = c.s[0].length > 26 ? 22 : c.s[0].length > 22 ? 24 : 26
                const svcPriceFs = c.s[1].length > 16 ? 20 : c.s[1].length > 13 ? 22 : 24
                return `
            <rect x="${c.x}" y="${c.y}" width="728" height="512" rx="24" fill="url(#cardDark)" stroke="${c.active ? '#10b981' : '#1e293b'}" stroke-width="${c.active ? '4' : '2'}"/>
            <clipPath id="cp-${c.x}-${c.y}"><rect x="${c.x + 18}" y="${c.y + 18}" width="692" height="330" rx="16"/></clipPath>
            <image href="${c.img}" x="${c.x + 18}" y="${c.y + 18}" width="692" height="330" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp-${c.x}-${c.y})"/>
            <text x="${c.x + 32}" y="${c.y + 398}" fill="#ffffff" font-size="${svcTitleFs}" font-weight="800">${esc(c.s[0])}</text>
            <text x="${c.x + 696}" y="${c.y + 398}" fill="#34d399" font-size="${svcPriceFs}" font-weight="800" text-anchor="end">${esc(c.s[1])}</text>
            <text x="${c.x + 32}" y="${c.y + 442}" fill="${c.active ? '#6ee7b7' : '#94a3b8'}" font-size="20" font-weight="600">${esc(c.s[2])}</text>
          `
              }
            )
            .join('')}

          <rect x="1604" y="316" width="868" height="1052" rx="28" fill="#062822" stroke="#10b981" stroke-width="4"/>
          <rect x="1652" y="364" width="420" height="46" rx="23" fill="#10b981" fill-opacity="0.25" stroke="#34d399" stroke-width="2"/>
          <text x="1862" y="394" fill="#ecfdf5" font-size="18" font-weight="800" text-anchor="middle">${esc(t.s1.passTag)}</text>

          <text x="1652" y="468" fill="#ffffff" font-size="38" font-weight="900">${esc(t.s1.passTitle)}</text>
          <text x="1652" y="518" fill="#a7f3d0" font-size="21">${esc(t.s1.passSub)}</text>

          <rect x="1652" y="556" width="772" height="176" rx="22" fill="#021713" stroke="#10b981" stroke-width="2"/>
          <text x="1682" y="658" fill="#ffffff" font-size="${heroFontSize}" font-weight="900">${esc(heroPrice)}</text>
          <text x="${heroRightX}" y="624" fill="#34d399" font-size="${heroCreditFontSize}" font-weight="800">${esc(t.s1.passCredit)}</text>
          <text x="${heroRightX}" y="666" fill="#94a3b8" font-size="${heroSubFontSize}">${esc(t.s1.passCompute)}</text>
          <text x="${heroRightX}" y="704" fill="#fbbf24" font-size="${heroSubFontSize}" font-weight="700">${esc(t.s1.passZero)}</text>

          ${t.s1.bullets
            .map(
              (item, i) => `
            <text x="1660" y="${796 + i * 62}" fill="#ecfdf5" font-size="21" font-weight="600">${esc(item)}</text>
          `
            )
            .join('')}

          <rect x="1652" y="1084" width="772" height="96" rx="22" fill="url(#emeraldGrad)"/>
          <text x="2038" y="1143" fill="#022c22" font-size="27" font-weight="900" text-anchor="middle">${esc(t.s1.cta)}</text>
          <text x="2038" y="1232" fill="#6ee7b7" font-size="19" font-weight="600" text-anchor="middle">${esc(t.s1.payNote)}</text>
        `,
      }),
    },
    {
      slug: '02-auto-intake-email',
      svg: browserFrame({
        stepPill: t.s2.pill,
        title: t.s2.title,
        domain: 'portal.harborlightfilms.com/intake/elena-80th-memoir',
        rightBadge: t.s2.badge,
        bodySvg: `
          <rect x="88" y="162" width="1020" height="1202" rx="24" fill="url(#cardDark)" stroke="#1e293b" stroke-width="2"/>
          <text x="132" y="220" fill="#38bdf8" font-size="19" font-weight="800">${esc(t.s2.inboxTag)}</text>
          <text x="132" y="272" fill="#ffffff" font-size="32" font-weight="800">${esc(t.s2.inboxTitle)}</text>

          <rect x="132" y="314" width="932" height="520" rx="22" fill="#0b1528" stroke="#10b981" stroke-width="3"/>
          <text x="172" y="368" fill="#34d399" font-size="19" font-weight="700">${esc(t.s2.fromLine)}</text>
          <text x="172" y="408" fill="#94a3b8" font-size="19">${esc(t.s2.toLine)}</text>
          <line x1="172" y1="434" x2="1024" y2="434" stroke="#1e293b" stroke-width="2"/>
          <text x="172" y="488" fill="#ffffff" font-size="27" font-weight="800">${esc(t.s2.emailHeading)}</text>
          <text x="172" y="540" fill="#cbd5e1" font-size="21">${esc(t.s2.emailBody1)}</text>
          <text x="172" y="580" fill="#cbd5e1" font-size="21">${esc(t.s2.emailBody2)}</text>
          <rect x="172" y="636" width="852" height="84" rx="18" fill="url(#emeraldGrad)"/>
          <text x="598" y="688" fill="#022c22" font-size="25" font-weight="900" text-anchor="middle">${esc(t.s2.emailBtn)}</text>
          <text x="598" y="776" fill="#6ee7b7" font-size="18" font-weight="600" text-anchor="middle">${esc(t.s2.emailFoot)}</text>

          <rect x="132" y="874" width="932" height="442" rx="22" fill="#052e2b" fill-opacity="0.45" stroke="#10b981" stroke-width="2"/>
          <text x="172" y="934" fill="#ecfdf5" font-size="25" font-weight="800">${esc(t.s2.consentTitle)}</text>
          <text x="172" y="984" fill="#a7f3d0" font-size="20">${esc(t.s2.consentBullets[0])}</text>
          <text x="172" y="1028" fill="#a7f3d0" font-size="20">${esc(t.s2.consentBullets[1])}</text>
          <text x="172" y="1072" fill="#a7f3d0" font-size="20">${esc(t.s2.consentBullets[2])}</text>
          <rect x="172" y="1130" width="852" height="136" rx="16" fill="#021713" stroke="#10b981" stroke-width="2"/>
          <text x="208" y="1184" fill="#fbbf24" font-size="21" font-weight="800">${esc(t.s2.computeTitle)}</text>
          <text x="208" y="1228" fill="#94a3b8" font-size="19">${esc(t.s2.computeSub)}</text>

          <rect x="1144" y="162" width="1328" height="1202" rx="24" fill="url(#cardDark)" stroke="#38bdf8" stroke-width="3"/>
          <text x="1192" y="220" fill="#38bdf8" font-size="19" font-weight="800">${esc(t.s2.rightTag)}</text>
          <text x="1192" y="272" fill="#ffffff" font-size="32" font-weight="800">${esc(t.s2.rightTitle)}</text>

          <rect x="1192" y="314" width="1232" height="230" rx="20" fill="#0f2438" stroke="#0ea5e9" stroke-width="2"/>
          <text x="1232" y="362" fill="#7dd3fc" font-size="19" font-weight="800">${esc(t.s2.quoteTag)}</text>
          <text x="1232" y="410" fill="#f8fafc" font-size="22">${esc(t.s2.quoteLines[0])}</text>
          <text x="1232" y="448" fill="#f8fafc" font-size="22">${esc(t.s2.quoteLines[1])}</text>
          <text x="1232" y="486" fill="#f8fafc" font-size="22">${esc(t.s2.quoteLines[2])}</text>

          <text x="1192" y="606" fill="#a7f3d0" font-size="21" font-weight="800">${esc(t.s2.extractedHeading)}</text>
          ${t.s2.extracted
            .map(
              (r, idx) => {
                const y = 636 + idx * 130
                return `
            <rect x="1192" y="${y}" width="1232" height="110" rx="18" fill="#091326" stroke="#334155" stroke-width="2"/>
            <rect x="1220" y="${y + 28}" width="256" height="54" rx="12" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-width="2"/>
            <text x="1348" y="${y + 62}" fill="#6ee7b7" font-size="17" font-weight="800" text-anchor="middle">${esc(r[0])}</text>
            <text x="1504" y="${y + 52}" fill="#ffffff" font-size="24" font-weight="800">${esc(r[1])}</text>
            <text x="1504" y="${y + 86}" fill="#94a3b8" font-size="19">${esc(r[2])}</text>
          `
              }
            )
            .join('')}

          <rect x="1192" y="1048" width="1232" height="96" rx="22" fill="url(#emeraldGrad)"/>
          <text x="1808" y="1107" fill="#022c22" font-size="27" font-weight="900" text-anchor="middle">${esc(t.s2.rightBtn)}</text>
          <text x="1808" y="1202" fill="#7dd3fc" font-size="20" font-weight="600" text-anchor="middle">${esc(t.s2.rightFoot)}</text>
        `,
      }),
    },
    {
      slug: '03-storyboard-audio',
      svg: browserFrame({
        stepPill: t.s3.pill,
        title: t.s3.title,
        domain: 'portal.harborlightfilms.com/blueprint/share/9d4e2a',
        rightBadge: t.s3.badge,
        bodySvg: `
          <rect x="88" y="158" width="2384" height="134" rx="22" fill="#0b192e" stroke="#38bdf8" stroke-width="3"/>
          <circle cx="164" cy="225" r="40" fill="url(#amberGrad)"/>
          <text x="168" y="238" fill="#0f172a" font-size="34" font-weight="900" text-anchor="middle">▶</text>
          <text x="232" y="212" fill="#ffffff" font-size="27" font-weight="800">${esc(t.s3.audioTitle)}</text>
          <text x="232" y="252" fill="#7dd3fc" font-size="20">${esc(t.s3.audioQuote)}</text>
          <rect x="1910" y="186" width="524" height="78" rx="20" fill="#052e2b" stroke="#10b981" stroke-width="2"/>
          <text x="2172" y="234" fill="#6ee7b7" font-size="24" font-weight="900" text-anchor="middle">${esc(t.s3.arBadge)}</text>

          ${[
            { x: 88, img: imgMemoir1, c: t.s3.cards[0] },
            { x: 896, img: imgMemoir2, c: t.s3.cards[1] },
            { x: 1704, img: imgBrand2, c: t.s3.cards[2] },
          ]
            .map(
              (b) => `
            <rect x="${b.x}" y="324" width="768" height="740" rx="24" fill="url(#cardDark)" stroke="#1e293b" stroke-width="2"/>
            <clipPath id="bp-${b.x}"><rect x="${b.x + 20}" y="344" width="728" height="420" rx="18"/></clipPath>
            <image href="${b.img}" x="${b.x + 20}" y="344" width="728" height="420" preserveAspectRatio="xMidYMid slice" clip-path="url(#bp-${b.x})"/>
            <text x="${b.x + 36}" y="818" fill="#34d399" font-size="19" font-weight="800">${esc(b.c[0])}</text>
            <text x="${b.x + 36}" y="868" fill="#ffffff" font-size="29" font-weight="800">${esc(b.c[1])}</text>
            <text x="${b.x + 36}" y="920" fill="#cbd5e1" font-size="21">${esc(b.c[2])}</text>
            <text x="${b.x + 36}" y="954" fill="#cbd5e1" font-size="21">${esc(b.c[3])}</text>
            <rect x="${b.x + 36}" y="986" width="340" height="48" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
            <text x="${b.x + 206}" y="1018" fill="#fbbf24" font-size="18" font-weight="700" text-anchor="middle">${esc(t.s3.voReady)}</text>
          `
            )
            .join('')}

          <rect x="88" y="1096" width="2384" height="268" rx="24" fill="#071f1b" stroke="#10b981" stroke-width="3"/>
          <text x="136" y="1164" fill="#ffffff" font-size="30" font-weight="800">${esc(t.s3.botTitle)}</text>
          <text x="136" y="1216" fill="#a7f3d0" font-size="21">${esc(t.s3.botLine1)}</text>
          <text x="136" y="1268" fill="#6ee7b7" font-size="21" font-weight="700">${esc(t.s3.botLine2)}</text>
          <rect x="1880" y="1158" width="544" height="104" rx="22" fill="url(#emeraldGrad)"/>
          <text x="2152" y="1220" fill="#022c22" font-size="26" font-weight="900" text-anchor="middle">${esc(t.s3.botBtn)}</text>
        `,
      }),
    },
    {
      slug: '04-ai-revisions-ar',
      svg: browserFrame({
        stepPill: t.s4.pill,
        title: t.s4.title,
        domain: 'portal.harborlightfilms.com/blueprint/share/9d4e2a#revise',
        rightBadge: t.s4.badge,
        rightColor: '#f59e0b',
        bodySvg: `
          <rect x="88" y="162" width="1160" height="1202" rx="24" fill="url(#cardDark)" stroke="#f59e0b" stroke-width="3"/>
          <text x="136" y="222" fill="#fbbf24" font-size="19" font-weight="800">${esc(t.s4.leftTag)}</text>
          <text x="136" y="274" fill="#ffffff" font-size="32" font-weight="800">${esc(t.s4.leftTitle)}</text>

          <rect x="136" y="318" width="1064" height="196" rx="20" fill="#0f172a" stroke="#334155" stroke-width="2"/>
          <text x="176" y="366" fill="#94a3b8" font-size="18" font-weight="800">${esc(t.s4.noteTag)}</text>
          <text x="176" y="416" fill="#f8fafc" font-size="22">${esc(t.s4.note1)}</text>
          <text x="176" y="456" fill="#f8fafc" font-size="22">${esc(t.s4.note2)}</text>

          <rect x="136" y="548" width="1064" height="396" rx="20" fill="#1e1b0d" stroke="#f59e0b" stroke-width="2"/>
          <text x="176" y="600" fill="#fde68a" font-size="20" font-weight="800">${esc(t.s4.planTag)}</text>
          <text x="176" y="654" fill="#ffffff" font-size="21">${esc(t.s4.planBullets[0])}</text>
          <text x="176" y="704" fill="#ffffff" font-size="21">${esc(t.s4.planBullets[1])}</text>
          <text x="176" y="754" fill="#ffffff" font-size="21">${esc(t.s4.planBullets[2])}</text>
          <text x="176" y="804" fill="#34d399" font-size="21" font-weight="700">${esc(t.s4.planBullets[3])}</text>

          <rect x="136" y="996" width="1064" height="94" rx="20" fill="url(#amberGrad)"/>
          <text x="668" y="1054" fill="#0f172a" font-size="26" font-weight="900" text-anchor="middle">${esc(t.s4.leftBtn)}</text>
          <text x="668" y="1148" fill="#94a3b8" font-size="19" text-anchor="middle">${esc(t.s4.leftFoot)}</text>

          <rect x="1284" y="162" width="1188" height="1202" rx="24" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="1332" y="222" fill="#34d399" font-size="19" font-weight="800">${esc(t.s4.rightTag)}</text>
          <text x="1332" y="274" fill="#ffffff" font-size="32" font-weight="800">${esc(t.s4.rightTitle)}</text>

          <rect x="1332" y="318" width="1092" height="440" rx="22" fill="#052e2b" fill-opacity="0.5" stroke="#10b981" stroke-width="2"/>
          <circle cx="1510" cy="538" r="126" fill="#022c22" stroke="#10b981" stroke-width="14"/>
          <text x="1510" y="544" fill="#ffffff" font-size="76" font-weight="900" text-anchor="middle">95</text>
          <text x="1510" y="586" fill="#6ee7b7" font-size="18" font-weight="800" text-anchor="middle">${esc(t.s4.readyTag)}</text>

          <text x="1690" y="410" fill="#ecfdf5" font-size="24" font-weight="800">${esc(t.s4.metrics[0])}</text>
          <text x="1690" y="468" fill="#ecfdf5" font-size="24" font-weight="800">${esc(t.s4.metrics[1])}</text>
          <text x="1690" y="526" fill="#ecfdf5" font-size="24" font-weight="800">${esc(t.s4.metrics[2])}</text>
          <text x="1690" y="596" fill="#a7f3d0" font-size="20">${esc(t.s4.emailedNote)}</text>
          <text x="1690" y="638" fill="#fbbf24" font-size="19" font-weight="700">${esc(t.s4.zeroPmNote)}</text>

          <rect x="1332" y="804" width="1092" height="270" rx="22" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="1376" y="868" fill="#ffffff" font-size="26" font-weight="800">${esc(t.s4.lockTitle)}</text>
          <text x="1376" y="920" fill="#cbd5e1" font-size="21">${esc(t.s4.lockLine1)}</text>
          <text x="1376" y="958" fill="#cbd5e1" font-size="21">${esc(t.s4.lockLine2)}</text>

          <rect x="1332" y="1116" width="1092" height="108" rx="24" fill="url(#emeraldGrad)"/>
          <text x="1878" y="1182" fill="#022c22" font-size="29" font-weight="900" text-anchor="middle">${esc(t.s4.rightBtn)}</text>
        `,
      }),
    },
    {
      slug: '05-pm-quote-stripe',
      svg: browserFrame({
        stepPill: t.s5.pill,
        title: t.s5.title,
        domain: 'sceneflowai.studio/dashboard/orders/elena-80th-memoir',
        rightBadge: t.s5.badge,
        rightColor: '#f59e0b',
        bodySvg: `
          <rect x="88" y="162" width="1240" height="1202" rx="24" fill="url(#cardDark)" stroke="#1e293b" stroke-width="2"/>
          <rect x="136" y="206" width="520" height="46" rx="23" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
          <text x="396" y="236" fill="#6ee7b7" font-size="18" font-weight="800" text-anchor="middle">${esc(t.s5.approvedPill)}</text>

          <text x="136" y="308" fill="#ffffff" font-size="33" font-weight="900">${esc(t.s5.estTitle)}</text>
          <text x="136" y="354" fill="#94a3b8" font-size="20">${esc(t.s5.estSub)}</text>

          ${t.s5.rows
            .map(
              (m, idx) => {
                const y = 404 + idx * 104
                return `
            <rect x="136" y="${y}" width="1144" height="86" rx="16" fill="#091326" stroke="#334155" stroke-width="2"/>
            <text x="172" y="${y + 52}" fill="#e2e8f0" font-size="21" font-weight="600">${esc(m[0])}</text>
            <text x="1244" y="${y + 52}" fill="#38bdf8" font-size="22" font-weight="800" text-anchor="end">${esc(m[1])}</text>
          `
              }
            )
            .join('')}

          <rect x="136" y="844" width="1144" height="176" rx="22" fill="#052e2b" fill-opacity="0.55" stroke="#10b981" stroke-width="2"/>
          <text x="176" y="908" fill="#a7f3d0" font-size="22" font-weight="700">${esc(t.s5.totalCompute)}</text>
          <text x="176" y="964" fill="#ffffff" font-size="${s5NetProfitFontSize}" font-weight="900">${esc(t.s5.netProfit)}</text>

          <rect x="1364" y="162" width="1108" height="1202" rx="24" fill="#0f172a" stroke="#f59e0b" stroke-width="3"/>
          <text x="1412" y="226" fill="#fbbf24" font-size="19" font-weight="800">${esc(t.s5.rightTag)}</text>
          <text x="1412" y="280" fill="#ffffff" font-size="32" font-weight="800">${esc(t.s5.rightTitle)}</text>

          ${t.s5.checks
            .map(
              (d, idx) => `
            <rect x="1412" y="${330 + idx * 96}" width="1012" height="78" rx="16" fill="#091326" stroke="#334155" stroke-width="2"/>
            <text x="1448" y="${378 + idx * 96}" fill="#f8fafc" font-size="21" font-weight="600">${esc(d)}</text>
          `
            )
            .join('')}

          <rect x="1412" y="750" width="1012" height="250" rx="22" fill="#1c1917" stroke="#f59e0b" stroke-width="2"/>
          <text x="1456" y="814" fill="#cbd5e1" font-size="23">${esc(t.s5.pkgPriceLabel)}</text>
          <text x="2380" y="814" fill="#ffffff" font-size="28" font-weight="800" text-anchor="end">${esc(t.s5.pkgPriceVal)}</text>
          <text x="1456" y="868" fill="#34d399" font-size="23">${esc(t.s5.creditLabel)}</text>
          <text x="2380" y="868" fill="#34d399" font-size="28" font-weight="800" text-anchor="end">${esc(t.s5.creditVal)}</text>
          <line x1="1456" y1="898" x2="2380" y2="898" stroke="#44403c" stroke-width="2"/>
          <text x="1456" y="958" fill="#fbbf24" font-size="29" font-weight="900">${esc(t.s5.dueLabel)}</text>
          <text x="2380" y="958" fill="#fbbf24" font-size="${s5DueFontSize}" font-weight="900" text-anchor="end">${esc(t.s5.dueVal)}</text>

          <rect x="1412" y="1056" width="1012" height="108" rx="24" fill="url(#amberGrad)"/>
          <text x="1918" y="1122" fill="#0f172a" font-size="28" font-weight="900" text-anchor="middle">${esc(t.s5.sendBtn)}</text>
          <text x="1918" y="1220" fill="#fde68a" font-size="19" font-weight="600" text-anchor="middle">${esc(t.s5.sendFoot)}</text>
        `,
      }),
    },
    {
      slug: '06-script-continuity',
      svg: browserFrame({
        stepPill: t.s6.pill,
        title: t.s6.title,
        domain: 'portal.harborlightfilms.com/continuity/elena-80th-memoir',
        rightBadge: t.s6.badge,
        bodySvg: `
          <rect x="88" y="162" width="1120" height="1202" rx="24" fill="url(#cardDark)" stroke="#38bdf8" stroke-width="3"/>
          <text x="136" y="222" fill="#38bdf8" font-size="19" font-weight="800">${esc(t.s6.leftTag)}</text>
          <text x="136" y="274" fill="#ffffff" font-size="32" font-weight="800">${esc(t.s6.leftTitle)}</text>

          <rect x="136" y="314" width="1024" height="84" rx="16" fill="#052e2b" stroke="#10b981" stroke-width="2"/>
          <text x="172" y="366" fill="#6ee7b7" font-size="21" font-weight="800">${esc(t.s6.scriptScore)}</text>

          <rect x="136" y="430" width="1024" height="740" rx="20" fill="#060c18" stroke="#1e293b" stroke-width="2"/>
          <text x="176" y="490" fill="#fbbf24" font-size="20" font-weight="800">${esc(t.s6.sc1Head)}</text>
          <text x="176" y="544" fill="#cbd5e1" font-size="21">${esc(t.s6.sc1Lines[0])}</text>
          <text x="176" y="582" fill="#cbd5e1" font-size="21">${esc(t.s6.sc1Lines[1])}</text>
          <text x="176" y="620" fill="#cbd5e1" font-size="21">${esc(t.s6.sc1Lines[2])}</text>

          <text x="360" y="694" fill="#38bdf8" font-size="21" font-weight="800">${esc(t.s6.voHead)}</text>
          <text x="210" y="740" fill="#ffffff" font-size="22">${esc(t.s6.voLines[0])}</text>
          <text x="210" y="780" fill="#ffffff" font-size="22">${esc(t.s6.voLines[1])}</text>

          <text x="176" y="868" fill="#fbbf24" font-size="20" font-weight="800">${esc(t.s6.sc2Head)}</text>
          <text x="176" y="922" fill="#cbd5e1" font-size="21">${esc(t.s6.sc2Lines[0])}</text>
          <text x="176" y="960" fill="#cbd5e1" font-size="21">${esc(t.s6.sc2Lines[1])}</text>
          <rect x="176" y="1028" width="944" height="96" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
          <text x="648" y="1086" fill="#6ee7b7" font-size="21" font-weight="700" text-anchor="middle">${esc(t.s6.exclBadge)}</text>

          <rect x="1244" y="162" width="1228" height="1202" rx="24" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="1292" y="222" fill="#34d399" font-size="19" font-weight="800">${esc(t.s6.rightTag)}</text>
          <text x="1292" y="274" fill="#ffffff" font-size="32" font-weight="800">${esc(t.s6.rightTitle)}</text>

          ${[
            { x: 1292, y: 320, img: imgCharOlder, a: t.s6.anchors[0] },
            { x: 1876, y: 320, img: imgCharYoung, a: t.s6.anchors[1] },
            { x: 1292, y: 760, img: imgMemoir2, a: t.s6.anchors[2] },
            { x: 1876, y: 760, img: imgPropCompass, a: t.s6.anchors[3] },
          ]
            .map(
              (c) => `
            <rect x="${c.x}" y="${c.y}" width="556" height="412" rx="20" fill="#091326" stroke="#10b981" stroke-width="2"/>
            <clipPath id="cc-${c.x}-${c.y}"><rect x="${c.x + 18}" y="${c.y + 18}" width="520" height="248" rx="14"/></clipPath>
            <image href="${c.img}" x="${c.x + 18}" y="${c.y + 18}" width="520" height="248" preserveAspectRatio="xMidYMid slice" clip-path="url(#cc-${c.x}-${c.y})"/>
            <text x="${c.x + 28}" y="${c.y + 304}" fill="#34d399" font-size="17" font-weight="800">${esc(c.a[0])}</text>
            <text x="${c.x + 28}" y="${c.y + 344}" fill="#ffffff" font-size="24" font-weight="800">${esc(c.a[1])}</text>
            <text x="${c.x + 28}" y="${c.y + 382}" fill="#a7f3d0" font-size="17" font-weight="600">${esc(c.a[2])}</text>
          `
            )
            .join('')}

          <rect x="1292" y="1210" width="1140" height="104" rx="22" fill="url(#emeraldGrad)"/>
          <text x="1862" y="1274" fill="#022c22" font-size="27" font-weight="900" text-anchor="middle">${esc(t.s6.signBtn)}</text>
        `,
      }),
    },
    {
      slug: '07-screening-room',
      svg: browserFrame({
        stepPill: t.s7.pill,
        title: t.s7.title,
        domain: 'portal.harborlightfilms.com/screening-room/elena-80th',
        rightBadge: t.s7.badge,
        bodySvg: `
          ${[
            { x: 88, w: 384, label: t.s7.tabs[0], state: 'done' },
            { x: 488, w: 340, label: t.s7.tabs[1], state: 'done' },
            { x: 844, w: 340, label: t.s7.tabs[2], state: 'done' },
            { x: 1200, w: 360, label: t.s7.tabs[3], state: 'done' },
            { x: 1576, w: 436, label: t.s7.tabs[4], state: 'active' },
            { x: 2028, w: 444, label: t.s7.tabs[5], state: 'active' },
          ]
            .map(
              (p) => `
            <rect x="${p.x}" y="156" width="${p.w}" height="68" rx="18" fill="${p.state === 'active' ? '#10b981' : '#0f172a'}" fill-opacity="${p.state === 'active' ? '0.24' : '0.9'}" stroke="${p.state === 'active' ? '#34d399' : '#334155'}" stroke-width="2"/>
            <text x="${p.x + p.w / 2}" y="199" fill="${p.state === 'active' ? '#ffffff' : '#6ee7b7'}" font-size="20" font-weight="800" text-anchor="middle">${esc(p.label)}</text>
          `
            )
            .join('')}

          <rect x="88" y="252" width="1540" height="1112" rx="26" fill="#050914" stroke="#1e293b" stroke-width="3"/>
          <clipPath id="sr-vid"><rect x="112" y="276" width="1492" height="840" rx="20"/></clipPath>
          <image href="${imgMemoir2}" x="112" y="276" width="1492" height="840" preserveAspectRatio="xMidYMid slice" clip-path="url(#sr-vid)"/>

          <rect x="148" y="312" width="440" height="52" rx="14" fill="#020617" fill-opacity="0.8" stroke="#10b981" stroke-width="2"/>
          <text x="368" y="346" fill="#ecfdf5" font-size="19" font-weight="800" text-anchor="middle">${esc(t.s7.uhdBadge)}</text>

          <rect x="140" y="1164" width="1436" height="16" rx="8" fill="#1e293b"/>
          <rect x="140" y="1164" width="540" height="16" rx="8" fill="url(#emeraldGrad)"/>
          <circle cx="680" cy="1172" r="16" fill="#fbbf24" stroke="#ffffff" stroke-width="3"/>
          <text x="140" y="1236" fill="#ffffff" font-size="25" font-weight="800">${esc(t.s7.chapTitle)}</text>
          <text x="140" y="1282" fill="#94a3b8" font-size="20">${esc(t.s7.chapSub)}</text>

          <rect x="1664" y="252" width="808" height="1112" rx="26" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="1712" y="316" fill="#34d399" font-size="19" font-weight="800">${esc(t.s7.rightTag)}</text>
          <text x="1712" y="368" fill="#ffffff" font-size="30" font-weight="800">${esc(t.s7.rightTitle)}</text>

          <rect x="1712" y="412" width="712" height="190" rx="20" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="1748" y="460" fill="#fbbf24" font-size="19" font-weight="800">${esc(t.s7.pin1Tag)}</text>
          <text x="1748" y="508" fill="#f8fafc" font-size="21">${esc(t.s7.pin1L1)}</text>
          <text x="1748" y="546" fill="#f8fafc" font-size="21">${esc(t.s7.pin1L2)}</text>

          <rect x="1712" y="632" width="712" height="190" rx="20" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="1748" y="680" fill="#38bdf8" font-size="19" font-weight="800">${esc(t.s7.pin2Tag)}</text>
          <text x="1748" y="728" fill="#f8fafc" font-size="21">${esc(t.s7.pin2L1)}</text>
          <text x="1748" y="766" fill="#f8fafc" font-size="21">${esc(t.s7.pin2L2)}</text>

          <rect x="1712" y="864" width="712" height="216" rx="20" fill="#052e2b" fill-opacity="0.5" stroke="#10b981" stroke-width="2"/>
          <text x="1748" y="924" fill="#ecfdf5" font-size="23" font-weight="800">${esc(t.s7.guardTitle)}</text>
          <text x="1748" y="972" fill="#a7f3d0" font-size="19">${esc(t.s7.guardL1)}</text>
          <text x="1748" y="1012" fill="#a7f3d0" font-size="19">${esc(t.s7.guardL2)}</text>

          <rect x="1712" y="1136" width="712" height="108" rx="22" fill="url(#emeraldGrad)"/>
          <text x="2068" y="1202" fill="#022c22" font-size="26" font-weight="900" text-anchor="middle">${esc(t.s7.approveBtn)}</text>
        `,
      }),
    },
    {
      slug: '08-client-signoff-roi',
      svg: browserFrame({
        stepPill: t.s8.pill,
        title: t.s8.title,
        domain: 'sceneflowai.studio/dashboard/roi · Harborlight Video Studio',
        rightBadge: t.s8.badge,
        bodySvg: `
          <rect x="88" y="162" width="1120" height="1202" rx="26" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="136" y="224" fill="#34d399" font-size="19" font-weight="800">${esc(t.s8.leftTag)}</text>
          <text x="136" y="278" fill="#ffffff" font-size="34" font-weight="900">${esc(t.s8.leftTitle)}</text>

          <clipPath id="roi-hero"><rect x="136" y="318" width="1024" height="460" rx="20"/></clipPath>
          <image href="${imgMemoir1}" x="136" y="318" width="1024" height="460" preserveAspectRatio="xMidYMid slice" clip-path="url(#roi-hero)"/>

          <rect x="136" y="814" width="1024" height="224" rx="20" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="176" y="874" fill="#ffffff" font-size="23" font-weight="800">${esc(t.s8.deliv1)}</text>
          <text x="176" y="926" fill="#ffffff" font-size="23" font-weight="800">${esc(t.s8.deliv2)}</text>
          <text x="176" y="978" fill="#6ee7b7" font-size="20" font-weight="700">${esc(t.s8.deliv3)}</text>

          <rect x="136" y="1084" width="1024" height="104" rx="22" fill="url(#emeraldGrad)"/>
          <text x="648" y="1148" fill="#022c22" font-size="27" font-weight="900" text-anchor="middle">${esc(t.s8.dlBtn)}</text>

          <rect x="1244" y="162" width="1228" height="1202" rx="26" fill="#062822" stroke="#10b981" stroke-width="4"/>
          <text x="1296" y="224" fill="#fbbf24" font-size="19" font-weight="800">${esc(t.s8.rightTag)}</text>
          <text x="1296" y="278" fill="#ffffff" font-size="34" font-weight="900">${esc(t.s8.rightTitle)}</text>

          ${t.s8.cards
            .map(
              (card, idx) => {
                const y = 332 + idx * 188
                const cardStatFs = card[1].length > 11 ? 33 : card[1].length > 8 ? 37 : 42
                return `
            <rect x="1296" y="${y}" width="1124" height="162" rx="22" fill="#021713" stroke="#10b981" stroke-width="2"/>
            <text x="1336" y="${y + 66}" fill="#ffffff" font-size="26" font-weight="800">${esc(card[0])}</text>
            <text x="1336" y="${y + 116}" fill="#a7f3d0" font-size="20">${esc(card[2])}</text>
            <text x="2376" y="${y + 96}" fill="#34d399" font-size="${cardStatFs}" font-weight="900" text-anchor="end">${esc(card[1])}</text>
          `
              }
            )
            .join('')}

          <rect x="1296" y="914" width="1124" height="390" rx="24" fill="#0f172a" stroke="#fbbf24" stroke-width="3"/>
          <text x="1858" y="986" fill="#fde68a" font-size="22" font-weight="800" text-anchor="middle">${esc(t.s8.runRateTag)}</text>
          <text x="1858" y="1096" fill="#ffffff" font-size="${s8RunRateFontSize}" font-weight="900" text-anchor="middle">${esc(t.s8.runRateVal)}</text>
          <text x="1858" y="1164" fill="#34d399" font-size="23" font-weight="800" text-anchor="middle">${esc(t.s8.runRateSub1)}</text>
          <text x="1858" y="1226" fill="#94a3b8" font-size="20" text-anchor="middle">${esc(t.s8.runRateSub2)}</text>
        `,
      }),
    },
  ]
}

async function main() {
  mkdirSync(PUBLIC_OUT_DIR, { recursive: true })

  const vsDir = join(ROOT, 'public', 'landing', 'video-services')
  const sbDir = join(ROOT, 'public', 'images', 'sandbox', 'glass-ledger')

  const imgs = {
    imgMemoir1: await thumbDataUri(join(vsDir, 'memoir-1.webp'), 900, 506),
    imgMemoir2: await thumbDataUri(join(vsDir, 'memoir-2.webp'), 900, 506),
    imgRealEstate: await thumbDataUri(join(vsDir, 'realestate-1.webp'), 900, 506),
    imgTraining: await thumbDataUri(join(vsDir, 'training-1.webp'), 900, 506),
    imgBrand1: await thumbDataUri(join(vsDir, 'brand-1.webp'), 900, 506),
    imgBrand2: await thumbDataUri(join(vsDir, 'brand-2.webp'), 900, 506),
    imgCharOlder: await thumbDataUri(join(sbDir, 'char-aris.jpg'), 500, 500),
    imgCharYoung: await thumbDataUri(join(sbDir, 'char-marcus.jpg'), 500, 500),
    imgPropCompass: await thumbDataUri(join(sbDir, 'prop-chrono-key.jpg'), 500, 500),
  }

  const localeArgIdx = process.argv.indexOf('--locale')
  const locales =
    localeArgIdx >= 0 && process.argv[localeArgIdx + 1]
      ? process.argv[localeArgIdx + 1].split(',').map((s) => s.trim())
      : Object.keys(SCREEN_I18N)

  for (const locale of locales) {
    const dict = SCREEN_I18N[locale]
    if (!dict) throw new Error(`Unsupported locale: ${locale}`)
    const locDir = join(BUILD_SCREENS_ROOT, locale)
    mkdirSync(locDir, { recursive: true })
    const screens = buildScreensForLocale(dict, imgs)

    await Promise.all(
      screens.map(async (s) => {
        const svgBuf = Buffer.from(s.svg, 'utf8')
        const buildPngPath = join(locDir, `${s.slug}.png`)
        await sharp(svgBuf).png({ compressionLevel: 6 }).toFile(buildPngPath)
        if (locale === 'en') {
          await sharp(svgBuf).png({ compressionLevel: 8 }).toFile(join(PUBLIC_OUT_DIR, `${s.slug}.png`))
          await sharp(svgBuf).webp({ quality: 90 }).toFile(join(PUBLIC_OUT_DIR, `${s.slug}.webp`))
        }
      })
    )
    console.log(`✓ Generated 8 localized QHD (2560x1440) UI plates for [${locale}]`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
