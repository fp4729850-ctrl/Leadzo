import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { WaveFile } from 'wavefile';
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

// OpenAI Voices mapping
const OPENAI_VOICES: Record<string, string> = {
  rachel: "nova",   
  sarah:  "shimmer", 
  drew:   "echo",    
  paul:   "onyx",    
};

app.post('/twiml', (req, res) => {
  const voice = req.query.voice || 'rachel';
  const prompt = (req.query.prompt as string) || '';
  // Escape XML for TwiML parameter
  const escapedPrompt = prompt.replace(/[<>&'"]/g, function (c: string) {
    switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
    }
  });

  const twiml = `
    <Response>
      <Connect>
        <Stream url="wss://${req.headers.host}/stream?voice=${voice}">
          <Parameter name="prompt" value="${escapedPrompt}" />
        </Stream>
      </Connect>
    </Response>
  `;
  res.type('text/xml');
  res.send(twiml);
});

// Pending prompts queue - FIFO. register-prompt pushes, next WebSocket connection shifts.
const pendingPrompts: string[] = [];

app.post('/register-prompt', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });
  pendingPrompts.push(prompt);
  console.log(`📝 Prompt queued (${pendingPrompts.length} pending). Length: ${prompt.length} chars`);
  // Auto-cleanup after 5 minutes if not consumed
  setTimeout(() => {
    const idx = pendingPrompts.indexOf(prompt);
    if (idx !== -1) pendingPrompts.splice(idx, 1);
  }, 300000);
  res.json({ success: true, pending: pendingPrompts.length });
});

wss.on('connection', (ws, req) => {
  if (!req.url?.startsWith('/stream')) {
    ws.close();
    return;
  }
  
  const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
  let selectedVoice = urlParams.get('voice') || 'rachel';
  let openAIVoice = OPENAI_VOICES[selectedVoice] || OPENAI_VOICES.rachel;

  let streamSid = '';
  let deepgramLive: any = null;
  let isAITalking = false;
  let currentPlaybackChain: Promise<void> | null = null;
  let conversationHistory: any[] = [];
  let activeTurnId = 0;

  console.log(`📞 New call connected | Voice: ${selectedVoice} (OpenAI: ${openAIVoice})`);

  // ===== OpenAI TTS Helper: Speak a text phrase and stream PCM to Twilio =====
  async function speakViaOpenAITTS(textToSpeak: string, currentTurnId: number): Promise<void> {
    if (!isAITalking || currentTurnId !== activeTurnId) return; 

    try {
      console.log(`🔊 Generating OpenAI TTS for: "${textToSpeak.substring(0, 50)}..."`);
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: openAIVoice as any,
        input: textToSpeak,
        response_format: "wav" // Request WAV format for wavefile parser
      });
      
      const arrayBuffer = await response.arrayBuffer();
      if (!isAITalking || currentTurnId !== activeTurnId) return;
      
      // Use wavefile to resample and convert to mu-law properly without aliasing
      const wav = new WaveFile(Buffer.from(arrayBuffer));
      wav.toSampleRate(8000); // Properly resample from 24kHz to 8kHz
      wav.toMuLaw();          // Convert to 8-bit mu-law (G.711)
      
      const mulawBuffer = Buffer.from((wav.data as any).samples);
      
      // Send mu-law audio to Twilio
      if (ws.readyState === WebSocket.OPEN && isAITalking && currentTurnId === activeTurnId) {
        // Send in chunks of ~0.5s to prevent buffer bloat
        const CHUNK_SIZE = 4000; 
        for (let i = 0; i < mulawBuffer.length; i += CHUNK_SIZE) {
          if (!isAITalking || currentTurnId !== activeTurnId) break; 
          const end = Math.min(i + CHUNK_SIZE, mulawBuffer.length);
          const chunk = mulawBuffer.subarray(i, end);
          ws.send(JSON.stringify({ event: "media", streamSid, media: { payload: chunk.toString('base64') } }));
          // Wait slightly to simulate realtime streaming
          await new Promise(r => setTimeout(r, 100)); 
        }
      }
    } catch (err: any) {
      console.error("OpenAI TTS Error", err);
      lastErrors.push("OpenAI TTS Error: " + String(err));
    }
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

  // ===== Handle STT results -> OpenAI LLM -> OpenAI TTS =====
  deepgramLive.on('message', async (data: any) => {
    let response;
    try {
      response = JSON.parse(data.toString());
    } catch (e) {
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
          activeTurnId++; 
          ws.send(JSON.stringify({ event: "clear", streamSid }));
          isAITalking = false;
        } else if (isAITalking) {
          console.log("⏭️ Skipping user input (too short, likely echo)");
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
              
              if (/[.,!?;:।\n]/.test(text)) {
                const phrase = sentenceBuffer.trim();
                sentenceBuffer = ""; 
                if (phrase.length > 0) {
                  currentPlaybackChain = currentPlaybackChain.then(() => speakViaOpenAITTS(phrase, myTurnId));
                }
              }
            }
          }
          
          if (sentenceBuffer.trim().length > 0) {
            const phrase = sentenceBuffer.trim();
            currentPlaybackChain = currentPlaybackChain.then(() => speakViaOpenAITTS(phrase, myTurnId));
          }

          await currentPlaybackChain;
          
          if (isAITalking && myTurnId === activeTurnId) {
            console.log(`🔊 AI finished speaking response.`);
            isAITalking = false;
            conversationHistory.push({ role: "assistant", content: fullResponse });
          }
          
        } catch (err) {
          lastErrors.push("OpenAI LLM Error: " + String(err));
          console.error("OpenAI LLM Error", err);
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
      
      // Pop the next pending prompt from the queue (registered via /register-prompt)
      const receivedPrompt = pendingPrompts.shift() || '';
      
      const debugInfo = `[DEBUG] pendingPrompts remaining=${pendingPrompts.length}, gotPrompt=${!!receivedPrompt}, promptLength=${receivedPrompt.length}`;
      console.log(debugInfo);
      lastErrors.push(debugInfo);
      if (lastErrors.length > 10) lastErrors.shift();
      
      const systemContent = receivedPrompt || "You are a helpful AI assistant for Leadzo. Keep responses short (1-2 sentences). Respond in Hinglish (mix of Hindi and English).";
      
      console.log(`🧠 System Prompt loaded: ${systemContent.substring(0, 100)}...`);
      lastPrompts.push(systemContent);
      if (lastPrompts.length > 5) lastPrompts.shift(); // Keep only last 5

      conversationHistory = [{ role: "system", content: systemContent }];
      
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
export let lastPrompts: string[] = [];

app.get('/ping', (req, res) => {
  res.json({
    status: "running",
    lastStreamSid,
    lastErrors,
    lastPrompts,
    pendingPromptsCount: pendingPrompts.length
  });
});

server.listen(PORT, () => {
  console.log(`Leadzo Full Vapi Clone listening on port ${PORT}`);
});
