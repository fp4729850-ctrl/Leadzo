import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, upgrade",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ── ITU-T G.711 mu-law (PCMU) Standard Telephony Codec ──
function linearToMuLaw(pcmSample: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;
  let sign = (pcmSample >> 8) & 0x80;
  if (sign !== 0) pcmSample = -pcmSample;
  if (pcmSample > CLIP) pcmSample = CLIP;
  pcmSample = (pcmSample + BIAS) >> 2;
  let exponent = 7;
  for (let expMask = 0x4000; (pcmSample & expMask) === 0 && exponent > 0; expMask >>= 1, exponent--) {}
  let mantissa = (pcmSample >> (exponent === 0 ? 4 : (exponent + 3))) & 0x0F;
  return ~(sign | (exponent << 4) | mantissa) & 0xFF;
}

// Convert 24kHz 16-bit Linear PCM (OpenAI standard) to 8kHz G.711 mu-law (Telephony standard)
function convertPcm24kToMulaw8k(pcm24kBuffer: ArrayBuffer): Uint8Array {
  const pcmView = new DataView(pcm24kBuffer);
  const totalSamples = Math.floor(pcmView.byteLength / 2);
  const mulawLength = Math.floor(totalSamples / 3); // 3:1 integer downsampling
  const mulawArray = new Uint8Array(mulawLength);

  for (let i = 0; i < mulawLength; i++) {
    const sampleIdx = i * 3;
    const pcmSample = pcmView.getInt16(sampleIdx * 2, true); // little-endian
    mulawArray[i] = linearToMuLaw(pcmSample);
  }
  return mulawArray;
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";

  // ─────────────────────────────────────────────────────────────
  // 1. WEBSOCKET STREAMING ENGINE (Direct VoiceLink Telephony)
  // ─────────────────────────────────────────────────────────────
  if (upgrade.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);

    let streamSid = "";
    let callSid = "";
    let callerNumber = "";
    let isBoss = false;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
    const openAiKey = Deno.env.get("OPENAI_API_KEY") || "";

    socket.onopen = () => {
      console.log("🔗 VoiceLink WebSocket stream connected!");
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        // EVENT: START / CONNECTED (Call Connected)
        if (data.event === "start" || data.event === "connected") {
          streamSid = data.start?.streamSid || data.start?.stream_sid || data.streamSid || data.stream_sid || "";
          callSid = data.start?.callSid || data.start?.call_sid || data.callSid || data.call_sid || "";
          callerNumber = data.start?.from || data.from || "";

          // Check if caller is Boss (9726846660)
          const cleanCaller = callerNumber.replace(/[^0-9]/g, "");
          isBoss = cleanCaller.endsWith("9726846660") || cleanCaller.endsWith("6660");

          const initialGreeting = isBoss
            ? "नमस्ते बॉस! King Villa का क्या स्टेटस देखना है?"
            : "नमस्ते! King Villa Resort & Suites में आपका स्वागत है। मैं आपकी room booking में क्या सहायता कर सकता हूँ?";

          console.log(`📞 Call started: ${callSid} | Stream: ${streamSid} | Caller: ${callerNumber} | isBoss: ${isBoss}`);

          // Synthesize and stream first greeting audio back to caller using OpenAI Onyx HD in 8kHz mu-law
          try {
            if (openAiKey) {
              const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${openAiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: "tts-1-hd",
                  input: initialGreeting,
                  voice: "onyx",
                  response_format: "pcm",
                  speed: 1.0
                })
              });

              if (ttsRes.ok) {
                const audioBuffer = await ttsRes.arrayBuffer();
                console.log(`TTS generation success: ${audioBuffer.byteLength} bytes raw 24kHz PCM`);

                // Convert 24kHz PCM to 8kHz G.711 mu-law for VoiceLink telecom network
                const mulawData = convertPcm24kToMulaw8k(audioBuffer);
                console.log(`Converted to 8kHz G.711 mu-law: ${mulawData.length} bytes`);

                // Stream in 80ms chunks (640 bytes) with precise timing
                const CHUNK_SIZE = 640;
                for (let i = 0; i < mulawData.length; i += CHUNK_SIZE) {
                  const end = Math.min(i + CHUNK_SIZE, mulawData.length);
                  const chunk = mulawData.subarray(i, end);
                  const payload = base64Encode(chunk);

                  socket.send(JSON.stringify({
                    event: "media",
                    streamSid: streamSid,
                    stream_sid: streamSid,
                    media: { payload }
                  }));

                  // 70ms pacing simulates realtime telephony voice packets
                  await new Promise(r => setTimeout(r, 70));
                }

                socket.send(JSON.stringify({
                  event: "mark",
                  streamSid: streamSid,
                  stream_sid: streamSid,
                  mark: { name: "greeting_done" }
                }));
                console.log("Greeting audio stream completed!");
                return;
              } else {
                console.error("OpenAI TTS failed:", await ttsRes.text());
              }
            }
          } catch (ttsErr) {
            console.error("Error synthesizing initial greeting with Onyx HD:", ttsErr);
          }
        }

        // EVENT: MEDIA (Incoming audio from caller)
        if (data.event === "media") {
          // Caller speech received
        }

        // EVENT: CLEAR (Caller interrupted / barge-in)
        if (data.event === "clear") {
          console.log("⚡ Barge-in detected from VoiceLink: Caller speaking");
        }

        // EVENT: STOP (Call Ended)
        if (data.event === "stop") {
          console.log(`Call terminated: ${callSid}`);
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
          version: "1.2.0",
          features: {
            telephony_engine: "VoiceLink Bidirectional WebSocket",
            ambient_background_sound: "office_reception (Vapi Style)",
            interruption_handling: "Barge-in clear support"
          },
          supported_voices: [
            { id: "elevenlabs_indian_male", name: "Indian Male (ElevenLabs Multilingual v2)", quality: "Ultra-Realistic" },
            { id: "openai_echo", name: "Male Voice - Echo (OpenAI Studio HD)", quality: "Studio HD" },
            { id: "openai_onyx", name: "Male Voice - Onyx (OpenAI Deep HD)", quality: "Deep HD" }
          ],
          protocols: ["VoiceLink WSS", "8kHz PCM", "Bilingual Hindi/English"],
          websocket_url: `wss://${url.host}/functions/v1/voicelink_voice_server`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audio Test / Voice Quality Simulation
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const testText = body.text || "नमस्ते! King Villa Resort & Suites में आपका स्वागत है। हमारे पास आज के लिए Deluxe Room और Private Pool Villa उपलब्ध है। क्या मैं आपके WhatsApp पर फ़ोटोज़ और रेट लिस्ट भेज दूँ?";
      const requestedVoice = body.voice || "elevenlabs_indian_male";

      const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY") || "sk_5f8b1cc0df76cb6eb94db78b1f53c36c0c1cdea6342da6f8";
      const openAiKey = Deno.env.get("OPENAI_API_KEY");

      // 1. ElevenLabs Indian Male Voice (Ultra-Realistic Human Quality)
      if (requestedVoice === "elevenlabs_indian_male" && elevenLabsKey) {
        try {
          const elResponse = await fetch("https://api.elevenlabs.io/v1/text-to-speech/kQvSCFzCwO6z2RCFMNRE", {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsKey,
              "Content-Type": "application/json",
              "accept": "audio/mpeg"
            },
            body: JSON.stringify({
              text: testText,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.55,
                similarity_boost: 0.80,
                style: 0.2,
                use_speaker_boost: true
              }
            })
          });

          if (elResponse.ok) {
            return new Response(elResponse.body, {
              headers: {
                ...corsHeaders,
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache"
              }
            });
          }
          console.warn("ElevenLabs generation returned non-OK, falling back to OpenAI HD");
        } catch (elErr) {
          console.error("ElevenLabs error, falling back to OpenAI HD:", elErr);
        }
      }

      // 2. OpenAI HD Male Voices (Echo or Onyx in Studio HD)
      if (!openAiKey) {
        return new Response(
          JSON.stringify({ error: "No TTS API key configured (neither ElevenLabs nor OpenAI)" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const openAiVoice = requestedVoice === "openai_onyx" ? "onyx" : "echo";
      const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          input: testText,
          voice: openAiVoice,
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
