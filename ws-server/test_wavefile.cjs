const OpenAI = require('openai').default;
const { WaveFile } = require('wavefile');
const fs = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: "Namaste! Main Leadzo se baat kar rahi hoon. Main aapki kaise madad kar sakti hoon?",
    response_format: "wav"
  });
  
  const arrayBuffer = await response.arrayBuffer();
  const wavBuffer = Buffer.from(arrayBuffer);
  
  const wav = new WaveFile(wavBuffer);
  wav.toSampleRate(8000);
  wav.toMuLaw();
  
  const samples = wav.data.samples;
  
  console.log("Converted 8kHz mu-law buffer size:", samples.length);
}

run().catch(console.error);
