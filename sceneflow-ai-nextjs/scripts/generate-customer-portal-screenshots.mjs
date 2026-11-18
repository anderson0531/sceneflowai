#!/usr/bin/env node
/**
 * Generates 8 crisp 2560x1440 (16:9 QHD) application experience screenshots for the
 * Customer & Provider Experience Film (`public/landing/video-services/portal-screens/`):
 *   01-business-portal.{png,webp}    — 1. Business Portal ($29)
 *   02-auto-intake-email.{png,webp}  — 2. Auto Intake Email
 *   03-storyboard-audio.{png,webp}   — 3. Storyboard + Audio
 *   04-ai-revisions-ar.{png,webp}    — 4. AI Revisions & AR
 *   05-pm-quote-stripe.{png,webp}    — 5. PM Quote & Stripe
 *   06-script-continuity.{png,webp}  — 6. Script + Continuity
 *   07-screening-room.{png,webp}     — 7. Screening Room
 *   08-client-signoff-roi.{png,webp} — 8. Client Sign-Off & ROI
 *
 * These plates can be uploaded directly into Google Flow as screen references
 * AND are automatically interjected with smooth 2-ROI cubic ease-in-out pan/zoom
 * by `scripts/build-customer-portal-film.ts`.
 */

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'landing', 'video-services', 'portal-screens')

const W = 2560
const H = 1440

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif">
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

  <rect x="196" y="59" width="256" height="48" rx="12" fill="#10b981" fill-opacity="0.16" stroke="#10b981" stroke-width="2"/>
  <text x="324" y="90" fill="#6ee7b7" font-size="18" font-weight="800" text-anchor="middle">${esc(stepPill)}</text>

  <text x="474" y="91" fill="#f8fafc" font-size="22" font-weight="700">${esc(title)}</text>

  <rect x="1220" y="59" width="768" height="48" rx="14" fill="#020617" stroke="#334155" stroke-width="2"/>
  <text x="1604" y="90" fill="#38bdf8" font-size="18" font-weight="600" text-anchor="middle">HTTPS // ${esc(domain)}</text>

  <rect x="2012" y="59" width="464" height="48" rx="24" fill="${rightColor}" fill-opacity="0.18" stroke="${rightColor}" stroke-width="2"/>
  <text x="2244" y="90" fill="#f8fafc" font-size="18" font-weight="700" text-anchor="middle">${esc(rightBadge)}</text>

  ${bodySvg}
