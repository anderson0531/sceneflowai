import { generateText } from '@/lib/vertexai/gemini';

const SERIES_ARCHITECT_SYSTEM_PROMPT = `
Role: You are a Senior Showrunner for a major streaming network.

Input: A 5-episode series concept titled "{title}".

Task: Expand this into a 10-episode Master Blueprint.

Requirements:

Narrative Pacing: Maintain the "High-Stakes" and "Non-Tutorial" tone.

The Mid-Point Shift: Episode 5 must end on a massive narrative pivot or "Tactical Ruin" that raises the stakes for the back half.

Episode Structure: Each of the 10 episodes must include a "Hook" (to stop click-off) and a "AVD Tactical Pause" (a high-tension moment).

Characters: Expand the protagonist's flaw and add 2 supporting characters (one ally, one antagonist force).

Output Format: Return as a strictly validated JSON object with title, logline, synopsis, episodes[], and characters[].
`;

export async function generateSeriesBible(concept: any) {
  let prompt = SERIES_ARCHITECT_SYSTEM_PROMPT;
  prompt = prompt.replace('{title}', concept.title);

  const response = await generateText(prompt, {
    model: 'gemini-3.1-pro-preview',
    thinkingLevel: 'high',
  });

  // Basic parsing, assuming generateText returns a stringified JSON
  return JSON.parse(response.text);
}
