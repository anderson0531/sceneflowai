import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { generateText, streamText } from '@/lib/vertexai/gemini';
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

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Extract text content from Vertex streamGenerateContent JSON chunks.
 * The stream body is a JSON array: [{candidates:[{content:{parts:[{text}]}}]}, ...]
 * We parse incrementally, pull out non-thought text parts, and forward clean text.
 */
function extractTextFromVertexChunk(raw: string): string {
  try {
    const chunks = safeParseJSON(raw)
    if (!chunks) return ''
    const arr = Array.isArray(chunks) ? chunks : [chunks]
    const parts: string[] = []
    for (const chunk of arr) {
      const candidates = chunk?.candidates ?? []
      for (const candidate of candidates) {
        for (const part of candidate?.content?.parts ?? []) {
          if (part.thought) continue
          if (part.text) parts.push(part.text)
        }
      }
    }
    return parts.join('')
  } catch {
    return raw
  }
}

export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const userId = headerList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: "Auth Required" }, { status: 401 });

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
    if (!arbitrageMap || Object.keys(arbitrageMap).length === 0) {
      throw new Error("Phase 3 failed to produce arbitrage map data.");
    }
    
    // Phase 4: Stream Series Bible via Vertex AI
    const biblePrompt = buildSeriesBiblePrompt({
      originalConcept: concept,
      selectedMarket: selectedMarket || (arbitrageMap.opportunities?.[0])
    });

    const responseStream = await streamText(biblePrompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_BIBLE_SYSTEM_PROMPT.trim(),
      thinkingLevel: 'high',
    });

    // Build a composite stream: metadata JSON line first, then transformed
    // Vertex text chunks. This avoids stuffing non-ASCII data into HTTP
    // headers (which are limited to Latin-1 and crash on CJK / Devanagari).
    const encoder = new TextEncoder()
    const metadataLine = JSON.stringify({ __metadata: { marketScan, gapAnalysis, arbitrageMap } }) + '\n'

    const vertexReader = responseStream.body?.getReader()
    const decoder = new TextDecoder()

    const compositeStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(metadataLine))

        if (!vertexReader) { controller.close(); return }

        // Buffer for incremental JSON array parsing from Vertex
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await vertexReader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            // Vertex streams a JSON array; try to extract text so far
            const text = extractTextFromVertexChunk(buffer)
            if (text) {
              controller.enqueue(encoder.encode(text))
              buffer = ''
            }
          }
          // Flush any remaining buffer
          if (buffer.trim()) {
            const remaining = extractTextFromVertexChunk(buffer)
            if (remaining) controller.enqueue(encoder.encode(remaining))
          }
        } catch (err) {
          console.error('[Visionary] Stream transform error:', err)
        }
        controller.close()
      }
    })

    return new Response(compositeStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('[Visionary API Error]:', error.message);
    return NextResponse.json(
      { error: 'Pipeline failed', details: error.message },
      { status: 500 }
    );
  }
}
