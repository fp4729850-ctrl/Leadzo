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

const { DEEPGRAM_API_KEY, OPENAI_API_KEY } = process.env;

if (!DEEPGRAM_API_KEY || !OPENAI_API_KEY) {
  console.error("Missing critical API Keys in .env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// OpenAI Voices mapping (using OpenAI TTS)
const OPENAI_VOICES: Record<string, string> = {
  rachel: "nova",   // Female, very natural
  sarah:  "shimmer", // Female, warm
  drew:   "echo",    // Male, energetic
  paul:   "onyx",    // Male, deep/pro
};

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
  let isAITalking = false;
  let currentPlaybackChain: Promise<void> | null = null;
  
  const systemContent = customPrompt || "You are a helpful AI assistant for Leadzo. Keep responses short (1-2 sentences). Respond in Hinglish (mix of Hindi and English).";
  console.log(`🧠 System Prompt initialized: ${systemContent.substring(0, 100)}...`);
  
  let conversationHistory: any[] = [{
    role: "system",
    content: systemContent
  }];

  const openAIVoice = OPENAI_VOICES[selectedVoice] || OPENAI_VOICES.rachel;

  console.log(`📞 New call connected | Voice: ${selectedVoice} (OpenAI: ${openAIVoice})`);

  // ===== OpenAI TTS Helper: Speak a text phrase and stream PCM to Twilio =====
  async function speakViaOpenAITTS(textToSpeak: string, currentTurnId: number): Promise<void> {
    if (!isAITalking || currentTurnId !== activeTurnId) return; // Abort if interrupted before generation

    try {
      console.log(`🔊 Generating OpenAI TTS for: "${textToSpeak.substring(0, 50)}..."`);
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: openAIVoice as any,
        input: textToSpeak,
        response_format: "pcm" // 24kHz 16-bit PCM
      });
      
      const arrayBuffer = await response.arrayBuffer();
      if (!isAITalking || currentTurnId !== activeTurnId) return; // Abort if interrupted during generation
      
      const pcmBuffer = Buffer.from(arrayBuffer);
      
      // Downsample 24kHz to 8kHz (3:1 ratio)
      const sampleCount = Math.floor(pcmBuffer.length / 2);
      const targetCount = Math.floor(sampleCount / 3);
      const mulawBuffer = Buffer.alloc(targetCount);
      
      let mulawOffset = 0;
      for (let i = 0; i < targetCount; i++) {
        const pcmIndex = i * 3 * 2; 
        if (pcmIndex + 1 < pcmBuffer.length) {
          const pcmSample = pcmBuffer.readInt16LE(pcmIndex);
          // @ts-ignore
          const mulawSample = mulaw.encodeSample(pcmSample);
          mulawBuffer[mulawOffset++] = mulawSample;
        }
      }
      
      // Send mu-law audio to Twilio
      if (ws.readyState === WebSocket.OPEN && isAITalking && currentTurnId === activeTurnId) {
        // Send in small chunks to prevent buffer bloat on Twilio side
        const CHUNK_SIZE = 4000; // ~0.5 seconds of audio per chunk
        for (let i = 0; i < mulawOffset; i += CHUNK_SIZE) {
          if (!isAITalking || currentTurnId !== activeTurnId) break; // Abort mid-playback if interrupted
          const end = Math.min(i + CHUNK_SIZE, mulawOffset);
          const chunk = mulawBuffer.subarray(i, end);
          ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: chunk.toString('base64') } }));
          // Wait slightly to simulate realtime streaming (avoids overwhelming Twilio)
          await new Promise(r => setTimeout(r, 100)); 
        }
      }
    } catch (err: any) {
      console.error("OpenAI TTS Error", err);
      lastErrors.push("OpenAI TTS Error: " + String(err));
    }
  }

  let activeTurnId = 0;

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

  // ===== Handle STT results -> OpenAI LLM -> OpenAI TTS =====
  deepgramLive.on('message', async (data: any) => {
    let response;
    try {
      response = JSON.parse(data.toString());
    } catch (e) {
      lastErrors.push("Deepgram STT JSON Parse Error: " + String(e));
      return;
    }
    if (response.type === 'Results') {
      const transcript = response.channel.alternatives[0].transcript;
      const cleanTranscript = transcript ? transcript.trim().replace(/[.,!?]/g, '') : '';
      
      if (cleanTranscript.length > 0 && response.is_final) {
        console.log(`👤 User said: "${transcript}"`);

        // Interruption Logic
        if (isAITalking && transcript.length > 5) {
          console.log("🛑 INTERRUPTION DETECTED! Stopping AI.");
          activeTurnId++; // Invalidate current playback chain
          ws.send(JSON.stringify({ event: "clear", streamSid }));
          isAITalking = false;
        } else if (isAITalking) {
          console.log("⏭️ Skipping user input (too short, likely echo) - AI is currently talking");
          return;
        }

        conversationHistory.push({ role: "user", content: transcript });

        // Generate AI response via OpenAI
        isAITalking = true;
        activeTurnId++;
        const myTurnId = activeTurnId;
        
        try {
          const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversationHistory,
            stream: true,
          });

          let fullResponse = "";
          let sentenceBuffer = "";
          currentPlaybackChain = Promise.resolve();

          for await (const chunk of stream) {
            if (!isAITalking || myTurnId !== activeTurnId) break;
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullResponse += text;
              sentenceBuffer += text;
              
              // If the text contains punctuation that signals a pause, queue it for TTS
              if (/[.,!?;:।\n]/.test(text)) {
                const phrase = sentenceBuffer.trim();
                sentenceBuffer = ""; 
                if (phrase.length > 0) {
                  currentPlaybackChain = currentPlaybackChain.then(() => speakViaOpenAITTS(phrase, myTurnId));
                }
              }
            }
          }
          
          // Flush any remaining text in the buffer
          if (sentenceBuffer.trim().length > 0) {
            const phrase = sentenceBuffer.trim();
            currentPlaybackChain = currentPlaybackChain.then(() => speakViaOpenAITTS(phrase, myTurnId));
          }

          // Wait for all queued audio to finish playing
          await currentPlaybackChain;
          
          if (isAITalking && myTurnId === activeTurnId) {
            console.log(`🔊 AI finished speaking response.`);
            isAITalking = false;
            conversationHistory.push({ role: "assistant", content: fullResponse });
          }
          
        } catch (err) {
          lastErrors.push("OpenAI LLM/TTS Error: " + String(err));
          console.error("OpenAI LLM/TTS Error", err);
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
          activeTurnId++;
          const myTurnId = activeTurnId;
          const greeting = "Namaste! Main Leadzo se baat kar rahi hoon. Main aapki kaise madad kar sakti hoon?";
          console.log("🗣️ Sending initial greeting:", greeting);
          try {
            await speakViaOpenAITTS(greeting, myTurnId);
            if (isAITalking && myTurnId === activeTurnId) {
              conversationHistory.push({ role: "assistant", content: greeting });
              console.log("✅ Greeting delivered successfully");
              isAITalking = false;
            }
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
  console.log(`Leadzo Full Vapi Clone listening on port ${PORT}`);
});
