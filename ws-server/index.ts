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
  const ttsEngine = urlParams.get('ttsEngine') || urlParams.get('amp;ttsEngine') || 'deepgram';

  let streamSid = '';
  let deepgramLive: any = null;
  let elevenLabsWs: WebSocket | null = null;
  let isAITalking = false;
  const systemContent = customPrompt || "You are a helpful AI assistant for Leadzo. Keep responses short (1-2 sentences).";
  let conversationHistory: any[] = [{
    role: "system",
    content: systemContent
  }];

  // Deepgram Aura voice mapping
  let auraModel = "aura-asteria-en"; // default female
  if (selectedVoice === "sarah") auraModel = "aura-luna-en";
  if (selectedVoice === "drew") auraModel = "aura-orion-en";
  if (selectedVoice === "paul") auraModel = "aura-arcas-en";

  console.log(`📞 New call connected | Voice: ${selectedVoice} (${auraModel}) | TTS: ${ttsEngine}`);

  // Helper: Speak text via Deepgram Aura (creates a FRESH WebSocket each time)
  function speakViaAura(textToSpeak: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const auraUrl = `wss://api.deepgram.com/v1/speak?model=${auraModel}&encoding=mulaw&sample_rate=8000`;
      const freshAuraWs = new WebSocket(auraUrl, {
        headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
      });

      freshAuraWs.on('open', () => {
        console.log(`🔊 Aura TTS opened, sending text: "${textToSpeak.substring(0, 50)}..."`);
        freshAuraWs.send(JSON.stringify({ type: "Speak", text: textToSpeak }));
        freshAuraWs.send(JSON.stringify({ type: "Flush" }));
      });

      freshAuraWs.on('message', (data: any, isBinary: boolean) => {
        if (isBinary) {
          // Raw mulaw audio - send directly to Twilio
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: data.toString('base64') } }));
          }
        } else {
          let res;
          try { res = JSON.parse(data.toString()); } catch(e) { return; }
          if (res.type === "Flushed") {
            console.log("🔊 Aura TTS finished speaking");
            isAITalking = false;
            freshAuraWs.close();
            resolve();
          }
        }
      });

      freshAuraWs.on('error', (err: any) => {
        console.error("Deepgram Aura TTS Error", err);
        lastErrors.push("Aura TTS Error: " + String(err));
        isAITalking = false;
        reject(err);
      });

      freshAuraWs.on('close', () => {
        // Safety: if closed without Flushed event
        if (isAITalking) {
          isAITalking = false;
          resolve();
        }
      });
    });
  }

  // Helper: Speak text via Deepgram Aura with OpenAI STREAMING (creates a FRESH WebSocket)
  function speakStreamViaAura(openaiStream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const auraUrl = `wss://api.deepgram.com/v1/speak?model=${auraModel}&encoding=mulaw&sample_rate=8000`;
      const freshAuraWs = new WebSocket(auraUrl, {
        headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
      });
      let fullResponse = "";

      freshAuraWs.on('open', async () => {
        console.log(`🔊 Aura TTS opened for streaming response`);
        try {
          for await (const chunk of openaiStream) {
            if (!isAITalking) break;
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullResponse += text;
              freshAuraWs.send(JSON.stringify({ type: "Speak", text }));
            }
          }
          // Signal end of text
          freshAuraWs.send(JSON.stringify({ type: "Flush" }));
        } catch (err: any) {
          console.error("OpenAI stream error", err);
          lastErrors.push("OpenAI Stream Error: " + String(err));
          freshAuraWs.close();
          reject(err);
        }
      });

      freshAuraWs.on('message', (data: any, isBinary: boolean) => {
        if (isBinary) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: data.toString('base64') } }));
          }
        } else {
          let res;
          try { res = JSON.parse(data.toString()); } catch(e) { return; }
          if (res.type === "Flushed") {
            console.log(`🔊 Aura TTS finished: "${fullResponse.substring(0, 80)}..."`);
            isAITalking = false;
            freshAuraWs.close();
            resolve(fullResponse);
          }
        }
      });

      freshAuraWs.on('error', (err: any) => {
        console.error("Deepgram Aura TTS Error", err);
        lastErrors.push("Aura TTS Error: " + String(err));
        isAITalking = false;
        reject(err);
      });

      freshAuraWs.on('close', () => {
        if (isAITalking) {
          isAITalking = false;
          resolve(fullResponse);
        }
      });
    });
  }

  // 1. Initialize Deepgram STT (Listening) via WebSockets
  const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=hi&encoding=mulaw&sample_rate=8000&interim_results=true&endpointing=300`;
  deepgramLive = new WebSocket(deepgramUrl, {
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` }
  });

  deepgramLive.on('error', (err: any) => {
    console.error("Deepgram STT Error", err);
    lastErrors.push("Deepgram STT Error: " + String(err));
  });

  deepgramLive.on('open', () => {
    console.log("✅ Deepgram STT connected");
  });

  // Handle STT results -> OpenAI -> TTS
  deepgramLive.on('message', async (data: any) => {
    let response;
    try {
      response = JSON.parse(data.toString());
    } catch (e) {
      lastErrors.push("Deepgram STT JSON Parse Error: " + String(e));
      console.error("Failed to parse Deepgram STT message", e);
      return;
    }
    if (response.type === 'Results') {
      const transcript = response.channel.alternatives[0].transcript;
      const cleanTranscript = transcript ? transcript.trim().replace(/[.,!?]/g, '') : '';
      if (cleanTranscript.length > 0 && response.is_final) {
        console.log(`👤 User said: "${transcript}"`);

        // Skip if AI is already talking (prevent echo)
        if (isAITalking) {
          console.log("⏭️ Skipping user input - AI is currently talking");
          return;
        }

        conversationHistory.push({ role: "user", content: transcript });

        // Generate AI response via OpenAI
        isAITalking = true;
        try {
          const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversationHistory,
            stream: true,
          });

          if (ttsEngine === "deepgram") {
            // Stream OpenAI response directly to a fresh Aura WebSocket
            const aiResponse = await speakStreamViaAura(stream);
            if (aiResponse) {
              conversationHistory.push({ role: "assistant", content: aiResponse });
            }
          } else if (ttsEngine === "elevenlabs") {
            // ElevenLabs path (kept for compatibility)
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
              let res;
              try { res = JSON.parse(data.toString()); } catch(e) { return; }
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

            // Stream text to ElevenLabs
            for await (const chunk of stream) {
              if (!isAITalking) break;
              const text = chunk.choices[0]?.delta?.content || "";
              if (text) {
                fullAIResponse += text;
                if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                  elevenLabsWs.send(JSON.stringify({ text, try_trigger_generation: true }));
                }
              }
            }
            if (isAITalking && elevenLabsWs?.readyState === WebSocket.OPEN) {
              elevenLabsWs.send(JSON.stringify({ text: "" }));
            }
          }
        } catch (err) {
          lastErrors.push("OpenAI/TTS Error: " + String(err));
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
      lastStreamSid = streamSid;
      console.log(`🎙️ Stream started: ${streamSid}`);
      
      // Trigger Initial Greeting after 1 second!
      setTimeout(async () => {
        if (!isAITalking) {
          isAITalking = true;
          const greeting = "Namaste! Main Leadzo se baat kar rahi hoon. Main aapki kaise madad kar sakti hoon?";
          console.log("🗣️ Sending initial greeting:", greeting);
          try {
            await speakViaAura(greeting);
            conversationHistory.push({ role: "assistant", content: greeting });
            console.log("✅ Greeting delivered successfully");
          } catch (err) {
            console.error("❌ Greeting failed:", err);
            isAITalking = false;
          }
        }
      }, 1500);
      
    } else if (msg.event === 'media') {
      if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
        deepgramLive.send(Buffer.from(msg.media.payload, 'base64'));
      }
    } else if (msg.event === 'stop') {
      console.log(`Stream stopped: ${streamSid}`);
      if (deepgramLive) deepgramLive.close();
      if (elevenLabsWs) elevenLabsWs.close();
    }
  });

  ws.on('close', () => {
    console.log('Twilio stream closed');
    if (deepgramLive) deepgramLive.close();
    if (elevenLabsWs) elevenLabsWs.close();
  });
});

const PORT = process.env.PORT || 8080;
export let lastStreamSid = "None";
export let lastErrors: string[] = [];

app.get('/ping', (req, res) => {
  res.json({
    status: "running",
    lastStreamSid,
    lastErrors
  });
});

server.listen(PORT, () => {
  console.log(`Leadzo Full Vapi Clone listening on port ${PORT}`);
});
