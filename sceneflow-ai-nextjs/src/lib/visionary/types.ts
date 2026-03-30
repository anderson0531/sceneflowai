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
  /** Supply score: how much content exists (0 = none, 100 = saturated) */
  supplyScore: number
  /** Demand score: audience interest (0 = none, 100 = massive) */
  demandScore: number
  /** Arbitrage score: demand - supply gap (higher = more opportunity) */
  arbitrageScore: number
  /** Estimated audience size in that language/region */
  estimatedAudience: string
  /** Revenue potential indicator */
  revenuePotential: 'high' | 'medium' | 'low'
  /** Notes about cultural adaptation needs */
  culturalNotes: string
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
  id: string;
  concept: string;
  genre?: string;
  overallScore: number;
  radarData: RadarAxis[]; // Data for the SVG Radar Chart
  marketScan: MarketTrend[];
  gapAnalysis: GapItem[];
  arbitrageMap: any; // Keep existing ArbitrageHeatMap data
  createdAt: string;
}

// =============================================================================
// API Request / Response
// =============================================================================

export interface CreateAnalysisRequest {
  concept: string
  genre?: string
  targetRegions?: string[]
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
