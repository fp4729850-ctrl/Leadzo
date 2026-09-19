import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, upgrade",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ── ITU-T G.711 A-law (PCMA) Telephony Codec (Indian Carrier Standard) ──
function linearToALaw(pcmSample: number): number {
  let mask = 0xD5;
  if (pcmSample < 0) {
    mask = 0x55;
    pcmSample = -pcmSample - 1;
    if (pcmSample < 0) pcmSample = 0;
  }
  if (pcmSample > 32767) pcmSample = 32767;

  let seg = 7;
  if (pcmSample < 256) seg = 0;
  else if (pcmSample < 512) seg = 1;
  else if (pcmSample < 1024) seg = 2;
  else if (pcmSample < 2048) seg = 3;
  else if (pcmSample < 4096) seg = 4;
  else if (pcmSample < 8192) seg = 5;
  else if (pcmSample < 16384) seg = 6;

  const aval = seg === 0 ? (pcmSample >> 4) & 0x0F : ((seg << 4) | ((pcmSample >> (seg + 3)) & 0x0F));
  return (aval ^ mask) & 0xFF;
}

// Convert 24kHz 16-bit Linear PCM (OpenAI standard) to 8kHz G.711 A-law (PCMA Indian Telephony)
function convertPcm24kToAlaw8k(pcm24kBuffer: ArrayBuffer): Uint8Array {
  const pcmView = new DataView(pcm24kBuffer);
  const totalSamples = Math.floor(pcmView.byteLength / 2);
  const alawLength = Math.floor(totalSamples / 3); // 3:1 integer downsampling (24kHz -> 8kHz)
  const alawArray = new Uint8Array(alawLength);

  for (let i = 0; i < alawLength; i++) {
    const sampleIdx = i * 3;
    const pcmSample = pcmView.getInt16(sampleIdx * 2, true); // little-endian
    alawArray[i] = linearToALaw(pcmSample);
  }
  return alawArray;
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";

  // ─────────────────────────────────────────────────────────────
  // 1. WEBSOCKET STREAMING ENGINE (Direct VoiceLink In-House Engine)
  // ─────────────────────────────────────────────────────────────
  if (upgrade.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);

    let streamSid = "";
    let callSid = "";
    let callerNumber = "";
    let isBoss = false;
    let deepgramWs: WebSocket | null = null;
    let currentPlayId = 0;
    let isSpeaking = false;
    let isCallActive = true;

    const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: `आप King Villa Resort & Suites (Gir Somnath / Sasan Gir) के अत्यधिक विनम्र, बुद्धिमान और त्वरित AI रिसेप्शनिस्ट हैं।
आपकी आवाज़ पुरुष, साफ़, गंभीर और दोस्ताना (Onyx Voice) है। आप हमेशा शुद्ध और स्वाभाविक हिंदी में 1-2 छोटे, स्पष्ट वाक्यों में उत्तर देते हैं।

होटल जानकारी:
- डीलक्स रूम (Deluxe Room): ₹1,800 प्रति रात (नाश्ता शामिल)
- प्राइवेट पूल विला (Private Pool Villa): ₹7,900 प्रति रात (व्यक्तिगत पूल, लक्ज़री स्टे)
- सुविधाएं: स्विमिंग पूल, मल्टी-कुज़ीन रेस्टोरेंट, फ्री हाई-स्पीड वाई-फाई, 24 घंटे रूम सर्विस
- व्हाट्सएप सेवा: यदि कॉलर बुकिंग या कमरे के फ़ोटो मांगे, तो तुरंत कहें "मैं तुरंत आपके इसी नंबर पर WhatsApp द्वारा कमरे के फ़ोटो और रेट लिस्ट भेज देता हूँ।"
- नियम: उत्तर फोन कॉल पर बातचीत के अनुसार केवल 1 से 2 छोटे, विनम्र और दोस्ताना वाक्यों में दें। कभी भी लंबा भाषण न दें।`
      }
    ];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const openAiKey = Deno.env.get("OPENAI_API_KEY") || "";
    const deepgramKey = Deno.env.get("DEEPGRAM_API_KEY") || "";

    // ── Helper: Stream TTS Speech to VoiceLink Caller in G.711 A-law ──
    async function streamSpeechToCaller(text: string) {
      if (!isCallActive || !openAiKey || !streamSid) return;

      const playId = ++currentPlayId;
      isSpeaking = true;

      try {
        console.log(`🎙️ Synthesizing Onyx HD A-law TTS for text: "${text}"`);
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: "onyx",
            response_format: "pcm",
            speed: 1.05
          })
        });

        if (!ttsRes.ok) {
          console.error("OpenAI TTS failed:", await ttsRes.text());
          isSpeaking = false;
          return;
        }

        const audioBuffer = await ttsRes.arrayBuffer();
        if (currentPlayId !== playId || !isCallActive) {
          console.log("Speech interrupted before conversion");
          isSpeaking = false;
          return;
        }

        // Convert 24kHz linear PCM to 8kHz G.711 A-law (PCMA)
        const alawData = convertPcm24kToAlaw8k(audioBuffer);
        console.log(`📡 Streaming ${alawData.length} bytes G.711 A-law audio to VoiceLink (PlayId: ${playId})`);

        // Stream in 80ms chunks (640 bytes @ 8kHz 8-bit)
        const CHUNK_SIZE = 640;
        for (let i = 0; i < alawData.length; i += CHUNK_SIZE) {
          if (currentPlayId !== playId || !isCallActive || socket.readyState !== WebSocket.OPEN) {
            console.log("⚡ Audio playback cancelled/interrupted (barge-in)");
            break;
          }

          const end = Math.min(i + CHUNK_SIZE, alawData.length);
          const chunk = alawData.subarray(i, end);
          const payload = base64Encode(chunk);

          socket.send(JSON.stringify({
            event: "media",
            streamSid: streamSid,
            stream_sid: streamSid,
            media: { payload }
          }));

          // 70ms pacing per 80ms chunk ensures smooth telephony audio buffer
          await new Promise(r => setTimeout(r, 70));
        }

        if (currentPlayId === playId && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            event: "mark",
            streamSid: streamSid,
            stream_sid: streamSid,
            mark: { name: `speech_done_${playId}` }
          }));
        }
      } catch (err) {
        console.error("Error streaming speech:", err);
      } finally {
        if (currentPlayId === playId) {
          isSpeaking = false;
        }
      }
    }

    // ── Helper: Query LLM and respond to caller ──
    async function handleCallerSpeech(transcript: string) {
      if (!transcript || !isCallActive) return;

      console.log(`💬 Processing caller input: "${transcript}"`);
      conversationHistory.push({ role: "user", content: transcript });

      try {
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: conversationHistory.slice(-8),
            temperature: 0.5,
            max_tokens: 150
          })
        });

        if (!gptRes.ok) {
          console.error("OpenAI Chat Completion failed:", await gptRes.text());
          return;
        }

        const gptData = await gptRes.json();
        const reply = gptData.choices?.[0]?.message?.content?.trim();
        if (reply) {
          conversationHistory.push({ role: "assistant", content: reply });
          console.log(`🤖 AI Receptionist Response: "${reply}"`);
          await streamSpeechToCaller(reply);
        }
      } catch (err) {
        console.error("Error generating LLM response:", err);
      }
    }

    // ── Helper: Initialize Deepgram Real-time A-law STT ──
    function connectDeepgramSTT() {
      if (!deepgramKey) {
        console.error("No DEEPGRAM_API_KEY available for live STT");
        return;
      }

      try {
        const dgUrl = "wss://api.deepgram.com/v1/listen?model=nova-2-general&language=hi&encoding=alaw&sample_rate=8000&endpointing=300&interim_results=false&smart_format=true&punctuate=true";
        deepgramWs = new WebSocket(dgUrl, ["token", deepgramKey]);

        deepgramWs.onopen = () => {
          console.log("🎙️ Deepgram Live A-law STT connected!");
        };

        deepgramWs.onmessage = async (e) => {
          try {
            const data = JSON.parse(e.data);
            const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
            const isFinal = data.is_final;
            const speechFinal = data.speech_final;

            if (transcript && (isFinal || speechFinal)) {
              console.log(`🗣️ Deepgram recognized: "${transcript}"`);
              
              // Barge-in: If AI is speaking, interrupt current playback
              if (isSpeaking) {
                console.log("⚡ Interrupting AI playback due to caller speech");
                currentPlayId++;
                isSpeaking = false;
                if (socket.readyState === WebSocket.OPEN && streamSid) {
                  socket.send(JSON.stringify({
                    event: "clear",
                    streamSid: streamSid,
                    stream_sid: streamSid
                  }));
                }
              }

              await handleCallerSpeech(transcript);
            }
          } catch (msgErr) {
            console.error("Error processing Deepgram message:", msgErr);
          }
        };

        deepgramWs.onerror = (err) => {
          console.error("Deepgram WebSocket error:", err);
        };

        deepgramWs.onclose = () => {
          console.log("Deepgram WebSocket closed");
        };
      } catch (dgErr) {
        console.error("Failed to initialize Deepgram WebSocket:", dgErr);
      }
    }

    // ── VoiceLink WebSocket Event Listeners ──
    socket.onopen = () => {
      console.log("🔗 VoiceLink WebSocket stream connected!");
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        // EVENT: START / CONNECTED
        if (data.event === "start" || data.event === "connected") {
          streamSid = data.start?.streamSid || data.start?.stream_sid || data.streamSid || data.stream_sid || "";
          callSid = data.start?.callSid || data.start?.call_sid || data.callSid || data.call_sid || "";
          callerNumber = data.start?.from || data.from || "";

          const cleanCaller = callerNumber.replace(/[^0-9]/g, "");
          isBoss = cleanCaller.endsWith("9726846660") || cleanCaller.endsWith("6660");

          console.log(`📞 Call started: ${callSid} | Stream: ${streamSid} | Caller: ${callerNumber} | isBoss: ${isBoss}`);

          // Connect Deepgram Live STT
          connectDeepgramSTT();

          // Stream Initial Greeting in A-law Onyx Voice
          const greeting = isBoss
            ? "नमस्ते बॉस! King Villa का क्या स्टेटस देखना है?"
            : "नमस्ते! King Villa Resort & Suites में आपका स्वागत है। मैं आपकी room booking में क्या सहायता कर सकता हूँ?";

          conversationHistory.push({ role: "assistant", content: greeting });
          await streamSpeechToCaller(greeting);
        }

        // EVENT: MEDIA (Incoming audio packet from caller in G.711 A-law)
        if (data.event === "media" && data.media?.payload) {
          if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            try {
              const rawAlawBytes = base64Decode(data.media.payload);
              deepgramWs.send(rawAlawBytes);
            } catch (decErr) {
              console.error("Error decoding/forwarding media packet:", decErr);
            }
          }
        }

        // EVENT: CLEAR (VoiceLink indicates user interruption)
        if (data.event === "clear") {
          console.log("⚡ Barge-in 'clear' event received from VoiceLink");
          currentPlayId++;
          isSpeaking = false;
        }

        // EVENT: STOP (Call Terminated)
        if (data.event === "stop") {
          console.log(`📴 Call terminated: ${callSid}`);
          isCallActive = false;
          if (deepgramWs) {
            deepgramWs.close();
            deepgramWs = null;
          }
        }

      } catch (err) {
        console.error("Error handling VoiceLink WebSocket event:", err);
      }
    };

    socket.onerror = (e) => {
      console.error("VoiceLink WebSocket error:", e);
    };

    socket.onclose = () => {
      console.log("VoiceLink WebSocket closed");
      isCallActive = false;
      if (deepgramWs) {
        deepgramWs.close();
        deepgramWs = null;
      }
    };

    return response;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. HTTP PREVIEW & SIMULATION API (For Dashboard & Testing)
  // ─────────────────────────────────────────────────────────────
  try {
    const url = new URL(req.url);

    // Health / Status check
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "online",
          engine: "Leadzo In-House VoiceLink WebSocket Server",
          version: "2.0.0",
          features: {
            telephony_codec: "ITU-T G.711 A-law (PCMA @ 8kHz)",
            telephony_engine: "VoiceLink Bidirectional WebSocket",
            speech_to_text: "Deepgram Nova-2 Streaming (Hindi)",
            conversational_llm: "OpenAI GPT-4o-mini",
            text_to_speech: "OpenAI Onyx HD Telephony",
            interruption_handling: "Real-time Barge-in clear support"
          },
          supported_voices: [
            { id: "elevenlabs_indian_male", name: "Indian Male (ElevenLabs Multilingual v2)", quality: "Ultra-Realistic" },
            { id: "openai_onyx", name: "Male Voice - Onyx (OpenAI Deep HD)", quality: "Deep HD Telephony" }
          ],
          websocket_url: `wss://${url.host}/functions/v1/voicelink_voice_server`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audio Test / Voice Quality Simulation
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const testText = body.text || "नमस्ते! King Villa Resort & Suites में आपका स्वागत है। हमारे पास आज के लिए Deluxe Room और Private Pool Villa उपलब्ध है। क्या मैं आपके WhatsApp पर फ़ोटोज़ और रेट लिस्ट भेज दूँ?";
      const requestedVoice = body.voice || "openai_onyx";

      const openAiKey = Deno.env.get("OPENAI_API_KEY");

      if (!openAiKey) {
        return new Response(
          JSON.stringify({ error: "No OPENAI_API_KEY configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          input: testText,
          voice: "onyx",
          speed: 1.0
        })
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS API failed: ${await ttsResponse.text()}`);
      }

      return new Response(ttsResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-cache"
        }
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
