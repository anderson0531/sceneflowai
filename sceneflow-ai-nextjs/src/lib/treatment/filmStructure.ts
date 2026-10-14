import type { ContentIntent } from '@/lib/content/contentIntent'
import { resolveBlueprintProductionFormat } from '@/lib/content/contentIntent'
import { getSeriesProductionProfile } from '@/config/series/productionFormats'
import type { BeatStructureKey } from '@/lib/treatment/structures'

export interface FilmStructureConcept {
  input_synopsis?: string
  core_themes?: string[]
}

/**
 * Pick a beat structure from the production type, then from the text.
 * Non-fiction types are decided before hero's-journey and Save the Cat, so a
 * long documentary cannot be coerced into a fictional feature structure.
 */
export function autoDetectFilmStructure(
  input: string,
  coreConcept: FilmStructureConcept | null,
  format: string,
  targetMinutes: number,
  contentIntent?: ContentIntent
): { structure: BeatStructureKey; confidence: number; reason: string } {
  const content = `${input} ${coreConcept?.input_synopsis || ''} ${coreConcept?.core_themes?.join(' ') || ''}`.toLowerCase()
  const profile = getSeriesProductionProfile(format)
  const resolved = resolveBlueprintProductionFormat(format)
  const intent = contentIntent ?? profile?.intent

  const instructionalPatterns = /\b(tutorial|how-to|guide|lesson|learn|teach|step-by-step|instructions|training|course|module|explain|explainer|walkthrough|demonstration)\b/i
  if (
    instructionalPatterns.test(content) ||
    resolved === 'education' ||
    resolved === 'training' ||
    resolved === 'explainer' ||
    profile?.engine === 'educational'
  ) {
    return {
      structure: 'instructional',
      confidence: 0.9,
      reason: 'Content has educational/instructional focus',
    }
  }

  const salesDemoPatterns = /\b(demo|product|sales|pitch|walkthrough|tour|feature|benefit|roi|conversion|prospect|lead|explainer|case study|advertisement|ad\b)\b/i
  const commercialFormats = ['product_demo', 'explainer', 'case_study', 'advertisement']
  if (
    salesDemoPatterns.test(content) ||
    commercialFormats.includes(resolved) ||
    profile?.intent === 'commercial'
  ) {
    return {
      structure: 'instructional',
      confidence: 0.85,
      reason: 'Content suits commercial/demo format',
    }
  }

  const newsPatterns = /\b(news|report|breaking|investigate|coverage|headline|anchor|correspondent|journalism|update)\b/i
  if (newsPatterns.test(content) || resolved === 'news' || profile?.engine === 'news') {
    return {
      structure: 'mini_doc',
      confidence: 0.85,
      reason: 'Content suits news/reporting format',
    }
  }

  const documentaryPatterns = /\b(documentary|real|authentic|behind-the-scenes|journey|explore|discover|reveal|interview|profile|portrait|day-in-the-life|story of|true story|podcast)\b/i
  if (
    documentaryPatterns.test(content) ||
    resolved === 'documentary' ||
    resolved === 'podcast' ||
    resolved === 'interview' ||
    profile?.engine === 'documentary'
  ) {
    return {
      structure: 'mini_doc',
      confidence: 0.85,
      reason: 'Content suits documentary/podcast/mini-doc format',
    }
  }

  if (intent && intent !== 'fiction') {
    if (intent === 'commercial') {
      return {
        structure: 'instructional',
        confidence: 0.7,
        reason: 'Commercial intent defaults to problem/solution instructional structure',
      }
    }
    return {
      structure: 'mini_doc',
      confidence: 0.7,
      reason: `${intent} intent defaults to documentary/segment structure (not three-act)`,
    }
  }

  const herosJourneyPatterns = /\b(hero|journey|quest|adventure|transform|overcome|destiny|calling|mentor|ordeal|return|triumph|dragon|villain|chosen one|reluctant|crossing threshold)\b/i
  if (herosJourneyPatterns.test(content)) {
    return {
      structure: 'heros_journey',
      confidence: 0.8,
      reason: "Content contains hero's journey narrative elements",
    }
  }

  const saveTheCatPatterns = /\b(commercial|blockbuster|mainstream|hook|catalyst|fun and games|midpoint|twist|all is lost|finale|crowd-pleaser|high-concept|entertainment)\b/i
  if (saveTheCatPatterns.test(content) || targetMinutes >= 30) {
    if (targetMinutes >= 20) {
      return {
        structure: 'save_the_cat',
        confidence: 0.75,
        reason: 'Content suits structured commercial narrative',
      }
    }
  }

  return {
    structure: 'three_act',
    confidence: 0.7,
    reason: 'Using versatile three-act structure as default',
  }
}
