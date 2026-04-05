const { execSync } = require('child_process');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const token = execSync('gcloud auth application-default print-access-token').toString().trim();
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;
  
  // Test 1: Studio voice with prompt
  const resp1 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      input: { text: "Hello there", prompt: "sound sad" },
      voice: { languageCode: "en-US", name: "en-US-Studio-M" },
      audioConfig: { audioEncoding: "MP3" }
    })
  });
  console.log("Studio-M with prompt:", await resp1.json());
  
  // Test 2: Gemini TTS with Kore
  const resp2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      input: { text: "Hello there", prompt: "sound sad" },
      voice: { languageCode: "en-US", name: "Kore", modelName: "gemini-2.5-flash-tts" },
      audioConfig: { audioEncoding: "MP3" }
    })
  });
  console.log("Gemini Kore with prompt:", resp2.ok ? "Success" : await resp2.json());
}
test();
