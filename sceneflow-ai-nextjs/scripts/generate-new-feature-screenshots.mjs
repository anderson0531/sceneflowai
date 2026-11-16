#!/usr/bin/env node
/**
 * Generates crisp 2560x1440 (16:9 QHD) SceneFlow Studio dark-mode UI screenshots
 * for the 5 newly shipped Studio capabilities in `public/landing/key-features/screenshots/`:
 *   1. client-intake-portal.webp        (icon: clientIntake)
 *   2. blueprint-share-estimator.webp   (icon: blueprintShare)
 *   3. character-selfie-studio.webp     (icon: selfieStudio)
 *   4. producer-whitelabel-launchpad.webp (icon: producerLaunchpad)
 *   5. streams-inventory-explorer.webp  (icon: streamsInventory)
 */

import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'landing', 'key-features', 'screenshots')
const SANDBOX_DIR = join(ROOT, 'public', 'images', 'sandbox', 'glass-ledger')

const W = 2560
const H = 1440

function esc(str) {
  return String(str)
    .replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, '&amp;')
}

function loadDataUri(relPath, mime = 'image/jpeg') {
  const buf = readFileSync(join(SANDBOX_DIR, relPath))
  return `data:${mime};base64,${buf.toString('base64')}`
}

const IMG_ELARA = loadDataUri('char-elara.jpg')
const IMG_MARCUS = loadDataUri('char-marcus.jpg')
const IMG_ARIS = loadDataUri('char-aris.jpg')
const IMG_VAULT = loadDataUri('loc-archive-vault.jpg')
const IMG_TWOSHOT = loadDataUri('s1-b2-twoshot-table.jpg')
const IMG_DECK = loadDataUri('s2-b2-deck-twoshot.jpg')

