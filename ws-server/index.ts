import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { mulaw } from 'alawmulaw';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const { DEEPGRAM_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY } = process.env;

if (!DEEPGRAM_API_KEY || !OPENAI_API_KEY || !ELEVENLABS_API_KEY) {
  console.error("Missing critical API Keys in .env");
  process.exit(1);
}

const deepgram = createClient(DEEPGRAM_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// Helper: Convert 16kHz PCM16 (ElevenLabs) to 8kHz mu-law (Twilio)
function transcodePcm16ToMulaw(base64Pcm16: string): string {
  const pcmBuffer = Buffer.from(base64Pcm16, 'base64');
  const sampleCount = pcmBuffer.length / 2;
  const targetCount = Math.floor(sampleCount / 2); // 16kHz to 8kHz
  const mulawBuffer = Buffer.alloc(targetCount);
  
  let mulawOffset = 0;
  for (let i = 0; i < sampleCount; i += 2) {
    if (i * 2 + 1 < pcmBuffer.length) {
      const pcmSample = pcmBuffer.readInt16LE(i * 2);
      const mulawSample = mulaw.encode[pcmSample < 0 ? pcmSample + 65536 : pcmSample] ?? 255;
      mulawBuffer[mulawOffset++] = mulawSample;
    }
  }
  return mulawBuffer.toString('base64');
}

app.post('/twiml', (req, res) => {
  const twiml = `
    <Response>
      <Connect>
        <Stream url="wss://${req.headers.host}/stream" />
      </Connect>
    </Response>
  `;
  res.type('text/xml');
  res.send(twiml);
});

wss.on('connection', (ws, req) => {
  if (req.url !== '/stream') {
    ws.close();
    return;
  }
  
  let streamSid = '';
  let deepgramLive: any = null;
  let elevenLabsWs: WebSocket | null = null;
  let isAITalking = false;
  let conversationHistory: any[] = [{
    role: "system",
    content: "You are a helpful AI assistant for Leadzo. Keep responses short (1-2 sentences)."
  }];

  // 1. Initialize Deepgram (Listening)
  deepgramLive = deepgram.listen.live({
    model: 'nova-2',
    language: 'hi', // Hindi/English support
    encoding: 'mulaw',
    sample_rate: 8000,
    interim_results: true,
    endpointing: 300,
  });

  deepgramLive.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram connected");
  });

  deepgramLive.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (transcript && data.is_final) {
      console.log(`User: ${transcript}`);
      
      // VAD Interruption Logic MVP:
      // If user speaks while AI is talking, stop the AI.
      if (isAITalking) {
        console.log("INTERRUPTION DETECTED! Stopping AI.");
        ws.send(JSON.stringify({ event: "clear", streamSid }));
        if (elevenLabsWs) elevenLabsWs.close();
        isAITalking = false;
      }

      conversationHistory.push({ role: "user", content: transcript });
      
      // 2. OpenAI (Thinking)
      isAITalking = true;
      try {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: conversationHistory,
          stream: true,
        });

        // 3. ElevenLabs (Speaking)
        const elevenUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream-input?model_id=eleven_multilingual_v2&output_format=pcm_16000`;
        elevenLabsWs = new WebSocket(elevenUrl, {
          headers: { "xi-api-key": ELEVENLABS_API_KEY }
        });

        let fullAIResponse = "";

        elevenLabsWs.on('open', () => {
          elevenLabsWs?.send(JSON.stringify({
            text: " ",
            voice_settings: { stability: 0.5, similarity_boost: 0.8 }
          }));
        });

        elevenLabsWs.on('message', (data) => {
          const res = JSON.parse(data.toString());
          if (res.audio) {
            // Transcode 16kHz PCM to 8kHz mu-law for Twilio
            const mulawAudio = transcodePcm16ToMulaw(res.audio);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                event: "media",
                streamSid,
                media: { payload: mulawAudio }
              }));
            }
          }
          if (res.isFinal) {
            isAITalking = false;
            conversationHistory.push({ role: "assistant", content: fullAIResponse });
          }
        });

        for await (const chunk of stream) {
          if (!isAITalking) break; // Abort if interrupted
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullAIResponse += text;
            if (elevenLabsWs?.readyState === WebSocket.OPEN) {
              elevenLabsWs.send(JSON.stringify({ text, try_trigger_generation: true }));
            }
          }
        }
        
        if (isAITalking && elevenLabsWs?.readyState === WebSocket.OPEN) {
          elevenLabsWs.send(JSON.stringify({ text: "" })); // End of stream signal
        }
      } catch (err) {
        console.error("OpenAI/ElevenLabs Error", err);
        isAITalking = false;
      }
    }
  });

  // Handle Twilio Messages
  ws.on('message', (message) => {
    const msg = JSON.parse(message.toString());
    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      console.log(`Stream started: ${streamSid}`);
    } else if (msg.event === 'media') {
      // Pipe raw mu-law to Deepgram
      if (deepgramLive && deepgramLive.getReadyState() === 1) {
        deepgramLive.send(Buffer.from(msg.media.payload, 'base64'));
      }
    } else if (msg.event === 'stop') {
      console.log(`Stream stopped: ${streamSid}`);
      if (deepgramLive) deepgramLive.finish();
      if (elevenLabsWs) elevenLabsWs.close();
    }
  });

  ws.on('close', () => {
    console.log('Twilio stream closed');
    if (deepgramLive) deepgramLive.finish();
    if (elevenLabsWs) elevenLabsWs.close();
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Leadzo Full Vapi Clone listening on port ${PORT}`);
});
