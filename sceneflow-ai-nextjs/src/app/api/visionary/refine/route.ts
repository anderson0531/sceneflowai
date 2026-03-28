import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/vertexai/gemini';
import { buildSeriesBiblePrompt, SERIES_BIBLE_SYSTEM_PROMPT } from '@/lib/visionary/prompt-templates';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';
import { MarketSelection } from '@/types/visionary';

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // Allow up to 3 minutes for creative generation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as MarketSelection;

    if (!body.originalConcept || !body.selectedMarket) {
      return NextResponse.json({ success: false, error: 'Missing concept or market selection' }, { status: 400 });
    }

    const prompt = buildSeriesBiblePrompt(body);

    const bibleText = await generateText(prompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_BIBLE_SYSTEM_PROMPT,
      thinkingLevel: 'MEDIUM',
      maxOutputTokens: 8192,
    });

    const seriesBible = safeParseJSON(bibleText.text);

    if (!seriesBible) {
      console.error('[Visionary Refine] Failed to parse Series Bible from LLM', { text: bibleText.text });
      return NextResponse.json({ success: false, error: 'Failed to generate a valid series bible from the creative brief.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, seriesBible });

  } catch (error: any) {
    console.error('[Visionary Refine] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
