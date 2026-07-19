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

// ElevenLabs Voice ID Mapping (natural, human-like voices)
const ELEVENLABS_VOICES: Record<string, string> = {
  rachel: "21m00Tcm4TlvDq8ikWAM",   // Rachel - calm young female
  sarah:  "EXAVITQu4vr4xnSDxMaL",   // Bella/Sarah - warm female
  drew:   "29vD33N1CtxCmqQRPOHJ",    // Drew - energetic male
  paul:   "5Q0t7uMcjvnagumLfvZi",    // Paul - pro male
};

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
  
  const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
  const selectedVoice = urlParams.get('voice') || 'rachel';
  const customPrompt = urlParams.get('prompt') ? decodeURIComponent(urlParams.get('prompt')!) : '';

  let streamSid = '';
  let deepgramLive: any = null;
  let activeElevenLabsWs: WebSocket | null = null;
  let isAITalking = false;
  const systemContent = customPrompt || "You are a helpful AI assistant for Leadzo. Keep responses short (1-2 sentences). Respond in Hinglish (mix of Hindi and English).";
  console.log(`🧠 System Prompt initialized: ${systemContent.substring(0, 100)}...`);
  
  let conversationHistory: any[] = [{
    role: "system",
    content: systemContent
  }];

  const elevenVoiceId = ELEVENLABS_VOICES[selectedVoice] || ELEVENLABS_VOICES.rachel;

  console.log(`📞 New call connected | Voice: ${selectedVoice} (ElevenLabs: ${elevenVoiceId})`);

  // ===== ElevenLabs TTS Helper: Speak a single text (fresh WS each time) =====
  function speakViaElevenLabs(textToSpeak: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const elUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}/stream-input?model_id=eleven_turbo_v2_5&output_format=ulaw_8000`;
      const elWs = new WebSocket(elUrl);
      activeElevenLabsWs = elWs;

      elWs.on('open', () => {
        console.log(`🔊 ElevenLabs TTS opened for: "${textToSpeak.substring(0, 50)}..."`);
        // BOS (Beginning of Stream)
        elWs.send(JSON.stringify({
          text: " ",
          voice_settings: { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: true },
          xi_api_key: ELEVENLABS_API_KEY,
        }));
        // Send the actual text
        elWs.send(JSON.stringify({ text: textToSpeak, try_trigger_generation: true }));
        // EOS (End of Stream)
        elWs.send(JSON.stringify({ text: "" }));
      });

      elWs.on('message', (data: any) => {
        let res;
        try { res = JSON.parse(data.toString()); } catch(e) { return; }
        if (res.audio) {
          // ulaw_8000 audio - send directly to Twilio (no transcoding needed!)
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: res.audio } }));
          }
        }
        if (res.isFinal) {
          console.log("🔊 ElevenLabs TTS finished speaking");
          isAITalking = false;
          elWs.close();
          resolve();
        }
      });

      elWs.on('error', (err: any) => {
        console.error("ElevenLabs TTS Error", err);
        lastErrors.push("ElevenLabs TTS Error: " + String(err));
        isAITalking = false;
        reject(err);
      });

      elWs.on('close', () => {
        if (isAITalking) {
          isAITalking = false;
          resolve();
        }
      });
    });
  }

  // ===== ElevenLabs TTS Helper: Stream OpenAI response (fresh WS each time) =====
  function speakStreamViaElevenLabs(openaiStream: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const elUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}/stream-input?model_id=eleven_turbo_v2_5&output_format=ulaw_8000`;
      const elWs = new WebSocket(elUrl);
      activeElevenLabsWs = elWs;
      let fullResponse = "";

      elWs.on('open', async () => {
        console.log(`🔊 ElevenLabs TTS opened for streaming response`);
        // BOS
        elWs.send(JSON.stringify({
          text: " ",
          voice_settings: { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: true },
          xi_api_key: ELEVENLABS_API_KEY,
        }));

        try {
          for await (const chunk of openaiStream) {
            if (!isAITalking) break;
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullResponse += text;
              elWs.send(JSON.stringify({ text })); // Removed try_trigger_generation to allow natural prosody buffer
            }
          }
          // EOS
          elWs.send(JSON.stringify({ text: "" }));
        } catch (err: any) {
          console.error("OpenAI stream error", err);
          lastErrors.push("OpenAI Stream Error: " + String(err));
          elWs.close();
          reject(err);
        }
      });

      elWs.on('message', (data: any) => {
        let res;
        try { res = JSON.parse(data.toString()); } catch(e) { return; }
        if (res.audio) {
          // ulaw_8000 audio - send directly to Twilio
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: res.audio } }));
          }
        }
        if (res.isFinal) {
          console.log(`🔊 ElevenLabs TTS finished: "${fullResponse.substring(0, 80)}..."`);
          isAITalking = false;
          elWs.close();
          resolve(fullResponse);
        }
      });

      elWs.on('error', (err: any) => {
        console.error("ElevenLabs TTS Error", err);
        lastErrors.push("ElevenLabs TTS Error: " + String(err));
        isAITalking = false;
        reject(err);
      });

      elWs.on('close', () => {
        if (isAITalking) {
          isAITalking = false;
          resolve(fullResponse);
        }
      });
    });
  }

  // ===== 1. Initialize Deepgram STT (Listening) =====
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

  // ===== Handle STT results -> OpenAI -> ElevenLabs TTS =====
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

        // Skip if AI is already talking (prevent echo) - Wait, we WANT interruption!
        // We will only interrupt if it's a significant utterance
        if (isAITalking && transcript.length > 5) {
          console.log("🛑 INTERRUPTION DETECTED! Stopping AI.");
          ws.send(JSON.stringify({ event: "clear", streamSid }));
          if (activeElevenLabsWs) activeElevenLabsWs.close();
          isAITalking = false;
        } else if (isAITalking) {
          console.log("⏭️ Skipping user input (too short, likely echo) - AI is currently talking");
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

          // Stream OpenAI response to ElevenLabs TTS
          const aiResponse = await speakStreamViaElevenLabs(stream);
          if (aiResponse) {
            conversationHistory.push({ role: "assistant", content: aiResponse });
          }
        } catch (err) {
          lastErrors.push("OpenAI/TTS Error: " + String(err));
          console.error("OpenAI/TTS Error", err);
          isAITalking = false;
        }
      }
    }
  });

  // ===== Handle Twilio Messages =====
  ws.on('message', (message) => {
    const msg = JSON.parse(message.toString());
    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      lastStreamSid = streamSid;
      console.log(`🎙️ Stream started: ${streamSid}`);
      
      // Trigger Initial Greeting after 1.5 seconds
      setTimeout(async () => {
        if (!isAITalking) {
          isAITalking = true;
          const greeting = "Namaste! Main Leadzo se baat kar rahi hoon. Main aapki kaise madad kar sakti hoon?";
          console.log("🗣️ Sending initial greeting:", greeting);
          try {
            await speakViaElevenLabs(greeting);
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
    }
  });

  ws.on('close', () => {
    console.log('Twilio stream closed');
    if (deepgramLive) deepgramLive.close();
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
  console.log(`Leadzo AI Voice Agent listening on port ${PORT}`);
});
