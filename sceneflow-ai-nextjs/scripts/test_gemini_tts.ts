import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getVertexAIAuthToken } from '../src/lib/vertexai/client';

async function test() {
  try {
    const token = await getVertexAIAuthToken();
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;
    
    console.log("Testing Studio-M with prompt...");
    const resp1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        input: { text: "Hello there" },
        voice: { languageCode: "en-US", name: "en-US-Studio-M" },
        audioConfig: { audioEncoding: "MP3" }
      })
    });
    console.log(resp1.ok ? "Success" : await resp1.json());

    console.log("\nTesting gemini-2.5-flash-tts with en-US-Studio-M...");
    const resp2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-goog-user-project': process.env.GCP_PROJECT_ID || '' },
      body: JSON.stringify({
        input: { text: "Hello there", prompt: "sound sad" },
        voice: { languageCode: "en-US", name: "en-US-Studio-M", modelName: "gemini-2.5-flash-tts" },
        audioConfig: { audioEncoding: "MP3" }
      })
    });
    console.log(resp2.ok ? "Success" : await resp2.json());

    console.log("\nTesting gemini-2.5-flash-tts with Kore...");
    const resp3 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-goog-user-project': process.env.GCP_PROJECT_ID || '' },
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
