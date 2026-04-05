/**
 * Visionary Engine — Types
 * 
 * AI-powered market-gap analysis, global language arbitrage,
 * and idea-to-production bridging for SceneFlow AI.
 */

// =============================================================================
// Analysis Request / Input
// =============================================================================

export interface VisionaryAnalysisInput {
  /** Free-form concept description or existing project title */
  concept: string
  /** Optional genre hint */
  genre?: string
  /** Optional target regions (ISO 3166-1 alpha-2 codes) */
  targetRegions?: string[]
  /** Optional existing project ID to pull metadata from */
  projectId?: string
  /** Optional languages to focus on (BCP 47 codes) */
  focusLanguages?: string[]
}

// =============================================================================
// Analysis Phases (state machine)
// =============================================================================

export type VisionaryPhase =
  | 'idle'
  | 'market-scan'       // Phase 1: Scanning global content landscape
  | 'gap-analysis'      // Phase 2: Identifying underserved niches
  | 'arbitrage-map'     // Phase 3: Language & region opportunity mapping
  | 'bridge-plan'       // Phase 4: Idea-to-production action plan
  | 'complete'
  | 'error'

export interface VisionaryPhaseProgress {
  phase: VisionaryPhase
  progress: number  // 0-100
  message: string
}

// --- NEW: Generation Strategy ---
export interface SeriesGeneratorParams {
  highRevenue: boolean;
  viralPotential: boolean;
  lowCost: boolean;
}

// --- NEW: Radar Chart Axis ---
export interface RadarAxis {
  label: string;
  value: number; // 0-100
}

// =============================================================================
// Market Scan Results
// =============================================================================

export interface MarketTrend {
  id: string;
  title: string;
  description: string;
  heat: 'Rising' | 'Steady' | 'Niche'; // For the UI heat indicators
  thumbnailUrl?: string;               // For the visual moodboard
}

export interface MarketScanResult {
  trends: MarketTrend[]
  saturatedNiches: string[]
  emergingFormats: string[]
  timestamp: string
}

// =============================================================================
// Gap Analysis Results
// =============================================================================

export interface ContentGap {
  id: string
  niche: string
  description: string
  demandSignal: 'high' | 'medium' | 'low'
  competitionLevel: 'high' | 'medium' | 'low'
  opportunityScore: number  // 0-100
  suggestedAngles: string[]
  targetAudience: string
  estimatedTAM: string  // e.g. "2.3M viewers"
}

export interface GapItem {
  type: 'strength' | 'weakness';
  label: string;
  description: string;
  strategicPivot?: string; // The "Bridge" content for weaknesses
}

export interface GapAnalysisResult {
  gaps: ContentGap[]
  conceptFit: {
    score: number  // 0-100
    strengths: string[]
    weaknesses: string[]
    pivotSuggestions: string[]
  }
}

// =============================================================================
// Language Arbitrage Results
// =============================================================================

export interface LanguageOpportunity {
  language: string        // BCP 47 code
  languageName: string
  region: string           // ISO 3166-1 alpha-2
  regionName: string
  supplyScore: number
  demandScore: number
  arbitrageScore: number
  estimatedAudience: string
  revenuePotential: 'high' | 'medium' | 'low'
  culturalNotes: string
  optimizedTitle?: string
  optimizedCreativeBrief?: string
}

export interface ArbitrageHeatMapData {
  opportunities: LanguageOpportunity[]
  topRegions: Array<{
    region: string
    regionName: string
    totalArbitrageScore: number
    topLanguages: string[]
  }>
  globalInsight: string
}

/** Alias used by UI components */
export type ArbitrageMap = ArbitrageHeatMapData

// =============================================================================
// Bridge Plan (Idea → Production)
// =============================================================================

export interface BridgeAction {
  id: string
  phase: 'blueprint' | 'production' | 'final-cut' | 'premiere'
  action: string
  description: string
  estimatedCredits: number
  priority: 'critical' | 'recommended' | 'optional'
  dependencies: string[]  // IDs of prerequisite actions
}

export interface BridgePlan {
  title: string
  summary: string
  actions: BridgeAction[]
  totalEstimatedCredits: number
  estimatedTimeline: string
  recommendedLanguages: string[]
  successProbability: number  // 0-100
}

// =============================================================================
// Complete Report
// =============================================================================

export interface VisionaryReport {
  id?: string
  concept?: string
  genre?: string
  status?: 'pending' | 'in_progress' | 'complete' | 'failed'

  /** Phase 1 output — matches Gemini MarketScan JSON */
  marketScan: MarketScanResult
  /** Phase 2 output — matches Gemini GapAnalysis JSON */
  gapAnalysis: GapAnalysisResult
  /** Phase 3 output — matches Gemini ArbitrageMap JSON */
  arbitrageMap: ArbitrageHeatMapData
  /** Phase 4 output — streamed Series Bible text */
  bridgePlan?: string

  /** ISO 3166-1 alpha-2 codes the user chose before analysis (optional) */
  targetRegions?: string[]

  /** Derived overall score (conceptFit + avg arbitrage) */
  overallScore?: number
  /** Radar chart axes derived from phase data */
  radarData?: RadarAxis[]

  createdAt?: string
}

// =============================================================================
// API Request / Response
// =============================================================================

export interface CreateAnalysisRequest {
  concept: string
  genre?: string
  targetRegions?: string[]
  /** ISO region codes — Market Insights form sends this; analyze route reads as `regions` */
  regions?: string[]
  focusLanguages?: string[]
  projectId?: string
}

export interface CreateAnalysisResponse {
  success: boolean
  report?: VisionaryReport
  error?: string
}

export interface ListReportsResponse {
  success: boolean
  reports: VisionaryReport[]
  total: number
  page: number
  pageSize: number
}

export interface ReportDetailResponse {
  success: boolean
  report?: VisionaryReport
  error?: string
}

// =============================================================================
// Status Ticker Messages
// =============================================================================

export const PHASE_TICKER_MESSAGES: Record<string, string[]> = {
  'market-scan': [
    'Scouring global YouTube viewership trends...',
    'Identifying high-retention content patterns...',
    'Analyzing viral hooks in your niche...',
    'Cross-referencing historical metadata...',
    'Mapping category growth vs. saturation...',
  ],
  'gap-analysis': [
    'Isolating underserved audience segments...',
    'Calculating Audience Retention Potential (ARP)...',
    'Identifying "Content Voids" in the current market...',
    'Synthesizing creative pivot suggestions...',
    'Evaluating concept-market alignment...',
  ],
  'arbitrage-map': [
    'Calculating language ROI across 72 regions...',
    'Identifying high-CPM regional targets...',
    'Mapping supply-demand gaps by territory...',
    'Architecting the Optimized Series Bible...',
    'Finalizing creative hooks and localized titles...',
  ],
  'bridge-plan': [
    'Generating Series Bible...',
    'Building narrative framework...',
    'Crafting production blueprint...',
    'Synthesizing creative brief...',
  ],
  'complete': [
    'Analysis complete!',
    'Series Bible generated.',
    'Market Arbitrage Map ready.',
  ],
  'error': [
    'Analysis interrupted.',
    'Check connection or concept complexity.',
  ],
}
