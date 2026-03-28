import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { generateText } from '@/lib/vertexai/gemini';
import { 
  buildMarketScanPrompt, 
  buildGapAnalysisPrompt,
  buildArbitragePrompt,
  buildSeriesBiblePrompt,
  MARKET_SCAN_SYSTEM,
  GAP_ANALYSIS_SYSTEM,
  ARBITRAGE_SYSTEM,
  SERIES_BIBLE_SYSTEM_PROMPT
} from '@/lib/visionary/prompt-templates';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const userId = headerList.get('x-user-id') || 'anonymous';

    const body = await req.json();
    const { concept, genre, regions, focusLanguages, selectedMarket } = body;

    if (!concept) {
      return NextResponse.json({ error: 'Concept is required' }, { status: 400 });
    }

    // Phase 1: Market Scan
    const marketScanResult = await generateText(
      buildMarketScanPrompt(concept, genre, regions),
      { model: 'gemini-3-flash-preview', systemInstruction: MARKET_SCAN_SYSTEM, thinkingLevel: 'low' }
    );
    const marketScan = safeParseJSON(marketScanResult.text);

    // Phase 2: Gap Analysis
    const gapAnalysisResult = await generateText(
      buildGapAnalysisPrompt(concept, JSON.stringify(marketScan), genre),
      { model: 'gemini-3-flash-preview', systemInstruction: GAP_ANALYSIS_SYSTEM, thinkingLevel: 'low' }
    );
    const gapAnalysis = safeParseJSON(gapAnalysisResult.text);

    // Phase 3: Arbitrage Map
    const arbitrageResult = await generateText(
      buildArbitragePrompt(concept, JSON.stringify(gapAnalysis), focusLanguages),
      { model: 'gemini-3.1-pro-preview', systemInstruction: ARBITRAGE_SYSTEM, thinkingLevel: 'medium' }
    );
    const arbitrageMap = safeParseJSON(arbitrageResult.text);
    
    // Phase 4: Series Bible
    const biblePrompt = buildSeriesBiblePrompt({
      originalConcept: concept,
      selectedMarket: selectedMarket || (arbitrageMap.opportunities && arbitrageMap.opportunities[0])
    });

    const seriesBibleResult = await generateText(biblePrompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_BIBLE_SYSTEM_PROMPT,
      thinkingLevel: 'high'
    });
    const seriesBible = safeParseJSON(seriesBibleResult.text);

    return NextResponse.json({
      reportId: crypto.randomUUID(),
      marketScan,
      gapAnalysis,
      arbitrageMap,
      seriesBible,
      metadata: { userId, timestamp: new Date().toISOString() }
    });

  } catch (error: any) {
    console.error('[Visionary API Error]:', error.message);
    return NextResponse.json(
      { error: 'Pipeline failed', details: error.message },
      { status: 500 }
    );
  }
}
