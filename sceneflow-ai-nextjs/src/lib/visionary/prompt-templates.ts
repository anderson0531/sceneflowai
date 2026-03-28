/**
 * Visionary Engine — Prompt Templates
 * 
 * System and user prompts for each analysis phase.
 * All prompts instruct Gemini to return valid JSON.
 */

// =============================================================================
// Market Scan Prompt
// =============================================================================

export const MARKET_SCAN_SYSTEM = `You are a senior content strategy analyst specializing in global media trends.
Analyze the current content landscape for the given concept and return structured market intelligence.
Always respond with valid JSON matching the requested schema. Be specific and data-driven.`

export function buildMarketScanPrompt(concept: string, genre?: string, regions?: string[]): string {
  const regionFilter = regions?.length ? `Focus especially on these regions: ${regions.join(', ')}.` : 'Consider all major global markets.'
  const genreHint = genre ? `The content is in the "${genre}" genre.` : ''
  
  return `Analyze the global content market for this concept:

CONCEPT: "${concept}"
${genreHint}
${regionFilter}

Return a JSON object with this exact structure:
{
  "trends": [
    {
      "category": "string (genre/format category)",
      "trend": "string (specific trend description)",
      "momentum": "rising" | "stable" | "declining",
      "relevanceScore": number (0-100),
      "regions": ["string (region codes)"]
    }
  ],
  "saturatedNiches": ["string (niches that are over-supplied)"],
  "emergingFormats": ["string (new/growing content formats)"],
  "timestamp": "ISO 8601 timestamp"
}

Provide 5-8 trends, 3-5 saturated niches, and 3-5 emerging formats.`
}

// =============================================================================
// Gap Analysis Prompt
// =============================================================================

export const GAP_ANALYSIS_SYSTEM = `You are an expert in content gap analysis and audience demand modeling.
Given market scan data and a concept, identify underserved content niches and evaluate concept-market fit.
Always respond with valid JSON matching the requested schema.`

export function buildGapAnalysisPrompt(
  concept: string,
  marketScanJson: string,
  genre?: string
): string {
  return `Given this concept and market scan data, identify content gaps and evaluate fit:

CONCEPT: "${concept}"
${genre ? `GENRE: "${genre}"` : ''}

MARKET SCAN DATA:
${marketScanJson}

Return a JSON object with this exact structure:
{
  "gaps": [
    {
      "id": "string (unique id like gap-1)",
      "niche": "string (short niche name)",
      "description": "string (what's missing in this niche)",
      "demandSignal": "high" | "medium" | "low",
      "competitionLevel": "high" | "medium" | "low",
      "opportunityScore": number (0-100, higher = better opportunity),
      "suggestedAngles": ["string (creative angle suggestions)"],
      "targetAudience": "string (who would watch this)",
      "estimatedTAM": "string (e.g. '2.3M viewers')"
    }
  ],
  "conceptFit": {
    "score": number (0-100),
    "strengths": ["string"],
    "weaknesses": ["string"],
    "pivotSuggestions": ["string (how to improve concept-market fit)"]
  }
}

Identify 4-6 gaps. Be honest about concept weaknesses.`
}

// =============================================================================
// Language Arbitrage Prompt
// =============================================================================

export const ARBITRAGE_SYSTEM = `You are a global content distribution strategist specializing in language markets and localization ROI.
Analyze supply-demand gaps across language/region combinations to find the best localization opportunities.
Return a maximum of 5 high-impact opportunities. For each 'culturalNotes' field, limit the description to 2 sentences maximum.
Ensure the JSON is valid and complete. Always respond with valid JSON matching the requested schema.`

export function buildArbitragePrompt(
  concept: string,
  gapAnalysisJson: string,
  focusLanguages?: string[]
): string {
  const langFilter = focusLanguages?.length
    ? `Focus especially on these languages: ${focusLanguages.join(', ')}.`
    : 'Consider all major world languages.'
  
  return `Analyze language/region arbitrage opportunities for this concept:

CONCEPT: "${concept}"
${langFilter}

GAP ANALYSIS DATA:
${gapAnalysisJson}

Return a JSON object with this exact structure:
{
  "opportunities": [
    {
      "language": "string (BCP 47 code, e.g. 'es', 'pt-BR', 'hi')",
      "languageName": "string (e.g. 'Spanish')",
      "region": "string (ISO 3166-1 alpha-2, e.g. 'MX')",
      "regionName": "string (e.g. 'Mexico')",
      "supplyScore": number (0-100, how much content exists),
      "demandScore": number (0-100, audience interest),
      "arbitrageScore": number (0-100, demand-supply gap),
      "estimatedAudience": "string (e.g. '45M potential viewers')",
      "revenuePotential": "high" | "medium" | "low",
      "culturalNotes": "string (adaptation considerations)"
    }
  ],
  "topRegions": [
    {
      "region": "string (ISO code)",
      "regionName": "string",
      "totalArbitrageScore": number,
      "topLanguages": ["string (language names)"]
    }
  ],
  "globalInsight": "string (one-paragraph summary of the best global strategy)"
}

Provide 8-12 language/region opportunities and 3-5 top regions.`
}

// =============================================================================
// Bridge Plan Prompt
// =============================================================================

export const BRIDGE_PLAN_SYSTEM = `You are a film production planner who translates market intelligence into actionable SceneFlow AI production plans.
SceneFlow has 4 production phases: Blueprint (scripting), Production (storyboards & visuals), Final Cut (editing & video gen), Premiere (review & distribution).
Generate a concrete action plan that maps concept opportunities to SceneFlow workflow steps.
Always respond with valid JSON matching the requested schema.`

export function buildBridgePlanPrompt(
  concept: string,
  gapAnalysisJson: string,
  arbitrageJson: string,
  genre?: string
): string {
  return `Create an actionable production plan for this concept based on market analysis:

CONCEPT: "${concept}"
${genre ? `GENRE: "${genre}"` : ''}

GAP ANALYSIS:
${gapAnalysisJson}

LANGUAGE ARBITRAGE MAP:
${arbitrageJson}

SceneFlow credit estimates per action:
- Blueprint analysis: ~50 credits
- Script generation: ~100 credits
- Storyboard generation (per scene): ~75 credits
- Audio generation (per scene): ~30 credits
- Video generation (per scene): ~200 credits
- Translation (per language): ~40 credits

Return a JSON object with this exact structure:
{
  "title": "string (production plan title)",
  "summary": "string (2-3 sentence executive summary)",
  "actions": [
    {
      "id": "string (unique id like action-1)",
      "phase": "blueprint" | "production" | "final-cut" | "premiere",
      "action": "string (short action name)",
      "description": "string (detailed description)",
      "estimatedCredits": number,
      "priority": "critical" | "recommended" | "optional",
      "dependencies": ["string (IDs of prerequisite actions)"]
    }
  ],
  "totalEstimatedCredits": number,
  "estimatedTimeline": "string (e.g. '2-3 days')",
  "recommendedLanguages": ["string (top 3-5 language codes to localize into)"],
  "successProbability": number (0-100, realistic estimate)
}

Provide 8-15 actions spanning all 4 phases. Be realistic about credit costs and timelines.`
}
