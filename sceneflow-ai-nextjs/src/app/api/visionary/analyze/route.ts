import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { generateText } from '@/lib/vertexai/gemini';
import { getGeminiTextModel } from '@/lib/config/modelConfig';
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

// 🔥 Vercel Pro Configuration: Must be outside the POST handler
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
      { 
        model: getGeminiTextModel('flash'), 
        systemInstruction: MARKET_SCAN_SYSTEM, 
        thinkingLevel: 'minimal' 
      }
    );
    const marketScan = safeParseJSON(marketScanResult.text);
    if (!marketScan || Object.keys(marketScan).length === 0) {
      throw new Error("Phase 1 failed to produce market data.");
    }

    // Phase 2: Gap Analysis
    const gapAnalysisResult = await generateText(
      buildGapAnalysisPrompt(concept, JSON.stringify(marketScan), genre),
      { 
        model: getGeminiTextModel('flash'), 
        systemInstruction: GAP_ANALYSIS_SYSTEM, 
        thinkingLevel: 'minimal' 
      }
    );
    const gapAnalysis = safeParseJSON(gapAnalysisResult.text);
    if (!gapAnalysis || Object.keys(gapAnalysis).length === 0) {
      throw new Error("Phase 2 failed to produce gap analysis data.");
    }

    // Phase 3: Arbitrage Map
    const arbitrageResult = await generateText(
      buildArbitragePrompt(concept, JSON.stringify(gapAnalysis), focusLanguages),
      { 
        model: 'gemini-3.1-pro-preview', 
        systemInstruction: ARBITRAGE_SYSTEM, 
        thinkingLevel: 'medium' 
      }
    );
    const arbitrageMap = safeParseJSON(arbitrageResult.text);

    // 🔥 STRATEGIC DEBUG LOG
    console.log('📊 [Visionary Debug] Phase 3 Arbitrage Map Data:');
    console.log(JSON.stringify(arbitrageMap, null, 2));

    if (!arbitrageMap || Object.keys(arbitrageMap).length === 0) {
      throw new Error("Phase 3 failed to produce arbitrage map data.");
    }
    
    // Phase 4: Series Bible
    const biblePrompt = buildSeriesBiblePrompt({
      originalConcept: concept,
      selectedMarket: selectedMarket || (arbitrageMap.opportunities && arbitrageMap.opportunities[0])
    });

    console.log('📜 [Visionary API] Starting Phase 4 (Series Bible)...');

    const seriesBibleResult = await generateText(biblePrompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_BIBLE_SYSTEM_PROMPT,
      // ⚡ TWEAK: Using 'medium' instead of 'high' to stay under 60s while testing
      thinkingLevel: 'medium' 
    });
    
    const seriesBible = safeParseJSON(seriesBibleResult.text);
    console.log('✅ Series Bible Complete');

    return NextResponse.json({
      reportId: crypto.randomUUID(),
      marketScan,
      gapAnalysis,
      arbitrageMap,
      seriesBible: seriesBible || { error: "Failed to generate series bible" },
      metadata: { userId, timestamp: new Date().toISOString() }
    });

  } catch (error: any) {
    console.error('💥 [Visionary API Error]:', error.message);
    return NextResponse.json(
      { error: 'Pipeline failed', details: error.message },
      { status: 500 }
    );
  }
}
