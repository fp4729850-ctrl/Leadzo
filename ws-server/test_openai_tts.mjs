import OpenAI from 'openai';
import { mulaw } from 'alawmulaw';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  console.log("Fetching OpenAI TTS...");
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: "Namaste! Main Leadzo se baat kar rahi hoon. Main aapki kaise madad kar sakti hoon?",
    response_format: "pcm"
  });
  
  const arrayBuffer = await response.arrayBuffer();
  const pcmBuffer = Buffer.from(arrayBuffer);
  console.log("Received 24kHz PCM buffer size:", pcmBuffer.length);
  
  // Resample 24kHz to 8kHz (drop 2 out of every 3 samples)
  const sampleCount = Math.floor(pcmBuffer.length / 2);
  const targetCount = Math.floor(sampleCount / 3);
  const mulawBuffer = Buffer.alloc(targetCount);
  
  let mulawOffset = 0;
  for (let i = 0; i < targetCount; i++) {
    // 3:1 ratio. 1 sample = 2 bytes (16-bit)
    const pcmIndex = i * 3 * 2; 
    if (pcmIndex + 1 < pcmBuffer.length) {
      const pcmSample = pcmBuffer.readInt16LE(pcmIndex);
      const mulawSample = mulaw.encodeSample(pcmSample);
      mulawBuffer[mulawOffset++] = mulawSample;
    }
  }
  
  console.log("Converted 8kHz mu-law buffer size:", mulawOffset);
  fs.writeFileSync('test_output.mulaw', mulawBuffer.slice(0, mulawOffset));
  console.log("Done. Wrote test_output.mulaw");
}

run().catch(console.error);
