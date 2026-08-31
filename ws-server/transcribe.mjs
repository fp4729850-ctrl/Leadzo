import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream("/tmp/real_human_short.wav"),
    model: "whisper-1",
  });
  console.log("Transcription: " + response.text);
}
main();
