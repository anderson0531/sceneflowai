import { getVertexAIAuthToken } from '../src/lib/vertexai/client';

async function test() {
  try {
    const token = await getVertexAIAuthToken();
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;
    
    // Test Studio voice with prompt
    console.log("Testing Studio-M with prompt...");
    const resp1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        input: { text: "Hello there", prompt: "sound sad" },
        voice: { languageCode: "en-US", name: "en-US-Studio-M" },
        audioConfig: { audioEncoding: "MP3" }
      })
    });
    console.log(await resp1.json());

    // Test Gemini TTS with standard name
    console.log("\nTesting gemini-2.5-flash-tts with en-US-Studio-M...");
    const resp2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        input: { text: "Hello there", prompt: "sound sad" },
        voice: { languageCode: "en-US", name: "en-US-Studio-M", modelName: "gemini-2.5-flash-tts" },
        audioConfig: { audioEncoding: "MP3" }
      })
    });
    console.log(await resp2.json());

    // Test Gemini TTS with Kore
    console.log("\nTesting gemini-2.5-flash-tts with Kore...");
    const resp3 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        input: { text: "Hello there", prompt: "sound sad" },
        voice: { languageCode: "en-US", name: "Kore", modelName: "gemini-2.5-flash-tts" },
        audioConfig: { audioEncoding: "MP3" }
      })
    });
    console.log(resp3.ok ? "Success!" : await resp3.json());
    
  } catch (err) {
    console.error(err);
  }
}
test();