</svg>`
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const vsDir = join(ROOT, 'public', 'landing', 'video-services')
  const sbDir = join(ROOT, 'public', 'images', 'sandbox', 'glass-ledger')

  const imgMemoir1 = await thumbDataUri(join(vsDir, 'memoir-1.webp'), 900, 506)
  const imgMemoir2 = await thumbDataUri(join(vsDir, 'memoir-2.webp'), 900, 506)
  const imgRealEstate = await thumbDataUri(join(vsDir, 'realestate-1.webp'), 900, 506)
  const imgTraining = await thumbDataUri(join(vsDir, 'training-1.webp'), 900, 506)
  const imgBrand1 = await thumbDataUri(join(vsDir, 'brand-1.webp'), 900, 506)
  const imgBrand2 = await thumbDataUri(join(vsDir, 'brand-2.webp'), 900, 506)
  const imgCharOlder = await thumbDataUri(join(sbDir, 'char-aris.jpg'), 500, 500)
  const imgCharYoung = await thumbDataUri(join(sbDir, 'char-marcus.jpg'), 500, 500)
  const imgPropCompass = await thumbDataUri(join(sbDir, 'prop-chrono-key.jpg'), 500, 500)

  const screens = [
    {
      slug: '01-business-portal',
      svg: browserFrame({
        stepPill: 'STAGE 01 · PORTAL',
        title: 'Harborlight Video Studio — White-Label Storefront',
        domain: 'portal.harborlightfilms.com · 100% White-Label',
        rightBadge: '$29 Paid Discovery · 83% Net Margin',
        bodySvg: `
          <!-- Agency Hero Banner -->
          <rect x="88" y="158" width="2384" height="128" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
          <rect x="120" y="186" width="72" height="72" rx="18" fill="url(#emeraldGrad)"/>
          <text x="156" y="233" fill="#022c22" font-size="30" font-weight="900" text-anchor="middle">HV</text>
          <text x="216" y="216" fill="#ffffff" font-size="34" font-weight="800">Harborlight Video Studio</text>
          <text x="216" y="254" fill="#94a3b8" font-size="22">Bespoke Cinema Production · Preview Your Illustrated Storyboard Blueprint in Minutes</text>
          <rect x="1970" y="188" width="468" height="68" rx="18" fill="#064e3b" fill-opacity="0.55" stroke="#10b981" stroke-width="2"/>
          <text x="2204" y="230" fill="#a7f3d0" font-size="21" font-weight="700" text-anchor="middle">Powered Invisibly by SceneFlow</text>

          <!-- Left 2x2 Grid: 4 Business Services -->
          ${[
            { x: 88, y: 316, img: imgMemoir1, name: 'Video Memoirs & Tributes', price: '$349 – $1,250', sub: 'Multi-Era Family Biographies · Selected ✓', active: true },
            { x: 844, y: 316, img: imgRealEstate, name: 'Real Estate Cinema Tours', price: '$199 – $599', sub: '48-Hour Architectural Listing Films', active: false },
            { x: 88, y: 856, img: imgTraining, name: 'Education & SOP Training', price: '$399 – $1,499', sub: '70+ Language Workforce Modules', active: false },
            { x: 844, y: 856, img: imgBrand1, name: 'Founder & Brand Stories', price: '$499 – $1,999', sub: 'High-Converting Commercial Films', active: false },
          ]
            .map(
              (c) => `
            <rect x="${c.x}" y="${c.y}" width="728" height="512" rx="24" fill="url(#cardDark)" stroke="${c.active ? '#10b981' : '#1e293b'}" stroke-width="${c.active ? '4' : '2'}"/>
            <clipPath id="cp-${c.x}-${c.y}"><rect x="${c.x + 18}" y="${c.y + 18}" width="692" height="330" rx="16"/></clipPath>
            <image href="${c.img}" x="${c.x + 18}" y="${c.y + 18}" width="692" height="330" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp-${c.x}-${c.y})"/>
            <text x="${c.x + 32}" y="${c.y + 398}" fill="#ffffff" font-size="28" font-weight="800">${esc(c.name)}</text>
            <text x="${c.x + 696}" y="${c.y + 398}" fill="#34d399" font-size="26" font-weight="800" text-anchor="end">${esc(c.price)}</text>
            <text x="${c.x + 32}" y="${c.y + 442}" fill="${c.active ? '#6ee7b7' : '#94a3b8'}" font-size="21" font-weight="600">${esc(c.sub)}</text>
          `
            )
            .join('')}

          <!-- Right Highlight Card: $29 Storyboard Blueprint Pass -->
          <rect x="1604" y="316" width="868" height="1052" rx="28" fill="#062822" stroke="#10b981" stroke-width="4"/>
          <rect x="1652" y="364" width="380" height="46" rx="23" fill="#10b981" fill-opacity="0.25" stroke="#34d399" stroke-width="2"/>
          <text x="1842" y="394" fill="#ecfdf5" font-size="19" font-weight="800" text-anchor="middle">SELF-FUNDING DISCOVERY</text>

          <text x="1652" y="468" fill="#ffffff" font-size="40" font-weight="900">Storyboard Blueprint Pass</text>
          <text x="1652" y="518" fill="#a7f3d0" font-size="23">See &amp; hear your custom film Blueprint before committing to production.</text>

          <rect x="1652" y="556" width="772" height="176" rx="22" fill="#021713" stroke="#10b981" stroke-width="2"/>
          <text x="1692" y="658" fill="#ffffff" font-size="86" font-weight="900">$29</text>
          <text x="1878" y="624" fill="#34d399" font-size="25" font-weight="800">100% Credited Toward Production</text>
          <text x="1878" y="666" fill="#94a3b8" font-size="21">Max AI compute ~$3.90 → +$23.96 net (83% margin)</text>
          <text x="1878" y="704" fill="#fbbf24" font-size="20" font-weight="700">Zero Unpaid Sales Calls · Zero Tire-Kickers</text>

          ${[
            '✓ Automated magic-link email into Guided AI Story Intake',
            '✓ 6 Illustrated 16:9 Beat Storyboards + Narrated Audio Overview',
            '✓ Up to 4 AI-Filtered Blueprint Director Revisions included',
            '✓ Up to 3 Automated Audience Resonance score passes emailed',
          ]
            .map(
              (item, i) => `
            <text x="1660" y="${796 + i * 62}" fill="#ecfdf5" font-size="23" font-weight="600">${esc(item)}</text>
          `
            )
            .join('')}

          <rect x="1652" y="1084" width="772" height="96" rx="22" fill="url(#emeraldGrad)"/>
          <text x="2038" y="1143" fill="#022c22" font-size="30" font-weight="900" text-anchor="middle">Start My Storyboard Blueprint — $29 →</text>
          <text x="2038" y="1232" fill="#6ee7b7" font-size="20" font-weight="600" text-anchor="middle">Apple Pay · Stripe · Whop · Instant Automated Email Link</text>
        `,
      }),
    },
    {
      slug: '02-auto-intake-email',
      svg: browserFrame({
        stepPill: 'STAGE 02 · AUTO INTAKE',
        title: 'Automated Magic-Link Email → Guided Vision & Story Interview',
        domain: 'portal.harborlightfilms.com/intake/elena-80th-memoir',
        rightBadge: '0 PM Minutes · 24/7 Voice or Text',
        bodySvg: `
          <!-- Left Column: Automated Branded Email Inbox -->
          <rect x="88" y="162" width="1020" height="1202" rx="24" fill="url(#cardDark)" stroke="#1e293b" stroke-width="2"/>
          <text x="132" y="220" fill="#38bdf8" font-size="20" font-weight="800" letter-spacing="1.5">CLIENT INBOX · SENT INSTANTLY ON $29 CHECKOUT</text>
          <text x="132" y="272" fill="#ffffff" font-size="34" font-weight="800">Automated Magic-Link Delivery</text>

          <rect x="132" y="314" width="932" height="520" rx="22" fill="#0b1528" stroke="#10b981" stroke-width="3"/>
          <text x="172" y="368" fill="#34d399" font-size="20" font-weight="700">From: Harborlight Video Studio &lt;concierge@harborlightfilms.com&gt;</text>
          <text x="172" y="408" fill="#94a3b8" font-size="20">To: Elena Morales &lt;elena.morales@email.com&gt; · Delivered in 2s</text>
          <line x1="172" y1="434" x2="1024" y2="434" stroke="#1e293b" stroke-width="2"/>
          <text x="172" y="488" fill="#ffffff" font-size="29" font-weight="800">Welcome Elena! Start your 5-minute Story Intake</text>
          <text x="172" y="540" fill="#cbd5e1" font-size="22">Your $29 Blueprint Pass is active and credited toward your film.</text>
          <text x="172" y="580" fill="#cbd5e1" font-size="22">Speak naturally or type in any of 7 languages—no password needed.</text>
          <rect x="172" y="636" width="852" height="84" rx="18" fill="url(#emeraldGrad)"/>
          <text x="598" y="688" fill="#022c22" font-size="26" font-weight="900" text-anchor="middle">Open Guided Vision &amp; Story Interview →</text>
          <text x="598" y="776" fill="#6ee7b7" font-size="19" font-weight="600" text-anchor="middle">Includes 4 Blueprint Iterations + 3 Audience Resonance Passes</text>

          <!-- Consent Shield Card -->
          <rect x="132" y="874" width="932" height="442" rx="22" fill="#052e2b" fill-opacity="0.45" stroke="#10b981" stroke-width="2"/>
          <text x="172" y="934" fill="#ecfdf5" font-size="27" font-weight="800">✓ Clickwrap Media, Likeness &amp; Voice Consent Verified</text>
          <text x="172" y="984" fill="#a7f3d0" font-size="21">• Automatic EXIF GPS stripping on all family uploads</text>
          <text x="172" y="1028" fill="#a7f3d0" font-size="21">• Isolated customer quarantine protects Producer standing</text>
          <text x="172" y="1072" fill="#a7f3d0" font-size="21">• 7 Native Languages: EN · ES · PT · HI · ZH · AR · TH</text>
          <rect x="172" y="1130" width="852" height="136" rx="16" fill="#021713" stroke="#10b981" stroke-width="2"/>
          <text x="208" y="1184" fill="#fbbf24" font-size="22" font-weight="800">STAGE COMPUTE COST: ~$0.55 · OPERATOR TIME: 0 MIN</text>
          <text x="208" y="1228" fill="#94a3b8" font-size="20">Vision confirmed in 2 passes + 4-turn story interview completed at 9:42 PM</text>

          <!-- Right Column: Live AI Vision & Story Intake -->
          <rect x="1144" y="162" width="1328" height="1202" rx="24" fill="url(#cardDark)" stroke="#38bdf8" stroke-width="3"/>
          <text x="1192" y="220" fill="#38bdf8" font-size="20" font-weight="800" letter-spacing="1.5">GUIDED VISION &amp; 4-TURN STORY INTERVIEW · 96% COMPLETE</text>
          <text x="1192" y="272" fill="#ffffff" font-size="34" font-weight="800">“Mateo’s 80th Birthday Harbor Memoir”</text>

          <rect x="1192" y="314" width="1232" height="230" rx="20" fill="#0f2438" stroke="#0ea5e9" stroke-width="2"/>
          <text x="1232" y="362" fill="#7dd3fc" font-size="20" font-weight="800">VOICE / TEXT INPUT · ELENA MORALES (TRANSCRIBED)</text>
          <text x="1232" y="410" fill="#f8fafc" font-size="23">“We want a 12-minute tribute for Dad’s 80th birthday—from learning cedar boatbuilding</text>
          <text x="1232" y="448" fill="#f8fafc" font-size="23">in 1958 Oaxaca, to opening his 1972 San Diego boatshop, to handing his scorched cedar</text>
          <text x="1232" y="486" fill="#f8fafc" font-size="23">compass box to his grandson at our harbor dinner.”</text>

          <!-- Extracted Multi-Age Cast & Prop Continuity Preview -->
          <text x="1192" y="606" fill="#a7f3d0" font-size="22" font-weight="800">AUTO-EXTRACTED MULTI-ERA CAST, LOCATIONS &amp; PROPS</text>
          ${[
            { y: 636, badge: 'CAST · ERA 1972', name: 'Mateo Morales (Age 28)', desc: 'Master boatwright · 1972 cedar boatshop likeness anchor' },
            { y: 766, badge: 'CAST · ERA 2026', name: 'Mateo Morales (Age 80)', desc: '80th birthday honoree · Exclusive era beat casting locked' },
            { y: 896, badge: 'HERO PROP LOCK', name: 'Scorched Cedar Compass Box', desc: 'Hand-carved 1958 heirloom passed across three generations' },
          ]
            .map(
              (r) => `
            <rect x="1192" y="${r.y}" width="1232" height="110" rx="18" fill="#091326" stroke="#334155" stroke-width="2"/>
            <rect x="1220" y="${r.y + 28}" width="236" height="54" rx="12" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-width="2"/>
            <text x="1338" y="${r.y + 62}" fill="#6ee7b7" font-size="18" font-weight="800" text-anchor="middle">${esc(r.badge)}</text>
            <text x="1484" y="${r.y + 52}" fill="#ffffff" font-size="25" font-weight="800">${esc(r.name)}</text>
            <text x="1484" y="${r.y + 86}" fill="#94a3b8" font-size="20">${esc(r.desc)}</text>
          `
            )
            .join('')}

          <rect x="1192" y="1048" width="1232" height="96" rx="22" fill="url(#emeraldGrad)"/>
          <text x="1808" y="1107" fill="#022c22" font-size="29" font-weight="900" text-anchor="middle">Complete Intake &amp; Auto-Generate Illustrated Blueprint →</text>
          <text x="1808" y="1202" fill="#7dd3fc" font-size="21" font-weight="600" text-anchor="middle">Illustrated Storyboards + Voiceover Narration Emailed Automatically in ~3 Minutes</text>
        `,
      }),
    },
    {
      slug: '03-storyboard-audio',
      svg: browserFrame({
        stepPill: 'STAGE 03 · BLUEPRINT',
        title: 'Illustrated Storyboard Blueprint + Gemini Narrated Overview',
        domain: 'portal.harborlightfilms.com/blueprint/share/9d4e2a',
        rightBadge: 'Emailed in ~3 Min · Audience Resonance 88/100',
        bodySvg: `
          <!-- Top Audio Narration Player Bar -->
          <rect x="88" y="158" width="2384" height="134" rx="22" fill="#0b192e" stroke="#38bdf8" stroke-width="3"/>
          <circle cx="164" cy="225" r="40" fill="url(#amberGrad)"/>
          <text x="168" y="238" fill="#0f172a" font-size="34" font-weight="900" text-anchor="middle">▶</text>
          <text x="232" y="212" fill="#ffffff" font-size="29" font-weight="800">Narrated Blueprint Overview · Studio Voice (Charon · 0:48)</text>
          <text x="232" y="252" fill="#7dd3fc" font-size="21">“In 1972 San Diego, fragrant cedar shavings curl beneath twenty-eight-year-old Mateo’s hand plane...”</text>
          <rect x="1930" y="186" width="504" height="78" rx="20" fill="#052e2b" stroke="#10b981" stroke-width="2"/>
          <text x="2182" y="234" fill="#6ee7b7" font-size="25" font-weight="900" text-anchor="middle">Audience Resonance: 88 / 100</text>

          <!-- 3 Featured Illustrated Beat Storyboard Cards -->
          ${[
            {
              x: 88,
              img: imgMemoir1,
              beat: 'BEAT 01 · 1958 OAXACA (0:00–2:15)',
              title: 'The Scorched Cedar Compass',
              desc: 'Young Mateo rescues a brass compass in warm sierra workshop light, carving his first dovetail box.',
            },
            {
              x: 896,
              img: imgMemoir2,
              beat: 'BEAT 03 · 1972 BOATSHOP (4:30–7:40)',
              title: 'Opening Harborlight Joinery',
              desc: 'Mateo (Age 28) &amp; Rosa unlock their San Diego cedar boatyard in golden coastal morning mist.',
            },
            {
              x: 1704,
              img: imgBrand2,
              beat: 'BEAT 06 · 2026 HARBOR (9:50–12:00)',
              title: 'Three-Generation Toast',
              desc: 'Mateo (Age 80) passes the scorched cedar compass box to grandson Leo beneath harbor lanterns.',
            },
          ]
            .map(
              (b) => `
            <rect x="${b.x}" y="324" width="768" height="740" rx="24" fill="url(#cardDark)" stroke="#1e293b" stroke-width="2"/>
            <clipPath id="bp-${b.x}"><rect x="${b.x + 20}" y="344" width="728" height="420" rx="18"/></clipPath>
            <image href="${b.img}" x="${b.x + 20}" y="344" width="728" height="420" preserveAspectRatio="xMidYMid slice" clip-path="url(#bp-${b.x})"/>
            <text x="${b.x + 36}" y="818" fill="#34d399" font-size="20" font-weight="800" letter-spacing="1.2">${b.beat}</text>
            <text x="${b.x + 36}" y="868" fill="#ffffff" font-size="31" font-weight="800">${b.title}</text>
            <text x="${b.x + 36}" y="920" fill="#cbd5e1" font-size="22">${b.desc.slice(0, 52)}</text>
            <text x="${b.x + 36}" y="954" fill="#cbd5e1" font-size="22">${b.desc.slice(52)}</text>
            <rect x="${b.x + 36}" y="986" width="320" height="48" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
            <text x="${b.x + 196}" y="1018" fill="#fbbf24" font-size="19" font-weight="700" text-anchor="middle">▶ Beat Voiceover Ready</text>
          `
            )
            .join('')}

          <!-- Bottom Self-Serve Status Strip -->
          <rect x="88" y="1096" width="2384" height="268" rx="24" fill="#071f1b" stroke="#10b981" stroke-width="3"/>
          <text x="136" y="1164" fill="#ffffff" font-size="32" font-weight="800">Delivered Automatically via Branded Email in ~3 Minutes</text>
          <text x="136" y="1216" fill="#a7f3d0" font-size="23">6 Beat Storyboard Stills (60 cr) + Section Audio Narration (40 cr) + AR Pass 1/3 (25 cr) = ~$1.25 Compute</text>
          <text x="136" y="1268" fill="#6ee7b7" font-size="22" font-weight="700">Customer can now self-refine up to 4 Blueprint Revisions + 3 Audience Resonance Passes—or click Approve.</text>
          <rect x="1900" y="1158" width="524" height="104" rx="22" fill="url(#emeraldGrad)"/>
          <text x="2162" y="1220" fill="#022c22" font-size="28" font-weight="900" text-anchor="middle">Refine or Approve Blueprint →</text>
        `,
      }),
    },
    {
      slug: '04-ai-revisions-ar',
      svg: browserFrame({
        stepPill: 'STAGE 04 · AI REVISIONS',
        title: '4 AI-Filtered Blueprint Revisions + 3 Audience Resonance Passes',
        domain: 'portal.harborlightfilms.com/blueprint/share/9d4e2a#revise',
        rightBadge: 'Revisions: 2 of 4 · AR Passes: 2 of 3',
        rightColor: '#f59e0b',
        bodySvg: `
          <!-- Left Column: Customer Raw Feedback -> AI Clarifier Confirmation -->
          <rect x="88" y="162" width="1160" height="1202" rx="24" fill="url(#cardDark)" stroke="#f59e0b" stroke-width="3"/>
          <text x="136" y="222" fill="#fbbf24" font-size="20" font-weight="800" letter-spacing="1.5">STEP 1 · AI FEEDBACK FILTER &amp; CLARIFIER</text>
          <text x="136" y="274" fill="#ffffff" font-size="34" font-weight="800">Client Feedback Confirmed Before Rewrite</text>

          <rect x="136" y="318" width="1064" height="196" rx="20" fill="#0f172a" stroke="#334155" stroke-width="2"/>
          <text x="176" y="366" fill="#94a3b8" font-size="19" font-weight="800">CLIENT RAW NOTE (ELENA MORALES)</text>
          <text x="176" y="416" fill="#f8fafc" font-size="24">“Can Beat 6 happen at golden sunset on the harbor deck, and have Dad</text>
          <text x="176" y="456" fill="#f8fafc" font-size="24">read the inscription inside the lid of the cedar compass box?”</text>

          <rect x="136" y="548" width="1064" height="396" rx="20" fill="#1e1b0d" stroke="#f59e0b" stroke-width="2"/>
          <text x="176" y="600" fill="#fde68a" font-size="21" font-weight="800">★ AI CLARIFIED REVISION PLAN (ROUTED TO BLUEPRINT DIRECTOR)</text>
          <text x="176" y="654" fill="#ffffff" font-size="23">• Update Beat 06 lighting &amp; setting to golden-hour San Diego harbor deck</text>
          <text x="176" y="704" fill="#ffffff" font-size="23">• Add close-up emotional beat of Mateo (Age 80) reading 1958 lid inscription</text>
          <text x="176" y="754" fill="#ffffff" font-size="23">• Re-illustrate Beat 06 storyboard keyframe while preserving Beats 01–05</text>
          <text x="176" y="804" fill="#34d399" font-size="22" font-weight="700">• Auto-run Audience Resonance Pass 2 of 3 &amp; email updated review link</text>

          <rect x="136" y="996" width="1064" height="94" rx="20" fill="url(#amberGrad)"/>
          <text x="668" y="1054" fill="#0f172a" font-size="28" font-weight="900" text-anchor="middle">✓ Confirmed &amp; Applied via Blueprint Director</text>
          <text x="668" y="1148" fill="#94a3b8" font-size="21" text-anchor="middle">Quarantine Protected · Capped at 4 Blueprint Revisions &amp; 3 AR Iterations</text>

          <!-- Right Column: Updated Audience Resonance 95/100 + Approve Lock -->
          <rect x="1284" y="162" width="1188" height="1202" rx="24" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="1332" y="222" fill="#34d399" font-size="20" font-weight="800" letter-spacing="1.5">STEP 2 · UPDATED AUDIENCE RESONANCE &amp; CLIENT SIGN-OFF</text>
          <text x="1332" y="274" fill="#ffffff" font-size="34" font-weight="800">Resonance Score Jumped: 88 → 95 / 100</text>

          <rect x="1332" y="318" width="1092" height="440" rx="22" fill="#052e2b" fill-opacity="0.5" stroke="#10b981" stroke-width="2"/>
          <circle cx="1510" cy="538" r="126" fill="#022c22" stroke="#10b981" stroke-width="14"/>
          <text x="1510" y="544" fill="#ffffff" font-size="76" font-weight="900" text-anchor="middle">95</text>
          <text x="1510" y="586" fill="#6ee7b7" font-size="20" font-weight="800" text-anchor="middle">READY FOR PROD</text>

          <text x="1690" y="410" fill="#ecfdf5" font-size="25" font-weight="800">Emotional Payoff: 98 / 100</text>
          <text x="1690" y="468" fill="#ecfdf5" font-size="25" font-weight="800">Era Pacing &amp; Structure: 95 / 100</text>
          <text x="1690" y="526" fill="#ecfdf5" font-size="25" font-weight="800">Character Continuity Arc: 96 / 100</text>
          <text x="1690" y="596" fill="#a7f3d0" font-size="21">✓ Updated AR Share Link Emailed Automatically</text>
          <text x="1690" y="638" fill="#fbbf24" font-size="20" font-weight="700">Producer Time Spent So Far: Still 0 Minutes</text>

          <rect x="1332" y="804" width="1092" height="270" rx="22" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="1376" y="868" fill="#ffffff" font-size="28" font-weight="800">Ready to Lock Blueprint &amp; Request Production Quote?</text>
          <text x="1376" y="920" fill="#cbd5e1" font-size="22">Approving locks your 6 illustrated beats, cast eras, and prop checklist,</text>
          <text x="1376" y="958" fill="#cbd5e1" font-size="22">and notifies your Harborlight Producer to send your $29-credited checkout link.</text>

          <rect x="1332" y="1116" width="1092" height="108" rx="24" fill="url(#emeraldGrad)"/>
          <text x="1878" y="1182" fill="#022c22" font-size="32" font-weight="900" text-anchor="middle">✓ Approve Blueprint &amp; Request Production Link</text>
        `,
      }),
    },
    {
      slug: '05-pm-quote-stripe',
      svg: browserFrame({
        stepPill: 'STAGE 05 · PM QUOTE',
        title: 'Producer Console — 3-Minute Cost Review & Stripe / Whop Link',
        domain: 'sceneflowai.studio/dashboard/orders/elena-80th-memoir',
        rightBadge: 'PM Gate · ~3 Min Review · 82% Margin',
        rightColor: '#f59e0b',
        bodySvg: `
          <!-- Left Panel: Approved Blueprint Summary + SceneFlow Cost Estimator -->
          <rect x="88" y="162" width="1240" height="1202" rx="24" fill="url(#cardDark)" stroke="#1e293b" stroke-width="2"/>
          <rect x="136" y="206" width="440" height="46" rx="23" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
          <text x="356" y="236" fill="#6ee7b7" font-size="19" font-weight="800" text-anchor="middle">✓ CLIENT APPROVED BLUEPRINT (AR 95)</text>

          <text x="136" y="308" fill="#ffffff" font-size="36" font-weight="900">SceneFlow Automatic Cost &amp; Scope Estimator</text>
          <text x="136" y="354" fill="#94a3b8" font-size="22">12-Minute Multi-Era Family Video Memoir · 6 Chapters · 24 Scenes · 4K Master + 60s Trailer</text>

          ${[
            { y: 404, label: '30-Min AR-Optimized Multi-Scene Script + Gemini Cast Voices', cost: '$4.80 (480 cr)' },
            { y: 508, label: 'Multi-Age Reference Likeness + 48 Scene Keyframes', cost: '$5.40 (540 cr)' },
            { y: 612, label: 'Pre-Vis Animatic Gate + Cinema Video Generation + 4K Upscale', cost: '$24.00 (2,400 cr)' },
            { y: 716, label: 'Estimated Producer Active Collaboration &amp; Polish (~75 Min)', cost: '~$62.00 labor eq.' },
          ]
            .map(
              (m) => `
            <rect x="136" y="${m.y}" width="1144" height="86" rx="16" fill="#091326" stroke="#334155" stroke-width="2"/>
            <text x="172" y="${m.y + 52}" fill="#e2e8f0" font-size="22" font-weight="600">${m.label}</text>
            <text x="1244" y="${m.y + 52}" fill="#38bdf8" font-size="23" font-weight="800" text-anchor="end">${m.cost}</text>
          `
            )
            .join('')}

          <rect x="136" y="844" width="1144" height="176" rx="22" fill="#052e2b" fill-opacity="0.55" stroke="#10b981" stroke-width="2"/>
          <text x="176" y="908" fill="#a7f3d0" font-size="23" font-weight="700">Total SceneFlow Compute Credits: $34.20 (3,420 cr)</text>
          <text x="176" y="964" fill="#ffffff" font-size="32" font-weight="900">Projected Net Profit on $649 Package: +$530.10 (82% Net Margin)</text>

          <!-- Right Panel: Packaged Deliverables & Stripe / Whop Checkout Sender -->
          <rect x="1364" y="162" width="1108" height="1202" rx="24" fill="#0f172a" stroke="#f59e0b" stroke-width="3"/>
          <text x="1412" y="226" fill="#fbbf24" font-size="20" font-weight="800" letter-spacing="1.5">PACKAGED DELIVERABLES &amp; PAYMENT LINK</text>
          <text x="1412" y="280" fill="#ffffff" font-size="34" font-weight="800">Send Production Checkout in 1 Click</text>

          ${[
            '☑ Pre-Vis Animatic Approval Gate (before heavy video rendering)',
            '☑ Continuity Library Client Upload Link (Cast, Locations &amp; Props)',
            '☑ 6 Chapter Previews + 12-Minute 4K Archival Master Film',
            '☑ 60-Second Vertical &amp; Landscape Family Reunion Trailer',
          ]
            .map(
              (d, idx) => `
            <rect x="1412" y="${330 + idx * 96}" width="1012" height="78" rx="16" fill="#091326" stroke="#334155" stroke-width="2"/>
            <text x="1448" y="${378 + idx * 96}" fill="#f8fafc" font-size="22" font-weight="600">${d}</text>
          `
            )
            .join('')}

          <rect x="1412" y="750" width="1012" height="250" rx="22" fill="#1c1917" stroke="#f59e0b" stroke-width="2"/>
          <text x="1456" y="814" fill="#cbd5e1" font-size="24">Heirloom Memoir Package Price:</text>
          <text x="2380" y="814" fill="#ffffff" font-size="28" font-weight="800" text-anchor="end">$649.00</text>
          <text x="1456" y="868" fill="#34d399" font-size="24">Less Paid Storyboard Blueprint Pass Credit:</text>
          <text x="2380" y="868" fill="#34d399" font-size="28" font-weight="800" text-anchor="end">− $29.00</text>
          <line x1="1456" y1="898" x2="2380" y2="898" stroke="#44403c" stroke-width="2"/>
          <text x="1456" y="958" fill="#fbbf24" font-size="32" font-weight="900">Net Production Balance Due:</text>
          <text x="2380" y="958" fill="#fbbf24" font-size="42" font-weight="900" text-anchor="end">$620.00</text>

          <rect x="1412" y="1056" width="1012" height="108" rx="24" fill="url(#amberGrad)"/>
          <text x="1918" y="1122" fill="#0f172a" font-size="30" font-weight="900" text-anchor="middle">Send Stripe / Whop Checkout Link ($620) →</text>
          <text x="1918" y="1220" fill="#fde68a" font-size="20" font-weight="600" text-anchor="middle">Auto-launches 30-Min Optimized Script + Continuity Upload Link upon payment</text>
        `,
      }),
    },
    {
      slug: '06-script-continuity',
      svg: browserFrame({
        stepPill: 'STAGE 06 · PRODUCTION',
        title: '30-Min AR-Optimized Script + Shared Continuity Library Portal',
        domain: 'portal.harborlightfilms.com/continuity/elena-80th-memoir',
        rightBadge: 'Script Ready in 30m · Likeness Locked',
        bodySvg: `
          <!-- Left Half: Automated 30-Min AR-Optimized Multi-Scene Script -->
          <rect x="88" y="162" width="1120" height="1202" rx="24" fill="url(#cardDark)" stroke="#38bdf8" stroke-width="3"/>
          <text x="136" y="222" fill="#38bdf8" font-size="20" font-weight="800" letter-spacing="1.5">SHARED PRODUCTION · STEP 1 (GENERATED IN 28 MIN)</text>
          <text x="136" y="274" fill="#ffffff" font-size="34" font-weight="800">AR-Optimized Script &amp; Dialogue</text>

          <rect x="136" y="314" width="1024" height="84" rx="16" fill="#052e2b" stroke="#10b981" stroke-width="2"/>
          <text x="172" y="366" fill="#6ee7b7" font-size="23" font-weight="800">✓ Script Audience Resonance: 96 / 100 · 24 Scenes · 12:00 Runtime</text>

          <rect x="136" y="430" width="1024" height="740" rx="20" fill="#060c18" stroke="#1e293b" stroke-width="2"/>
          <text x="176" y="490" fill="#fbbf24" font-size="21" font-weight="800">SCENE 09 — INT. SAN DIEGO CEDAR BOATSHOP — MORNING (1972)</text>
          <text x="176" y="544" fill="#cbd5e1" font-size="22">Golden coastal mist filters through tall timber doors. MATEO (AGE 28)</text>
          <text x="176" y="582" fill="#cbd5e1" font-size="22">draws a hand plane along a fragrant hull plank beside the open</text>
          <text x="176" y="620" fill="#cbd5e1" font-size="22">SCORCHED CEDAR COMPASS BOX.</text>

          <text x="420" y="694" fill="#38bdf8" font-size="22" font-weight="800">SOFIA (V.O. · WARM NARRATION)</text>
          <text x="240" y="740" fill="#ffffff" font-size="23">“Every boat my grandfather built carried the grain of Oaxaca</text>
          <text x="240" y="780" fill="#ffffff" font-size="23">and that brass compass from fifty-eight...”</text>

          <text x="176" y="868" fill="#fbbf24" font-size="21" font-weight="800">SCENE 22 — EXT. SAN DIEGO HARBOR DECK — SUNSET (2026)</text>
          <text x="176" y="922" fill="#cbd5e1" font-size="22">String lanterns glow above harbor water. MATEO (AGE 80) opens the</text>
          <text x="176" y="960" fill="#cbd5e1" font-size="22">compass lid and places it into grandson LEO’s hands.</text>
          <rect x="176" y="1028" width="944" height="96" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2"/>
          <text x="648" y="1086" fill="#6ee7b7" font-size="23" font-weight="700" text-anchor="middle">✓ Multi-Age Beat Exclusivity Verified (Zero Duplicate Era Cast)</text>

          <!-- Right Half: Client Continuity Library Upload & Sign-Off -->
          <rect x="1244" y="162" width="1228" height="1202" rx="24" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="1292" y="222" fill="#34d399" font-size="20" font-weight="800" letter-spacing="1.5">SHARED PRODUCTION · STEP 2 (CLIENT CONTINUITY PORTAL)</text>
          <text x="1292" y="274" fill="#ffffff" font-size="34" font-weight="800">Client Uploads &amp; Approves Reference Anchors</text>

          ${[
            { x: 1292, y: 320, img: imgCharOlder, tag: 'CHARACTER ANCHOR', title: 'Mateo Morales (Age 80)', sub: 'Client Photo Uploaded · EXIF Stripped · Approved ✓' },
            { x: 1876, y: 320, img: imgCharYoung, tag: '1972 ERA LIKENESS', title: 'Mateo Morales (Age 28)', sub: '1972 Snapshot + Likeness Lock · Approved ✓' },
            { x: 1292, y: 760, img: imgMemoir2, tag: 'LOCATION ANCHOR', title: '1972 Harbor Boatshop', sub: 'Archival Timber Boatyard · Approved ✓' },
            { x: 1876, y: 760, img: imgPropCompass, tag: 'HERO PROP ANCHOR', title: 'Cedar Compass Box', sub: 'Smartphone Macro Upload · Approved ✓' },
          ]
            .map(
              (c) => `
            <rect x="${c.x}" y="${c.y}" width="556" height="412" rx="20" fill="#091326" stroke="#10b981" stroke-width="2"/>
            <clipPath id="cc-${c.x}-${c.y}"><rect x="${c.x + 18}" y="${c.y + 18}" width="520" height="248" rx="14"/></clipPath>
            <image href="${c.img}" x="${c.x + 18}" y="${c.y + 18}" width="520" height="248" preserveAspectRatio="xMidYMid slice" clip-path="url(#cc-${c.x}-${c.y})"/>
            <text x="${c.x + 28}" y="${c.y + 304}" fill="#34d399" font-size="17" font-weight="800">${c.tag}</text>
            <text x="${c.x + 28}" y="${c.y + 344}" fill="#ffffff" font-size="25" font-weight="800">${c.title}</text>
            <text x="${c.x + 28}" y="${c.y + 382}" fill="#a7f3d0" font-size="18" font-weight="600">${c.sub}</text>
          `
            )
            .join('')}

          <rect x="1292" y="1210" width="1140" height="104" rx="22" fill="url(#emeraldGrad)"/>
          <text x="1862" y="1274" fill="#022c22" font-size="29" font-weight="900" text-anchor="middle">✓ Continuity Library Signed Off by Elena Morales</text>
        `,
      }),
    },
    {
      slug: '07-screening-room',
      svg: browserFrame({
        stepPill: 'STAGE 07 · SCREENING',
        title: 'White-Label Screening Room — Staged Deliverable Review & Approval',
        domain: 'portal.harborlightfilms.com/screening-room/elena-80th',
        rightBadge: 'Pre-Vis Gate Protects Video Credits',
        bodySvg: `
          <!-- Packaged Deliverable Stage Pills -->
          ${[
            { x: 88, w: 384, label: '✓ 1. Pre-Vis Animatic', state: 'done' },
            { x: 488, w: 340, label: '✓ 2. Key Clips', state: 'done' },
            { x: 844, w: 340, label: '✓ 3. Scenes', state: 'done' },
            { x: 1200, w: 360, label: '✓ 4. Chapters', state: 'done' },
            { x: 1576, w: 436, label: '● 5. 12-Min 4K Master', state: 'active' },
            { x: 2028, w: 444, label: '● 6. 60s Social Trailer', state: 'active' },
          ]
            .map(
              (p) => `
            <rect x="${p.x}" y="156" width="${p.w}" height="68" rx="18" fill="${p.state === 'active' ? '#10b981' : '#0f172a'}" fill-opacity="${p.state === 'active' ? '0.24' : '0.9'}" stroke="${p.state === 'active' ? '#34d399' : '#334155'}" stroke-width="2"/>
            <text x="${p.x + p.w / 2}" y="199" fill="${p.state === 'active' ? '#ffffff' : '#6ee7b7'}" font-size="21" font-weight="800" text-anchor="middle">${p.label}</text>
          `
            )
            .join('')}

          <!-- Left Cinema Player -->
          <rect x="88" y="252" width="1540" height="1112" rx="26" fill="#050914" stroke="#1e293b" stroke-width="3"/>
          <clipPath id="sr-vid"><rect x="112" y="276" width="1492" height="840" rx="20"/></clipPath>
          <image href="${imgMemoir2}" x="112" y="276" width="1492" height="840" preserveAspectRatio="xMidYMid slice" clip-path="url(#sr-vid)"/>

          <rect x="148" y="312" width="420" height="52" rx="14" fill="#020617" fill-opacity="0.8" stroke="#10b981" stroke-width="2"/>
          <text x="358" y="346" fill="#ecfdf5" font-size="20" font-weight="800" text-anchor="middle">4K UHD PREVIEW · 04:18 / 12:00</text>

          <!-- Scrubber Timeline with Pin -->
          <rect x="140" y="1164" width="1436" height="16" rx="8" fill="#1e293b"/>
          <rect x="140" y="1164" width="540" height="16" rx="8" fill="url(#emeraldGrad)"/>
          <circle cx="680" cy="1172" r="16" fill="#fbbf24" stroke="#ffffff" stroke-width="3"/>
          <text x="140" y="1236" fill="#ffffff" font-size="27" font-weight="800">Chapter 3: 1972 Harborlight Joinery · Frame-Accurate Review</text>
          <text x="140" y="1282" fill="#94a3b8" font-size="21">Packaged deliverables customized per client tier · Watermarked until final sign-off</text>

          <!-- Right Timecoded Feedback & Bounded Approval Column -->
          <rect x="1664" y="252" width="808" height="1112" rx="26" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="1712" y="316" fill="#34d399" font-size="20" font-weight="800" letter-spacing="1.5">TIMECODED CLIENT REVIEW · ROUND 1 OF 2</text>
          <text x="1712" y="368" fill="#ffffff" font-size="32" font-weight="800">Staged Sign-Off Ledger</text>

          <rect x="1712" y="412" width="712" height="190" rx="20" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="1748" y="460" fill="#fbbf24" font-size="20" font-weight="800">● PIN @ 04:18 · ELENA MORALES</text>
          <text x="1748" y="508" fill="#f8fafc" font-size="22">“Dad’s 1972 smile and the cedar shavings look</text>
          <text x="1748" y="546" fill="#f8fafc" font-size="22">unbelievable! My sister cried watching this.”</text>

          <rect x="1712" y="632" width="712" height="190" rx="20" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="1748" y="680" fill="#38bdf8" font-size="20" font-weight="800">● PIN @ 09:54 · ELENA MORALES</text>
          <text x="1748" y="728" fill="#f8fafc" font-size="22">“Harbor sunset toast and the 60s trailer cut are</text>
          <text x="1748" y="766" fill="#f8fafc" font-size="22">100% ready for Saturday’s dinner!”</text>

          <rect x="1712" y="864" width="712" height="216" rx="20" fill="#052e2b" fill-opacity="0.5" stroke="#10b981" stroke-width="2"/>
          <text x="1748" y="924" fill="#ecfdf5" font-size="24" font-weight="800">Why Pre-Vis Gate Protects Margins:</text>
          <text x="1748" y="972" fill="#a7f3d0" font-size="20">Pacing &amp; voiceover approved on Pre-Vis Animatic</text>
          <text x="1748" y="1012" fill="#a7f3d0" font-size="20">before spending 4K cinema generation credits.</text>

          <rect x="1712" y="1136" width="712" height="108" rx="22" fill="url(#emeraldGrad)"/>
          <text x="2068" y="1202" fill="#022c22" font-size="28" font-weight="900" text-anchor="middle">✓ Approve 4K Master &amp; 60s Trailer</text>
        `,
      }),
    },
    {
      slug: '08-client-signoff-roi',
      svg: browserFrame({
        stepPill: 'STAGE 08 · SIGN-OFF & ROI',
        title: 'Client 4K Delivery Unlocked + Studio Unit Economics Payoff',
        domain: 'sceneflowai.studio/dashboard/roi · Harborlight Video Studio',
        rightBadge: '+$530 Net / Film · 82% Net Margin',
        bodySvg: `
          <!-- Left Card: Client Final Delivery Experience -->
          <rect x="88" y="162" width="1120" height="1202" rx="26" fill="url(#cardDark)" stroke="#10b981" stroke-width="3"/>
          <text x="136" y="224" fill="#34d399" font-size="20" font-weight="800" letter-spacing="1.5">WHAT YOUR CUSTOMER SEES · LUXURY DELIVERY</text>
          <text x="136" y="278" fill="#ffffff" font-size="36" font-weight="900">4K Master &amp; Trailer Unlocked ✓</text>

          <clipPath id="roi-hero"><rect x="136" y="318" width="1024" height="460" rx="20"/></clipPath>
          <image href="${imgMemoir1}" x="136" y="318" width="1024" height="460" preserveAspectRatio="xMidYMid slice" clip-path="url(#roi-hero)"/>

          <rect x="136" y="814" width="1024" height="224" rx="20" fill="#091326" stroke="#334155" stroke-width="2"/>
          <text x="176" y="874" fill="#ffffff" font-size="26" font-weight="800">✓ 12-Minute 4K UHD Archival Master (MP4 + ProRes)</text>
          <text x="176" y="926" fill="#ffffff" font-size="26" font-weight="800">✓ 60-Second Social &amp; Family Share Trailer (16:9 + 9:16)</text>
          <text x="176" y="978" fill="#6ee7b7" font-size="22" font-weight="700">✓ Multi-Language Dub Pack Ready (ES · EN Family Share Link)</text>

          <rect x="136" y="1084" width="1024" height="104" rx="22" fill="url(#emeraldGrad)"/>
          <text x="648" y="1148" fill="#022c22" font-size="30" font-weight="900" text-anchor="middle">✓ Download 4K Master &amp; Share Family Link</text>

          <!-- Right Card: Provider ROI & Monthly Studio Scale -->
          <rect x="1244" y="162" width="1228" height="1202" rx="26" fill="#062822" stroke="#10b981" stroke-width="4"/>
          <text x="1296" y="224" fill="#fbbf24" font-size="20" font-weight="800" letter-spacing="1.5">WHAT YOU EARN · AUTOMATED STUDIO ECONOMICS</text>
          <text x="1296" y="278" fill="#ffffff" font-size="36" font-weight="900">90% Automated · Scale 8–15 Films / Month</text>

          ${[
            { y: 332, label: '1. Self-Funding $29 Blueprint Pass', val: '83% Margin', sub: '~$3.90 max compute · 0 PM min · Zero tire-kickers' },
            { y: 520, label: '2. Full Memoir Order ($649 Package)', val: '+$530 Net', sub: '$34.20 SceneFlow compute · 82% net profit margin' },
            { y: 708, label: '3. Active Producer Time per Film', val: '~75 Min', sub: '3 min quote + guided Pre-Vis &amp; Screening Room sign-off' },
          ]
            .map(
              (card) => `
            <rect x="1296" y="${card.y}" width="1124" height="162" rx="22" fill="#021713" stroke="#10b981" stroke-width="2"/>
            <text x="1336" y="${card.y + 66}" fill="#ffffff" font-size="29" font-weight="800">${card.label}</text>
            <text x="1336" y="${card.y + 116}" fill="#a7f3d0" font-size="22">${card.sub}</text>
            <text x="2376" y="${card.y + 96}" fill="#34d399" font-size="48" font-weight="900" text-anchor="end">${card.val}</text>
          `
            )
            .join('')}

          <rect x="1296" y="914" width="1124" height="390" rx="24" fill="#0f172a" stroke="#fbbf24" stroke-width="3"/>
          <text x="1858" y="986" fill="#fde68a" font-size="24" font-weight="800" text-anchor="middle">SOLO OPERATOR MONTHLY PROFIT RUN-RATE (ACROSS 4 VERTICALS)</text>
          <text x="1858" y="1096" fill="#ffffff" font-size="78" font-weight="900" text-anchor="middle">$4,240 – $7,950 / mo</text>
          <text x="1858" y="1164" fill="#34d399" font-size="26" font-weight="800" text-anchor="middle">8 to 15 Client Films / Month · ~12–18 Active Producer Hours Total</text>
          <text x="1858" y="1226" fill="#94a3b8" font-size="21" text-anchor="middle">Memoirs · Real Estate Tours · Education &amp; Training · Brand Stories</text>
        `,
      }),
    },
  ]

  for (const s of screens) {
    const svgBuf = Buffer.from(s.svg, 'utf8')
    const pngPath = join(OUT_DIR, `${s.slug}.png`)
    const webpPath = join(OUT_DIR, `${s.slug}.webp`)
    await sharp(svgBuf).png({ compressionLevel: 8 }).toFile(pngPath)
    await sharp(svgBuf).webp({ quality: 90 }).toFile(webpPath)
    console.log(`✓ Generated ${s.slug}.png & ${s.slug}.webp (2560x1440)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
