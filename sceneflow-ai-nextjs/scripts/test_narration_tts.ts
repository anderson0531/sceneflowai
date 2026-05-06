import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testNarrationTTS() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/vision/generate-scene-audio`;

    console.log(`Sending test narration TTS request to: ${url}`);

    const testPayload = {
      projectId: "test-project-narration", // Placeholder project ID
      sceneIndex: 0,
      audioType: "narration",
      text: "[pensive] In the quiet echoes of time, a new story begins.",
      voiceConfig: {
        provider: "google",
        voiceId: "gemini-en-US-Studio-A", // Example Gemini voice ID
        voiceName: "en-US-Studio-A",
        prompt: "[calm, low]"
      },
      language: "en",
      skipTranslation: true,
      skipDbUpdate: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Narration TTS test successful!");
      console.log("Response:", JSON.stringify(data, null, 2));
    } else {
      console.error("Narration TTS test failed.");
      console.error("Status:", response.status);
      console.error("Error Response:", JSON.stringify(data, null, 2));
    }

  } catch (err) {
    console.error("An unexpected error occurred:", err);
  }
}

testNarrationTTS();