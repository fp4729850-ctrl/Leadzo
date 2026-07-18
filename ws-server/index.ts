import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { mulaw } from 'alawmulaw';
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


const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// Helper: Convert 16kHz PCM16 (ElevenLabs) to 8kHz mu-law (Twilio)
function transcodePcm16ToMulaw(base64Pcm16: string): string {
  const pcmBuffer = Buffer.from(base64Pcm16, 'base64');
  const sampleCount = Math.floor(pcmBuffer.length / 2);
  const targetCount = Math.floor(sampleCount / 2); // 16kHz to 8kHz
  const mulawBuffer = Buffer.alloc(targetCount);
  
  let mulawOffset = 0;
  for (let i = 0; i < sampleCount; i += 2) {
    if (i * 2 + 1 < pcmBuffer.length) {
      const pcmSample = pcmBuffer.readInt16LE(i * 2);
      // @ts-ignore
      const mulawSample = mulaw.encodeSample(pcmSample);
      mulawBuffer[mulawOffset++] = mulawSample;
    }
  }
  return mulawBuffer.toString('base64');
}

app.post('/twiml', (req, res) => {
  // Pass voice and prompt params from outbound calls
  const voice = req.query.voice || 'rachel';
  const prompt = req.query.prompt || '';
  const twiml = `
    <Response>
      <Connect>
        <Stream url="wss://${req.headers.host}/stream?voice=${voice}&prompt=${prompt}" />
      </Connect>
    </Response>
  `;
  res.type('text/xml');
  res.send(twiml);
});

wss.on('connection', (ws, req) => {
  if (!req.url?.startsWith('/stream')) {
    ws.close();
    return;
  }
  
  // Parse URL params for outbound calls
  const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
  const selectedVoice = urlParams.get('voice') || 'rachel';
  const customPrompt = urlParams.get('prompt') ? decodeURIComponent(urlParams.get('prompt')!) : '';

  const ttsEngine = urlParams.get('ttsEngine') || urlParams.get('amp;ttsEngine') || 'elevenlabs';

  let streamSid = '';
  let deepgramLive: any = null;
  let elevenLabsWs: WebSocket | null = null;
  let auraWs: WebSocket | null = null;
  let isAITalking = false;
  const systemContent = customPrompt || "You are a helpful AI assistant for Leadzo. Keep responses short (1-2 sentences).";
  let conversationHistory: any[] = [{
    role: "system",
    content: systemContent
  }];

  console.log(`📞 New call connected | Voice: ${selectedVoice} | TTS: ${ttsEngine}`);

  // 1. Initialize Deepgram (Listening) via WebSockets
  const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=hi&encoding=mulaw&sample_rate=8000&interim_results=true&endpointing=300`;
  deepgramLive = new WebSocket(deepgramUrl, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
  });

  deepgramLive.on('open', () => {
    console.log("Deepgram connected");
  });

  deepgramLive.on('message', async (data: any) => {
    const response = JSON.parse(data.toString());
    if (response.type === 'Results') {
      const transcript = response.channel.alternatives[0].transcript;
      const cleanTranscript = transcript ? transcript.trim().replace(/[^a-zA-Z0-9]/g, '') : '';
      if (cleanTranscript.length > 0 && response.is_final) {
      console.log(`User: ${transcript}`);
      
      // VAD Interruption Logic MVP:
      // If user speaks while AI is talking, stop the AI.
      if (isAITalking) {
        console.log("INTERRUPTION DETECTED! Stopping AI.");
        ws.send(JSON.stringify({ event: "clear", streamSid }));
        if (elevenLabsWs) elevenLabsWs.close();
        if (auraWs) auraWs.close();
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

        let fullAIResponse = "";
        let textBufferQueue: string[] = [];
        let flushPending = false;

        if (ttsEngine === "elevenlabs") {
          const elevenUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream-input?model_id=eleven_multilingual_v2&output_format=pcm_16000`;
          elevenLabsWs = new WebSocket(elevenUrl, {
            headers: { "xi-api-key": ELEVENLABS_API_KEY }
          });

          elevenLabsWs.on('open', () => {
            elevenLabsWs?.send(JSON.stringify({
              text: " ",
              voice_settings: { stability: 0.5, similarity_boost: 0.8 }
            }));
            for (const t of textBufferQueue) {
              elevenLabsWs?.send(JSON.stringify({ text: t, try_trigger_generation: true }));
            }
            textBufferQueue = [];
            if (flushPending) {
              elevenLabsWs?.send(JSON.stringify({ text: "" }));
              flushPending = false;
            }
          });

          elevenLabsWs.on('message', (data) => {
            const res = JSON.parse(data.toString());
            if (res.audio) {
              const mulawAudio = transcodePcm16ToMulaw(res.audio);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: mulawAudio } }));
              }
            }
            if (res.isFinal) {
              isAITalking = false;
              conversationHistory.push({ role: "assistant", content: fullAIResponse });
            }
          });
        } else {
          // Deepgram Aura TTS
          const auraUrl = `wss://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000`;
          auraWs = new WebSocket(auraUrl, {
            headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
          });

          auraWs.on('open', () => {
            for (const t of textBufferQueue) {
              auraWs?.send(JSON.stringify({ type: "Speak", text: t }));
            }
            textBufferQueue = [];
            if (flushPending) {
              auraWs?.send(JSON.stringify({ type: "Flush" }));
              flushPending = false;
            }
          });

          auraWs.on('message', (data, isBinary) => {
            if (isBinary) {
              // Direct mulaw audio
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: data.toString('base64') } }));
              }
            } else {
              const res = JSON.parse(data.toString());
              if (res.type === "Flushed") {
                isAITalking = false;
                conversationHistory.push({ role: "assistant", content: fullAIResponse });
              }
            }
          });
        }

        // Stream text to the selected TTS engine
        for await (const chunk of stream) {
          if (!isAITalking) break;
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullAIResponse += text;
            if (ttsEngine === "elevenlabs") {
              if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                elevenLabsWs.send(JSON.stringify({ text, try_trigger_generation: true }));
              } else {
                textBufferQueue.push(text);
              }
            } else if (ttsEngine === "deepgram") {
              if (auraWs?.readyState === WebSocket.OPEN) {
                auraWs.send(JSON.stringify({ type: "Speak", text }));
              } else {
                textBufferQueue.push(text);
              }
            }
          }
        }
        
        if (isAITalking) {
          if (ttsEngine === "elevenlabs") {
            if (elevenLabsWs?.readyState === WebSocket.OPEN) {
              elevenLabsWs.send(JSON.stringify({ text: "" }));
            } else {
              flushPending = true;
            }
          } else if (ttsEngine === "deepgram") {
            if (auraWs?.readyState === WebSocket.OPEN) {
              auraWs.send(JSON.stringify({ type: "Flush" }));
            } else {
              flushPending = true;
            }
          }
        }
      } catch (err) {
        console.error("OpenAI/TTS Error", err);
        isAITalking = false;
      }
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
      if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
        deepgramLive.send(Buffer.from(msg.media.payload, 'base64'));
      }
    } else if (msg.event === 'stop') {
      console.log(`Stream stopped: ${streamSid}`);
      if (deepgramLive) deepgramLive.close();
      if (elevenLabsWs) elevenLabsWs.close();
      if (auraWs) auraWs.close();
    }
  });

  ws.on('close', () => {
    console.log('Twilio stream closed');
    if (deepgramLive) deepgramLive.close();
    if (elevenLabsWs) elevenLabsWs.close();
    if (auraWs) auraWs.close();
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Leadzo Full Vapi Clone listening on port ${PORT}`);
});
