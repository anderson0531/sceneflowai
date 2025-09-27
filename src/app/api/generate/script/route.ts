import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth";

// This is a placeholder for your actual Cue service client
// In a real app, this would be initialized and imported from a shared location
async function getCueResponse(prompt: string): Promise<string> {
  const endpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const response = await fetch(`${endpoint}/api/cue/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || 'Failed to get response from Cue service');
  }

  const result = await response.json();
  // Assuming the script is in a 'response' property, which might need parsing if it's a stringified JSON
  try {
    const parsedResponse = JSON.parse(result.response);
    return parsedResponse.script || parsedResponse.response || JSON.stringify(parsedResponse);
  } catch {
    return result.response;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { beatSheet } = await req.json();

    if (!beatSheet || !Array.isArray(beatSheet) || beatSheet.length === 0) {
      return NextResponse.json({ success: false, error: 'Valid beatSheet is required' }, { status: 400 });
    }

    // Convert beatSheet to a simple string format for the prompt
    const scenesText = beatSheet.map((beat: any, index: number) => 
      `SCENE ${index + 1}: ${beat.slugline}\nSUMMARY: ${beat.summary || 'No summary provided.'}`
    ).join('\n\n');

    const prompt = `
      You are an expert screenwriter AI.
      Based on the following scene outline, write a complete screenplay in the Fountain markup syntax.
      The script should be properly formatted, including scene headings, character dialogue, parentheticals, and action lines.
      Flesh out the scenes with compelling dialogue and vivid descriptions. Do not include scene summaries in the final script.
      Only return the Fountain script content, with no other explanatory text, preamble, or apologies.

      Here is the scene outline:
      ---
      ${scenesText}
      ---
    `;

    const script = await getCueResponse(prompt);

    return NextResponse.json({ success: true, script });

  } catch (error: any) {
    console.error('[SCRIPT_GENERATION_ERROR]', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}

// Force re-evaluation by build system
