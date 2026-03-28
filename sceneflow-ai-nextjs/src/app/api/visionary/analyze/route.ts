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

// 🔥 Vercel Pro Config: 5-minute timeout window
export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

export async function POST(req: Request) {
  console.log('🚀 [Visionary API] Initializing Speed-Run Pipeline');
  
  try {
    const headerList = await headers();
    const userId = headerList.get('x-user-id') || 'anonymous';
    const body = await req.json();
    const { concept, genre, regions, focusLanguages, selectedMarket } = body;

    if (!concept) return NextResponse.json({ error: 'Concept is required' }, { status: 400 });

    /**
     * ⚡ PHASE 1 & 2: CONCURRENT DISCOVERY
     */
    const [marketScanRaw, gapAnalysisRaw] = await Promise.all([
      generateText(
        buildMarketScanPrompt(concept, genre, regions),
        { 
          model: 'gemini-3.1-pro-preview', 
          systemInstruction: MARKET_SCAN_SYSTEM, 
          thinkingLevel: 'minimal'
        }
      ),
      generateText(
        buildGapAnalysisPrompt(concept, "{}", genre), 
        { 
          model: 'gemini-3.1-pro-preview', 
          systemInstruction: GAP_ANALYSIS_SYSTEM, 
          thinkingLevel: 'minimal'
        }
      )
    ]);

    const marketScan = safeParseJSON(marketScanRaw.text);
    const gapAnalysis = safeParseJSON(gapAnalysisRaw.text);

    console.log('✅ Discovery Phases Complete (Lightning Speed)');

    /**
     * 🧠 PHASE 3: ARBITRAGE MAP
     */
    const arbitrageResult = await generateText(
      buildArbitragePrompt(concept, JSON.stringify(gapAnalysis), focusLanguages),
      { 
        model: 'gemini-3.1-pro-preview', 
        systemInstruction: ARBITRAGE_SYSTEM, 
        thinkingLevel: 'low' 
      }
    );
    const arbitrageMap = safeParseJSON(arbitrageResult.text);
    
    console.log('📊 [Visionary Debug] Phase 3 Arbitrage Map Data Logged');
    console.log(JSON.stringify(arbitrageMap, null, 2));

    /**
     * 📜 PHASE 4: SERIES BIBLE
     */
    const biblePrompt = buildSeriesBiblePrompt({
      originalConcept: concept,
      selectedMarket: selectedMarket || (arbitrageMap?.opportunities?.[0])
    });

    const seriesBibleResult = await generateText(biblePrompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_BIBLE_SYSTEM_PROMPT,
      thinkingLevel: 'medium'
    });
    
    const seriesBible = safeParseJSON(seriesBibleResult.text);
    console.log('✅ Full Pipeline Success');

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
