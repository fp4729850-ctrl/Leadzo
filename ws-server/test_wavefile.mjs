import OpenAI from 'openai';
import { WaveFile } from 'wavefile';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: "Namaste! Main Leadzo se baat kar rahi hoon. Main aapki kaise madad kar sakti hoon?",
    response_format: "wav" // Get a WAV file directly so wavefile can parse it easily
  });
  
  const arrayBuffer = await response.arrayBuffer();
  const wavBuffer = Buffer.from(arrayBuffer);
  
  const wav = new WaveFile(wavBuffer);
  // Resample from 24kHz to 8kHz properly (with anti-aliasing)
  wav.toSampleRate(8000);
  // Convert to mu-law (which Twilio expects)
  wav.toMuLaw();
  
  // The samples are now in mu-law format
  const samples = wav.data.samples;
  
  console.log("Converted 8kHz mu-law buffer size:", samples.length);
  fs.writeFileSync('test_output.mulaw', Buffer.from(samples));
  console.log("Done. Wrote test_output.mulaw");
}

run().catch(console.error);
