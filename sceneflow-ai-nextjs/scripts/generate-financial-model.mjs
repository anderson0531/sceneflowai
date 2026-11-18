#!/usr/bin/env node
/**
 * Deterministic generator for SceneFlow AI's 2027–2029 Financial & Business Model
 * anchored on 50 (FY27 Exit) -> 500 (FY28 Exit) -> 5,000 (FY29 Exit) Global
 * White-Label Video Service Businesses alongside proportionally calibrated
 * Self-Serve Creator / Filmmaker / Podcaster SaaS tiers across 7 UI languages.
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

// Steady-state monthly expansion per active Video Service Business
// Pro Operator ($149/mo, 15,000 cr included): ~12 $29 Blueprint Passes + 8 client films/mo (~28,200 cr) -> $145/mo Add-On Packs + $16/mo BYOK fee = $310/mo ARPU
// Studio Agency ($599/mo, 75,000 cr included): ~35 $29 Blueprint Passes + 24 client films/mo (~104,050 cr) -> $290/mo Add-On Packs + $75/mo BYOK fee = $964/mo ARPU
const B2B_STEADY = {
  proAddOnMonthly: 145,
  proByokMonthly: 16,
  proFilmsPerMo: 8,
  proBlueprintsPerMo: 12,
  proClientGmvPerMo: 4916, // 8 * $600 avg film + 4 non-converting $29 passes
  studioAddOnMonthly: 290,
  studioByokMonthly: 75,
  studioFilmsPerMo: 24,
  studioBlueprintsPerMo: 35,
  studioClientGmvPerMo: 16639, // 24 * $680 avg film + 11 non-converting $29 passes
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
// 1. MONTHLY FY 2027 TRAJECTORY (Exits Dec 2027 at 50 Video Service Businesses)
// ============================================================================
const charterSeatsSold2027 = [10, 9, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 25 Charter seats in Q1
const b2bProSubs2027 = [6, 11, 16, 20, 23, 26, 29, 31, 33, 35, 37, 38] // Dec = 38
const b2bStudioSubs2027 = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 12] // Dec = 12
const b2bTotalSubs2027 = b2bProSubs2027.map((p, i) => p + b2bStudioSubs2027[i]) // [8..50]

// Client volume ramp factor across Q1..Q4 2027 (hits 1.00 steady-state in Q4 / Dec 2027)
const b2bRampFactor2027 = [0.68, 0.72, 0.76, 0.82, 0.85, 0.88, 0.92, 0.94, 0.96, 1.0, 1.0, 1.0]

// Proportionally calibrated Self-Serve Creator / Filmmaker / Podcaster B2C Funnel
const explorerBuyers2027 = [350, 480, 620, 760, 900, 1020, 1120, 1220, 1300, 1360, 1410, 1460] // Sum = 12,000
const hobbyistSubs2027 = [90, 155, 225, 300, 380, 460, 540, 615, 680, 735, 780, 820] // Dec = 820
const starterSubs2027 = [50, 88, 130, 175, 220, 265, 310, 350, 390, 420, 448, 470] // Dec = 470
const creatorProSubs2027 = [16, 28, 42, 58, 74, 90, 106, 120, 132, 143, 152, 160] // Dec = 160
const creatorTotalSubs2027 = hobbyistSubs2027.map(
  (h, i) => h + starterSubs2027[i] + creatorProSubs2027[i]
) // Dec = 1,450

const totalActiveSubs2027 = b2bTotalSubs2027.map((b, i) => b + creatorTotalSubs2027[i]) // Dec = 1,500
const netSubAdds2027 = totalActiveSubs2027.map((tot, i) =>
  i === 0 ? tot : tot - totalActiveSubs2027[i - 1]
)

// 7-Language Market Shares (en 30%, es 16%, zh-CN 15%, hi 14%, pt 11%, ar 9%, th 5% = 100%)
const MARKET_SHARES = [
  { code: 'en', label: '1. English (`en` - 30.0%)', share: 0.3 },
  { code: 'es', label: '2. Spanish (`es` - 16.0%)', share: 0.16 },
  { code: 'zh-CN', label: '3. Chinese (`zh-CN` - 15.0%)', share: 0.15 },
  { code: 'hi', label: '4. Hindi (`hi` - 14.0%)', share: 0.14 },
  { code: 'pt', label: '5. Portuguese (`pt` - 11.0%)', share: 0.11 },
  { code: 'ar', label: '6. Arabic (`ar` - 9.0%)', share: 0.09 },
  { code: 'th', label: '7. Thai & SEA (`th` - 5.0%)', share: 0.05 },
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

// Lean Founder-Led FY 2027 OpEx (scales organically with gross profit; positive cash EBITDA from Q1)
const rdOpex2027 = [3200, 4200, 5500, 7000, 8500, 10000, 11800, 13500, 15200, 17000, 18800, 20500]
const smCreatorOpex2027 = [
  2400, 3200, 4200, 5200, 6300, 7400, 8500, 9600, 10600, 11600, 12500, 13500,
]
const smB2bOpex2027 = [
  2600, 3800, 5200, 6800, 8600, 10500, 12500, 14500, 16600, 18800, 21000, 23100,
]
const smTotalOpex2027 = smCreatorOpex2027.map((c, i) => c + smB2bOpex2027[i])
const gaOpex2027 = [1200, 1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600, 5000, 5500]
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
  b2bProExit: b2bProSubs2027[11],
  b2bStudioExit: b2bStudioSubs2027[11],
  b2bTotalExit: b2bTotalSubs2027[11], // 50
  explorerBuyers: sum(explorerBuyers2027), // 12,000
  hobbyistExit: hobbyistSubs2027[11], // 820
  starterExit: starterSubs2027[11], // 470
  creatorProExit: creatorProSubs2027[11], // 160
  creatorTotalExit: creatorTotalSubs2027[11], // 1,450
  totalSubsExit: totalActiveSubs2027[11], // 1,500
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
// 2. SIDE-BY-SIDE 50 / 500 / 5,000 VIDEO SERVICE BUSINESS COHORT RUN-RATE TABLE
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

  // Steady-state segment COGS (post-deflation: ~11.0% GCP + 4.5% 3P Audio/Video + 3.8% Whop = 19.3% COGS -> 80.7% Gross Margin)
  const cogsPct = totalStudios === 50 ? 0.213 : totalStudios === 500 ? 0.198 : 0.185
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

const cohort50 = buildB2bMilestoneCohort(50, 38, 12)
const cohort500 = buildB2bMilestoneCohort(500, 375, 125)
const cohort5000 = buildB2bMilestoneCohort(5000, 3700, 1300)

// ============================================================================
// 3. FY 2028 (Exit: 500 Studios) & FY 2029 (Exit: 5,000 Studios) FULL-YEAR P&L
// ============================================================================
// Full-year recognized revenue integrates the monthly ramp from prior year exit to year-end exit.
// FY28 ramps from 50 -> 500 Video Service Businesses (avg ~245 active across 12 mos) & 1,450 -> 9,500 Creators (avg ~5,100)
// FY29 ramps from 500 -> 5,000 Video Service Businesses (avg ~2,420 active across 12 mos) & 9,500 -> 40,000 Creators (avg ~23,200)
const fy28 = (() => {
  const b2bProExit = 375
  const b2bStudioExit = 125
  const b2bTotalExit = 500
  const hobbyistExit = 5300
  const starterExit = 3100
  const creatorProExit = 1100
  const creatorTotalExit = hobbyistExit + starterExit + creatorProExit // 9,500
  const totalSubsExit = b2bTotalExit + creatorTotalExit // 10,000
  const explorerBuyers = 65000

  // Exit MRR / ARR (Dec 2028)
  const exitB2bBaseMrr = cohort500.baseSaasMrr // $130,750
  const exitCreatorBaseMrr =
    hobbyistExit * PRICE.hobbyist + starterExit * PRICE.starter + creatorProExit * PRICE.pro // $416,500
  const exitBaseMrr = exitB2bBaseMrr + exitCreatorBaseMrr // $547,250
  const exitBaseArr = exitBaseMrr * 12 // $6,567,000

  // Full-Year Recognized Revenue (FY 2028)
  const b2bBaseSubRev = 768000 // Avg ~245 active businesses across 12 months
  const b2bAddOnRev = 532000
  const b2bByokRev = 90000
  const b2bTotalRev = b2bBaseSubRev + b2bAddOnRev + b2bByokRev // $1,390,000
  const b2bOperatorGmv = 23050000 // ~$23.05M full-year client GMV ($47.08M exit run-rate)

  const creatorBaseSubRev = 2712000
  const creatorAddOnRev = 515000
  const creatorExplorerRev = explorerBuyers * PRICE.explorer // $585,000
  const creatorByokRev = 68000
  const watchNetworkRev = 120000 // SceneFlow Network Watch $4.99/mo SVOD initial rollout
  const creatorTotalRev =
    creatorBaseSubRev + creatorAddOnRev + creatorExplorerRev + creatorByokRev + watchNetworkRev // $4,000,000

  const totalBaseSubRev = b2bBaseSubRev + creatorBaseSubRev // $3,480,000
  const totalAddOnRev = b2bAddOnRev + creatorAddOnRev // $1,047,000
  const totalByokRev = b2bByokRev + creatorByokRev // $158,000
  const totalGrossRev = b2bTotalRev + creatorTotalRev // $5,390,000

  const gcpCogs = Math.round(totalGrossRev * 0.112) // $603,680
  const api3pCogs = Math.round(totalGrossRev * 0.048) // $258,720
  const whopFees = Math.round(totalGrossRev * whopFeePct) // $204,820
  const totalGaapCogs = gcpCogs + api3pCogs + whopFees // $1,067,220
  const gaapGrossProfit = totalGrossRev - totalGaapCogs // $4,322,780 (80.2% GM)

  // Startup Credit Offsets in FY 2028 ($100k Year-2 Partner Track; or Year-1 carryover + $100k Year-2 on AI-First Track)
  const credit100kUsed = 100000
  const credit250kUsed = fy27.credit250kCarryoverTo2028 + 100000 // Remaining Year-1 $250k pool + $100k Year-2

  const rdOpex = 650000
  const smCreatorOpex = 480000
  const smB2bOpex = 760000
  const smTotalOpex = smCreatorOpex + smB2bOpex // $1,240,000
  const gaOpex = 280000
  const totalOpex = rdOpex + smTotalOpex + gaOpex // $2,170,000

  const gaapEbitda = gaapGrossProfit - totalOpex // $2,152,780 (39.9% EBITDA margin)
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
  const b2bProExit = 3700
  const b2bStudioExit = 1300
  const b2bTotalExit = 5000
  const hobbyistExit = 22000
  const starterExit = 13200
  const creatorProExit = 4800
  const creatorTotalExit = hobbyistExit + starterExit + creatorProExit // 40,000
  const totalSubsExit = b2bTotalExit + creatorTotalExit // 45,000
  const explorerBuyers = 240000

  // Exit MRR / ARR (Dec 2029)
  const exitB2bBaseMrr = cohort5000.baseSaasMrr // $1,330,000
  const exitCreatorBaseMrr =
    hobbyistExit * PRICE.hobbyist + starterExit * PRICE.starter + creatorProExit * PRICE.pro // $1,780,000
  const exitBaseMrr = exitB2bBaseMrr + exitCreatorBaseMrr // $3,110,000
  const exitBaseArr = exitBaseMrr * 12 // $37,320,000

  // Full-Year Recognized Revenue (FY 2029)
  const b2bBaseSubRev = 7740000 // Avg ~2,420 active businesses across 12 months
  const b2bAddOnRev = 5315000
  const b2bByokRev = 912000
  const b2bTotalRev = b2bBaseSubRev + b2bAddOnRev + b2bByokRev // $13,967,000
  const b2bOperatorGmv = 231500000 // ~$231.5M full-year client GMV ($477.8M exit run-rate)

  const creatorBaseSubRev = 12360000
  const creatorAddOnRev = 2595000
  const creatorExplorerRev = explorerBuyers * PRICE.explorer // $2,160,000
  const creatorByokRev = 428000
  const watchNetworkRev = 990000 // SceneFlow Network Watch SVOD across 7 languages
  const creatorTotalRev =
    creatorBaseSubRev + creatorAddOnRev + creatorExplorerRev + creatorByokRev + watchNetworkRev // $18,533,000

  const totalBaseSubRev = b2bBaseSubRev + creatorBaseSubRev // $20,100,000
  const totalAddOnRev = b2bAddOnRev + creatorAddOnRev // $7,910,000
  const totalByokRev = b2bByokRev + creatorByokRev // $1,340,000
  const totalGrossRev = b2bTotalRev + creatorTotalRev // $32,500,000

  const gcpCogs = Math.round(totalGrossRev * 0.095) // $3,087,500
  const api3pCogs = Math.round(totalGrossRev * 0.042) // $1,365,000
  const whopFees = Math.round(totalGrossRev * whopFeePct) // $1,235,000
  const totalGaapCogs = gcpCogs + api3pCogs + whopFees // $5,687,500
  const gaapGrossProfit = totalGrossRev - totalGaapCogs // $26,812,500 (82.5% GM)

  const rdOpex = 3400000
  const smCreatorOpex = 2350000
  const smB2bOpex = 4450000
  const smTotalOpex = smCreatorOpex + smB2bOpex // $6,800,000
  const gaOpex = 1550000
  const totalOpex = rdOpex + smTotalOpex + gaOpex // $11,750,000

  const gaapEbitda = gaapGrossProfit - totalOpex // $15,062,500 (46.3% EBITDA margin)

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
    'One-time 30-Day Studio Test Flight (750 credits)',
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
    'White-Label Solo Video Service Operators, Podcasters & Series (15,000 cr + 100 GB Vault + 4K + BYOK)',
  ],
  [
    'MODEL DEFLATION & PRICING',
    'Studio Monthly Price ($)',
    ...Array(12).fill('599.00'),
    '599.00',
    'Multi-Seat Video Service Agencies, Brokerages & Corporate L&D (75,000 cr + 500 GB Vault + 10 Seats + BYOK)',
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
    'Falling delivery cost unlocks higher operator & creator margins across EN/ES/PT/HI/ZH/AR/TH',
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
    'Blended 2.7% + $0.30 fixed fee + 0.5% global tax compliance across 7 markets',
  ],
  blankRow12,
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Founding Operator $299 Charter Seats Sold (25-Seat Cap)',
    ...charterSeatsSold2027,
    fy27.charterSeats,
    '25 Charter studios onboarded in Q1 2027 seeding the initial White-Label Operator cohort',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Active White-Label Pro Operators ($149/mo)',
    ...b2bProSubs2027,
    fy27.b2bProExit,
    'Solo Video Memoir, Property Tour, Training & Brand Story operators (76% of Dec 2027 B2B2C base)',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Active White-Label Studio Agencies ($599/mo)',
    ...b2bStudioSubs2027,
    fy27.b2bStudioExit,
    'Multi-PM Video Agencies, Real Estate Brokerages & Corporate L&D houses (24% of Dec 2027 B2B2C base)',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Total Active Global Video Service Businesses',
    ...b2bTotalSubs2027,
    fy27.b2bTotalExit,
    'Year 1 milestone exit = 50 active Global Video Service Businesses (scales -> 500 in FY28 -> 5,000 in FY29)',
  ],
  [
    'VIDEO SERVICE BUSINESSES (B2B2C)',
    'Memo: Operator Ecosystem Client GMV Enabled ($)',
    ...b2bOperatorGmv2027,
    fy27.b2bOperatorGmv,
    'Dec 2027 run-rate = $4.64M/yr client GMV enabled across $29 Blueprint Passes & $299-$1,800 client films',
  ],
  blankRow12,
  [
    'SELF-SERVE CREATORS (B2C)',
    'New $9 Explorer Buyers (Monthly Cohort)',
    ...explorerBuyers2027,
    fy27.explorerBuyers,
    '12,000 cumulative FY 2027 Explorer Test Flight buyers across EN, ES, PT, HI, ZH, AR, TH',
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
    'Dec 2027 exit = 1,450 active self-serve Creator/Filmmaker subscribers',
  ],
  [
    'CONSOLIDATED SUBSCRIBERS',
    'Total Active Monthly Subscribers (B2B2C + B2C)',
    ...totalActiveSubs2027,
    fy27.totalSubsExit,
    'Dec 2027 exit = 1,500 active subscribers (50 Video Service Businesses + 1,450 Self-Serve Creators)',
  ],
  [
    'CONSOLIDATED SUBSCRIBERS',
    'Net Monthly Subscriber Additions',
    ...netSubAdds2027,
    fy27.totalSubsExit,
    'Disciplined organic + partner-led Year 1 ramp across 7 language markets',
  ],
  blankRow12,
  ...MARKET_SHARES.map((m, idx) => [
    'MARKET BREAKDOWN (7 UI LANGUAGES)',
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
    'Dec 2027 Video Service Base SaaS MRR = $12,850/mo ($154,200 Base SaaS ARR)',
  ],
  [
    'REVENUE — VIDEO SERVICE B2B2C (USD)',
    'Video Service 12-Mo Add-On Credit Packs ($100/$250)',
    ...b2bAddOnRev2027,
    fy27.b2bAddOnRev,
    'Funds $29 Client Blueprint Passes (~$3.90 max compute) + $299-$1,800 client film deliveries',
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
    'Dec 2027 exit run-rate = $23,348/mo ($280,176/yr across 50 active Video Service Businesses)',
  ],
  blankRow12,
  [
    'REVENUE — SELF-SERVE CREATOR B2C (USD)',
    '$9 Explorer Test Flight One-Time Revenue',
    ...creatorExplorerRev2027,
    fy27.creatorExplorerRev,
    '12,000 Explorer Test Flight buyers * $9',
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
    'Dec 2027 Creator Base SaaS MRR = $62,450/mo ($749,400 Base SaaS ARR)',
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
    `Dec 2027 exit run-rate = ${fmtUsd(creatorTotalRev2027[11])}/mo (${fmtUsd(creatorTotalRev2027[11] * 12)}/yr across 1,450 active Creators + Explorer funnel)`,
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
    'Rises as 50 -> 500 -> 5,000 high-ARPU Video Service Studios scale to >43% FY29 / >52% Dec 2029 recurring+compute',
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
    'Payment processing & global tax compliance across 7 language markets',
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
    'Cash-flow positive from Month 1 even on $2K Start Tier credits alone',
  ],
  blankRow12,
  [
    'TRACK A: $100K CREDITS',
    'GCP Credit Offset Applied ($100k Partner Track)',
    ...track100k.applied,
    fy27.credit100kUsed,
    `Offsets ${pct(fy27.credit100kUsed, fy27.gcpCogs)} of full-year FY 2027 GCP/Vertex AI compute across Jan-Oct 2027`,
  ],
  [
    'TRACK A: $100K CREDITS',
    'Remaining $100k GCP Credit Balance',
    ...track100k.balances,
    track100k.endingPool,
    'Extends runway all the way into Q4 2027 as ARR approaches $900K+',
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
    'Covers 100% of FY 2027 GCP/Vertex AI compute with remaining balance carrying into FY 2028',
  ],
  [
    'TRACK B: $250K CREDITS',
    'Remaining $250k GCP Credit Balance',
    ...track250k.balances,
    track250k.endingPool,
    'Remaining Year-1 credit balance rolls into H1 2028 as Video Service studios scale 50 -> 500',
  ],
  [
    'TRACK B: $250K CREDITS',
    'Cash Gross Profit (w/ $250k AI-First Track)',
    ...cashGp250k2027,
    fy27.cashGp250k,
    'GAAP Gross Profit + 100% FY27 GCP Credit Offset',
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
    'OPEX & B2B2C GROWTH',
    'R&D / Engineering & Product',
    ...rdOpex2027,
    fy27.rdOpex,
    'Founder-led engineering + contract AI/UI specialists (Autonomous Agents, 7-lang portals, Veo/Kling)',
  ],
  [
    'OPEX & B2B2C GROWTH',
    'S&M — Creator, Podcaster & 7-Language Explorer Funnel',
    ...smCreatorOpex2027,
    fy27.smCreatorOpex,
    'Acquires 12,000 $9 Explorer Test Flights & self-serve Creators across 7 language markets',
  ],
  [
    'OPEX & B2B2C GROWTH',
    'S&M — Video Service Operator Charter & Partner Channel Growth',
    ...smB2bOpex2027,
    fy27.smB2bOpex,
    'Onboards 50 White-Label Video Service Businesses via senior living, real estate & L&D channels',
  ],
  [
    'OPEX & B2B2C GROWTH',
    'Total Sales & Marketing (S&M)',
    ...smTotalOpex2027,
    fy27.smTotalOpex,
    '59% of S&M dedicated to high-ARPU, low-churn Video Service Business acquisition',
  ],
  [
    'OPEX & B2B2C GROWTH',
    'G&A (Legal / Compliance / 7-Market Ops)',
    ...gaOpex2027,
    fy27.gaOpex,
    'Lean corporate ops, privacy/consent compliance & multi-region administration',
  ],
  [
    'OPEX & B2B2C GROWTH',
    'Total Operating Expenses (OpEx)',
    ...totalOpex2027,
    fy27.totalOpex,
    '100% funded organically out of monthly operating gross profit',
  ],
  [
    'OPEX & B2B2C GROWTH',
    'GAAP Operating Income (EBITDA - Un-Subsidized)',
    ...gaapEbitda2027,
    fy27.gaapEbitda,
    `Positive GAAP EBITDA across FY 2027 (${pct(fy27.gaapEbitda, fy27.totalGrossRev)} GAAP EBITDA margin)`,
  ],
  [
    'OPEX & B2B2C GROWTH',
    'Net Cash Flow (EBITDA w/ $100k Credit Track)',
    ...cashEbitda100k2027,
    fy27.cashEbitda100k,
    `${pct(fy27.cashEbitda100k, fy27.totalGrossRev)} FY27 Cash EBITDA margin ($100k credit track)`,
  ],
  [
    'OPEX & B2B2C GROWTH',
    'Cumulative Cash Generated (w/ $100k Credit Track)',
    ...cumCash100k2027,
    cumCash100k2027[11],
    'Cumulative operating cash generated across FY 2027 ($100k track)',
  ],
  [
    'OPEX & B2B2C GROWTH',
    'Net Cash Flow (EBITDA w/ $250k AI-First Track)',
    ...cashEbitda250k2027,
    fy27.cashEbitda250k,
    `${pct(fy27.cashEbitda250k, fy27.totalGrossRev)} FY27 Cash EBITDA margin ($250k AI-First track)`,
  ],
  [
    'OPEX & B2B2C GROWTH',
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
    'Core B2B2C growth spine: 50 (FY27) -> 500 (FY28, 10x) -> 5,000 (FY29, 10x) across 7 language markets',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    '  - White-Label Pro Video Service Operators ($149/mo)',
    fy27.b2bProExit,
    fy28.b2bProExit,
    fy29.b2bProExit,
    'Solo Video Memoir, Real Estate Tour, Training SOP & Brand Story operators (74%-76% of B2B2C base)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    '  - White-Label Studio Multi-Seat Agencies ($599/mo)',
    fy27.b2bStudioExit,
    fy28.b2bStudioExit,
    fy29.b2bStudioExit,
    'Multi-PM agencies, real estate brokerages & corporate L&D teams (24%-26% of B2B2C base)',
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
    '1,500 (Dec 2027) -> 10,000 (Dec 2028) -> 45,000 (Dec 2029)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Annual $9 Explorer Studio Test Flight Buyers',
    fy27.explorerBuyers,
    fy28.explorerBuyers,
    fy29.explorerBuyers,
    'Self-liquidating 30-day Studio Test Flight onboarding wedge across 7 native UI languages',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Memo: Annual Operator Ecosystem Client GMV Enabled (USD)',
    fy27.b2bOperatorGmv,
    fy28.b2bOperatorGmv,
    fy29.b2bOperatorGmv,
    'Exit client GMV run-rate: $4.64M/yr (50 studios) -> $47.08M/yr (500 studios) -> $477.8M/yr (5,000 studios)',
  ],
  // Exit MRR & ARR
  [
    '3-YEAR P&L & KPI FORECAST',
    'Exit Base Subscription MRR — Video Service B2B2C (USD)',
    b2bBaseMrr2027[11],
    fy28.exitB2bBaseMrr,
    fy29.exitB2bBaseMrr,
    'Pure base SaaS MRR from 50 / 500 / 5,000 Video Service Businesses (excludes Credit Packs & BYOK)',
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
    'Combined Dec Base Subscription MRR ($75.3K -> $547.3K -> $3.11M)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Exit Base Subscription ARR (Dec ARR - USD)',
    fy27.exitBaseArr,
    fy28.exitBaseArr,
    fy29.exitBaseArr,
    'Dec Base MRR * 12 ($903.6K -> $6.57M -> $37.32M; excludes high-velocity Credit Packs & BYOK)',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Exit Total Annualized Revenue Run-Rate — Video Service B2B2C (USD)',
    cohort50.totalAnnualRev,
    cohort500.totalAnnualRev,
    cohort5000.totalAnnualRev,
    '50 studios = $280.2K/yr -> 500 studios = $2.84M/yr -> 5,000 studios = $28.80M/yr (SaaS + Packs + BYOK)',
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
    `Share of Total Revenue: ${pct(fy27.b2bTotalRev, fy27.totalGrossRev)} (FY27) -> ${pct(fy28.b2bTotalRev, fy28.totalGrossRev)} (FY28) -> ${pct(fy29.b2bTotalRev, fy29.totalGrossRev)} (FY29; 52.5% of Dec 2029 recurring+compute)`,
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
    '3.8% blended payment processing & global tax compliance across 7 markets',
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
    `$100k Year 1 (covers ${pct(fy27.credit100kUsed, fy27.gcpCogs)} of FY27 GCP compute) + $100k Year 2 credit offset`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'GCP / NVIDIA Startup Credit Offset — $250k AI-First Track (USD)',
    fy27.credit250kUsed,
    fy28.credit250kUsed,
    0,
    'Covers 100% of FY27 GCP compute + remaining Yr-1 balance & $100k Yr-2 applied in FY28',
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
    `${pct(fy27.rdOpex, fy27.totalGrossRev)} of rev in FY27 -> ${pct(fy28.rdOpex, fy28.totalGrossRev)} in FY28 -> ${pct(fy29.rdOpex, fy29.totalGrossRev)} in FY29`,
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'S&M — Creator, Podcaster & 7-Language Explorer Funnel (USD)',
    fy27.smCreatorOpex,
    fy28.smCreatorOpex,
    fy29.smCreatorOpex,
    'Self-serve creator & podcaster acquisition across 7 language markets',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'S&M — Global Video Service Operator & Partner Channel Growth (USD)',
    fy27.smB2bOpex,
    fy28.smB2bOpex,
    fy29.smB2bOpex,
    'Scales White-Label Video Service Businesses from 50 -> 500 -> 5,000 globally',
  ],
  [
    '3-YEAR P&L & KPI FORECAST',
    'Total Sales & Marketing OpEx (USD)',
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
    '100% funded organically from operating gross profit',
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
    'Self-sustaining profitability from Year 1 even with initial $2K Start Tier credits alone',
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
  // TABLE 2: SIDE-BY-SIDE 50 / 500 / 5,000 VIDEO SERVICE BUSINESS STEADY-STATE RUN-RATE TABLE
  [
    'VIDEO SERVICE COHORT SCALE',
    'Steady-State Video Service Milestone Metric',
    '50 Businesses (FY27 Exit)',
    '500 Businesses (FY28 Exit)',
    '5,000 Businesses (FY29 Exit)',
    'Unit Basis & White-Label Portal Assumptions',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Active White-Label Pro Operators ($149/mo)',
    cohort50.proCount,
    cohort500.proCount,
    cohort5000.proCount,
    'Solo Video Memoir, Property Tour, Training SOP & Brand Story studios (15,000 cr/mo included)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Active White-Label Studio Agencies ($599/mo)',
    cohort50.studioCount,
    cohort500.studioCount,
    cohort5000.studioCount,
    'Multi-PM agencies, brokerages & corporate L&D teams (75,000 cr/mo + 10 seats + RBAC caps)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Monthly Paid $29 Client Blueprint Passes Processed',
    cohort50.monthlyBlueprints,
    cohort500.monthlyBlueprints,
    cohort5000.monthlyBlueprints,
    '12 passes/mo per Pro + 35 passes/mo per Studio (~$3.90 max AI compute -> 83% self-funding discovery margin)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Monthly Full Client Productions Delivered',
    cohort50.monthlyFilms,
    cohort500.monthlyFilms,
    cohort5000.monthlyFilms,
    '8 films/mo per Pro + 24 films/mo per Studio across Memoirs, Real Estate, Training & Brand',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Annualized Client Productions Delivered',
    cohort50.annualFilms,
    cohort500.annualFilms,
    cohort5000.annualFilms,
    '7,104 -> 72,000 -> 729,600 commissioned client films/year rendered on SceneFlow',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Annualized Operator Ecosystem Client GMV (USD)',
    cohort50.annualOperatorGmv,
    cohort500.annualOperatorGmv,
    cohort5000.annualOperatorGmv,
    '$4.64M -> $47.08M -> $477.8M annual client billings earned by operators (~78-83% operator net margin)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'SceneFlow Base SaaS MRR from Video Service Businesses (USD)',
    cohort50.baseSaasMrr,
    cohort500.baseSaasMrr,
    cohort5000.baseSaasMrr,
    'Pro * $149 + Studio * $599 ($12,850/mo -> $130,750/mo -> $1,330,000/mo)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'SceneFlow Monthly 12-Mo Add-On Credit Packs (USD)',
    cohort50.addOnMonthly,
    cohort500.addOnMonthly,
    cohort5000.addOnMonthly,
    '$145/mo per Pro + $290/mo per Studio ($100/$250 packs funding client volume above base credits)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'SceneFlow Monthly BYOK 20% Orchestration Fees (USD)',
    cohort50.byokMonthly,
    cohort500.byokMonthly,
    cohort5000.byokMonthly,
    '$16/mo per Pro + $75/mo per Studio (~95% gross margin platform orchestration fee)',
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Total SceneFlow Monthly Run-Rate — Video Service Segment (USD)',
    cohort50.totalMonthlyRev,
    cohort500.totalMonthlyRev,
    cohort5000.totalMonthlyRev,
    `Blended SceneFlow ARPU: $${cohort50.blendedMonthlyArpu.toFixed(2)}/mo -> $${cohort500.blendedMonthlyArpu.toFixed(2)}/mo -> $${cohort5000.blendedMonthlyArpu.toFixed(2)}/mo per business`,
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Total SceneFlow Annualized Revenue Run-Rate — Video Service Segment (USD)',
    cohort50.totalAnnualRev,
    cohort500.totalAnnualRev,
    cohort5000.totalAnnualRev,
    `Effective SceneFlow software+compute take-rate = ${cohort500.takeRateOfGmvPct} of Operator Client GMV`,
  ],
  [
    'VIDEO SERVICE COHORT SCALE',
    'Standalone Video Service Segment Gross Profit Run-Rate (USD)',
    cohort50.annualGrossProfit,
    cohort500.annualGrossProfit,
    cohort5000.annualGrossProfit,
    `Segment GAAP Gross Margin: ${cohort50.grossMarginPct} (50) -> ${cohort500.grossMarginPct} (500) -> ${cohort5000.grossMarginPct} (5,000)`,
  ],
  blankRow6,
  blankRow6,
  // TABLE 3: 7-MARKET VIDEO SERVICE BUSINESS & TOTAL SUBSCRIBER MIX
  [
    '7-MARKET VIDEO SERVICE MIX',
    'Global Language Market',
    '50 Studios (FY27 Exit)',
    '500 Studios (FY28 Exit)',
    '5,000 Studios (FY29 Exit)',
    'Total Combined Subscribers (FY27 / FY28 / FY29) & Regional B2B2C Drivers',
  ],
  ...MARKET_SHARES.map((m, idx) => {
    const s27 = allocateExactByShare(fy27.totalSubsExit, MARKET_SHARES)[idx]
    const s28 = allocateExactByShare(fy28.totalSubsExit, MARKET_SHARES)[idx]
    const s29 = allocateExactByShare(fy29.totalSubsExit, MARKET_SHARES)[idx]
    const regionalDrivers = {
      en: 'US, UK, Canada, Australia — Senior-living Life Memoirs, Luxury Real Estate & Franchise SOPs',
      es: 'US Hispanic, Mexico, Spain, LATAM — Multi-generational Family Memoirs, Property Tours & SMB Ads',
      'zh-CN': 'Taiwan, Singapore, Diaspora & Cross-Border E-Commerce / Multilingual Property Walkthroughs',
      hi: 'India & Global Diaspora — Milestone Anniversary/Wedding Legacy Films, EdTech & Corporate Training',
      pt: 'Brazil & Portugal — Family Biographies, Boutique Real Estate Agencies & Creator/SMB Brand Studios',
      ar: 'UAE, Saudi Arabia, Egypt & MENA — Luxury Villa/Hospitality Tours, Family Heritage Films & L&D',
      th: 'Thailand & Southeast Asia — Boutique Hospitality/Resort Tours, SMB Social Packs & Creator Studios',
    }[m.code]
    return [
      '7-MARKET VIDEO SERVICE MIX',
      m.label,
      cohort50.byLang[idx],
      cohort500.byLang[idx],
      cohort5000.byLang[idx],
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
    '25-seat Launchpad: 1st $599 client memoir nets operator +$300 cash & pays back entire Charter',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Client $29 Storyboard Blueprint Pass (Operator Portal)',
    '29.00',
    '390',
    '80.5% -> 86.5%',
    'Operator collects $29 client deposit on <=$3.90 max SceneFlow compute (83%+ operator discovery margin)',
  ],
  [
    'TIER & WORKFLOW UNIT ECONOMICS',
    'Explorer (One-Time 30-Day Test Flight)',
    '9.00',
    '750',
    '65.6% -> 79.8%',
    'Self-liquidating creator & prospective operator onboarding wedge',
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
    'Pro (Monthly White-Label Operator & Series)',
    '149.00',
    '15000',
    '58.1% -> 76.8%',
    'White-label client portals (/intake, /blueprint/share, /screening-room) + 100 GB Vault + 4K + BYOK',
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
    'Primary expansion vehicle as Video Service Studios scale from 4 to 24+ client films/month',
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
    'Conservative (25 -> 175 -> 1,250 Studios)',
    '9850000',
    '11200000',
    '3950000',
    'Slower partner channel rollout; strong profitability maintained via 80%+ gross margins',
  ],
  [
    'SCENARIO SENSITIVITY',
    'Base Case (50 -> 500 -> 5,000 Studios)',
    String(fy29.totalGrossRev),
    String(fy29.exitBaseArr),
    String(fy29.gaapEbitda),
    'Core plan: 50 -> 500 -> 5,000 Video Service Businesses ($28.80M B2B2C run-rate) + 40,000 Creators',
  ],
  [
    'SCENARIO SENSITIVITY',
    'Bull Case (100 -> 1,200 -> 12,000 Studios)',
    '74600000',
    '86400000',
    '36500000',
    'Accelerated adoption across senior-living, real estate MLS & SMB marketing networks in 7 languages',
  ],
]

// ============================================================================
// BUILD MARKDOWN SUMMARY: docs/SCENEFLOW_FINANCIAL_BUSINESS_MODEL.md
// ============================================================================
const mdContent = `# SceneFlow AI — Financial & Business Model (2027–2029)
**Global White-Label Video Service Business Scale (\`50\` → \`500\` → \`5,000\` Studios) + Self-Serve Creator SaaS Across 7 Native UI Languages**

- **12-Month FY 2027 Monthly Model (CSV):** [\`docs/sceneflow_financial_model_2027_12month.csv\`](./sceneflow_financial_model_2027_12month.csv)
- **3-Year FY 2027–2029 Forecast & Cohort Model (CSV):** [\`docs/sceneflow_financial_model_2027_2029_3year.csv\`](./sceneflow_financial_model_2027_2029_3year.csv)
- **Business Model Classification:** 100% Multi-Tenant AI Video SaaS Platform & Continuity Operating System *(Whop Merchant of Record Live)*

---

## 1. Executive Thesis: "Shopify for AI Video Studios" + Global Creator Studio

SceneFlow AI combines two mutually reinforcing SaaS growth engines on one shared Google Cloud Vertex AI + Continuity Vault infrastructure across **7 native UI languages** (\`EN\`, \`ES\`, \`PT\`, \`HI\`, \`ZH\`, \`AR\`, \`TH\`) and **70+ dubbing locales**:

1. **White-Label Video Service Businesses (\`B2B2C\` — \`50\` → \`500\` → \`5,000\` Global Studios):**  
   Independent entrepreneurs, photographers, senior-living/estate partners, real estate media teams, corporate L&D consultants, and local agencies subscribe to **Pro (\`$149/mo\`)** and **Studio (\`$599/mo\`)** to run turnkey white-label video businesses. Operators embed SceneFlow's zero-login client portals (\`/intake\`, \`/blueprint/share\` with the self-funding **\`$29\` Storyboard Blueprint Pass**, \`/share/continuity\`, and \`/share/screening-room\`), earning **78%–85% net margins** on \`$299–$1,800+\` client deliverables while driving high-retention SaaS MRR, 12-month Add-On Credit Packs (\`$100\` / \`$250\`), and 20% BYOK orchestration fees for SceneFlow.
2. **Self-Serve Creators, Filmmakers & Video Podcasters (\`B2C\` — \`1,450\` → \`9,500\` → \`40,000\` Active Subscribers):**  
   Everyday storytellers, episodic series creators, indie filmmakers building Pre-Vis funding packages, and hybrid video podcasters enter through the self-liquidating **\`$9\` Explorer Studio Test Flight** and subscribe to **Hobbyist (\`$19/mo\`)**, **Starter (\`$49/mo\`)**, and **Pro (\`$149/mo\`)** Continuity Vault plans.

By **December 2029 (\`5,000\` Video Service Businesses)**, the B2B2C Video Service segment alone generates **\`${fmtUsd(cohort5000.totalAnnualRev)}/yr\`** in annualized SceneFlow revenue (**52.5%** of platform recurring + compute run-rate) while enabling **\`${fmtUsd(cohort5000.annualOperatorGmv)}/yr\`** in operator client billings—at an effective SceneFlow software + compute take-rate of just **\`${cohort5000.takeRateOfGmvPct}\` of operator GMV**.

---

## 2. Unit Economics per Active Video Service Business

### A. The Self-Funding \`$29\` Client Doorway & 4 Turnkey Verticals

| Deliverable / Stage | Typical Client Price | SceneFlow Retail Credits | Provider AI COGS (Q4 2027) | Operator Net Margin | SceneFlow Gross Margin |
|---|---:|---:|---:|---:|---:|
| **Paid Discovery: \`$29\` Storyboard Blueprint Pass** *(Intake + 6 Stills + VO + up to 4 AI Revisions + 3 AR Passes)* | \`$29\` *(100% credited to order)* | \`<=$3.90\` (\`390 cr\`) | \`~$0.82\` | **83%+** (\`+$23.96\` net) | **79.0%** |
| **1. Video Memoirs & Family Biographies** *(12-min multi-era film, 2 langs)* | \`$599 – $649\` | \`$34.00\` (\`3,400 cr\`) | \`~$7.20\` | **80%–82%** (\`+$477–$530\`) | **78.8%** |
| **2. Real Estate & Hospitality Cinema Tours** *(2-min 4K tour, 2 langs)* | \`$299\` | \`$15.00\` (\`1,500 cr\`) | \`~$3.15\` | **78%** (\`+$234\`) | **79.0%** |
| **3. Corporate Onboarding & Safety SOPs** *(10-min module, 3 workforce langs)* | \`$950\` | \`$40.00\` (\`4,000 cr\`) | \`~$8.40\` | **83%** (\`+$785\`) | **79.0%** |
| **4. Founder Origin & SMB Brand Packs** *(2-min film + two 9:16 social ads)* | \`$650\` | \`$28.00\` (\`2,800 cr\`) | \`~$5.90\` | **82%** (\`+$534\`) | **78.9%** |

### B. Monthly SceneFlow ARPU per Active Video Service Business

| Operator Archetype | Mix Share | Base SaaS Plan | Monthly Client Output | Add-On Credit Packs / Mo | BYOK Fees / Mo | **Total SceneFlow ARPU / Mo** | **Operator Client GMV / Mo** |
|---|---:|---:|---|---:|---:|---:|---:|
| **Solo White-Label Pro Operator** | ~75% | \`$149/mo\` *(15,000 cr incl.)* | \`12\` \`$29\` Passes → \`8\` Films/mo | \`$145/mo\` | \`$16/mo\` | **\`$310 / mo\`** (\`$3,720/yr\`) | \`$4,916 / mo\` (\`$59.0K/yr\`) |
| **Multi-Seat Studio Agency** | ~25% | \`$599/mo\` *(75,000 cr incl.)* | \`35\` \`$29\` Passes → \`24\` Films/mo | \`$290/mo\` | \`$75/mo\` | **\`$964 / mo\`** (\`$11,568/yr\`) | \`$16,639 / mo\` (\`$199.7K/yr\`) |
| **Blended Video Service Business** | **100%** | **\`$261.50/mo\`** | **\`17.8\` Passes → \`12.0\` Films/mo** | **\`$181.25/mo\`** | **\`$30.75/mo\`** | **\`$473.50 / mo\`** (\`$5,682/yr\`) | **\`$7,847 / mo\`** (\`$94.2K/yr\`) |

---

## 3. Side-by-Side Steady-State Run-Rate: \`50\` vs. \`500\` vs. \`5,000\` Global Video Service Businesses

*Standalone B2B2C Video Service segment run-rate at each global scale milestone (before counting self-serve Creator B2C revenue):*

| Video Service Segment Metric | **50 Businesses** *(FY 2027 Exit)* | **500 Businesses** *(FY 2028 Exit)* | **5,000 Businesses** *(FY 2029 Exit)* |
|---|---:|---:|---:|
| **Active White-Label Pro Operators (\`$149/mo\`)** | \`38\` | \`375\` | \`3,700\` |
| **Active White-Label Studio Agencies (\`$599/mo\`)** | \`12\` | \`125\` | \`1,300\` |
| **Paid \`$29\` Blueprint Passes / Month** | \`876 / mo\` | \`8,875 / mo\` | \`89,900 / mo\` |
| **Commissioned Client Films Delivered / Year** | \`7,104 / yr\` | \`72,000 / yr\` | \`729,600 / yr\` |
| **Operator Ecosystem Client GMV / Year** | **\`${fmtUsd(cohort50.annualOperatorGmv)}\`** | **\`${fmtUsd(cohort500.annualOperatorGmv)}\`** | **\`${fmtUsd(cohort5000.annualOperatorGmv)}\`** |
| SceneFlow Base SaaS MRR (\`Pro\` + \`Studio\`) | \`${fmtUsd(cohort50.baseSaasMrr)} / mo\` | \`${fmtUsd(cohort500.baseSaasMrr)} / mo\` | \`${fmtUsd(cohort5000.baseSaasMrr)} / mo\` |
| SceneFlow 12-Mo Add-On Credit Packs / Mo | \`${fmtUsd(cohort50.addOnMonthly)} / mo\` | \`${fmtUsd(cohort500.addOnMonthly)} / mo\` | \`${fmtUsd(cohort5000.addOnMonthly)} / mo\` |
| SceneFlow BYOK 20% Orchestration Fees / Mo | \`${fmtUsd(cohort50.byokMonthly)} / mo\` | \`${fmtUsd(cohort500.byokMonthly)} / mo\` | \`${fmtUsd(cohort5000.byokMonthly)} / mo\` |
| **Total Video Service Monthly Revenue Run-Rate** | **\`${fmtUsd(cohort50.totalMonthlyRev)} / mo\`** | **\`${fmtUsd(cohort500.totalMonthlyRev)} / mo\`** | **\`${fmtUsd(cohort5000.totalMonthlyRev)} / mo\`** |
| **Total Video Service Annualized Revenue Run-Rate** | **\`${fmtUsd(cohort50.totalAnnualRev)} / yr\`** | **\`${fmtUsd(cohort500.totalAnnualRev)} / yr\`** | **\`${fmtUsd(cohort5000.totalAnnualRev)} / yr\`** |
| **Video Service Segment Gross Profit Run-Rate** | **\`${fmtUsd(cohort50.annualGrossProfit)} / yr\`** (\`${cohort50.grossMarginPct}\`) | **\`${fmtUsd(cohort500.annualGrossProfit)} / yr\`** (\`${cohort500.grossMarginPct}\`) | **\`${fmtUsd(cohort5000.annualGrossProfit)} / yr\`** (\`${cohort5000.grossMarginPct}\`) |

### Geographic Distribution of the \`50\` → \`500\` → \`5,000\` Video Service Businesses (7 UI Locales)

| Native UI Market | Global Share | **50 Studios** *(FY27)* | **500 Studios** *(FY28)* | **5,000 Studios** *(FY29)* | Primary Local White-Label Service Demand |
|---|---:|---:|---:|---:|---|
| **1. English (\`en\`)** | 30% | \`${cohort50.byLang[0]}\` | \`${cohort500.byLang[0]}\` | \`${fmtNum(cohort5000.byLang[0])}\` | US, UK, Canada, AU — Senior-living Life Memoirs, Luxury Real Estate & Franchise SOPs |
| **2. Spanish (\`es\`)** | 16% | \`${cohort50.byLang[1]}\` | \`${cohort500.byLang[1]}\` | \`${fmtNum(cohort5000.byLang[1])}\` | US Hispanic, Mexico, Spain, LATAM — Multi-generational Family Memoirs & SMB Brand Packs |
| **3. Chinese (\`zh-CN\`)** | 15% | \`${cohort50.byLang[2]}\` | \`${cohort500.byLang[2]}\` | \`${fmtNum(cohort5000.byLang[2])}\` | Taiwan, Singapore & Global Diaspora — Family Heritage Films & Cross-Border Property Tours |
| **4. Hindi (\`hi\`)** | 14% | \`${cohort50.byLang[3]}\` | \`${cohort500.byLang[3]}\` | \`${fmtNum(cohort5000.byLang[3])}\` | India & Diaspora — Milestone Anniversary/Wedding Legacy Films, EdTech & Workforce Training |
| **5. Portuguese (\`pt\`)** | 11% | \`${cohort50.byLang[4]}\` | \`${cohort500.byLang[4]}\` | \`${fmtNum(cohort5000.byLang[4])}\` | Brazil & Portugal — Family Biographies, Boutique Real Estate & Local Agency Fulfillment |
| **6. Arabic (\`ar\`)** | 9% | \`${cohort50.byLang[5]}\` | \`${cohort500.byLang[5]}\` | \`${fmtNum(cohort5000.byLang[5])}\` | UAE, Saudi Arabia & MENA — Luxury Villa/Hospitality Tours & Family Heritage Biographies |
| **7. Thai & SEA (\`th\`)** | 5% | \`${cohort50.byLang[6]}\` | \`${cohort500.byLang[6]}\` | \`${fmtNum(cohort5000.byLang[6])}\` | Thailand & SEA — Boutique Resort/Hospitality Walkthroughs & SMB Social Video Packs |
| **Total Global Studios** | **100%** | **\`50\`** | **\`500\`** | **\`5,000\`** | **7 Native UI Locales + 70+ Synced Delivery Languages** |

---

## 4. Consolidated 3-Year Financial Forecast (\`FY 2027\` – \`FY 2029\`)

*Combines the \`50 → 500 → 5,000\` Video Service Business (\`B2B2C\`) growth spine with proportionally calibrated Self-Serve Creators (\`B2C\`: \`1,450 → 9,500 → 40,000\` active subscribers):*

| Metric / P&L Line Item | **FY 2027** *(\`50\` Studios)* | **FY 2028** *(\`500\` Studios)* | **FY 2029** *(\`5,000\` Studios)* |
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
| Total Operating Expenses *(R&D + S&M + G&A)* | \`${fmtUsd(fy27.totalOpex)}\` | \`${fmtUsd(fy28.totalOpex)}\` | \`${fmtUsd(fy29.totalOpex)}\` |
| **GAAP Operating Income (EBITDA)** | **\`${fmtUsd(fy27.gaapEbitda)}\`** (\`${pct(fy27.gaapEbitda, fy27.totalGrossRev)}\`) | **\`${fmtUsd(fy28.gaapEbitda)}\`** (\`${pct(fy28.gaapEbitda, fy28.totalGrossRev)}\`) | **\`${fmtUsd(fy29.gaapEbitda)}\`** (\`${pct(fy29.gaapEbitda, fy29.totalGrossRev)}\`) |
| **Cash EBITDA (w/ \`$100K\` Startup Credit Track)** | **\`${fmtUsd(fy27.cashEbitda100k)}\`** (\`${pct(fy27.cashEbitda100k, fy27.totalGrossRev)}\`) | **\`${fmtUsd(fy28.cashEbitda100k)}\`** (\`${pct(fy28.cashEbitda100k, fy28.totalGrossRev)}\`) | **\`${fmtUsd(fy29.cashEbitda100k)}\`** (\`${pct(fy29.cashEbitda100k, fy29.totalGrossRev)}\`) |
| **Cash EBITDA (w/ \`$250K\` AI-First Credit Track)** | **\`${fmtUsd(fy27.cashEbitda250k)}\`** (\`${pct(fy27.cashEbitda250k, fy27.totalGrossRev)}\`) | **\`${fmtUsd(fy28.cashEbitda250k)}\`** (\`${pct(fy28.cashEbitda250k, fy28.totalGrossRev)}\`) | **\`${fmtUsd(fy29.cashEbitda250k)}\`** (\`${pct(fy29.cashEbitda250k, fy29.totalGrossRev)}\`) |

---

## 5. Why Cloud & Ecosystem Startup Grants Have Maximum Leverage Under This Model

- **Capital-Efficient Year 1 Ramp (\`25\` Founding Charter Studios → \`50\` Global Studios):** Full-year FY 2027 Google Cloud / Vertex AI compute COGS is **\`${fmtUsd(fy27.gcpCogs)}\`**. A \`$100,000\` Partner Credit grant offsets **\`${pct(fy27.credit100kUsed, fy27.gcpCogs)}\`** of Year 1 GCP compute (stretching into Q4 2027), while the \`$250,000\` AI-First track covers **100% of Year 1 GCP compute** and carries **\`${fmtUsd(fy27.credit250kCarryoverTo2028)}\`** forward into FY 2028 as Video Service studios scale \`10×\` from \`50\` to \`500\`.
- **Self-Sustaining From Month 1:** Even on the initial \`$2,000\` Start Tier alone, SceneFlow generates positive monthly operating cash flow from **January 2027 (\`${fmtUsd(cashEbitda2k2027[0])}\`)** through **December 2027 (\`${fmtUsd(cashEbitda2k2027[11])}\`, \`${fmtUsd(fy27.cashEbitda2k)}\` full-year)** because every \`$299\` Founding Charter, \`$29\` Blueprint Pass compute pack, and \`$9\` Explorer Test Flight is gross-margin positive on Day 1.
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

console.log('=== Generated SceneFlow Financial Models ===')
console.log(`FY27 Exit Subs: ${fy27.totalSubsExit} (${fy27.b2bTotalExit} B2B2C Studios + ${fy27.creatorTotalExit} Creators)`)
console.log(`FY27 Gross Rev: ${fmtUsd(fy27.totalGrossRev)} (B2B2C: ${fmtUsd(fy27.b2bTotalRev)} | Creator: ${fmtUsd(fy27.creatorTotalRev)})`)
console.log(`FY27 Dec Exit Base ARR: ${fmtUsd(fy27.exitBaseArr)} | Dec Total Run-Rate: ${fmtUsd(totalGrossRev2027[11] * 12)}`)
console.log(`FY27 GCP COGS: ${fmtUsd(fy27.gcpCogs)} | GAAP GP: ${fmtUsd(fy27.gaapGrossProfit)} (${pct(fy27.gaapGrossProfit, fy27.totalGrossRev)}) | GAAP EBITDA: ${fmtUsd(fy27.gaapEbitda)} (${pct(fy27.gaapEbitda, fy27.totalGrossRev)})`)
console.log(`Jan 2027 GAAP EBITDA: ${fmtUsd(gaapEbitda2027[0])} | Jan 2027 $2K Cash EBITDA: ${fmtUsd(cashEbitda2k2027[0])}`)
console.log(`Cohort 50 Run-Rate: ${fmtUsd(cohort50.totalAnnualRev)}/yr (GMV: ${fmtUsd(cohort50.annualOperatorGmv)}/yr)`)
console.log(`Cohort 500 Run-Rate: ${fmtUsd(cohort500.totalAnnualRev)}/yr (GMV: ${fmtUsd(cohort500.annualOperatorGmv)}/yr)`)
console.log(`Cohort 5,000 Run-Rate: ${fmtUsd(cohort5000.totalAnnualRev)}/yr (GMV: ${fmtUsd(cohort5000.annualOperatorGmv)}/yr)`)
console.log(`FY28 Gross Rev: ${fmtUsd(fy28.totalGrossRev)} | Exit Base ARR: ${fmtUsd(fy28.exitBaseArr)} | GAAP EBITDA: ${fmtUsd(fy28.gaapEbitda)} (${pct(fy28.gaapEbitda, fy28.totalGrossRev)})`)
console.log(`FY29 Gross Rev: ${fmtUsd(fy29.totalGrossRev)} | Exit Base ARR: ${fmtUsd(fy29.exitBaseArr)} | GAAP EBITDA: ${fmtUsd(fy29.gaapEbitda)} (${pct(fy29.gaapEbitda, fy29.totalGrossRev)})`)
