import { NextResponse } from 'next/server';
import { generateText } from '@/lib/vertexai/gemini';
import { buildConceptGenerationPrompt, SERIES_CONCEPT_GENERATION_SYSTEM } from '@/lib/visionary/prompt-templates';
import { safeParseJSON } from '@/lib/utils/safeParseJSON';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const report = await req.json();

    if (!report) {
      return NextResponse.json({ success: false, error: 'Analysis report is required' }, { status: 400 });
    }

    const prompt = buildConceptGenerationPrompt(report);

    const conceptsResult = await generateText(prompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_CONCEPT_GENERATION_SYSTEM,
      thinkingLevel: 'high', // Use high for maximum creativity
    });

    const conceptsJson = safeParseJSON(conceptsResult.text);

    if (!conceptsJson || !conceptsJson.concepts) {
      console.error('[Visionary Concepts] Failed to parse concepts from LLM', { text: conceptsResult.text });
      return NextResponse.json({ success: false, error: 'Failed to generate valid series concepts.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, concepts: conceptsJson.concepts });

  } catch (error: any) {
    console.error('[Visionary Concepts API Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
