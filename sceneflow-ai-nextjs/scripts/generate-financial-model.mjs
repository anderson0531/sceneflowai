#!/usr/bin/env node
/**
 * Deterministic generator for SceneFlow AI's 2027–2029 Financial & Business Model
 * anchored on 500 (FY27 Exit) -> 5,000 (FY28 Exit) -> 50,000 (FY29 Exit) Global
 * White-Label Video Service Businesses (side-hustle & primary-hustle operators
 * aged 18–35 serving massive Baby Boomer Video Memoir, Real Estate, Training &
 * SMB Brand demand) powered by early-revenue marketing reinvestment across
 * English, Spanish, Portuguese, Hindi, Chinese, and Arabic markets (+ Thai/SEA),
 * alongside Self-Serve Creator / Filmmaker / Podcaster SaaS tiers.
 *
 * Outputs:
 *   - docs/sceneflow_financial_model_2027_12month.csv
 *   - docs/sceneflow_financial_model_2027_2029_3year.csv
 *   - docs/SCENEFLOW_FINANCIAL_BUSINESS_MODEL.md
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DOCS_DIR = join(ROOT, 'docs')

const MONTHS_2027 = [
  'Jan 2027',
  'Feb 2027',
  'Mar 2027',
  'Apr 2027',
  'May 2027',
  'Jun 2027',
  'Jul 2027',
  'Aug 2027',
  'Sep 2027',
  'Oct 2027',
  'Nov 2027',
  'Dec 2027',
]

// Pricing constants (matching src/lib/billing/tierCatalog.ts)
const PRICE = {
  explorer: 9,
  hobbyist: 19,
  starter: 49,
  pro: 149,
  studio: 599,
  charter: 299, // 25-seat Founding Operator 90-Day Pro Launchpad
}

// Steady-state monthly unit economics per active Video Service Business (85% Pro / 15% Studio):
// - Pro Operator ($149/mo, 15,000 cr incl., 85% of base — blends 18-35 side-hustlers @ 3-4 films/mo & primary-hustlers @ 8-10 films/mo):
//   Blended 9 $29 Blueprint Passes + 6 commissioned client films/mo (~22,110 cr) -> $85/mo Add-On Packs + $12/mo BYOK fee = $246/mo SceneFlow ARPU ($3,687/mo operator GMV)
// - Studio Agency ($599/mo, 75,000 cr incl., 15% of base — scaled primary hustlers & multi-seat local agencies):
//   Blended 30 $29 Blueprint Passes + 20 commissioned client films/mo (~86,700 cr) -> $240/mo Add-On Packs + $60/mo BYOK fee = $899/mo SceneFlow ARPU ($13,890/mo operator GMV)
const B2B_STEADY = {
  proAddOnMonthly: 85,
  proByokMonthly: 12,
  proFilmsPerMo: 6,
  proBlueprintsPerMo: 9,
  proClientGmvPerMo: 3687, // 6 * $600 avg film (Baby Boomer Video Memoirs, Property & Brand) + 3 non-converting $29 passes
  studioAddOnMonthly: 240,
  studioByokMonthly: 60,
  studioFilmsPerMo: 20,
  studioBlueprintsPerMo: 30,
  studioClientGmvPerMo: 13890, // 20 * $680 avg film + 10 non-converting $29 passes
}

function csvCell(v) {
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsv(rows) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0)
}

function pct(num, den, digits = 1) {
  if (!den) return '0.0%'
  return `${((num / den) * 100).toFixed(digits)}%`
}

function fmtUsd(n) {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

function fmtNum(n) {
  return Math.round(n).toLocaleString('en-US')
}

// ============================================================================
// 1. MONTHLY FY 2027 TRAJECTORY (Exits Dec 2027 at 500 Video Service Businesses)
// ============================================================================
const charterSeatsSold2027 = [12, 8, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 25 Charter seats in Q1
const b2bProSubs2027 = [15, 32, 55, 85, 120, 160, 205, 250, 295, 340, 385, 425] // Dec = 425 (85%)
const b2bStudioSubs2027 = [3, 6, 10, 15, 21, 28, 36, 44, 52, 60, 68, 75] // Dec = 75 (15%)
const b2bTotalSubs2027 = b2bProSubs2027.map((p, i) => p + b2bStudioSubs2027[i]) // [18..500]

// Client volume ramp factor across Q1..Q4 2027 as newly onboarded 18-35 operators ramp monthly memoir/client fulfillment
const b2bRampFactor2027 = [0.68, 0.72, 0.76, 0.82, 0.85, 0.88, 0.92, 0.94, 0.96, 1.0, 1.0, 1.0]

// Self-Serve Creator / Filmmaker / Podcaster & $9 Explorer Funnel (boosted by 18-35 multi-market acquisition)
const explorerBuyers2027 = [600, 900, 1250, 1650, 2100, 2550, 3000, 3450, 3900, 4300, 4600, 4900] // Sum = 33,200
const hobbyistSubs2027 = [140, 250, 380, 520, 670, 825, 980, 1125, 1250, 1360, 1440, 1500] // Dec = 1,500
const starterSubs2027 = [70, 125, 190, 260, 335, 410, 485, 555, 620, 670, 710, 740] // Dec = 740
const creatorProSubs2027 = [24, 42, 65, 90, 118, 145, 172, 198, 220, 238, 250, 260] // Dec = 260
const creatorTotalSubs2027 = hobbyistSubs2027.map(
  (h, i) => h + starterSubs2027[i] + creatorProSubs2027[i]
) // Dec = 2,500

const totalActiveSubs2027 = b2bTotalSubs2027.map((b, i) => b + creatorTotalSubs2027[i]) // Dec = 3,000
const netSubAdds2027 = totalActiveSubs2027.map((tot, i) =>
  i === 0 ? tot : tot - totalActiveSubs2027[i - 1]
)

// 7-Language Market Shares — 97% concentrated across the 6 paid 18-35 marketing markets (EN, ES, HI, ZH, PT, AR) + 3% organic TH/SEA
const MARKET_SHARES = [
  { code: 'en', label: '1. English (`en` - 30.0%)', share: 0.3 },
  { code: 'es', label: '2. Spanish (`es` - 17.0%)', share: 0.17 },
  { code: 'hi', label: '3. Hindi (`hi` - 16.0%)', share: 0.16 },
  { code: 'zh-CN', label: '4. Chinese (`zh-CN` - 14.0%)', share: 0.14 },
  { code: 'pt', label: '5. Portuguese (`pt` - 12.0%)', share: 0.12 },
  { code: 'ar', label: '6. Arabic (`ar` - 8.0%)', share: 0.08 },
  { code: 'th', label: '7. Thai & SEA (`th` - 3.0% Organic)', share: 0.03 },
]

function allocateExactByShare(total, shares) {
  const raw = shares.map((s) => total * s.share)
  const floored = raw.map((x) => Math.floor(x))
  let rem = total - sum(floored)
  const order = raw
    .map((x, idx) => ({ idx, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < rem; k++) {
    floored[order[k].idx]++
  }
  return floored
}

const marketSubs2027ByLang = MARKET_SHARES.map((_, langIdx) =>
  totalActiveSubs2027.map((tot) => allocateExactByShare(tot, MARKET_SHARES)[langIdx])
)

// Monthly Revenue Lines (FY 2027)
// A. Video Service Business (B2B2C) Revenue
const b2bCharterRev2027 = charterSeatsSold2027.map((s) => s * PRICE.charter)
const b2bProMrr2027 = b2bProSubs2027.map((s) => s * PRICE.pro)
const b2bStudioMrr2027 = b2bStudioSubs2027.map((s) => s * PRICE.studio)
const b2bBaseMrr2027 = b2bProMrr2027.map((p, i) => p + b2bStudioMrr2027[i])
const b2bAddOnRev2027 = b2bProSubs2027.map((p, i) =>
  Math.round(
    (p * B2B_STEADY.proAddOnMonthly + b2bStudioSubs2027[i] * B2B_STEADY.studioAddOnMonthly) *
      b2bRampFactor2027[i]
  )
)
const b2bByokRev2027 = b2bProSubs2027.map((p, i) =>
  Math.round(
    (p * B2B_STEADY.proByokMonthly + b2bStudioSubs2027[i] * B2B_STEADY.studioByokMonthly) *
      b2bRampFactor2027[i]
  )
)
const b2bTotalRev2027 = b2bBaseMrr2027.map(
  (mrr, i) => mrr + b2bCharterRev2027[i] + b2bAddOnRev2027[i] + b2bByokRev2027[i]
)
const b2bOperatorGmv2027 = b2bProSubs2027.map((p, i) =>
  Math.round(
    (p * B2B_STEADY.proClientGmvPerMo + b2bStudioSubs2027[i] * B2B_STEADY.studioClientGmvPerMo) *
      b2bRampFactor2027[i]
  )
)

// B. Self-Serve Creator, Filmmaker & Podcaster (B2C) Revenue
const creatorExplorerRev2027 = explorerBuyers2027.map((b) => b * PRICE.explorer)
const creatorHobbyistMrr2027 = hobbyistSubs2027.map((s) => s * PRICE.hobbyist)
const creatorStarterMrr2027 = starterSubs2027.map((s) => s * PRICE.starter)
const creatorProMrr2027 = creatorProSubs2027.map((s) => s * PRICE.pro)
const creatorBaseMrr2027 = creatorHobbyistMrr2027.map(
  (h, i) => h + creatorStarterMrr2027[i] + creatorProMrr2027[i]
)
const creatorAddOnPct2027 = [0.14, 0.14, 0.14, 0.16, 0.16, 0.16, 0.17, 0.17, 0.17, 0.18, 0.18, 0.18]
const creatorAddOnRev2027 = creatorBaseMrr2027.map((mrr, i) =>
  Math.round(mrr * creatorAddOnPct2027[i])
)
const creatorByokRev2027 = creatorProMrr2027.map((mrr) => Math.round(mrr * 0.06))
const creatorTotalRev2027 = creatorBaseMrr2027.map(
  (mrr, i) => mrr + creatorExplorerRev2027[i] + creatorAddOnRev2027[i] + creatorByokRev2027[i]
)

// C. Consolidated Platform Revenue (FY 2027)
const totalBaseMrr2027 = b2bBaseMrr2027.map((b, i) => b + creatorBaseMrr2027[i])
const annualizedArr2027 = totalBaseMrr2027.map((m) => m * 12)
const totalAddOnRev2027 = b2bAddOnRev2027.map((b, i) => b + creatorAddOnRev2027[i])
const totalByokRev2027 = b2bByokRev2027.map((b, i) => b + creatorByokRev2027[i])
const totalGrossRev2027 = b2bTotalRev2027.map((b, i) => b + creatorTotalRev2027[i])
const b2bSharePct2027 = b2bTotalRev2027.map((b, i) => pct(b, totalGrossRev2027[i]))

// Deflation & COGS Rates across 2027
const modelDrop2027 = [
  '0.0%',
  '0.0%',
  '0.0%',
  '-25.0%',
  '-25.0%',
  '-25.0%',
  '-40.0%',
  '-40.0%',
  '-40.0%',
  '-55.0%',
  '-55.0%',
  '-55.0%',
]
const ep10MinCost2027 = [
  '42.00',
  '42.00',
  '42.00',
  '31.50',
  '31.50',
  '31.50',
  '25.20',
  '25.20',
  '25.20',
  '18.90',
  '18.90',
  '18.90',
]
const gcpCogsPct2027 = [0.25, 0.25, 0.25, 0.2, 0.2, 0.2, 0.16, 0.16, 0.16, 0.125, 0.125, 0.125]
const api3pCogsPct2027 = [
  0.09, 0.09, 0.09, 0.075, 0.075, 0.075, 0.062, 0.062, 0.062, 0.05, 0.05, 0.05,
]
const whopFeePct = 0.038

const gcpCogs2027 = totalGrossRev2027.map((r, i) => Math.round(r * gcpCogsPct2027[i]))
const api3pCogs2027 = totalGrossRev2027.map((r, i) => Math.round(r * api3pCogsPct2027[i]))
const whopFees2027 = totalGrossRev2027.map((r) => Math.round(r * whopFeePct))
const totalGaapCogs2027 = gcpCogs2027.map((g, i) => g + api3pCogs2027[i] + whopFees2027[i])
const gaapGrossProfit2027 = totalGrossRev2027.map((r, i) => r - totalGaapCogs2027[i])

// Startup Cloud Credit Offsets
function computeCreditTrack(monthlyGcpCogs, startingPool) {
  let rem = startingPool
  const applied = []
  const balances = []
  for (const c of monthlyGcpCogs) {
    const used = Math.min(rem, c)
    rem -= used
    applied.push(used)
    balances.push(rem)
  }
  return { applied, balances, endingPool: rem }
}

const track2k = computeCreditTrack(gcpCogs2027, 1250) // $750 pre-launch + $1,250 Jan 2027
const track100k = computeCreditTrack(gcpCogs2027, 100000)
const track250k = computeCreditTrack(gcpCogs2027, 250000)

// FY 2027 OpEx — Aggressive, Self-Funded Early-Revenue Reinvestment into 18–35 Marketing across EN/ES/PT/HI/ZH/AR
const rdOpex2027 = [3800, 5200, 7000, 9500, 12500, 15500, 18500, 21500, 24500, 27500, 30500, 33500]
const smCreatorOpex2027 = [
  3000, 4800, 7200, 10000, 13500, 17000, 20500, 24000, 27500, 31000, 34500, 38000,
]
const smB2bOpex2027 = [
  5200, 9500, 15000, 22000, 30000, 39000, 49000, 59000, 69000, 79000, 89000, 99000,
]
const smTotalOpex2027 = smCreatorOpex2027.map((c, i) => c + smB2bOpex2027[i])
const gaOpex2027 = [1400, 1900, 2500, 3300, 4200, 5200, 6200, 7200, 8200, 9200, 10200, 11200]
const totalOpex2027 = rdOpex2027.map((r, i) => r + smTotalOpex2027[i] + gaOpex2027[i])

const gaapEbitda2027 = gaapGrossProfit2027.map((gp, i) => gp - totalOpex2027[i])
const cashEbitda2k2027 = gaapEbitda2027.map((eb, i) => eb + track2k.applied[i])
const cashGp100k2027 = gaapGrossProfit2027.map((gp, i) => gp + track100k.applied[i])
const cashEbitda100k2027 = gaapEbitda2027.map((eb, i) => eb + track100k.applied[i])
const cashGp250k2027 = gaapGrossProfit2027.map((gp, i) => gp + track250k.applied[i])
const cashEbitda250k2027 = gaapEbitda2027.map((eb, i) => eb + track250k.applied[i])

function cumulative(arr) {
  let acc = 0
  return arr.map((v) => {
    acc += v
    return acc
  })
}
const cumCash100k2027 = cumulative(cashEbitda100k2027)
const cumCash250k2027 = cumulative(cashEbitda250k2027)

// FY 2027 Totals
const fy27 = {
  charterSeats: sum(charterSeatsSold2027),
  b2bProExit: b2bProSubs2027[11], // 425
  b2bStudioExit: b2bStudioSubs2027[11], // 75
  b2bTotalExit: b2bTotalSubs2027[11], // 500
  explorerBuyers: sum(explorerBuyers2027), // 33,200
  hobbyistExit: hobbyistSubs2027[11], // 1,500
  starterExit: starterSubs2027[11], // 740
  creatorProExit: creatorProSubs2027[11], // 260
  creatorTotalExit: creatorTotalSubs2027[11], // 2,500
  totalSubsExit: totalActiveSubs2027[11], // 3,000
  b2bCharterRev: sum(b2bCharterRev2027),
  b2bProMrrSum: sum(b2bProMrr2027),
  b2bStudioMrrSum: sum(b2bStudioMrr2027),
  b2bBaseMrrSum: sum(b2bBaseMrr2027),
  b2bAddOnRev: sum(b2bAddOnRev2027),
  b2bByokRev: sum(b2bByokRev2027),
  b2bTotalRev: sum(b2bTotalRev2027),
  b2bOperatorGmv: sum(b2bOperatorGmv2027),
  creatorExplorerRev: sum(creatorExplorerRev2027),
  creatorHobbyistMrrSum: sum(creatorHobbyistMrr2027),
  creatorStarterMrrSum: sum(creatorStarterMrr2027),
  creatorProMrrSum: sum(creatorProMrr2027),
  creatorBaseMrrSum: sum(creatorBaseMrr2027),
  creatorAddOnRev: sum(creatorAddOnRev2027),
  creatorByokRev: sum(creatorByokRev2027),
  creatorTotalRev: sum(creatorTotalRev2027),
  totalBaseMrrSum: sum(totalBaseMrr2027),
  exitBaseMrr: totalBaseMrr2027[11],
  exitBaseArr: annualizedArr2027[11],
  exitB2bBaseArr: b2bBaseMrr2027[11] * 12,
  exitCreatorBaseArr: creatorBaseMrr2027[11] * 12,
  totalAddOnRev: sum(totalAddOnRev2027),
  totalByokRev: sum(totalByokRev2027),
  totalGrossRev: sum(totalGrossRev2027),
  gcpCogs: sum(gcpCogs2027),
  api3pCogs: sum(api3pCogs2027),
  whopFees: sum(whopFees2027),
  totalGaapCogs: sum(totalGaapCogs2027),
  gaapGrossProfit: sum(gaapGrossProfit2027),
  credit2kUsed: sum(track2k.applied),
  credit100kUsed: sum(track100k.applied),
  credit250kUsed: sum(track250k.applied),
  credit250kCarryoverTo2028: track250k.endingPool,
  rdOpex: sum(rdOpex2027),
  smCreatorOpex: sum(smCreatorOpex2027),
  smB2bOpex: sum(smB2bOpex2027),
  smTotalOpex: sum(smTotalOpex2027),
  gaOpex: sum(gaOpex2027),
  totalOpex: sum(totalOpex2027),
  gaapEbitda: sum(gaapEbitda2027),
  cashEbitda2k: sum(cashEbitda2k2027),
  cashGp100k: sum(cashGp100k2027),
  cashEbitda100k: sum(cashEbitda100k2027),
  cashGp250k: sum(cashGp250k2027),
  cashEbitda250k: sum(cashEbitda250k2027),
}

// ============================================================================
// 2. SIDE-BY-SIDE 500 / 5,000 / 50,000 VIDEO SERVICE BUSINESS COHORT RUN-RATE
// ============================================================================
function buildB2bMilestoneCohort(totalStudios, proCount, studioCount) {
  const proSaasMrr = proCount * PRICE.pro
  const studioSaasMrr = studioCount * PRICE.studio
  const baseSaasMrr = proSaasMrr + studioSaasMrr
  const baseSaasArr = baseSaasMrr * 12

  const addOnMonthly =
    proCount * B2B_STEADY.proAddOnMonthly + studioCount * B2B_STEADY.studioAddOnMonthly
  const byokMonthly =
    proCount * B2B_STEADY.proByokMonthly + studioCount * B2B_STEADY.studioByokMonthly
  const totalMonthlyRev = baseSaasMrr + addOnMonthly + byokMonthly
  const totalAnnualRev = totalMonthlyRev * 12
  const blendedMonthlyArpu = totalMonthlyRev / totalStudios

  const monthlyBlueprints =
    proCount * B2B_STEADY.proBlueprintsPerMo + studioCount * B2B_STEADY.studioBlueprintsPerMo
  const monthlyFilms =
    proCount * B2B_STEADY.proFilmsPerMo + studioCount * B2B_STEADY.studioFilmsPerMo
  const annualFilms = monthlyFilms * 12
  const monthlyOperatorGmv =
    proCount * B2B_STEADY.proClientGmvPerMo + studioCount * B2B_STEADY.studioClientGmvPerMo
  const annualOperatorGmv = monthlyOperatorGmv * 12

  // Steady-state segment COGS (Q4 2027: 21.3% -> FY28: 19.8% -> FY29: 18.2%)
  const cogsPct = totalStudios === 500 ? 0.213 : totalStudios === 5000 ? 0.198 : 0.182
  const annualCogs = Math.round(totalAnnualRev * cogsPct)
  const annualGrossProfit = totalAnnualRev - annualCogs
  const grossMarginPct = pct(annualGrossProfit, totalAnnualRev)

  return {
    totalStudios,
    proCount,
    studioCount,
    proSaasMrr,
    studioSaasMrr,
    baseSaasMrr,
    baseSaasArr,
    addOnMonthly,
    addOnAnnual: addOnMonthly * 12,
    byokMonthly,
    byokAnnual: byokMonthly * 12,
    totalMonthlyRev,
    totalAnnualRev,
    blendedMonthlyArpu,
    monthlyBlueprints,
    monthlyFilms,
    annualFilms,
    monthlyOperatorGmv,
    annualOperatorGmv,
    takeRateOfGmvPct: pct(totalAnnualRev, annualOperatorGmv),
    annualCogs,
    annualGrossProfit,
    grossMarginPct,
    byLang: allocateExactByShare(totalStudios, MARKET_SHARES),
  }
}

const cohort500 = buildB2bMilestoneCohort(500, 425, 75)
const cohort5000 = buildB2bMilestoneCohort(5000, 4250, 750)
const cohort50000 = buildB2bMilestoneCohort(50000, 42500, 7500)

// Blended single-studio averages (85% Pro / 15% Studio)
const BLENDED_STUDIO = {
  baseSaas: 0.85 * PRICE.pro + 0.15 * PRICE.studio, // $216.50
  passesPerMo: 0.85 * B2B_STEADY.proBlueprintsPerMo + 0.15 * B2B_STEADY.studioBlueprintsPerMo, // 12.15
  filmsPerMo: 0.85 * B2B_STEADY.proFilmsPerMo + 0.15 * B2B_STEADY.studioFilmsPerMo, // 8.10
  addOnMonthly: 0.85 * B2B_STEADY.proAddOnMonthly + 0.15 * B2B_STEADY.studioAddOnMonthly, // $108.25
  byokMonthly: 0.85 * B2B_STEADY.proByokMonthly + 0.15 * B2B_STEADY.studioByokMonthly, // $19.20
  arpuMonthly: cohort5000.blendedMonthlyArpu, // $343.95
  clientGmvMonthly:
    0.85 * B2B_STEADY.proClientGmvPerMo + 0.15 * B2B_STEADY.studioClientGmvPerMo, // $5,217.45
}

// ============================================================================
// 3. FY 2028 (Exit: 5,000 Studios) & FY 2029 (Exit: 50,000 Studios) FULL-YEAR P&L
// ============================================================================
// Full-year recognized revenue integrates the 12-month ramp from prior year exit to year-end exit:
// - FY28 ramps 500 -> 5,000 Video Service Businesses (avg ~2,550 active across 12 mos) & 2,500 -> 18,000 Creators (avg ~9,600)
// - FY29 ramps 5,000 -> 50,000 Video Service Businesses (avg ~24,800 active across 12 mos) & 18,000 -> 90,000 Creators (avg ~51,000)
const fy28 = (() => {
  const b2bProExit = 4250
  const b2bStudioExit = 750
  const b2bTotalExit = 5000
  const hobbyistExit = 10400
  const starterExit = 5500
  const creatorProExit = 2100
  const creatorTotalExit = hobbyistExit + starterExit + creatorProExit // 18,000
  const totalSubsExit = b2bTotalExit + creatorTotalExit // 23,000
  const explorerBuyers = 160000

  // Exit MRR / ARR (Dec 2028)
  const exitB2bBaseMrr = cohort5000.baseSaasMrr // $1,082,500
  const exitCreatorBaseMrr =
    hobbyistExit * PRICE.hobbyist + starterExit * PRICE.starter + creatorProExit * PRICE.pro // $780,000
  const exitBaseMrr = exitB2bBaseMrr + exitCreatorBaseMrr // $1,862,500
  const exitBaseArr = exitBaseMrr * 12 // $22,350,000

  // Full-Year Recognized Revenue (FY 2028 — avg ~2,550 active studios across 12 months)
  const b2bBaseSubRev = 6625000
  const b2bAddOnRev = 3312000
  const b2bByokRev = 588000
  const b2bTotalRev = b2bBaseSubRev + b2bAddOnRev + b2bByokRev // $10,525,000
  const b2bOperatorGmv = 159650000 // ~$159.7M full-year client GMV ($313.0M exit run-rate)

  const creatorBaseSubRev = 4980000
  const creatorAddOnRev = 946000
  const creatorExplorerRev = explorerBuyers * PRICE.explorer // $1,440,000
  const creatorByokRev = 134000
  const watchNetworkRev = 275000 // SceneFlow Network Watch $4.99/mo SVOD catalog across 7 languages
  const creatorTotalRev =
    creatorBaseSubRev + creatorAddOnRev + creatorExplorerRev + creatorByokRev + watchNetworkRev // $7,775,000

  const totalBaseSubRev = b2bBaseSubRev + creatorBaseSubRev // $11,605,000
  const totalAddOnRev = b2bAddOnRev + creatorAddOnRev // $4,258,000
  const totalByokRev = b2bByokRev + creatorByokRev // $722,000
  const totalGrossRev = b2bTotalRev + creatorTotalRev // $18,300,000

  const gcpCogs = Math.round(totalGrossRev * 0.112) // $2,049,600
  const api3pCogs = Math.round(totalGrossRev * 0.048) // $878,400
  const whopFees = Math.round(totalGrossRev * whopFeePct) // $695,400
  const totalGaapCogs = gcpCogs + api3pCogs + whopFees // $3,623,400
  const gaapGrossProfit = totalGrossRev - totalGaapCogs // $14,676,600 (80.2% GM)

  // Startup Credit Offsets in FY 2028 ($100k Year-2 Partner Track; or remaining Year-1 pool + $100k Year-2 on AI-First Track)
  const credit100kUsed = 100000
  const credit250kUsed = fy27.credit250kCarryoverTo2028 + 100000

  // High-velocity revenue reinvestment into 18-35 multi-market performance acquisition (EN, ES, PT, HI, ZH, AR)
  const rdOpex = 1650000
  const smCreatorOpex = 1750000
  const smB2bOpex = 4350000 // Reinvests ~33.3% total S&M to scale 500 -> 5,000 Video Service Operators across 6 markets
  const smTotalOpex = smCreatorOpex + smB2bOpex // $6,100,000
  const gaOpex = 780000
  const totalOpex = rdOpex + smTotalOpex + gaOpex // $8,530,000

  const gaapEbitda = gaapGrossProfit - totalOpex // $6,146,600 (33.6% GAAP EBITDA margin)
  const cashGp100k = gaapGrossProfit + credit100kUsed
  const cashGp250k = gaapGrossProfit + credit250kUsed
  const cashEbitda100k = gaapEbitda + credit100kUsed
  const cashEbitda250k = gaapEbitda + credit250kUsed

  return {
    b2bProExit,
    b2bStudioExit,
    b2bTotalExit,
    hobbyistExit,
    starterExit,
    creatorProExit,
    creatorTotalExit,
    totalSubsExit,
    explorerBuyers,
    exitB2bBaseMrr,
    exitCreatorBaseMrr,
    exitBaseMrr,
    exitBaseArr,
    exitB2bBaseArr: exitB2bBaseMrr * 12,
    exitCreatorBaseArr: exitCreatorBaseMrr * 12,
    b2bBaseSubRev,
    b2bAddOnRev,
    b2bByokRev,
    b2bTotalRev,
    b2bOperatorGmv,
    creatorBaseSubRev,
    creatorAddOnRev,
    creatorExplorerRev,
    creatorByokRev,
    watchNetworkRev,
    creatorTotalRev,
    totalBaseSubRev,
    totalAddOnRev,
    totalByokRev,
    totalGrossRev,
    gcpCogs,
    api3pCogs,
    whopFees,
    totalGaapCogs,
    gaapGrossProfit,
    credit100kUsed,
    credit250kUsed,
    rdOpex,
    smCreatorOpex,
    smB2bOpex,
    smTotalOpex,
    gaOpex,
    totalOpex,
    gaapEbitda,
    cashGp100k,
    cashGp250k,
    cashEbitda100k,
    cashEbitda250k,
  }
})()

const fy29 = (() => {
  const b2bProExit = 42500
  const b2bStudioExit = 7500
  const b2bTotalExit = 50000
  const hobbyistExit = 52000
  const starterExit = 27500
  const creatorProExit = 10500
  const creatorTotalExit = hobbyistExit + starterExit + creatorProExit // 90,000
  const totalSubsExit = b2bTotalExit + creatorTotalExit // 140,000
  const explorerBuyers = 750000

  // Exit MRR / ARR (Dec 2029)
  const exitB2bBaseMrr = cohort50000.baseSaasMrr // $10,825,000
  const exitCreatorBaseMrr =
    hobbyistExit * PRICE.hobbyist + starterExit * PRICE.starter + creatorProExit * PRICE.pro // $3,900,000
  const exitBaseMrr = exitB2bBaseMrr + exitCreatorBaseMrr // $14,725,000
  const exitBaseArr = exitBaseMrr * 12 // $176,700,000

  // Full-Year Recognized Revenue (FY 2029 — avg ~24,800 active studios across 12 months)
  const b2bBaseSubRev = 64430000
  const b2bAddOnRev = 32215000
  const b2bByokRev = 5715000
  const b2bTotalRev = b2bBaseSubRev + b2bAddOnRev + b2bByokRev // $102,360,000
  const b2bOperatorGmv = 1552700000 // ~$1.55B full-year client GMV ($3.13B Dec 2029 exit run-rate)

  const creatorBaseSubRev = 26400000
  const creatorAddOnRev = 5280000
  const creatorExplorerRev = explorerBuyers * PRICE.explorer // $6,750,000
  const creatorByokRev = 810000
  const watchNetworkRev = 2400000 // SceneFlow Network Watch SVOD across 7 languages
  const creatorTotalRev =
    creatorBaseSubRev + creatorAddOnRev + creatorExplorerRev + creatorByokRev + watchNetworkRev // $41,640,000

  const totalBaseSubRev = b2bBaseSubRev + creatorBaseSubRev // $90,830,000
  const totalAddOnRev = b2bAddOnRev + creatorAddOnRev // $37,495,000
  const totalByokRev = b2bByokRev + creatorByokRev // $6,525,000
  const totalGrossRev = b2bTotalRev + creatorTotalRev // $144,000,000

  const gcpCogs = Math.round(totalGrossRev * 0.095) // $13,680,000
  const api3pCogs = Math.round(totalGrossRev * 0.042) // $6,048,000
  const whopFees = Math.round(totalGrossRev * whopFeePct) // $5,472,000
  const totalGaapCogs = gcpCogs + api3pCogs + whopFees // $25,200,000
  const gaapGrossProfit = totalGrossRev - totalGaapCogs // $118,800,000 (82.5% GM)

  // Stateless serverless platform operating leverage + sustained 6-language 18-35 marketing engine
  const rdOpex = 11200000
  const smCreatorOpex = 9400000
  const smB2bOpex = 31600000 // Scales 5,000 -> 50,000 Video Service Operators across EN, ES, PT, HI, ZH, AR
  const smTotalOpex = smCreatorOpex + smB2bOpex // $41,000,000 (28.5% of revenue)
  const gaOpex = 5400000
  const totalOpex = rdOpex + smTotalOpex + gaOpex // $57,600,000

  const gaapEbitda = gaapGrossProfit - totalOpex // $61,200,000 (42.5% GAAP EBITDA margin)

  return {
    b2bProExit,
    b2bStudioExit,
    b2bTotalExit,
    hobbyistExit,
    starterExit,
    creatorProExit,
    creatorTotalExit,
    totalSubsExit,
    explorerBuyers,
    exitB2bBaseMrr,
    exitCreatorBaseMrr,
    exitBaseMrr,
    exitBaseArr,
    exitB2bBaseArr: exitB2bBaseMrr * 12,
    exitCreatorBaseArr: exitCreatorBaseMrr * 12,
    b2bBaseSubRev,
    b2bAddOnRev,
    b2bByokRev,
    b2bTotalRev,
    b2bOperatorGmv,
    creatorBaseSubRev,
    creatorAddOnRev,
    creatorExplorerRev,
    creatorByokRev,
    watchNetworkRev,
    creatorTotalRev,
    totalBaseSubRev,
    totalAddOnRev,
    totalByokRev,
    totalGrossRev,
    gcpCogs,
    api3pCogs,
    whopFees,
    totalGaapCogs,
    gaapGrossProfit,
    credit100kUsed: 0,
    credit250kUsed: 0,
    rdOpex,
    smCreatorOpex,
    smB2bOpex,
    smTotalOpex,
    gaOpex,
    totalOpex,
    gaapEbitda,
    cashGp100k: gaapGrossProfit,
    cashGp250k: gaapGrossProfit,
    cashEbitda100k: gaapEbitda,
    cashEbitda250k: gaapEbitda,
  }
})()

// Dec 2029 B2B2C share of total recurring + compute run-rate
const dec2029CreatorRunRate =
  (fy29.exitCreatorBaseMrr + Math.round(fy29.exitCreatorBaseMrr * 0.2) + Math.round(fy29.creatorProExit * PRICE.pro * 0.06)) * 12
const dec2029B2bShareRunRatePct = pct(
  cohort50000.totalAnnualRev,
  cohort50000.totalAnnualRev + dec2029CreatorRunRate
)

// ============================================================================
// BUILD CSV 1: docs/sceneflow_financial_model_2027_12month.csv
// ============================================================================
const blankRow12 = Array(16).fill('')
const csv12Rows = [
  [
    'Category',
    'Line Item',
    ...MONTHS_2027,
    'FY 2027 Total / Exit',
    'Notes & Basis',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Founding Operator 90-Day Charter ($)',
    ...Array(12).fill('299.00'),
    '299.00',
    '25-seat Q1 Launchpad (/founding-operators): 90d White-Label Pro + 18,000 cr + Playbooks (locks $119/mo post-Day-90)',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Explorer One-Time Price ($)',
    ...Array(12).fill('9.00'),
    '9.00',
    'One-time 30-Day Studio Test Flight (750 credits) — primary low-friction entry for 18-35 prospective side-hustle operators & creators',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Hobbyist Monthly Price ($)',
    ...Array(12).fill('19.00'),
    '19.00',
    'Everyday Storyteller Continuity Vault tier (1,500 cr + 10 GB Vault)',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Starter Monthly Price ($)',
    ...Array(12).fill('49.00'),
    '49.00',
    'Publish Chapter & Filmmaker Pre-Vis Pitch tier (4,500 cr + 25 GB Vault + 1 Voice Clone)',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Pro Monthly Price ($)',
    ...Array(12).fill('149.00'),
    '149.00',
    'White-Label Side-Hustle & Primary-Hustle Video Service Operators (18-35), Podcasters & Series (15,000 cr + 100 GB Vault + 4K + BYOK)',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Studio Monthly Price ($)',
    ...Array(12).fill('599.00'),
    '599.00',
    'Scaled Multi-Seat Video Service Agencies, Brokerages & Corporate L&D (75,000 cr + 500 GB Vault + 10 Seats + BYOK)',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Cumulative AI Model Price Drop vs Jan 2027',
    ...modelDrop2027,
    '-55.0%',
    'Veo 3.1, Imagen 4, Gemini, Kling & TTS inference deflation across 2027',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Cost to Deliver 10-Min Multi-Language Episode ($)',
    ...ep10MinCost2027,
    '18.90',
    'Falling delivery cost unlocks 80%+ operator margins on Baby Boomer Video Memoirs across EN/ES/PT/HI/ZH/AR',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'GCP / Vertex AI Compute COGS (% of Rev)',
    ...gcpCogsPct2027.map((x) => `${(x * 100).toFixed(1)}%`),
    pct(fy27.gcpCogs, fy27.totalGrossRev),
    'Drops from 25.0% in Q1 to 12.5% in Q4 as model inference costs deflate',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Third-Party API COGS (% of Rev)',
    ...api3pCogsPct2027.map((x) => `${(x * 100).toFixed(1)}%`),
    pct(fy27.api3pCogs, fy27.totalGrossRev),
    'Drops from 9.0% in Q1 to 5.0% in Q4 (ElevenLabs/Kling/Topaz/Hive)',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Whop Merchant of Record Fee (% of Rev)',
    ...Array(12).fill('3.8%'),
    '3.8%',
    'Blended 2.7% + $0.30 fixed fee + 0.5% global tax compliance across all language markets',
  ],
  blankRow12,
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Founding Operator $299 Charter Seats Sold (25-Seat Cap)',
    ...charterSeatsSold2027,
    fy27.charterSeats,
    '25 Charter studios onboarded in Q1 2027 seeding proof-of-income case studies for 18-35 operator marketing',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Active White-Label Pro Operators ($149/mo - Side & Primary Hustle)',
    ...b2bProSubs2027,
    fy27.b2bProExit,
    '18-35 side-hustle & primary-hustle operators serving Baby Boomer Video Memoirs, Property Tours & SMBs (85% of Dec 2027 B2B2C base)',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Active White-Label Studio Agencies ($599/mo - Scaled Multi-Seat)',
    ...b2bStudioSubs2027,
    fy27.b2bStudioExit,
    'Scaled full-time operators, real estate media teams & L&D agencies (15% of Dec 2027 B2B2C base)',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Total Active Global Video Service Businesses',
    ...b2bTotalSubs2027,
    fy27.b2bTotalExit,
    'Year 1 milestone exit = 500 active Global Video Service Businesses (scales -> 5,000 in FY28 -> 50,000 in FY29)',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Memo: Operator Ecosystem Client GMV Enabled ($)',
    ...b2bOperatorGmv2027,
    fy27.b2bOperatorGmv,
    `Dec 2027 run-rate = ${fmtUsd(b2bOperatorGmv2027[11] * 12)}/yr client GMV enabled across $29 Blueprint Passes & $299-$1,800 client films`,
  ],
  blankRow12,
  [
    'SELF-SERVE CREATORS (B2C)',
    'New $9 Explorer Buyers (Monthly Cohort)',
    ...explorerBuyers2027,
    fy27.explorerBuyers,
    '33,200 cumulative FY 2027 Explorer Test Flight buyers across EN, ES, PT, HI, ZH, AR (+ TH organic)',
  ],
  [
    'SELF-SERVE CREATORS (B2C)',
    'Active Hobbyist Subscribers ($19/mo)',
    ...hobbyistSubs2027,
    fy27.hobbyistExit,
    'Everyday non-technical storytellers & personal Continuity Vaults',
  ],
  [
    'SELF-SERVE CREATORS (B2C)',
    'Active Starter Subscribers ($49/mo)',
    ...starterSubs2027,
    fy27.starterExit,
    'Publish Chapter creators & indie filmmaker Pre-Vis pitch packages',
  ],
  [
    'SELF-SERVE CREATORS (B2C)',
    'Active Creator Pro Subscribers ($149/mo - Series & Podcasts)',
    ...creatorProSubs2027,
    fy27.creatorProExit,
    'Monetized episodic series creators & hybrid video podcasters (non-agency)',
  ],
  [
    'SELF-SERVE CREATORS (B2C)',
    'Total Active Self-Serve Creator Subscribers',
    ...creatorTotalSubs2027,
    fy27.creatorTotalExit,
    'Dec 2027 exit = 2,500 active self-serve Creator/Filmmaker subscribers',
  ],
  [
    'CONSOLIDATED SUBSCRIBERS',
    'Total Active Monthly Subscribers (B2B2C + B2C)',
    ...totalActiveSubs2027,
    fy27.totalSubsExit,
    'Dec 2027 exit = 3,000 active subscribers (500 Video Service Businesses + 2,500 Self-Serve Creators)',
  ],
  [
    'CONSOLIDATED SUBSCRIBERS',
    'Net Monthly Subscriber Additions',
    ...netSubAdds2027,
    fy27.totalSubsExit,
    'Accelerating revenue-reinvested acquisition targeting ages 18-35 across EN, ES, PT, HI, ZH, AR',
  ],
  blankRow12,
  ...MARKET_SHARES.map((m, idx) => [
    'MARKET BREAKDOWN (UI LANGUAGES)',
    m.label,
    ...marketSubs2027ByLang[idx],
    marketSubs2027ByLang[idx][11],
    `Active combined subscribers in ${m.code} market (${(m.share * 100).toFixed(0)}% global share)`,
  ]),
  blankRow12,
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Founding Operator $299 Charter Launchpad Revenue',
    ...b2bCharterRev2027,
    fy27.b2bCharterRev,
    '25 Founding Operator Charter packages * $299 in Q1 2027',
  ],
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Video Service Pro Subscription MRR ($149)',
    ...b2bProMrr2027,
    fy27.b2bProMrrSum,
    'Active White-Label Pro Operators * $149/mo',
  ],
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Video Service Studio Subscription MRR ($599)',
    ...b2bStudioMrr2027,
    fy27.b2bStudioMrrSum,
    'Active White-Label Studio Agencies * $599/mo',
  ],
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Video Service Base Subscription MRR',
    ...b2bBaseMrr2027,
    fy27.b2bBaseMrrSum,
    `Dec 2027 Video Service Base SaaS MRR = ${fmtUsd(b2bBaseMrr2027[11])}/mo (${fmtUsd(b2bBaseMrr2027[11] * 12)} Base SaaS ARR)`,
  ],
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Video Service 12-Mo Add-On Credit Packs ($100/$250)',
    ...b2bAddOnRev2027,
    fy27.b2bAddOnRev,
    'Funds $29 Client Blueprint Passes (~$3.90 max compute) + $299-$1,800 Baby Boomer Video Memoirs & client films',
  ],
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Video Service BYOK 20% Orchestration Fees',
    ...b2bByokRev2027,
    fy27.b2bByokRev,
    '20% platform orchestration fee on high-volume Pro/Studio BYOK renders',
  ],
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Subtotal: Video Service Business Segment Revenue',
    ...b2bTotalRev2027,
    fy27.b2bTotalRev,
    `Dec 2027 exit run-rate = ${fmtUsd(b2bTotalRev2027[11])}/mo (${fmtUsd(b2bTotalRev2027[11] * 12)}/yr across 500 active Video Service Businesses)`,
  ],
  blankRow12,
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    '$9 Explorer Test Flight One-Time Revenue',
    ...creatorExplorerRev2027,
    fy27.creatorExplorerRev,
    '33,200 Explorer Test Flight buyers * $9',
  ],
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    'Hobbyist Subscription MRR ($19)',
    ...creatorHobbyistMrr2027,
    fy27.creatorHobbyistMrrSum,
    'Active Hobbyist * $19/mo',
  ],
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    'Starter Subscription MRR ($49)',
    ...creatorStarterMrr2027,
    fy27.creatorStarterMrrSum,
    'Active Starter * $49/mo',
  ],
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    'Creator Pro Subscription MRR ($149)',
    ...creatorProMrr2027,
    fy27.creatorProMrrSum,
    'Active Indie Series & Video Podcaster Pro * $149/mo',
  ],
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    'Creator Base Subscription MRR',
    ...creatorBaseMrr2027,
    fy27.creatorBaseMrrSum,
    `Dec 2027 Creator Base SaaS MRR = ${fmtUsd(creatorBaseMrr2027[11])}/mo (${fmtUsd(creatorBaseMrr2027[11] * 12)} Base SaaS ARR)`,
  ],
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    'Creator Add-On Credit Packs & BYOK Fees',
    ...creatorAddOnRev2027.map((a, i) => a + creatorByokRev2027[i]),
    fy27.creatorAddOnRev + fy27.creatorByokRev,
    '12-month chapter completion packs ($25/$100) + indie Pro BYOK orchestration',
  ],
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    'Subtotal: Self-Serve Creator Segment Revenue',
    ...creatorTotalRev2027,
    fy27.creatorTotalRev,
    `Dec 2027 exit run-rate = ${fmtUsd(creatorTotalRev2027[11])}/mo (${fmtUsd(creatorTotalRev2027[11] * 12)}/yr across 2,500 active Creators + Explorer funnel)`,
  ],
  blankRow12,
  [
    'CONSOLIDATED REVENUE (USD)',
    'Total Base Subscription MRR (B2B2C + B2C)',
    ...totalBaseMrr2027,
    fy27.totalBaseMrrSum,
    `Dec 2027 exit Base MRR = ${fmtUsd(fy27.exitBaseMrr)}/mo (${fmtUsd(b2bBaseMrr2027[11])} Video Service + ${fmtUsd(creatorBaseMrr2027[11])} Creator)`,
  ],
  [
    'CONSOLIDATED REVENUE (USD)',
    'Annualized Base Subscription ARR (MRR * 12)',
    ...annualizedArr2027,
    fy27.exitBaseArr,
    `Dec 2027 exit Base Subscription ARR = ${fmtUsd(fy27.exitBaseArr)}`,
  ],
  [
    'CONSOLIDATED REVENUE (USD)',
    'Total Recognized Gross Revenue (All Streams)',
    ...totalGrossRev2027,
    fy27.totalGrossRev,
    `Dec 2027 annualized total revenue run-rate = ${fmtUsd(totalGrossRev2027[11] * 12)} (${fmtUsd(totalGrossRev2027[11])}/mo * 12); FY27 Recognized Total = ${fmtUsd(fy27.totalGrossRev)}`,
  ],
  [
    'CONSOLIDATED REVENUE (USD)',
    'Memo: Video Service B2B2C Share of Total Revenue (%)',
    ...b2bSharePct2027,
    pct(fy27.b2bTotalRev, fy27.totalGrossRev),
    `Rises from ${pct(fy27.b2bTotalRev, fy27.totalGrossRev)} in FY27 to ${pct(fy29.b2bTotalRev, fy29.totalGrossRev)} in FY29 (${dec2029B2bShareRunRatePct} of Dec 2029 recurring+compute) as 500 -> 5,000 -> 50,000 Studios scale`,
  ],
  blankRow12,
  [
    'COGS & CREDITS (USD)',
    'Un-Subsidized GCP / Vertex AI COGS',
    ...gcpCogs2027,
    fy27.gcpCogs,
    'Drops from 25.0% of rev in Q1 -> 20.0% Q2 -> 16.0% Q3 -> 12.5% Q4',
  ],
  [
    'COGS & CREDITS (USD)',
    'Cash 3P API COGS (ElevenLabs/Kling/Topaz/Hive)',
    ...api3pCogs2027,
    fy27.api3pCogs,
    'Drops from 9.0% of rev in Q1 -> 7.5% Q2 -> 6.2% Q3 -> 5.0% Q4',
  ],
  [
    'COGS & CREDITS (USD)',
    'Whop Merchant of Record Fees (3.8%)',
    ...whopFees2027,
    fy27.whopFees,
    'Payment processing & global tax compliance across all language markets',
  ],
  [
    'COGS & CREDITS (USD)',
    'Total Un-Subsidized GAAP COGS',
    ...totalGaapCogs2027,
    fy27.totalGaapCogs,
    'Drops from 37.8% of rev in Q1 to 21.3% in Q4',
  ],
  [
    'COGS & CREDITS (USD)',
    'GAAP Gross Profit (Un-Subsidized)',
    ...gaapGrossProfit2027,
    fy27.gaapGrossProfit,
    'Total Gross Revenue minus Total GAAP COGS',
  ],
  [
    'COGS & CREDITS (USD)',
    'GAAP Gross Margin %',
    ...gaapGrossProfit2027.map((gp, i) => pct(gp, totalGrossRev2027[i])),
    pct(fy27.gaapGrossProfit, fy27.totalGrossRev),
    'Expands +16.5 percentage points across 2027 from AI model deflation + high-margin Vault/BYOK mix',
  ],
  blankRow12,
  [
    'START TRACK: $2K CREDITS',
    'Google Startups $2K Start Tier Credit Offset ($750 Pre-Launch + $1,250 Jan)',
    ...track2k.applied,
    fy27.credit2kUsed,
    '$2,000 Start Tier funds Nov-Dec 2026 showcase renders ($750) + $1,250 Jan 2027 GCP offset',
  ],
  [
    'START TRACK: $2K CREDITS',
    'Net Cash Flow (EBITDA w/ $2K Start Tier Credits Only)',
    ...cashEbitda2k2027,
    fy27.cashEbitda2k,
    'Cash-flow positive from Month 1 even after reinvesting early revenue into 6-language 18-35 marketing',
  ],
  blankRow12,
  [
    'TRACK A: $100K CREDITS',
    'GCP Credit Offset Applied ($100k Partner Track)',
    ...track100k.applied,
    fy27.credit100kUsed,
    `100% deployed in FY 2027 (offsets ${pct(fy27.credit100kUsed, fy27.gcpCogs)} of Year 1 GCP compute), freeing $100K cash for 18-35 operator marketing`,
  ],
  [
    'TRACK A: $100K CREDITS',
    'Remaining $100k GCP Credit Balance',
    ...track100k.balances,
    track100k.endingPool,
    'Fully utilized inside Year 1 as studio ramp accelerates toward 500 active businesses',
  ],
  [
    'TRACK A: $100K CREDITS',
    'Cash Gross Profit (w/ $100k Credit Track)',
    ...cashGp100k2027,
    fy27.cashGp100k,
    'GAAP Gross Profit + $100k GCP Credit Offset',
  ],
  [
    'TRACK A: $100K CREDITS',
    'Cash Gross Margin % (w/ $100k Credit Track)',
    ...cashGp100k2027.map((gp, i) => pct(gp, totalGrossRev2027[i])),
    pct(fy27.cashGp100k, fy27.totalGrossRev),
    'Blended FY 2027 Cash Gross Margin w/ $100k Credit Track',
  ],
  blankRow12,
  [
    'TRACK B: $250K CREDITS',
    'GCP Credit Offset Applied ($250k AI-First Yr-1 Track)',
    ...track250k.applied,
    fy27.credit250kUsed,
    `Offsets ${pct(fy27.credit250kUsed, fy27.gcpCogs)} of FY 2027 GCP/Vertex AI compute across the 500-studio Year 1 ramp`,
  ],
  [
    'TRACK B: $250K CREDITS',
    'Remaining $250k GCP Credit Balance',
    ...track250k.balances,
    track250k.endingPool,
    track250k.endingPool > 0
      ? 'Remaining Year-1 credit balance rolls into Q1 2028 as Video Service studios scale 500 -> 5,000'
      : '100% utilized inside FY 2027 driving >$2.0M Year-2 Vertex AI compute consumption',
  ],
  [
    'TRACK B: $250K CREDITS',
    'Cash Gross Profit (w/ $250k AI-First Track)',
    ...cashGp250k2027,
    fy27.cashGp250k,
    'GAAP Gross Profit + $250k AI-First GCP Credit Offset',
  ],
  [
    'TRACK B: $250K CREDITS',
    'Cash Gross Margin % (w/ $250k AI-First Track)',
    ...cashGp250k2027.map((gp, i) => pct(gp, totalGrossRev2027[i])),
    pct(fy27.cashGp250k, fy27.totalGrossRev),
    'Blended FY 2027 Cash Gross Margin w/ $250k AI-First Track',
  ],
  blankRow12,
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'R&D / Engineering & Product',
    ...rdOpex2027,
    fy27.rdOpex,
    'Stateless multi-tenant scaling, Autonomous Agents, 7-lang white-label portals & Veo/Kling orchestration',
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'S&M — 18-35 Creator, Podcaster & $9 Explorer Funnel (EN/ES/PT/HI/ZH/AR)',
    ...smCreatorOpex2027,
    fy27.smCreatorOpex,
    'Short-form social & creator ads driving 33,200 $9 Explorer Test Flights across EN, ES, PT, HI, ZH, AR',
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'S&M — 18-35 Side/Primary Hustle Video Business Acquisition (EN/ES/PT/HI/ZH/AR)',
    ...smB2bOpex2027,
    fy27.smB2bOpex,
    'Reinvests early revenue into TikTok/Reels/Shorts proof-of-margin ads targeting 18-35 operators serving Baby Boomer Video Memoirs',
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'Total Sales & Marketing Reinvestment (S&M)',
    ...smTotalOpex2027,
    fy27.smTotalOpex,
    `${pct(fy27.smTotalOpex, fy27.totalGrossRev)} of FY27 revenue reinvested directly into 6-market growth (71% dedicated to 500 Video Service Operators)`,
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'G&A (Legal / Compliance / Multi-Region Ops)',
    ...gaOpex2027,
    fy27.gaOpex,
    'Lean corporate ops, privacy/consent compliance & multi-region administration',
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'Total Operating Expenses (OpEx)',
    ...totalOpex2027,
    fy27.totalOpex,
    '100% funded organically out of monthly operating gross profit',
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'GAAP Operating Income (EBITDA - Un-Subsidized)',
    ...gaapEbitda2027,
    fy27.gaapEbitda,
    `Positive GAAP EBITDA every month of FY 2027 (${pct(fy27.gaapEbitda, fy27.totalGrossRev)} GAAP EBITDA margin)`,
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'Net Cash Flow (EBITDA w/ $100k Credit Track)',
    ...cashEbitda100k2027,
    fy27.cashEbitda100k,
    `${pct(fy27.cashEbitda100k, fy27.totalGrossRev)} FY27 Cash EBITDA margin ($100k credit track)`,
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'Cumulative Cash Generated (w/ $100k Credit Track)',
    ...cumCash100k2027,
    cumCash100k2027[11],
    'Cumulative operating cash generated across FY 2027 ($100k track)',
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'Net Cash Flow (EBITDA w/ $250k AI-First Track)',
    ...cashEbitda250k2027,
    fy27.cashEbitda250k,
    `${pct(fy27.cashEbitda250k, fy27.totalGrossRev)} FY27 Cash EBITDA margin ($250k AI-First track)`,
  ],
  [
    'OPEX & 6-MARKET REINVESTMENT',
    'Cumulative Cash Generated (w/ $250k AI-First Track)',
    ...cumCash250k2027,
    cumCash250k2027[11],
    'Cumulative operating cash generated across FY 2027 ($250k track)',
  ],
]

// ============================================================================
// BUILD CSV 2: docs/sceneflow_financial_model_2027_2029_3year.csv
// ============================================================================
const blankRow6 = Array(6).fill('')
const csv3YrRows = [
  [
    'Table',
    'Line Item / Metric',
    'FY 2027',
    'FY 2028',
    'FY 2029',
    'Notes & Assumptions',
  ],
  // KPI & Subscriber Block
  [
    '3-YEAR P&L & KPI FORECAST',
    'Ending Active Global Video Service Businesses (B2B2C)',
    fy27.b2bTotalExit,
    fy28.b2bTotalExit,
    fy29.b2bTotalExit,
    'Core B2B2C growth spine: 500 (FY27) -> 5,000 (FY28, 10x) -> 50,000 (FY29, 10x) driven by 18-35 side/primary hustlers + Boomer Video Memoir demand',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    '  - White-Label Pro Video Service Operators ($149/mo - Side & Primary Hustle)',
    fy27.b2bProExit,
    fy28.b2bProExit,
    fy29.b2bProExit,
    '18-35 side-hustle & full-time operators offering Baby Boomer Video Memoirs, Real Estate Tours & Brand Packs (85% of B2B2C base)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    '  - White-Label Studio Multi-Seat Agencies ($599/mo - Scaled Operators)',
    fy27.b2bStudioExit,
    fy28.b2bStudioExit,
    fy29.b2bStudioExit,
    'Scaled multi-seat agencies, real estate brokerages & corporate L&D teams (15% of B2B2C base)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Ending Active Self-Serve Creator Subscribers (B2C)',
    fy27.creatorTotalExit,
    fy28.creatorTotalExit,
    fy29.creatorTotalExit,
    'Hobbyist ($19), Starter ($49) & Indie Series/Podcast Pro ($149) across 7 UI languages',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Ending Active Monthly Subscribers (B2B2C + B2C)',
    fy27.totalSubsExit,
    fy28.totalSubsExit,
    fy29.totalSubsExit,
    '3,000 (Dec 2027) -> 23,000 (Dec 2028) -> 140,000 (Dec 2029)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Annual $9 Explorer Studio Test Flight Buyers',
    fy27.explorerBuyers,
    fy28.explorerBuyers,
    fy29.explorerBuyers,
    'Self-liquidating 30-day Studio Test Flight onboarding wedge for 18-35 prospective operators & creators',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Memo: Annual Operator Ecosystem Client GMV Enabled (USD)',
    fy27.b2bOperatorGmv,
    fy28.b2bOperatorGmv,
    fy29.b2bOperatorGmv,
    `Exit client GMV run-rate: ${fmtUsd(cohort500.annualOperatorGmv)}/yr (500 studios) -> ${fmtUsd(cohort5000.annualOperatorGmv)}/yr (5,000 studios) -> ${fmtUsd(cohort50000.annualOperatorGmv)}/yr (50,000 studios)`,
  ],
  // Exit MRR & ARR
  [
    '3-YEAR P&L & KPI FORECAST',
    'Exit Base Subscription MRR — Video Service B2B2C (USD)',
    b2bBaseMrr2027[11],
    fy28.exitB2bBaseMrr,
    fy29.exitB2bBaseMrr,
    'Pure base SaaS MRR from 500 / 5,000 / 50,000 Video Service Businesses (excludes Credit Packs & BYOK)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Exit Base Subscription MRR — Self-Serve Creator B2C (USD)',
    creatorBaseMrr2027[11],
    fy28.exitCreatorBaseMrr,
    fy29.exitCreatorBaseMrr,
    'Pure base SaaS MRR from Hobbyist, Starter & Indie Pro creators',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Exit Base Subscription MRR (Dec MRR - USD)',
    fy27.exitBaseMrr,
    fy28.exitBaseMrr,
    fy29.exitBaseMrr,
    `Combined Dec Base Subscription MRR (${fmtUsd(fy27.exitBaseMrr)} -> ${fmtUsd(fy28.exitBaseMrr)} -> ${fmtUsd(fy29.exitBaseMrr)})`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Exit Base Subscription ARR (Dec ARR - USD)',
    fy27.exitBaseArr,
    fy28.exitBaseArr,
    fy29.exitBaseArr,
    `Dec Base MRR * 12 (${fmtUsd(fy27.exitBaseArr)} -> ${fmtUsd(fy28.exitBaseArr)} -> ${fmtUsd(fy29.exitBaseArr)}; excludes high-velocity Credit Packs & BYOK)`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Exit Total Annualized Revenue Run-Rate — Video Service B2B2C (USD)',
    cohort500.totalAnnualRev,
    cohort5000.totalAnnualRev,
    cohort50000.totalAnnualRev,
    '500 studios = $2.06M/yr -> 5,000 studios = $20.64M/yr -> 50,000 studios = $206.37M/yr (SaaS + Packs + BYOK)',
  ],
  // Recognized Full-Year Revenue Breakdown
  [
    '3-YEAR P&L & KPI FORECAST',
    'A1. Video Service Base Subscriptions + Q1 Charter Revenue (USD)',
    fy27.b2bBaseMrrSum + fy27.b2bCharterRev,
    fy28.b2bBaseSubRev,
    fy29.b2bBaseSubRev,
    'Full-year recognized base SaaS from White-Label Pro ($149) & Studio ($599) + FY27 $299 Charter',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'A2. Video Service 12-Month Add-On Credit Packs Revenue (USD)',
    fy27.b2bAddOnRev,
    fy28.b2bAddOnRev,
    fy29.b2bAddOnRev,
    '$100/$250 client production & $29 Storyboard Blueprint Pass compute packs',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'A3. Video Service BYOK 20% Orchestration Fees Revenue (USD)',
    fy27.b2bByokRev,
    fy28.b2bByokRev,
    fy29.b2bByokRev,
    '20% orchestration fee on Pro & Studio direct-key video rendering (~95% gross margin)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Subtotal: Video Service Business (B2B2C) Recognized Revenue (USD)',
    fy27.b2bTotalRev,
    fy28.b2bTotalRev,
    fy29.b2bTotalRev,
    `Share of Total Revenue: ${pct(fy27.b2bTotalRev, fy27.totalGrossRev)} (FY27) -> ${pct(fy28.b2bTotalRev, fy28.totalGrossRev)} (FY28) -> ${pct(fy29.b2bTotalRev, fy29.totalGrossRev)} (FY29; ${dec2029B2bShareRunRatePct} of Dec 2029 recurring+compute)`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'B1. Self-Serve Creator Base Subscriptions Revenue (USD)',
    fy27.creatorBaseMrrSum,
    fy28.creatorBaseSubRev,
    fy29.creatorBaseSubRev,
    'Hobbyist ($19), Starter ($49) & Indie Series/Podcast Pro ($149)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'B2. Self-Serve Creator Add-On Packs & BYOK Fees Revenue (USD)',
    fy27.creatorAddOnRev + fy27.creatorByokRev,
    fy28.creatorAddOnRev + fy28.creatorByokRev,
    fy29.creatorAddOnRev + fy29.creatorByokRev,
    '$25/$100 chapter completion packs + indie Pro BYOK fees',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'B3. $9 Explorer Studio Test Flights Revenue (USD)',
    fy27.creatorExplorerRev,
    fy28.creatorExplorerRev,
    fy29.creatorExplorerRev,
    'Self-liquidating top-of-funnel paid trial ($9 * annual Explorer buyers)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'B4. SceneFlow Network Watch SKU (Net 50% Share - USD)',
    0,
    fy28.watchNetworkRev,
    fy29.watchNetworkRev,
    '$4.99/mo SVOD catalog across 7 languages launched after Year-1 Originals catalog',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Subtotal: Self-Serve Creator & Network (B2C) Recognized Revenue (USD)',
    fy27.creatorTotalRev,
    fy28.creatorTotalRev,
    fy29.creatorTotalRev,
    'Proportionally scaled creator & storyteller ecosystem across 7 native UI languages',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Recognized Gross Revenue (USD)',
    fy27.totalGrossRev,
    fy28.totalGrossRev,
    fy29.totalGrossRev,
    `YoY Growth: +${(((fy28.totalGrossRev - fy27.totalGrossRev) / fy27.totalGrossRev) * 100).toFixed(0)}% in FY28; +${(((fy29.totalGrossRev - fy28.totalGrossRev) / fy28.totalGrossRev) * 100).toFixed(0)}% in FY29`,
  ],
  // COGS & Gross Profit
  [
    '3-YEAR P&L & KPI FORECAST',
    'Google Cloud / Vertex AI Compute COGS (USD)',
    fy27.gcpCogs,
    fy28.gcpCogs,
    fy29.gcpCogs,
    `Deflates from 25.0% in Q1 2027 to 12.5% in Q4 2027 (${pct(fy27.gcpCogs, fy27.totalGrossRev)} FY27 -> 11.2% FY28 -> 9.5% FY29)`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Third-Party Generation & Audio COGS (USD)',
    fy27.api3pCogs,
    fy28.api3pCogs,
    fy29.api3pCogs,
    `ElevenLabs 70+ lang, Kling/Fal, Topaz, Hive AI (${pct(fy27.api3pCogs, fy27.totalGrossRev)} FY27 -> 4.8% FY28 -> 4.2% FY29)`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Whop Merchant of Record Payment Fees (USD)',
    fy27.whopFees,
    fy28.whopFees,
    fy29.whopFees,
    '3.8% blended payment processing & global tax compliance across all markets',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Un-Subsidized GAAP COGS (USD)',
    fy27.totalGaapCogs,
    fy28.totalGaapCogs,
    fy29.totalGaapCogs,
    `${pct(fy27.totalGaapCogs, fy27.totalGrossRev)} of rev in FY27 -> ${pct(fy28.totalGaapCogs, fy28.totalGrossRev)} in FY28 -> ${pct(fy29.totalGaapCogs, fy29.totalGrossRev)} in FY29`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'GAAP Gross Profit (USD)',
    fy27.gaapGrossProfit,
    fy28.gaapGrossProfit,
    fy29.gaapGrossProfit,
    'Total Recognized Gross Revenue minus Total GAAP COGS',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'GAAP Gross Margin %',
    pct(fy27.gaapGrossProfit, fy27.totalGrossRev),
    pct(fy28.gaapGrossProfit, fy28.totalGrossRev),
    pct(fy29.gaapGrossProfit, fy29.totalGrossRev),
    'Expands from AI model deflation + rising White-Label B2B2C, Vault & BYOK mix',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'GCP Startup Credit Offset — $2K Start Tier (Pre-Launch + Jan 2027)',
    fy27.credit2kUsed,
    0,
    0,
    '$2,000 Start Tier ($750 Nov-Dec 2026 showcase rendering + $1,250 Jan 2027 offset)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'GCP / NVIDIA Startup Credit Offset — Base $100k Partner Track (USD)',
    fy27.credit100kUsed,
    fy28.credit100kUsed,
    0,
    `$100k Year 1 (100% deployed inside FY27 covering ${pct(fy27.credit100kUsed, fy27.gcpCogs)} of Year-1 GCP compute) + $100k Year 2 offset`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'GCP / NVIDIA Startup Credit Offset — $250k AI-First Track (USD)',
    fy27.credit250kUsed,
    fy28.credit250kUsed,
    0,
    `Offsets ${pct(fy27.credit250kUsed, fy27.gcpCogs)} of FY27 GCP compute + ${fmtUsd(fy28.credit250kUsed)} applied in FY28 as GCP compute scales >$2.0M/yr`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Cash Gross Profit — Base $100k Credit Track (USD)',
    fy27.cashGp100k,
    fy28.cashGp100k,
    fy29.cashGp100k,
    `${pct(fy27.cashGp100k, fy27.totalGrossRev)} in FY27; ${pct(fy28.cashGp100k, fy28.totalGrossRev)} in FY28; ${pct(fy29.cashGp100k, fy29.totalGrossRev)} in FY29`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Cash Gross Profit — $250k AI-First Credit Track (USD)',
    fy27.cashGp250k,
    fy28.cashGp250k,
    fy29.cashGp250k,
    `${pct(fy27.cashGp250k, fy27.totalGrossRev)} in FY27; ${pct(fy28.cashGp250k, fy28.totalGrossRev)} in FY28; ${pct(fy29.cashGp250k, fy29.totalGrossRev)} in FY29`,
  ],
  // OpEx & EBITDA
  [
    '3-YEAR P&L & KPI FORECAST',
    'R&D / Engineering & Product OpEx (USD)',
    fy27.rdOpex,
    fy28.rdOpex,
    fy29.rdOpex,
    `${pct(fy27.rdOpex, fy27.totalGrossRev)} of rev in FY27 -> ${pct(fy28.rdOpex, fy28.totalGrossRev)} in FY28 -> ${pct(fy29.rdOpex, fy29.totalGrossRev)} in FY29 (stateless multi-tenant cloud leverage)`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'S&M — 18-35 Creator, Podcaster & Explorer Funnel across EN/ES/PT/HI/ZH/AR (USD)',
    fy27.smCreatorOpex,
    fy28.smCreatorOpex,
    fy29.smCreatorOpex,
    'Self-serve creator & $9 Explorer acquisition across EN, ES, PT, HI, ZH, AR (+ TH organic)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'S&M — 18-35 Side/Primary Hustle Video Business Marketing across EN/ES/PT/HI/ZH/AR (USD)',
    fy27.smB2bOpex,
    fy28.smB2bOpex,
    fy29.smB2bOpex,
    'Reinvests early revenue to scale White-Label Video Service Businesses 500 -> 5,000 -> 50,000 across 6 core language markets',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Sales & Marketing Reinvestment OpEx (USD)',
    fy27.smTotalOpex,
    fy28.smTotalOpex,
    fy29.smTotalOpex,
    `${pct(fy27.smTotalOpex, fy27.totalGrossRev)} of rev in FY27 -> ${pct(fy28.smTotalOpex, fy28.totalGrossRev)} in FY28 -> ${pct(fy29.smTotalOpex, fy29.totalGrossRev)} in FY29`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'General & Administrative OpEx (USD)',
    fy27.gaOpex,
    fy28.gaOpex,
    fy29.gaOpex,
    `${pct(fy27.gaOpex, fy27.totalGrossRev)} of rev in FY27 -> ${pct(fy28.gaOpex, fy28.totalGrossRev)} in FY28 -> ${pct(fy29.gaOpex, fy29.totalGrossRev)} in FY29`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Operating Expenses (USD)',
    fy27.totalOpex,
    fy28.totalOpex,
    fy29.totalOpex,
    '100% funded organically from operating gross profit via revenue reinvestment flywheel',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'GAAP Operating Income / EBITDA (USD)',
    fy27.gaapEbitda,
    fy28.gaapEbitda,
    fy29.gaapEbitda,
    `GAAP EBITDA Margin: ${pct(fy27.gaapEbitda, fy27.totalGrossRev)} (FY27) -> ${pct(fy28.gaapEbitda, fy28.totalGrossRev)} (FY28) -> ${pct(fy29.gaapEbitda, fy29.totalGrossRev)} (FY29)`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Cash Operating Income / EBITDA — $2K Start Tier Only (USD)',
    fy27.cashEbitda2k,
    fy28.gaapEbitda,
    fy29.gaapEbitda,
    'Self-sustaining profitability from Month 1 even with initial $2K Start Tier credits alone',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Cash Operating Income / EBITDA — $100k Credit Track (USD)',
    fy27.cashEbitda100k,
    fy28.cashEbitda100k,
    fy29.cashEbitda100k,
    `Cash EBITDA Margin: ${pct(fy27.cashEbitda100k, fy27.totalGrossRev)} (FY27) -> ${pct(fy28.cashEbitda100k, fy28.totalGrossRev)} (FY28) -> ${pct(fy29.cashEbitda100k, fy29.totalGrossRev)} (FY29)`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Cash Operating Income / EBITDA — $250k AI-First Track (USD)',
    fy27.cashEbitda250k,
    fy28.cashEbitda250k,
    fy29.cashEbitda250k,
    `Cash EBITDA Margin: ${pct(fy27.cashEbitda250k, fy27.totalGrossRev)} (FY27) -> ${pct(fy28.cashEbitda250k, fy28.totalGrossRev)} (FY28) -> ${pct(fy29.cashEbitda250k, fy29.totalGrossRev)} (FY29)`,
  ],
  blankRow6,
  blankRow6,
  // TABLE 2: SIDE-BY-SIDE 500 / 5,000 / 50,000 VIDEO SERVICE BUSINESS STEADY-STATE RUN-RATE TABLE
  [
    'VIDEO SERVICE COHORT SCALE',
    'Steady-State Video Service Milestone Metric',
    '500 Businesses (FY27 Exit)',
    '5,000 Businesses (FY28 Exit)',
    '50,000 Businesses (FY29 Exit)',
    'Unit Basis & White-Label Portal Assumptions (85% Side/Primary Hustle Pro · 15% Studio)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Active White-Label Pro Operators ($149/mo - Side & Primary Hustle)',
    cohort500.proCount,
    cohort5000.proCount,
    cohort50000.proCount,
    '18-35 side-hustle & full-time Video Memoir, Property Tour & Brand Story operators (15,000 cr/mo included)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Active White-Label Studio Agencies ($599/mo - Scaled Multi-Seat)',
    cohort500.studioCount,
    cohort5000.studioCount,
    cohort50000.studioCount,
    'Scaled multi-PM agencies, brokerages & corporate L&D teams (75,000 cr/mo + 10 seats + RBAC caps)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Monthly Paid $29 Client Blueprint Passes Processed',
    cohort500.monthlyBlueprints,
    cohort5000.monthlyBlueprints,
    cohort50000.monthlyBlueprints,
    '9 passes/mo per Pro + 30 passes/mo per Studio (~$3.90 max AI compute -> 83% self-funding discovery margin)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Monthly Full Client Productions Delivered',
    cohort500.monthlyFilms,
    cohort5000.monthlyFilms,
    cohort50000.monthlyFilms,
    '6 films/mo per Pro (side + primary hustle blend) + 20 films/mo per Studio across Baby Boomer Memoirs, Real Estate, Training & Brand',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Annualized Client Productions Delivered',
    cohort500.annualFilms,
    cohort5000.annualFilms,
    cohort50000.annualFilms,
    '48,600 -> 486,000 -> 4,860,000 commissioned client films/year rendered on SceneFlow (<0.3% global Boomer + SMB TAM)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Annualized Operator Ecosystem Client GMV (USD)',
    cohort500.annualOperatorGmv,
    cohort5000.annualOperatorGmv,
    cohort50000.annualOperatorGmv,
    '$31.30M -> $312.99M -> $3.13B annual client billings earned by operators (~78-83% operator net margin)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'SceneFlow Base SaaS MRR from Video Service Businesses (USD)',
    cohort500.baseSaasMrr,
    cohort5000.baseSaasMrr,
    cohort50000.baseSaasMrr,
    'Pro * $149 + Studio * $599 ($108,250/mo -> $1,082,500/mo -> $10,825,000/mo)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'SceneFlow Monthly 12-Mo Add-On Credit Packs (USD)',
    cohort500.addOnMonthly,
    cohort5000.addOnMonthly,
    cohort50000.addOnMonthly,
    '$85/mo per Pro + $240/mo per Studio ($100/$250 packs funding client volume above base credits)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'SceneFlow Monthly BYOK 20% Orchestration Fees (USD)',
    cohort500.byokMonthly,
    cohort5000.byokMonthly,
    cohort50000.byokMonthly,
    '$12/mo per Pro + $60/mo per Studio (~95% gross margin platform orchestration fee)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Total SceneFlow Monthly Run-Rate — Video Service Segment (USD)',
    cohort500.totalMonthlyRev,
    cohort5000.totalMonthlyRev,
    cohort50000.totalMonthlyRev,
    `Blended SceneFlow ARPU: $${cohort500.blendedMonthlyArpu.toFixed(2)}/mo ($${(cohort500.blendedMonthlyArpu * 12).toFixed(0)}/yr) per active Video Service Business`,
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Total SceneFlow Annualized Revenue Run-Rate — Video Service Segment (USD)',
    cohort500.totalAnnualRev,
    cohort5000.totalAnnualRev,
    cohort50000.totalAnnualRev,
    `Effective SceneFlow software+compute take-rate = ${cohort5000.takeRateOfGmvPct} of Operator Client GMV`,
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Standalone Video Service Segment Gross Profit Run-Rate (USD)',
    cohort500.annualGrossProfit,
    cohort5000.annualGrossProfit,
    cohort50000.annualGrossProfit,
    `Segment GAAP Gross Margin: ${cohort500.grossMarginPct} (500) -> ${cohort5000.grossMarginPct} (5,000) -> ${cohort50000.grossMarginPct} (50,000)`,
  ],
  blankRow6,
  blankRow6,
  // TABLE 3: 6 PAID 18-35 MARKETING MARKETS + ORGANIC THAI/SEA MIX
  [
    'GLOBAL MARKET MIX (6 PAID + 1 ORGANIC)',
    'Language Market & 18-35 Marketing Focus',
    '500 Studios (FY27 Exit)',
    '5,000 Studios (FY28 Exit)',
    '50,000 Studios (FY29 Exit)',
    'Total Combined Subscribers (FY27 / FY28 / FY29) & Regional Supply/Demand Drivers',
  ],
  ...MARKET_SHARES.map((m, idx) => {
    const s27 = allocateExactByShare(fy27.totalSubsExit, MARKET_SHARES)[idx]
    const s28 = allocateExactByShare(fy28.totalSubsExit, MARKET_SHARES)[idx]
    const s29 = allocateExactByShare(fy29.totalSubsExit, MARKET_SHARES)[idx]
    const regionalDrivers = {
      en: 'Paid 18-35 Reinvestment (US, UK, CA, AU) — 70M+ Baby Boomer Legacy Video Memoirs, Real Estate & SMB Packs',
      es: 'Paid 18-35 Reinvestment (US Hispanic, Mexico, Spain, LATAM) — Multi-generational Abuelos Memoirs, Property & SMBs',
      hi: 'Paid 18-35 Reinvestment (India & Global Diaspora) — Parents Milestone/Anniversary Legacy Films, EdTech & Corporate SOPs',
      'zh-CN': 'Paid 18-35 Reinvestment (Taiwan, Singapore & Global Diaspora) — Family Heritage Biographies & Cross-Border Commerce/Property',
      pt: 'Paid 18-35 Reinvestment (Brazil & Portugal) — High-velocity Youth Side-Hustle Creators, Family Memoirs & Boutique Agencies',
      ar: 'Paid 18-35 Reinvestment (UAE, Saudi Arabia & MENA) — Family Heritage Tributes, Luxury Villa/Hospitality Tours & L&D',
      th: 'Organic Native UI Adoption (Thailand & SEA) — Boutique Resort/Hospitality Walkthroughs & Creator Studios',
    }[m.code]
    return [
      'GLOBAL MARKET MIX (6 PAID + 1 ORGANIC)',
      m.label,
      cohort500.byLang[idx],
      cohort5000.byLang[idx],
      cohort50000.byLang[idx],
      `Total Subs: ${s27.toLocaleString('en-US')} / ${s28.toLocaleString('en-US')} / ${s29.toLocaleString('en-US')} — ${regionalDrivers}`,
    ]
  }),
  blankRow6,
  blankRow6,
  // TABLE 4: TIER & WHITE-LABEL WORKFLOW UNIT ECONOMICS
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Tier / White-Label Workflow',
    'Price / Typical Fee (USD)',
    'Credits / Compute',
    'Q1 -> Q4+ GAAP Margin %',
    'Customer / Operator Value Proposition',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Founding Operator 90-Day Charter',
    '299.00',
    '18000',
    '56.2% -> 76.0%',
    '25-seat Launchpad: 1st $599 Baby Boomer memoir nets operator +$300 cash & pays back entire Charter on Order #1',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Client $29 Storyboard Blueprint Pass (Operator Portal)',
    '29.00',
    '390',
    '80.5% -> 86.5%',
    'Zero-PM-time automated paid discovery: client pays $29 on <=$3.90 max SceneFlow compute (83%+ operator discovery margin)',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Explorer (One-Time 30-Day Test Flight)',
    '9.00',
    '750',
    '65.6% -> 79.8%',
    'Self-liquidating 18-35 prospective side-hustle operator & creator onboarding wedge',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Hobbyist (Monthly Storyteller & Vault)',
    '19.00',
    '1500',
    '67.9% -> 81.2%',
    'Personal storytellers & active 10 GB Continuity Vault retention',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Starter (Monthly Chapter & Pre-Vis Pitch)',
    '49.00',
    '4500',
    '63.4% -> 79.4%',
    '5-15 min episodic chapters & indie filmmaker Pre-Vis funding packages',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Pro (Monthly Side/Primary Hustle Operator & Series)',
    '149.00',
    '15000',
    '58.1% -> 76.8%',
    '90%-automated white-label portals (/intake, /blueprint/share, /screening-room) + 100 GB Vault + 4K + BYOK',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Studio (Monthly Multi-Seat Agency & B2B)',
    '599.00',
    '75000',
    '54.6% -> 75.1%',
    '10 team seats, PM RBAC credit caps, 500 GB Vault, 25 voice clones & 4K Priority Queue',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    '$100 / $250 Subscriber Add-On Packs (12-Mo)',
    '100.00 / 250.00',
    '9000 / 25000',
    '56.2% -> 76.4%',
    'Primary expansion vehicle as side-hustlers scale into full-time 8-20+ film/month primary businesses',
  ],
  blankRow6,
  blankRow6,
  // TABLE 5: AI MODEL DEFLATION CURVE
  [
    'MODEL DEFLATION CURVE',
    'AI Operation (`creditCosts.ts`)',
    'Q1 2027 Provider Cost ($)',
    'Q4 2027+ Provider Cost ($)',
    'Retail Credit Value ($)',
    'Q1 -> Q4+ GAAP Margin %',
  ],
  ['MODEL DEFLATION CURVE', 'Veo 3.1 Fast Video Segment (1080p 8s + EXT)', '0.75', '0.34', '1.50', '50.0% -> 77.3%'],
  ['MODEL DEFLATION CURVE', 'Veo 3.1 Quality Video Segment (4K 8s)', '1.30', '0.58', '2.50', '48.0% -> 76.8%'],
  ['MODEL DEFLATION CURVE', 'Imagen 4 Storyboard / Blueprint Beat Frame (1K)', '0.04', '0.018', '0.10', '60.0% -> 82.0%'],
  ['MODEL DEFLATION CURVE', 'ElevenLabs / Studio Multilingual TTS (per 1K chars)', '0.35', '0.16', '0.80', '56.3% -> 80.0%'],
  ['MODEL DEFLATION CURVE', 'Client $29 Blueprint Pass (Intake + 6 Stills + VO + 4 Rev + 3 AR)', '1.75', '0.82', '3.90', '55.1% -> 79.0%'],
  ['MODEL DEFLATION CURVE', '12-Min Commissioned Family Video Memoir ($599-$649 Client Retail)', '15.80', '7.20', '34.00', '53.5% -> 78.8%'],
  ['MODEL DEFLATION CURVE', '2-Min Narrated 4K Property Tour ($299 Client Retail)', '6.90', '3.15', '15.00', '54.0% -> 79.0%'],
  ['MODEL DEFLATION CURVE', '10-Min Multilingual Corporate SOP Module ($950 Client Retail)', '18.50', '8.40', '40.00', '53.8% -> 79.0%'],
  blankRow6,
  blankRow6,
  // TABLE 6: 3-YEAR SCENARIO SENSITIVITY
  [
    'SCENARIO SENSITIVITY',
    '3-Year Scenario (Video Service Studios FY27 -> FY28 -> FY29)',
    'FY2029 Recognized Revenue ($)',
    'Dec 2029 Exit Base ARR ($)',
    'FY2029 GAAP EBITDA ($)',
    'Key Scenario Drivers',
  ],
  [
    'SCENARIO SENSITIVITY',
    'Conservative (150 -> 1,500 -> 15,000 Studios)',
    '48500000',
    '58200000',
    '19800000',
    'Slower paid social ramp; 80%+ gross margins still sustain ~41% EBITDA margin at 15,000 studios',
  ],
  [
    'SCENARIO SENSITIVITY',
    'Base Case (500 -> 5,000 -> 50,000 Studios)',
    String(fy29.totalGrossRev),
    String(fy29.exitBaseArr),
    String(fy29.gaapEbitda),
    'Core plan: 18-35 side/primary hustle surge + Baby Boomer Video Memoirs + 6-language revenue reinvestment ($206.4M B2B2C run-rate)',
  ],
  [
    'SCENARIO SENSITIVITY',
    'Bull Case (1,000 -> 10,000 -> 100,000 Studios)',
    '278000000',
    '342000000',
    '124000000',
    'Viral TikTok/Reels/Shorts operator breakout + senior-living, estate-planning & MLS partnerships across EN/ES/PT/HI/ZH/AR',
  ],
]

// ============================================================================
// BUILD MARKDOWN SUMMARY: docs/SCENEFLOW_FINANCIAL_BUSINESS_MODEL.md
// ============================================================================
const mdContent = `# SceneFlow AI — Financial & Business Model (2027–2029)
**Global White-Label Video Service Business Scale (\`500\` → \`5,000\` → \`50,000\` Studios) + Self-Serve Creator SaaS Powered by 6-Market \`18–35\` Operator Acquisition**

- **12-Month FY 2027 Monthly Model (CSV):** [\`docs/sceneflow_financial_model_2027_12month.csv\`](./sceneflow_financial_model_2027_12month.csv)
- **3-Year FY 2027–2029 Forecast & Cohort Model (CSV):** [\`docs/sceneflow_financial_model_2027_2029_3year.csv\`](./sceneflow_financial_model_2027_2029_3year.csv)
- **Business Model Classification:** 100% Multi-Tenant AI Video SaaS Platform & Continuity Operating System *(Whop Merchant of Record Live)*

---

## 1. Executive Thesis: Two-Sided Demographic Wave ("Easy-Button" \`18–35\` Hustle × Baby Boomer Legacy Memoirs)

SceneFlow AI sits at the intersection of two massive global demographic trends—running on a stateless, infinitely scalable Google Cloud Vertex AI + Cloud Run multi-tenant architecture across **7 native UI languages** and **70+ dubbing locales**:

1. **Supply-Side Operator Surge (\`18–35\` Side-Hustle & Primary-Hustle Entrepreneurs):**  
   Millions of digitally native **\`18–35\` year olds** across **English (\`EN\`), Spanish (\`ES\`), Portuguese (\`PT\`), Hindi (\`HI\`), Chinese (\`ZH\`), and Arabic (\`AR\`)** markets are actively searching for high-margin, turnkey AI side hustles and primary businesses with "easy-button" fulfillment. SceneFlow's white-label portals (\`/intake\`, \`/blueprint/share\` with the self-funding **\`$29\` Storyboard Blueprint Pass**, \`/share/continuity\`, and \`/share/screening-room\`) automate **90% of client intake, storyboarding, revisions, and delivery**—requiring zero camera crews, zero cold calls, and only ~60–90 active minutes per film.
2. **Demand-Side Client Wave (Baby Boomer Legacy Video Memoirs + Local SMBs):**  
   Over **70 million Baby Boomers** in North America and **hundreds of millions of aging parents and multi-generational families worldwide** want affordable, cinema-grade **Video Memoirs & Family Legacy Films** (\`$349–$950\` vs. \`$2,500–$10,000\` traditional crews), alongside realtors, corporate training teams, and SMBs needing localized video. A single \`$599–$649\` Video Memoir nets the operator **\`+$477–$530\` profit (\`80%–82%\` margin)**—paying back a \`$149/mo\` **Pro** subscription more than **\`3×\` on Order #1**.
3. **Self-Funding 6-Language Marketing Reinvestment Flywheel (\`500\` → \`5,000\` → \`50,000\` Studios):**  
   Because every \`$9\` Explorer Test Flight, \`$299\` Founding Charter, \`$149/mo\` Pro plan, and \`$100/$250\` credit pack is gross-margin positive from Day 1 (\`${pct(fy27.gaapGrossProfit, fy27.totalGrossRev)}\` FY27 → \`${pct(fy29.gaapGrossProfit, fy29.totalGrossRev)}\` FY29 GAAP Gross Margin), SceneFlow reinvests **28.5%–37.7% of gross revenue** directly into short-form proof-of-income social campaigns (TikTok, Instagram Reels, YouTube Shorts, and creator business affiliates) targeting the **\`18–35\` demographic across \`EN\`, \`ES\`, \`PT\`, \`HI\`, \`ZH\`, and \`AR\`** (+ organic \`TH\`/SEA)—scaling active White-Label Video Service Businesses from **\`500\` (FY27 Exit)** → **\`5,000\` (FY28 Exit)** → **\`50,000\` (FY29 Exit)** alongside **\`2,500\` → \`18,000\` → \`90,000\`** Self-Serve Creators.

By **December 2029 (\`50,000\` Video Service Businesses)**, the B2B2C Video Service segment alone generates **\`${fmtUsd(cohort50000.totalAnnualRev)}/yr\`** in annualized SceneFlow revenue (**\`${dec2029B2bShareRunRatePct}\`** of platform recurring + compute run-rate) while enabling **\`${fmtUsd(cohort50000.annualOperatorGmv)}/yr\`** in operator client billings—at an effective SceneFlow software + compute take-rate of just **\`${cohort50000.takeRateOfGmvPct}\` of operator GMV**.

---

## 2. Unit Economics per Active Video Service Business (Side-Hustle + Primary-Hustle Blend)

### A. The Self-Funding \`$29\` Client Doorway & 4 Turnkey Verticals

| Deliverable / Stage | Typical Client Price | SceneFlow Retail Credits | Provider AI COGS (Q4 2027) | Operator Net Margin | SceneFlow Gross Margin |
|---|---:|---:|---:|---:|---:|
| **Paid Discovery: \`$29\` Storyboard Blueprint Pass** *(Intake + 6 Stills + VO + up to 4 AI Revisions + 3 AR Passes)* | \`$29\` *(100% credited to order)* | \`<=$3.90\` (\`390 cr\`) | \`~$0.82\` | **83%+** (\`+$23.96\` net) | **79.0%** |
| **1. Baby Boomer Video Memoirs & Family Biographies** *(12-min multi-era film, 2 langs)* | \`$599 – $649\` | \`$34.00\` (\`3,400 cr\`) | \`~$7.20\` | **80%–82%** (\`+$477–$530\`) | **78.8%** |
| **2. Real Estate & Hospitality Cinema Tours** *(2-min 4K tour, 2 langs)* | \`$299\` | \`$15.00\` (\`1,500 cr\`) | \`~$3.15\` | **78%** (\`+$234\`) | **79.0%** |
| **3. Corporate Onboarding & Safety SOPs** *(10-min module, 3 workforce langs)* | \`$950\` | \`$40.00\` (\`4,000 cr\`) | \`~$8.40\` | **83%** (\`+$785\`) | **79.0%** |
| **4. Founder Origin & SMB Brand Packs** *(2-min film + two 9:16 social ads)* | \`$650\` | \`$28.00\` (\`2,800 cr\`) | \`~$5.90\` | **82%** (\`+$534\`) | **78.9%** |

### B. Monthly SceneFlow ARPU per Active Video Service Business (\`85%\` Pro / \`15%\` Studio Mix)

*Reflects a realistic mix of \`18–35\` part-time side-hustlers (\`3–4\` films/mo earning \`~$1.8K–$2.4K/mo\`), full-time primary-hustlers (\`8–12\` films/mo earning \`~$5.0K–$7.5K/mo\`), and scaled multi-seat agencies (\`20\` films/mo):*

| Operator Archetype | Mix Share | Base SaaS Plan | Monthly Client Output | Add-On Credit Packs / Mo | BYOK Fees / Mo | **Total SceneFlow ARPU / Mo** | **Operator Client GMV / Mo** |
|---|---:|---:|---|---:|---:|---:|---:|
| **White-Label Pro Operator** *(Side + Primary Hustle Blend)* | **85%** | \`$149/mo\` *(15,000 cr incl.)* | \`9\` \`$29\` Passes → \`6\` Films/mo | \`$85/mo\` | \`$12/mo\` | **\`$246.00 / mo\`** (\`$2,952/yr\`) | \`$3,687 / mo\` (\`$44.2K/yr\`) |
| **Multi-Seat Studio Agency** *(Scaled Operators & Teams)* | **15%** | \`$599/mo\` *(75,000 cr incl.)* | \`30\` \`$29\` Passes → \`20\` Films/mo | \`$240/mo\` | \`$60/mo\` | **\`$899.00 / mo\`** (\`$10,788/yr\`) | \`$13,890 / mo\` (\`$166.7K/yr\`) |
| **Blended Video Service Business** | **100%** | **\`$${BLENDED_STUDIO.baseSaas.toFixed(2)}/mo\`** | **\`${BLENDED_STUDIO.passesPerMo.toFixed(1)}\` Passes → \`${BLENDED_STUDIO.filmsPerMo.toFixed(1)}\` Films/mo** | **\`$${BLENDED_STUDIO.addOnMonthly.toFixed(2)}/mo\`** | **\`$${BLENDED_STUDIO.byokMonthly.toFixed(2)}/mo\`** | **\`$${BLENDED_STUDIO.arpuMonthly.toFixed(2)} / mo\`** (\`$${Math.round(BLENDED_STUDIO.arpuMonthly * 12).toLocaleString('en-US')}/yr\`) | **\`$${Math.round(BLENDED_STUDIO.clientGmvMonthly).toLocaleString('en-US')} / mo\`** (\`$${(BLENDED_STUDIO.clientGmvMonthly * 12 / 1000).toFixed(1)}K/yr\`) |

---

## 3. Side-by-Side Steady-State Run-Rate: \`500\` vs. \`5,000\` vs. \`50,000\` Global Video Service Businesses

*Standalone B2B2C Video Service segment run-rate at each year-end milestone (before counting self-serve Creator B2C revenue):*

| Video Service Segment Metric | **500 Businesses** *(FY 2027 Exit)* | **5,000 Businesses** *(FY 2028 Exit)* | **50,000 Businesses** *(FY 2029 Exit)* |
|---|---:|---:|---:|
| **Active White-Label Pro Operators (\`$149/mo\`)** | \`${fmtNum(cohort500.proCount)}\` | \`${fmtNum(cohort5000.proCount)}\` | \`${fmtNum(cohort50000.proCount)}\` |
| **Active White-Label Studio Agencies (\`$599/mo\`)** | \`${fmtNum(cohort500.studioCount)}\` | \`${fmtNum(cohort5000.studioCount)}\` | \`${fmtNum(cohort50000.studioCount)}\` |
| **Paid \`$29\` Blueprint Passes / Month** | \`${fmtNum(cohort500.monthlyBlueprints)} / mo\` | \`${fmtNum(cohort5000.monthlyBlueprints)} / mo\` | \`${fmtNum(cohort50000.monthlyBlueprints)} / mo\` |
| **Commissioned Client Films Delivered / Year** | \`${fmtNum(cohort500.annualFilms)} / yr\` | \`${fmtNum(cohort5000.annualFilms)} / yr\` | \`${fmtNum(cohort50000.annualFilms)} / yr\` |
| **Operator Ecosystem Client GMV / Year** | **\`${fmtUsd(cohort500.annualOperatorGmv)}\`** | **\`${fmtUsd(cohort5000.annualOperatorGmv)}\`** | **\`${fmtUsd(cohort50000.annualOperatorGmv)}\`** |
| SceneFlow Base SaaS MRR (\`Pro\` + \`Studio\`) | \`${fmtUsd(cohort500.baseSaasMrr)} / mo\` | \`${fmtUsd(cohort5000.baseSaasMrr)} / mo\` | \`${fmtUsd(cohort50000.baseSaasMrr)} / mo\` |
| SceneFlow 12-Mo Add-On Credit Packs / Mo | \`${fmtUsd(cohort500.addOnMonthly)} / mo\` | \`${fmtUsd(cohort5000.addOnMonthly)} / mo\` | \`${fmtUsd(cohort50000.addOnMonthly)} / mo\` |
| SceneFlow BYOK 20% Orchestration Fees / Mo | \`${fmtUsd(cohort500.byokMonthly)} / mo\` | \`${fmtUsd(cohort5000.byokMonthly)} / mo\` | \`${fmtUsd(cohort50000.byokMonthly)} / mo\` |
| **Total Video Service Monthly Revenue Run-Rate** | **\`${fmtUsd(cohort500.totalMonthlyRev)} / mo\`** | **\`${fmtUsd(cohort5000.totalMonthlyRev)} / mo\`** | **\`${fmtUsd(cohort50000.totalMonthlyRev)} / mo\`** |
| **Total Video Service Annualized Revenue Run-Rate** | **\`${fmtUsd(cohort500.totalAnnualRev)} / yr\`** | **\`${fmtUsd(cohort5000.totalAnnualRev)} / yr\`** | **\`${fmtUsd(cohort50000.totalAnnualRev)} / yr\`** |
| **Video Service Segment Gross Profit Run-Rate** | **\`${fmtUsd(cohort500.annualGrossProfit)} / yr\`** (\`${cohort500.grossMarginPct}\`) | **\`${fmtUsd(cohort5000.annualGrossProfit)} / yr\`** (\`${cohort5000.grossMarginPct}\`) | **\`${fmtUsd(cohort50000.annualGrossProfit)} / yr\`** (\`${cohort50000.grossMarginPct}\`) |

### Geographic Distribution: 6 Priority \`18–35\` Paid Marketing Markets + Organic SEA

*97% of paid marketing reinvestment targets ages \`18–35\` across **English, Spanish, Hindi, Chinese, Portuguese, and Arabic** markets, complemented by organic adoption in **Thai & SEA**:*

| Language Market | Global Share | **500 Studios** *(FY27)* | **5,000 Studios** *(FY28)* | **50,000 Studios** *(FY29)* | \`18–35\` Operator Acquisition & Local Client Demand |
|---|---:|---:|---:|---:|---|
| **1. English (\`en\` — Paid Focus)** | 30% | \`${fmtNum(cohort500.byLang[0])}\` | \`${fmtNum(cohort5000.byLang[0])}\` | \`${fmtNum(cohort50000.byLang[0])}\` | US, UK, Canada, AU — \`70M+\` Baby Boomer Legacy Memoirs, Real Estate & SMB Video |
| **2. Spanish (\`es\` — Paid Focus)** | 17% | \`${fmtNum(cohort500.byLang[1])}\` | \`${fmtNum(cohort5000.byLang[1])}\` | \`${fmtNum(cohort50000.byLang[1])}\` | US Hispanic, Mexico, Spain, LATAM — Multi-generational *Abuelos* Memoirs & SMB Packs |
| **3. Hindi (\`hi\` — Paid Focus)** | 16% | \`${fmtNum(cohort500.byLang[2])}\` | \`${fmtNum(cohort5000.byLang[2])}\` | \`${fmtNum(cohort50000.byLang[2])}\` | India & Diaspora — Parents Milestone/Anniversary Legacy Films, EdTech & Training |
| **4. Chinese (\`zh-CN\` — Paid Focus)** | 14% | \`${fmtNum(cohort500.byLang[3])}\` | \`${fmtNum(cohort5000.byLang[3])}\` | \`${fmtNum(cohort50000.byLang[3])}\` | Taiwan, Singapore & Global Diaspora — Family Heritage Films & Cross-Border Property |
| **5. Portuguese (\`pt\` — Paid Focus)** | 12% | \`${fmtNum(cohort500.byLang[4])}\` | \`${fmtNum(cohort5000.byLang[4])}\` | \`${fmtNum(cohort50000.byLang[4])}\` | Brazil & Portugal — High-velocity Youth Side-Hustle Creators, Memoirs & Local Agencies |
| **6. Arabic (\`ar\` — Paid Focus)** | 8% | \`${fmtNum(cohort500.byLang[5])}\` | \`${fmtNum(cohort5000.byLang[5])}\` | \`${fmtNum(cohort50000.byLang[5])}\` | UAE, Saudi Arabia & MENA — Family Heritage Biographies & Luxury Villa/Hospitality Tours |
| **7. Thai & SEA (\`th\` — Organic UI)** | 3% | \`${fmtNum(cohort500.byLang[6])}\` | \`${fmtNum(cohort5000.byLang[6])}\` | \`${fmtNum(cohort50000.byLang[6])}\` | Thailand & SEA — Organic Boutique Resort/Hospitality Walkthroughs & Creator Studios |
| **Total Global Studios** | **100%** | **\`500\`** | **\`5,000\`** | **\`50,000\`** | **6 Paid \`18–35\` Acquisition Markets + Organic SEA · 70+ Synced Delivery Languages** |

---

## 4. Consolidated 3-Year Financial Forecast (\`FY 2027\` – \`FY 2029\`)

*Combines the \`500 → 5,000 → 50,000\` Video Service Business (\`B2B2C\`) growth spine with Self-Serve Creators (\`B2C\`: \`2,500 → 18,000 → 90,000\` active subscribers) and explicit marketing reinvestment:*

| Metric / P&L Line Item | **FY 2027** *(\`500\` Studios)* | **FY 2028** *(\`5,000\` Studios)* | **FY 2029** *(\`50,000\` Studios)* |
|---|---:|---:|---:|
| **Ending Active Video Service Businesses (\`B2B2C\`)** | **\`${fmtNum(fy27.b2bTotalExit)}\`** | **\`${fmtNum(fy28.b2bTotalExit)}\`** | **\`${fmtNum(fy29.b2bTotalExit)}\`** |
| **Ending Active Self-Serve Creators (\`B2C\`)** | \`${fmtNum(fy27.creatorTotalExit)}\` | \`${fmtNum(fy28.creatorTotalExit)}\` | \`${fmtNum(fy29.creatorTotalExit)}\` |
| **Total Ending Active Subscribers** | **\`${fmtNum(fy27.totalSubsExit)}\`** | **\`${fmtNum(fy28.totalSubsExit)}\`** | **\`${fmtNum(fy29.totalSubsExit)}\`** |
| Annual \`$9\` Explorer Studio Test Flights | \`${fmtNum(fy27.explorerBuyers)}\` | \`${fmtNum(fy28.explorerBuyers)}\` | \`${fmtNum(fy29.explorerBuyers)}\` |
| **Exit Base Subscription ARR (Dec Base MRR × 12)** | **\`${fmtUsd(fy27.exitBaseArr)}\`** | **\`${fmtUsd(fy28.exitBaseArr)}\`** | **\`${fmtUsd(fy29.exitBaseArr)}\`** |
| **Recognized Revenue — Video Service \`B2B2C\`** | **\`${fmtUsd(fy27.b2bTotalRev)}\`** | **\`${fmtUsd(fy28.b2bTotalRev)}\`** | **\`${fmtUsd(fy29.b2bTotalRev)}\`** |
| **Recognized Revenue — Self-Serve Creator & Network \`B2C\`** | \`${fmtUsd(fy27.creatorTotalRev)}\` | \`${fmtUsd(fy28.creatorTotalRev)}\` | \`${fmtUsd(fy29.creatorTotalRev)}\` |
| **Total Recognized Gross Revenue** | **\`${fmtUsd(fy27.totalGrossRev)}\`** | **\`${fmtUsd(fy28.totalGrossRev)}\`** | **\`${fmtUsd(fy29.totalGrossRev)}\`** |
| Total Un-Subsidized GAAP COGS *(GCP + 3P APIs + Whop 3.8%)* | \`${fmtUsd(fy27.totalGaapCogs)}\` | \`${fmtUsd(fy28.totalGaapCogs)}\` | \`${fmtUsd(fy29.totalGaapCogs)}\` |
| **GAAP Gross Profit (Un-Subsidized)** | **\`${fmtUsd(fy27.gaapGrossProfit)}\`** (\`${pct(fy27.gaapGrossProfit, fy27.totalGrossRev)}\`) | **\`${fmtUsd(fy28.gaapGrossProfit)}\`** (\`${pct(fy28.gaapGrossProfit, fy28.totalGrossRev)}\`) | **\`${fmtUsd(fy29.gaapGrossProfit)}\`** (\`${pct(fy29.gaapGrossProfit, fy29.totalGrossRev)}\`) |
| Sales & Marketing Reinvestment *(6-Lang \`18–35\` Growth)* | \`${fmtUsd(fy27.smTotalOpex)}\` (\`${pct(fy27.smTotalOpex, fy27.totalGrossRev)}\`) | \`${fmtUsd(fy28.smTotalOpex)}\` (\`${pct(fy28.smTotalOpex, fy28.totalGrossRev)}\`) | \`${fmtUsd(fy29.smTotalOpex)}\` (\`${pct(fy29.smTotalOpex, fy29.totalGrossRev)}\`) |
| Total Operating Expenses *(R&D + S&M + G&A)* | \`${fmtUsd(fy27.totalOpex)}\` | \`${fmtUsd(fy28.totalOpex)}\` | \`${fmtUsd(fy29.totalOpex)}\` |
| **GAAP Operating Income (EBITDA)** | **\`${fmtUsd(fy27.gaapEbitda)}\`** (\`${pct(fy27.gaapEbitda, fy27.totalGrossRev)}\`) | **\`${fmtUsd(fy28.gaapEbitda)}\`** (\`${pct(fy28.gaapEbitda, fy28.totalGrossRev)}\`) | **\`${fmtUsd(fy29.gaapEbitda)}\`** (\`${pct(fy29.gaapEbitda, fy29.totalGrossRev)}\`) |
| **Cash EBITDA (w/ \`$100K\` Startup Credit Track)** | **\`${fmtUsd(fy27.cashEbitda100k)}\`** (\`${pct(fy27.cashEbitda100k, fy27.totalGrossRev)}\`) | **\`${fmtUsd(fy28.cashEbitda100k)}\`** (\`${pct(fy28.cashEbitda100k, fy28.totalGrossRev)}\`) | **\`${fmtUsd(fy29.cashEbitda100k)}\`** (\`${pct(fy29.cashEbitda100k, fy29.totalGrossRev)}\`) |
| **Cash EBITDA (w/ \`$250K\` AI-First Credit Track)** | **\`${fmtUsd(fy27.cashEbitda250k)}\`** (\`${pct(fy27.cashEbitda250k, fy27.totalGrossRev)}\`) | **\`${fmtUsd(fy28.cashEbitda250k)}\`** (\`${pct(fy28.cashEbitda250k, fy28.totalGrossRev)}\`) | **\`${fmtUsd(fy29.cashEbitda250k)}\`** (\`${pct(fy29.cashEbitda250k, fy29.totalGrossRev)}\`) |

---

## 5. Cloud Scalability & Why Startup Credits Directly Fuel the \`500 → 5,000 → 50,000\` Flywheel

- **Zero-Bottleneck Stateless Cloud Scale:** Because client intake, Storyboard Blueprint generation, AI-filtered revisions, Continuity Vault storage, and Cloud Run FFmpeg assembly are **100% automated and stateless**, scaling from \`500\` to \`50,000\` operators requires zero SceneFlow human production staff—growing Google Cloud / Vertex AI consumption from **\`${fmtUsd(fy27.gcpCogs)}\` (FY27)** → **\`${fmtUsd(fy28.gcpCogs)}\` (FY28)** → **\`${fmtUsd(fy29.gcpCogs)}\` (FY29)**.
- **Startup Credits Unlock Immediate \`18–35\` Marketing Reinvestment:** Full-year FY 2027 GCP compute COGS is **\`${fmtUsd(fy27.gcpCogs)}\`**. Both the **\`$100,000\` Partner Track** (\`${pct(fy27.credit100kUsed, fy27.gcpCogs)}\` of FY27 GCP compute) and the **\`$250,000\` AI-First Year-1 Track** (\`${pct(fy27.credit250kUsed, fy27.gcpCogs)}\` of FY27 GCP compute) are **deployed inside Year 1**—freeing up to \`$250,000\` in operating cash to reinvest directly into \`18–35\` customer acquisition across \`EN\`, \`ES\`, \`PT\`, \`HI\`, \`ZH\`, and \`AR\`.
- **Self-Sustaining From Month 1:** Even on the initial \`$2,000\` Start Tier alone—and *after* funding **\`${fmtUsd(fy27.smTotalOpex)}\`** in Year-1 marketing reinvestment—SceneFlow generates positive monthly cash flow from **January 2027 (\`${fmtUsd(cashEbitda2k2027[0])}\`)** through **December 2027 (\`${fmtUsd(cashEbitda2k2027[11])}\`, \`${fmtUsd(fy27.cashEbitda2k)}\` full-year)**.
`

csv12Rows.forEach((row, idx) => {
  if (row.length !== 16) {
    throw new Error(`12month CSV row ${idx + 1} expected 16 cols, got ${row.length}: ${JSON.stringify(row)}`)
  }
})
csv3YrRows.forEach((row, idx) => {
  if (row.length !== 6) {
    throw new Error(`3year CSV row ${idx + 1} expected 6 cols, got ${row.length}: ${JSON.stringify(row)}`)
  }
})

writeFileSync(join(DOCS_DIR, 'sceneflow_financial_model_2027_12month.csv'), toCsv(csv12Rows), 'utf8')
writeFileSync(join(DOCS_DIR, 'sceneflow_financial_model_2027_2029_3year.csv'), toCsv(csv3YrRows), 'utf8')
writeFileSync(join(DOCS_DIR, 'SCENEFLOW_FINANCIAL_BUSINESS_MODEL.md'), mdContent, 'utf8')

console.log('=== Generated SceneFlow Financial Models (500 -> 5,000 -> 50,000 Studios) ===')
console.log(`FY27 Exit Subs: ${fy27.totalSubsExit} (${fy27.b2bTotalExit} B2B2C Studios + ${fy27.creatorTotalExit} Creators)`)
console.log(`FY27 Gross Rev: ${fmtUsd(fy27.totalGrossRev)} (B2B2C: ${fmtUsd(fy27.b2bTotalRev)} | Creator: ${fmtUsd(fy27.creatorTotalRev)})`)
console.log(`FY27 Dec Exit Base ARR: ${fmtUsd(fy27.exitBaseArr)} | Dec Total Run-Rate: ${fmtUsd(totalGrossRev2027[11] * 12)}`)
console.log(`FY27 GCP COGS: ${fmtUsd(fy27.gcpCogs)} | GAAP GP: ${fmtUsd(fy27.gaapGrossProfit)} (${pct(fy27.gaapGrossProfit, fy27.totalGrossRev)}) | S&M Reinvested: ${fmtUsd(fy27.smTotalOpex)} (${pct(fy27.smTotalOpex, fy27.totalGrossRev)}) | GAAP EBITDA: ${fmtUsd(fy27.gaapEbitda)} (${pct(fy27.gaapEbitda, fy27.totalGrossRev)})`)
console.log(`Monthly 2027 GAAP EBITDA: [${gaapEbitda2027.join(', ')}]`)
console.log(`Jan 2027 GAAP EBITDA: ${fmtUsd(gaapEbitda2027[0])} | Jan 2027 $2K Cash EBITDA: ${fmtUsd(cashEbitda2k2027[0])}`)
console.log(`Cohort 500 Run-Rate: ${fmtUsd(cohort500.totalAnnualRev)}/yr (GMV: ${fmtUsd(cohort500.annualOperatorGmv)}/yr)`)
console.log(`Cohort 5,000 Run-Rate: ${fmtUsd(cohort5000.totalAnnualRev)}/yr (GMV: ${fmtUsd(cohort5000.annualOperatorGmv)}/yr)`)
console.log(`Cohort 50,000 Run-Rate: ${fmtUsd(cohort50000.totalAnnualRev)}/yr (GMV: ${fmtUsd(cohort50000.annualOperatorGmv)}/yr)`)
console.log(`FY28 Gross Rev: ${fmtUsd(fy28.totalGrossRev)} | Exit Base ARR: ${fmtUsd(fy28.exitBaseArr)} | S&M: ${fmtUsd(fy28.smTotalOpex)} | GAAP EBITDA: ${fmtUsd(fy28.gaapEbitda)} (${pct(fy28.gaapEbitda, fy28.totalGrossRev)})`)
console.log(`FY29 Gross Rev: ${fmtUsd(fy29.totalGrossRev)} | Exit Base ARR: ${fmtUsd(fy29.exitBaseArr)} | S&M: ${fmtUsd(fy29.smTotalOpex)} | GAAP EBITDA: ${fmtUsd(fy29.gaapEbitda)} (${pct(fy29.gaapEbitda, fy29.totalGrossRev)})`)