function shellWindow({ title, urlPill, badgeText, badgeColor = '#10b981', bodySvg }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="55%" stop-color="#0b1224"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accentCyan" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="accentViolet" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- Main Studio Window Frame -->
  <rect x="56" y="44" width="2448" height="1352" rx="28" fill="#090f1f" stroke="#1e293b" stroke-width="3"/>

  <!-- Top Chrome Bar -->
  <rect x="56" y="44" width="2448" height="84" rx="28" fill="#0f172a"/>
  <rect x="56" y="96" width="2448" height="32" fill="#0f172a"/>
  <line x1="56" y1="128" x2="2504" y2="128" stroke="#1e293b" stroke-width="2"/>

  <circle cx="106" cy="86" r="10" fill="#f43f5e" opacity="0.85"/>
  <circle cx="138" cy="86" r="10" fill="#f59e0b" opacity="0.85"/>
  <circle cx="170" cy="86" r="10" fill="#10b981" opacity="0.85"/>

  <text x="212" y="94" fill="#f8fafc" font-size="23" font-weight="700">${title}</text>

  <rect x="960" y="62" width="1040" height="48" rx="14" fill="#020617" stroke="#334155" stroke-width="2"/>
  <text x="1480" y="93" fill="#38bdf8" font-size="19" font-weight="600" text-anchor="middle">${urlPill}</text>

  <rect x="2040" y="62" width="424" height="48" rx="24" fill="${badgeColor}" fill-opacity="0.16" stroke="${badgeColor}" stroke-width="2"/>
  <text x="2252" y="93" fill="#ecfdf5" font-size="19" font-weight="700" text-anchor="middle">${badgeText}</text>

  ${bodySvg}
</svg>`
}

function buildClientIntakeSvg() {
  return shellWindow({
    title: 'Harbor Legacy Films · Client Story Intake',
    urlPill: 'sceneflowai.studio/intake/harbor-memoir-7f9a · Zero Login',
    badgeText: '7 Languages · Consent Verified',
    badgeColor: '#10b981',
    bodySvg: `
      <!-- Left Column: White-Label Header + Language Pills + Consent + Vision Upload -->
      <rect x="96" y="164" width="1060" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>

      <text x="136" y="220" fill="#38bdf8" font-size="19" font-weight="700" letter-spacing="1.5">WHITE-LABEL CLIENT PORTAL · STEP 1 OF 3</text>
      <text x="136" y="268" fill="#ffffff" font-size="36" font-weight="800">Tell Us Your Family Story</text>
      <text x="136" y="308" fill="#94a3b8" font-size="22">Speak naturally or type in your preferred language — no account required.</text>

      <!-- 7-Language Selector Row -->
      ${['EN · English', 'ES · Español', 'PT · Português', 'HI · हिन्दी', 'ZH · 中文', 'AR · العربية', 'TH · ไทย']
        .map((lbl, idx) => {
          const x = 136 + idx * 138
          const active = idx === 0
          return `
            <rect x="${x}" y="336" width="128" height="44" rx="12" fill="${active ? '#06b6d4' : '#1e293b'}" fill-opacity="${active ? '0.24' : '0.85'}" stroke="${active ? '#22d3ee' : '#334155'}" stroke-width="2"/>
            <text x="${x + 64}" y="365" fill="${active ? '#ecfeff' : '#cbd5e1'}" font-size="17" font-weight="700" text-anchor="middle">${lbl}</text>
          `
        })
        .join('')}

      <!-- Clickwrap Media, Likeness & Voice Consent Card -->
      <rect x="136" y="408" width="980" height="168" rx="18" fill="#052e2b" fill-opacity="0.55" stroke="#10b981" stroke-width="2"/>
      <circle cx="180" cy="456" r="18" fill="#10b981"/>
      <text x="180" y="463" fill="#022c22" font-size="22" font-weight="900" text-anchor="middle">✓</text>
      <text x="216" y="463" fill="#ecfdf5" font-size="25" font-weight="700">Media, Multi-Age Likeness &amp; Voice Consent Signed</text>
      <text x="216" y="502" fill="#a7f3d0" font-size="20">EXIF GPS stripped automatically on upload · Never used to train shared AI models</text>
      <text x="216" y="540" fill="#6ee7b7" font-size="18" font-weight="600">Signed by Claire Vance · Timestamped Ledger #CL-2026-8841 · Cap: 2,500 cr</text>

      <!-- Vision-Driven Photo Interview Uploads -->
      <text x="136" y="626" fill="#e2e8f0" font-size="24" font-weight="700">Vision-Driven Photo Interview (AI Inspects Photos &amp; Asks Follow-Ups)</text>

      <clipPath id="p1"><rect x="136" y="652" width="306" height="210" rx="16"/></clipPath>
      <image href="${IMG_ELARA}" x="136" y="652" width="306" height="210" preserveAspectRatio="xMidYMid slice" clip-path="url(#p1)"/>
      <rect x="136" y="652" width="306" height="210" rx="16" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
      <rect x="148" y="814" width="282" height="36" rx="8" fill="#020617" fill-opacity="0.82"/>
      <text x="289" y="838" fill="#e0f2fe" font-size="17" font-weight="600" text-anchor="middle">1974 Coastline Portrait · EXIF Clean</text>

      <clipPath id="p2"><rect x="472" y="652" width="306" height="210" rx="16"/></clipPath>
      <image href="${IMG_MARCUS}" x="472" y="652" width="306" height="210" preserveAspectRatio="xMidYMid slice" clip-path="url(#p2)"/>
      <rect x="472" y="652" width="306" height="210" rx="16" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
      <rect x="484" y="814" width="282" height="36" rx="8" fill="#020617" fill-opacity="0.82"/>
      <text x="625" y="838" fill="#e0f2fe" font-size="17" font-weight="600" text-anchor="middle">1989 Woodshop Opening · Detected</text>

      <clipPath id="p3"><rect x="808" y="652" width="306" height="210" rx="16"/></clipPath>
      <image href="${IMG_VAULT}" x="808" y="652" width="306" height="210" preserveAspectRatio="xMidYMid slice" clip-path="url(#p3)"/>
      <rect x="808" y="652" width="306" height="210" rx="16" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
      <rect x="820" y="814" width="282" height="36" rx="8" fill="#020617" fill-opacity="0.82"/>
      <text x="961" y="838" fill="#e0f2fe" font-size="17" font-weight="600" text-anchor="middle">Harbor Workshop Set · Indexed</text>

      <!-- Live Voice Dictation Box -->
      <rect x="136" y="896" width="980" height="216" rx="18" fill="#020617" stroke="#06b6d4" stroke-width="2.5"/>
      <circle cx="184" cy="944" r="16" fill="#ef4444"/>
      <text x="216" y="952" fill="#38bdf8" font-size="22" font-weight="700">Voice Dictation Active (01:42) · Live Transcript</text>
      <text x="164" y="1002" fill="#f1f5f9" font-size="22">“In 1974 all Dad and Mom owned was that wood-paneled station wagon along Big Sur.</text>
      <text x="164" y="1038" fill="#f1f5f9" font-size="22">Fifteen years later they unlocked their neighborhood woodshop in the evening rain...”</text>
      <text x="164" y="1084" fill="#64748b" font-size="18">Completeness Gate: 5 / 5 Core Story &amp; Era Anchors Captured</text>

      <rect x="136" y="1144" width="980" height="74" rx="16" fill="url(#accentCyan)"/>
      <text x="626" y="1191" fill="#022c22" font-size="26" font-weight="800" text-anchor="middle">Confirm Clarified Vision &amp; Auto-Generate Blueprint →</text>

      <!-- Right Column: AI Interview Conversation + Emerald Clarified Vision Proposal -->
      <rect x="1192" y="164" width="1272" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1236" y="220" fill="#a78bfa" font-size="19" font-weight="700" letter-spacing="1.5">AI STORY INTERVIEWER &amp; VISION COMPLETENESS GATE</text>
      <text x="1236" y="268" fill="#ffffff" font-size="34" font-weight="800">Interactive Follow-Up &amp; Proposed Film Vision</text>

      <rect x="1236" y="304" width="1184" height="146" rx="18" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <text x="1268" y="346" fill="#38bdf8" font-size="20" font-weight="700">SceneFlow Vision Interviewer</text>
      <text x="1268" y="384" fill="#f8fafc" font-size="21">I see warm 1970s coastal sunlight in Photo 1 and brass workshop pendants in Photo 2.</text>
      <text x="1268" y="418" fill="#cbd5e1" font-size="21">Should we portray Arthur across three distinct ages (26, 41, and 78) for the 50th anniversary?</text>

      <rect x="1340" y="472" width="1080" height="112" rx="18" fill="#172554" stroke="#3b82f6" stroke-width="2"/>
      <text x="1372" y="514" fill="#93c5fd" font-size="19" font-weight="700">Client Response (Voice Dictated)</text>
      <text x="1372" y="552" fill="#eff6ff" font-size="21">“Yes! Keep Mom’s yellow floral sundress in 1974 and gather all three generations at the end.”</text>

      <!-- Emerald Clarified Vision Proposal Card -->
      <rect x="1236" y="614" width="1184" height="702" rx="22" fill="#064e3b" fill-opacity="0.32" stroke="#10b981" stroke-width="3"/>
      <rect x="1272" y="646" width="330" height="42" rx="21" fill="#10b981" fill-opacity="0.22" stroke="#34d399" stroke-width="1.5"/>
      <text x="1437" y="674" fill="#a7f3d0" font-size="18" font-weight="700" text-anchor="middle">✓ CLARIFIED VISION READY</text>
      <text x="2384" y="674" fill="#6ee7b7" font-size="19" font-weight="600" text-anchor="end">Vision Pass 1 of 3 · 96% Completeness</text>

      <text x="1272" y="734" fill="#ffffff" font-size="32" font-weight="800">“The Coastline We Built” — 50th Anniversary Heirloom Film</text>
      <text x="1272" y="778" fill="#d1fae5" font-size="21">Format: 16:9 Cinema + 9:16 Keepsake · Anamorphic Kodak Portra Era Realism · 12 Scenes</text>

      ${[
        ['Act I · 1974 Big Sur Youth', 'Arthur (Age 26) & Eleanor (Age 24, yellow floral sundress) beside the 1974 station wagon.'],
        ['Act II · 1989 Rainy Night Woodshop', 'Arthur (Age 41) flips on warm amber workshop pendants as business resilience blooms.'],
        ['Act III · Present-Day Family Premiere', 'Arthur (Age 78), Eleanor (Age 76), daughter Claire & grandchildren celebrate 50 years.'],
      ]
        .map(
          ([h, d], i) => `
        <rect x="1272" y="${814 + i * 124}" width="1112" height="106" rx="14" fill="#020617" fill-opacity="0.72" stroke="#10b981" stroke-opacity="0.45" stroke-width="1.5"/>
        <text x="1302" y="${856 + i * 124}" fill="#34d399" font-size="22" font-weight="700">${h}</text>
        <text x="1302" y="${894 + i * 124}" fill="#e2e8f0" font-size="20">${d}</text>
      `
        )
        .join('')}

      <text x="1272" y="1226" fill="#a7f3d0" font-size="20" font-weight="700">Auto-Extracted Cast &amp; Era Locks: Arthur (26 · 41 · 78) · Eleanor (24 · 39 · 76) · Claire (44) · 3 Sets</text>
      <text x="1272" y="1272" fill="#6ee7b7" font-size="19">Client approval triggers instant Blueprint + Continuity Vault scaffolding in Producer Workspace.</text>
    `,
  })
}

function buildBlueprintShareEstimatorSvg() {
  return shellWindow({
    title: 'Blueprint Share Link & Margin Estimator',
    urlPill: 'sceneflowai.studio/blueprint/share/coastline-92b · Round 1 of 2',
    badgeText: 'AR Score 94 / 100 · 79% Net Margin',
    badgeColor: '#6366f1',
    bodySvg: `
      <!-- Left: Illustrated Beat Storyboards & Client Sign-Off -->
      <rect x="96" y="164" width="1440" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="218" fill="#a78bfa" font-size="19" font-weight="700" letter-spacing="1.5">SHARED CLIENT BLUEPRINT · ILLUSTRATED STORYBOARD BEATS</text>
      <text x="136" y="266" fill="#ffffff" font-size="34" font-weight="800">Visual Beat-by-Beat Approval Before Video Spend</text>

      <rect x="1156" y="196" width="340" height="52" rx="14" fill="#1e1b4b" stroke="#818cf8" stroke-width="2"/>
      <text x="1326" y="229" fill="#e0e7ff" font-size="20" font-weight="700" text-anchor="middle">▶ Listen to Narrated Treatment</text>

      ${[
        {
          beat: 'BEAT 01 · COLD OPEN',
          title: 'Craftsman Living Room Shoebox',
          desc: 'Arthur 78 & Eleanor 76 open the faded 1974 Big Sur photo album in warm afternoon shafts.',
          img: IMG_TWOSHOT,
          status: 'Approved by Client ✓',
        },
        {
          beat: 'BEAT 02 · FLASHBACK 1974',
          title: 'Pacific Cliffside Station Wagon',
          desc: 'De-aged Arthur 26 & Eleanor 24 laugh above golden-hour surf; zero crew travel.',
          img: IMG_DECK,
          status: 'Approved by Client ✓',
        },
        {
          beat: 'BEAT 03 · 1989 MILESTONE',
          title: 'Grand Opening in Evening Rain',
          desc: 'Amber woodshop pendants ignite across wet sidewalk; client requested warmer cello swell.',
          img: IMG_VAULT,
          status: '1 Client Note Resolved ✓',
        },
      ]
        .map(
          (b, idx) => `
        <rect x="136" y="${304 + idx * 308}" width="1360" height="282" rx="18" fill="#020617" stroke="#334155" stroke-width="2"/>
        <clipPath id="bp${idx}"><rect x="158" y="${326 + idx * 308}" width="400" height="238" rx="14"/></clipPath>
        <image href="${b.img}" x="158" y="${326 + idx * 308}" width="400" height="238" preserveAspectRatio="xMidYMid slice" clip-path="url(#bp${idx})"/>
        <text x="592" y="${368 + idx * 308}" fill="#38bdf8" font-size="19" font-weight="700">${b.beat}</text>
        <text x="592" y="${412 + idx * 308}" fill="#ffffff" font-size="28" font-weight="800">${b.title}</text>
        <text x="592" y="${458 + idx * 308}" fill="#cbd5e1" font-size="21">${b.desc}</text>
        <rect x="592" y="${498 + idx * 308}" width="290" height="44" rx="22" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-width="1.5"/>
        <text x="737" y="${527 + idx * 308}" fill="#a7f3d0" font-size="18" font-weight="700" text-anchor="middle">${b.status}</text>
      `
        )
        .join('')}

      <rect x="136" y="1240" width="1360" height="80" rx="16" fill="url(#accentCyan)"/>
      <text x="816" y="1290" fill="#022c22" font-size="26" font-weight="800" text-anchor="middle">✓ Client Sign-Off Complete (Round 1 / 2) — Greenlight to Production Stage</text>

      <!-- Right: Live Blueprint Cost, Compute & Service Margin Estimator -->
      <rect x="1572" y="164" width="892" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1612" y="218" fill="#34d399" font-size="19" font-weight="700" letter-spacing="1.5">PRODUCER SCOPE &amp; MARGIN FIREWALL</text>
      <text x="1612" y="266" fill="#ffffff" font-size="32" font-weight="800">Blueprint Cost &amp; Profit Estimator</text>

      <rect x="1612" y="302" width="812" height="196" rx="18" fill="#052e2b" fill-opacity="0.55" stroke="#10b981" stroke-width="2.5"/>
      <text x="1644" y="350" fill="#a7f3d0" font-size="20" font-weight="600">Projected Net Service Margin (After Compute + PM Time)</text>
      <text x="1644" y="424" fill="#ffffff" font-size="60" font-weight="900">$638 Profit</text>
      <text x="2048" y="424" fill="#34d399" font-size="34" font-weight="800">79.8% Margin</text>
      <text x="1644" y="472" fill="#6ee7b7" font-size="18">Package: $799 Heirloom Tier · Est. Compute: $24 (2,400 cr incl. 20% buffer)</text>

      ${[
        ['Blueprint, Beat Illustrations & AR', '140 cr ($1.40)', 'Locked ✓'],
        ['Continuity Vault (8 Portraits + 3 Sets)', '220 cr ($2.20)', 'Forecast'],
        ['Dialogue, Narration, SFX & Lyria Score', '190 cr ($1.90)', 'Forecast'],
        ['Hybrid Stills + 12 Omni 1.2 10s Clips', '1,450 cr ($14.50)', 'Forecast'],
        ['20% Smart Retake & Revision Reserve', '400 cr ($4.00)', 'Firewall Cap'],
      ]
        .map(
          ([k, v, tag], i) => `
        <rect x="1612" y="${528 + i * 104}" width="812" height="88" rx="14" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="1638" y="${580 + i * 104}" fill="#e2e8f0" font-size="19" font-weight="600">${k}</text>
        <text x="2248" y="${580 + i * 104}" fill="#38bdf8" font-size="19" font-weight="700" text-anchor="end">${v}</text>
        <text x="2398" y="${580 + i * 104}" fill="#94a3b8" font-size="17" font-weight="600" text-anchor="end">${tag}</text>
      `
        )
        .join('')}

      <!-- Live Client Chat Thread -->
      <rect x="1612" y="1068" width="812" height="252" rx="18" fill="#020617" stroke="#6366f1" stroke-width="2"/>
      <text x="1640" y="1114" fill="#a5b4fc" font-size="19" font-weight="700">Client &amp; PM Thread · Revision Cap Enforced (Max 2 Rounds)</text>
      <text x="1640" y="1162" fill="#f8fafc" font-size="18.5">Claire V.: “Seeing the illustrated 1974 cliffside beat made us tear up!”</text>
      <text x="1640" y="1208" fill="#6ee7b7" font-size="18.5">Producer PM: “Wonderful! Approving locks scope for Continuity portraits.”</text>
      <text x="1640" y="1268" fill="#94a3b8" font-size="17.5">Hard Credit Cap: 2,500 cr · Zero unexpected render overages</text>
    `,
  })
}

function buildSelfieStudioSvg() {
  return shellWindow({
    title: 'Character Selfie Studio & Reference Likeness',
    urlPill: 'AI Face Framing · Zero-Prep Grooming · 1:1 Identity Lock · Portrait-to-Voice',
    badgeText: '1:1 Identity Lock Verified',
    badgeColor: '#06b6d4',
    bodySvg: `
      <!-- Left: Selfie Capture & Split Before/After Studio Polish -->
      <rect x="96" y="164" width="1180" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="218" fill="#38bdf8" font-size="19" font-weight="700" letter-spacing="1.5">CHARACTER SELFIE STUDIO · ZERO-PREP HEADSHOT ENHANCEMENT</text>
      <text x="136" y="266" fill="#ffffff" font-size="33" font-weight="800">Auto-Frame, Polish &amp; Lock Exact Facial Identity</text>

      <!-- Preset Pills -->
      ${['Studio Headshot', 'Groom & Polish', 'Natural Portrait', 'Casting Neutral']
        .map(
          (p, i) => `
        <rect x="${136 + i * 272}" y="296" width="256" height="46" rx="23" fill="${i === 1 ? '#06b6d4' : '#1e293b'}" fill-opacity="${i === 1 ? '0.25' : '0.9'}" stroke="${i === 1 ? '#22d3ee' : '#334155'}" stroke-width="2"/>
        <text x="${264 + i * 272}" y="326" fill="#f8fafc" font-size="19" font-weight="700" text-anchor="middle">${p}</text>
      `
        )
        .join('')}

      <!-- Split Before/After Portrait Stage -->
      <clipPath id="selfieMain"><rect x="136" y="368" width="1100" height="600" rx="20"/></clipPath>
      <image href="${IMG_ELARA}" x="136" y="368" width="1100" height="600" preserveAspectRatio="xMidYMid slice" clip-path="url(#selfieMain)"/>
      <rect x="136" y="368" width="1100" height="600" rx="20" fill="none" stroke="#22d3ee" stroke-width="3"/>
      <line x1="686" y1="368" x2="686" y2="968" stroke="#38bdf8" stroke-width="4"/>
      <circle cx="686" cy="668" r="26" fill="#020617" stroke="#38bdf8" stroke-width="3"/>
      <text x="686" y="676" fill="#38bdf8" font-size="22" font-weight="900" text-anchor="middle">↔</text>

      <!-- Face Detection Guide Box -->
      <rect x="490" y="420" width="390" height="430" rx="24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="12 8"/>
      <rect x="164" y="394" width="250" height="42" rx="10" fill="#020617" fill-opacity="0.82"/>
      <text x="289" y="422" fill="#cbd5e1" font-size="18" font-weight="700" text-anchor="middle">Raw Phone Selfie</text>
      <rect x="896" y="394" width="314" height="42" rx="10" fill="#052e2b" fill-opacity="0.9" stroke="#10b981" stroke-width="1.5"/>
      <text x="1053" y="422" fill="#a7f3d0" font-size="18" font-weight="700" text-anchor="middle">AI Studio Headshot · 1:1 Lock</text>

      <!-- Grooming & Optics Checks -->
      ${[
        ['✓ Hair & Grooming Tidy', 'Stray flyaways smoothed without altering hairline'],
        ['✓ Complexion & Red-Eye Fix', 'Balanced 5200K key light, lens distortion & symmetry corrected'],
        ['✓ Strict 1:1 Bone & Eye Lock', 'Zero beautification drift — exact eyes, nose & jawline preserved'],
      ]
        .map(
          ([t, s], i) => `
        <rect x="136" y="${996 + i * 108}" width="1100" height="92" rx="14" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="168" y="${1036 + i * 108}" fill="#34d399" font-size="21" font-weight="700">${t}</text>
        <text x="168" y="${1070 + i * 108}" fill="#94a3b8" font-size="19">${s}</text>
      `
        )
        .join('')}

      <!-- Right: Multi-Age Reference Likeness + Family Inheritance + Portrait-to-Voice Match -->
      <rect x="1312" y="164" width="1152" height="1192" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1352" y="218" fill="#a78bfa" font-size="19" font-weight="700" letter-spacing="1.5">MULTI-ERA REFERENCE LIKENESS &amp; FAMILY INHERITANCE</text>
      <text x="1352" y="266" fill="#ffffff" font-size="33" font-weight="800">De-Age Across Decades &amp; Match Voice to Portrait</text>

      <!-- 3 Era / Family Cards -->
      ${[
        { img: IMG_ELARA, tag: 'ANCHOR · AGE 26 (1974)', name: 'Elara Vance · Youth', sub: 'Derived via Reference Likeness' },
        { img: IMG_MARCUS, tag: 'ERA LOCK · AGE 41 (1989)', name: 'Marcus Thorne · Prime', sub: 'Beard & hazel-eye trait lock' },
        { img: IMG_ARIS, tag: 'BLENDED LINEAGE · AGE 68', name: 'Dr. Aris · Elder Era', sub: 'Multi-parent trait inheritance' },
      ]
        .map(
          (c, i) => `
        <rect x="${1352 + i * 364}" y="304" width="344" height="456" rx="18" fill="#020617" stroke="#334155" stroke-width="2"/>
        <clipPath id="era${i}"><rect x="${1368 + i * 364}" y="320" width="312" height="292" rx="12"/></clipPath>
        <image href="${c.img}" x="${1368 + i * 364}" y="320" width="312" height="292" preserveAspectRatio="xMidYMid slice" clip-path="url(#era${i})"/>
        <text x="${1368 + i * 364}" y="648" fill="#38bdf8" font-size="16" font-weight="700">${c.tag}</text>
        <text x="${1368 + i * 364}" y="684" fill="#ffffff" font-size="23" font-weight="800">${c.name}</text>
        <text x="${1368 + i * 364}" y="718" fill="#94a3b8" font-size="18">${c.sub}</text>
      `
        )
        .join('')}

      <!-- Multimodal Portrait-to-Voice Match Card -->
      <rect x="1352" y="794" width="1072" height="330" rx="20" fill="#1e1b4b" fill-opacity="0.55" stroke="#818cf8" stroke-width="2.5"/>
      <text x="1392" y="844" fill="#c7d2fe" font-size="20" font-weight="700" letter-spacing="1.2">MULTIMODAL PORTRAIT-TO-VOICE MATCHING</text>
      <text x="1392" y="892" fill="#ffffff" font-size="30" font-weight="800">Auto-Calibrated Vocal Timbre, Age &amp; Cadence</text>
      <text x="1392" y="936" fill="#e0e7ff" font-size="21">Analyzes portrait age, persona &amp; script role to match acoustic register (130 WPM, warm mezzo-alto)</text>
      <rect x="1392" y="968" width="992" height="64" rx="14" fill="#020617" stroke="#4f46e5" stroke-width="2"/>
      <text x="1424" y="1008" fill="#34d399" font-size="21" font-weight="700">▶ Matched Voice: Kore-Studio (98% Acoustic Fit) · Synced Across 70+ Languages</text>
      <text x="1392" y="1084" fill="#a5b4fc" font-size="19">Includes 1-Click “Reset from Script” to re-sync wardrobes, props &amp; cast across episodes.</text>

      <rect x="1352" y="1158" width="1072" height="156" rx="18" fill="#020617" stroke="#10b981" stroke-width="2"/>
      <text x="1392" y="1212" fill="#34d399" font-size="24" font-weight="800">person [1] + PiP Wardrobe Diptych Ready for Omni 1.2 Flash</text>
      <text x="1392" y="1258" fill="#cbd5e1" font-size="20">Discrete facial identity + per-shot wardrobe composite bound automatically to Stills &amp; 10s Clips.</text>
    `,
  })
}

function buildProducerLaunchpadSvg() {
  return shellWindow({
    title: 'White-Label Producer Launchpad & RBAC',
    urlPill: 'sceneflowai.studio/dashboard/settings/producer · Pro+ White-Label Active',
    badgeText: '4-Step Launchpad · 100% White-Label',
    badgeColor: '#10b981',
    bodySvg: `
      <!-- Top 4-Step Wizard Progress Strip -->
      <rect x="96" y="160" width="2368" height="110" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      ${[
        '01 · White-Label Studio Brand & IP Shield',
        '02 · Service-in-a-Box Vertical Rate Cards',
        '03 · Generate Branded /intake & Embed Link',
        '04 · Invite PMs & Enforce Credit Caps',
      ]
        .map(
          (step, idx) => `
        <rect x="${124 + idx * 582}" y="182" width="560" height="66" rx="14" fill="${idx < 3 ? '#052e2b' : '#1e1b4b'}" stroke="${idx < 3 ? '#10b981' : '#818cf8'}" stroke-width="2"/>
        <text x="${404 + idx * 582}" y="223" fill="#f8fafc" font-size="20" font-weight="700" text-anchor="middle">${step}</text>
      `
        )
        .join('')}

      <!-- Left: Brand Identity + Privacy Shield -->
      <rect x="96" y="298" width="1150" height="1058" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="354" fill="#38bdf8" font-size="19" font-weight="700" letter-spacing="1.5">PRO+ WHITE-LABEL PORTAL BRANDING</text>
      <text x="136" y="402" fill="#ffffff" font-size="33" font-weight="800">Clients See Only Your Studio Name, Logo &amp; Domain</text>

      <rect x="136" y="438" width="1070" height="190" rx="18" fill="#020617" stroke="#334155" stroke-width="2"/>
      <circle cx="212" cy="533" r="44" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="3"/>
      <text x="212" y="545" fill="#34d399" font-size="34" font-weight="900" text-anchor="middle">HL</text>
      <text x="284" y="504" fill="#ffffff" font-size="28" font-weight="800">Harbor Legacy &amp; Commercial Studios</text>
      <text x="284" y="544" fill="#94a3b8" font-size="20">Primary Accent: #10B981 · Support: concierge@harborlegacy.studio</text>
      <text x="284" y="584" fill="#34d399" font-size="20" font-weight="700">✓ Hide “Powered by SceneFlow” across Intake, Blueprint, Continuity &amp; Screening</text>

      <text x="136" y="684" fill="#e2e8f0" font-size="25" font-weight="800">Enterprise Client Privacy &amp; Margin Guardrails</text>
      ${[
        ['✓ Automatic EXIF GPS & Metadata Stripping', 'Client family & property photos are sanitized on upload before cloud storage.'],
        ['✓ Zero Shared Model Training + 1-Click Raw Purge', 'Client media never trains external AI models and purges cleanly post-delivery.'],
        ['✓ Daily Public Intake & Revision Round Caps', 'Default 2 client revision rounds · Daily public intake cap: 1,500 cr.'],
      ]
        .map(
          ([h, d], i) => `
        <rect x="136" y="${714 + i * 136}" width="1070" height="116" rx="16" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="168" y="${760 + i * 136}" fill="#34d399" font-size="22" font-weight="700">${h}</text>
        <text x="168" y="${800 + i * 136}" fill="#cbd5e1" font-size="19">${d}</text>
      `
        )
        .join('')}

      <!-- Right: Service-in-a-Box Playbooks + Team RBAC -->
      <rect x="1282" y="298" width="1182" height="1058" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="1322" y="354" fill="#a78bfa" font-size="19" font-weight="700" letter-spacing="1.5">SERVICE-IN-A-BOX RATE CARDS &amp; TEAM RBAC</text>
      <text x="1322" y="402" fill="#ffffff" font-size="33" font-weight="800">Turnkey Vertical Pricing &amp; PM Credit Allowances</text>

      ${[
        ['Video Memoirs & Tributes', '$349 – $950 / film', '~$100 total cost · 80% net margin'],
        ['Real Estate & Villa Tours', '$249 – $550 / listing', '~$60 total cost · 78% net margin'],
        ['Corporate Training & SOPs', '$599 – $1,800 / module', '~$150 total cost · Quarterly retainers'],
        ['Local Brand & 9:16 Ad Packs', '$399 – $1,200 / pack', '~$110 total cost · 20+ SMB accounts'],
      ]
        .map(
          ([v, p, m], i) => `
        <rect x="1322" y="${438 + i * 112}" width="1102" height="94" rx="15" fill="${i === 0 ? '#052e2b' : '#020617'}" fill-opacity="${i === 0 ? '0.6' : '1'}" stroke="${i === 0 ? '#10b981' : '#334155'}" stroke-width="2"/>
        <text x="1354" y="${494 + i * 112}" fill="#ffffff" font-size="22" font-weight="700">${v}</text>
        <text x="1910" y="${494 + i * 112}" fill="#38bdf8" font-size="22" font-weight="800" text-anchor="end">${p}</text>
        <text x="2394" y="${494 + i * 112}" fill="#6ee7b7" font-size="19" font-weight="600" text-anchor="end">${m}</text>
      `
        )
        .join('')}

      <rect x="1322" y="914" width="1102" height="402" rx="18" fill="#020617" stroke="#6366f1" stroke-width="2"/>
      <text x="1356" y="964" fill="#a5b4fc" font-size="22" font-weight="800">Workspace Project Managers (RBAC &amp; Monthly Credit Caps)</text>
      <text x="1356" y="1020" fill="#f8fafc" font-size="21">• maya.pm@harborlegacy.studio — Role: Project Manager · 12 Active Projects · 4,200 / 8,000 cr</text>
      <text x="1356" y="1068" fill="#f8fafc" font-size="21">• lucas.pm@harborlegacy.studio — Role: Project Manager · 9 Active Projects · 3,150 / 8,000 cr</text>
      <rect x="1356" y="1116" width="1034" height="72" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="1384" y="1160" fill="#38bdf8" font-size="19" font-weight="600">&lt;iframe src="https://sceneflowai.studio/embed/intake/harbor-7f9a" /&gt; · 1-Click Copy Embed</text>
      <text x="1356" y="1256" fill="#6ee7b7" font-size="20" font-weight="700">✓ 20% Partner Referral Sheet Ready (Senior Living, Estate Planners, Brokerages &amp; Agencies)</text>
    `,
  })
}

function buildStreamsInventorySvg() {
  return shellWindow({
    title: 'Streams Inventory & 1-Click Publishing',
    urlPill: 'Pre-Vis (Stitched) · Scenes · Chapters · 9:16 Promos · 4K Masters · 70+ Languages',
    badgeText: 'YouTube · TikTok · Facebook Connected',
    badgeColor: '#8b5cf6',
    bodySvg: `
      <!-- Filter & Multi-Dimensional Explorer Bar -->
      <rect x="96" y="160" width="2368" height="96" rx="18" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      ${['All Deliverables (28)', 'Pre-Vis Stitched (7)', 'Scenes & Chapters (12)', '9:16 Promos (4)', '4K Masters (5)']
        .map(
          (f, i) => `
        <rect x="${124 + i * 336}" y="182" width="316" height="52" rx="12" fill="${i === 0 ? '#6366f1' : '#020617'}" fill-opacity="${i === 0 ? '0.28' : '0.9'}" stroke="${i === 0 ? '#818cf8' : '#334155'}" stroke-width="2"/>
        <text x="${282 + i * 336}" y="216" fill="#f8fafc" font-size="19" font-weight="700" text-anchor="middle">${f}</text>
      `
        )
        .join('')}
      <text x="2428" y="216" fill="#34d399" font-size="20" font-weight="700" text-anchor="end">70+ Language Filter: EN · ES · PT · HI · ZH · AR · TH</text>

      <!-- Left: Multi-Stream Inventory Catalog Rows -->
      <rect x="96" y="280" width="1460" height="1076" rx="22" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
      <text x="136" y="334" fill="#38bdf8" font-size="19" font-weight="700" letter-spacing="1.5">STREAM EXPLORER CATALOG · VERSION HISTORY &amp; LOSSLESS FFMPEG STITCH</text>

      ${[
        ['4K Final Master · English (EN)', '16:9 · 4K UHD · -14 LUFS · v3 Active', 'Published · YouTube ✓', '#10b981'],
        ['4K Final Master · Español (ES)', '16:9 · In-Scene Lip-Sync + Stem Mix · v2', 'Ready to Ship', '#06b6d4'],
        ['Pre-Vis Animatic (Stitched All 12 Scenes)', '16:9 · Lossless FFmpeg Audio-Clock Stitch · v1', 'Client Approved ✓', '#10b981'],
        ['Social Promo Cutdown · Português (PT)', '9:16 Vertical · Reels / TikTok / Shorts · v2', 'Published · TikTok ✓', '#a855f7'],
        ['4K Final Master · 中文 / हिन्दी / العربية / ไทย', '4 Localized Workforce Streams · 1080p/4K', '4 / 4 Ready', '#06b6d4'],
        ['Chapter 02 Deliverable · Rainy Woodshop', '16:9 · Incremental Early Client Release · v1', 'Shared in /s/ Link', '#f59e0b'],
      ]
        .map(
          ([title, meta, status, color], i) => `
        <rect x="136" y="${366 + i * 156}" width="1380" height="136" rx="16" fill="#020617" stroke="#1e293b" stroke-width="2"/>
        <text x="172" y="${418 + i * 156}" fill="#ffffff" font-size="24" font-weight="800">${title}</text>
        <text x="172" y="${460 + i * 156}" fill="#94a3b8" font-size="19">${meta}</text>
        <rect x="1156" y="${398 + i * 156}" width="324" height="52" rx="26" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2"/>
        <text x="1318" y="${431 + i * 156}" fill="#f8fafc" font-size="19" font-weight="700" text-anchor="middle">${status}</text>
      `
        )
        .join('')}

      <!-- Right: Package & Ship 1-Click OAuth Modal -->
      <rect x="1592" y="280" width="872" height="1076" rx="22" fill="#0f172a" stroke="#6366f1" stroke-width="2.5"/>
      <text x="1632" y="334" fill="#c4b5fd" font-size="19" font-weight="700" letter-spacing="1.5">PACKAGE &amp; SHIP · 1-CLICK SOCIAL OAUTH</text>
      <text x="1632" y="382" fill="#ffffff" font-size="32" font-weight="800">Publish Globally with Zero GCP Setup</text>

      <clipPath id="thumbShip"><rect x="1632" y="414" width="792" height="340" rx="16"/></clipPath>
      <image href="${IMG_DECK}" x="1632" y="414" width="792" height="340" preserveAspectRatio="xMidYMid slice" clip-path="url(#thumbShip)"/>
      <rect x="1632" y="414" width="792" height="340" rx="16" fill="none" stroke="#818cf8" stroke-width="2.5"/>
      <rect x="1656" y="692" width="410" height="44" rx="10" fill="#020617" fill-opacity="0.86"/>
      <text x="1861" y="721" fill="#e0e7ff" font-size="18" font-weight="700" text-anchor="middle">Auto-Generated High-CTR Thumbnail</text>

      ${[
        ['YouTube Channel Connected', '1-Click OAuth · Localized Titles, Chapters & Captions'],
        ['TikTok Business Connected', '9:16 Vertical Direct Post · Auto-Hook Description'],
        ['Facebook Page Connected', 'Multi-Language Release + Archival Stems ZIP'],
      ]
        .map(
          ([p, d], i) => `
        <rect x="1632" y="${782 + i * 132}" width="792" height="112" rx="14" fill="#020617" stroke="#334155" stroke-width="2"/>
        <text x="1664" y="${828 + i * 132}" fill="#34d399" font-size="22" font-weight="700">✓ ${p}</text>
        <text x="1664" y="${866 + i * 132}" fill="#cbd5e1" font-size="19">${d}</text>
      `
        )
        .join('')}

      <rect x="1632" y="1202" width="792" height="108" rx="18" fill="url(#accentViolet)"/>
      <text x="2028" y="1266" fill="#ffffff" font-size="26" font-weight="800" text-anchor="middle">Publish Selected Streams &amp; Download 4K Bundle →</text>
    `,
  })
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const targets = [
    ['client-intake-portal.webp', buildClientIntakeSvg()],
    ['blueprint-share-estimator.webp', buildBlueprintShareEstimatorSvg()],
    ['character-selfie-studio.webp', buildSelfieStudioSvg()],
    ['producer-whitelabel-launchpad.webp', buildProducerLaunchpadSvg()],
    ['streams-inventory-explorer.webp', buildStreamsInventorySvg()],
  ]

  for (const [filename, rawSvg] of targets) {
    const svg = esc(rawSvg)
    const outPath = join(OUT_DIR, filename)
    await sharp(Buffer.from(svg))
      .webp({ quality: 92, effort: 5 })
      .toFile(outPath)
    console.log(`✓ Wrote ${outPath}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
