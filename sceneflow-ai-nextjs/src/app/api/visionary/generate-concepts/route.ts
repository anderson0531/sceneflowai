import { streamText } from '@/lib/vertexai/gemini';
import { buildConceptGenerationPrompt, SERIES_CONCEPT_GENERATION_SYSTEM } from '@/lib/visionary/prompt-templates';
import { NextResponse } from 'next/server'; // Keep NextResponse for error handling

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const report = await req.json();

    if (!report) {
      return NextResponse.json({ success: false, error: 'Analysis report is required' }, { status: 400 });
    }

    const prompt = buildConceptGenerationPrompt(report);

    const streamResponse = await streamText(prompt, {
      model: 'gemini-3.1-pro-preview',
      systemInstruction: SERIES_CONCEPT_GENERATION_SYSTEM,
      thinkingLevel: 'high',
      responseMimeType: 'text/plain', // Ensure text/plain for raw markdown stream
    });

    return streamResponse;

  } catch (error: any) {
    console.error('[Visionary Concepts API Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
