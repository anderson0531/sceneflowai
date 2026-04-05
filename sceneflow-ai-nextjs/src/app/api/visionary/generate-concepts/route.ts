import { generateText } from '@/lib/vertexai/gemini';
import { buildConceptGenerationPrompt, SERIES_CONCEPT_GENERATION_SYSTEM } from '@/lib/visionary/prompt-templates';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body) {
      return NextResponse.json({ success: false, error: 'Analysis report is required' }, { status: 400 });
    }

    const { targetMarkets, ...report } = body;
    const prompt = buildConceptGenerationPrompt(report, targetMarkets);

    const result = await generateText(prompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_CONCEPT_GENERATION_SYSTEM,
      thinkingLevel: 'high',
      responseMimeType: 'application/json',
    });

    const parsed = safeParseJSON(result.text || '');
    const concepts = Array.isArray(parsed?.concepts) ? parsed.concepts : null;

    if (!concepts || concepts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Concept generation returned an invalid payload.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      concepts,
    });

  } catch (error: any) {
    console.error('[Visionary Concepts API Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
