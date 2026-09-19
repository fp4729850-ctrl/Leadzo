import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, upgrade",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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

        // EVENT: START (Call Connected)
        if (data.event === "start") {
          streamSid = data.start?.stream_sid || data.stream_sid || "";
          callSid = data.start?.call_sid || data.call_sid || "";
          callerNumber = data.start?.from || "";

          // Check if caller is Boss (9726846660)
          const cleanCaller = callerNumber.replace(/[^0-9]/g, "");
          isBoss = cleanCaller.endsWith("9726846660") || cleanCaller.endsWith("6660");

          const initialGreeting = isBoss
            ? "नमस्ते बॉस! King Villa का क्या स्टेटस देखना है?"
            : "नमस्ते! King Villa Resort & Suites में आपका स्वागत है। मैं आपकी room booking में क्या सहायता कर सकता हूँ?";

          console.log(`Call started: ${callSid} | Caller: ${callerNumber} | isBoss: ${isBoss}`);

          // Synthesize and stream first greeting audio back to caller
          // Try ElevenLabs Indian Male first, fallback to OpenAI Echo HD
          try {
            if (elevenLabsKey) {
              const elRes = await fetch("https://api.elevenlabs.io/v1/text-to-speech/kQvSCFzCwO6z2RCFMNRE/stream?output_format=ulaw_8000", {
                method: "POST",
                headers: {
                  "xi-api-key": elevenLabsKey,
                  "Content-Type": "application/json",
                  "accept": "audio/wav-mulaw"
                },
                body: JSON.stringify({
                  text: initialGreeting,
                  model_id: "eleven_multilingual_v2",
                  voice_settings: { stability: 0.55, similarity_boost: 0.8 }
                })
              });

              if (elRes.ok) {
                const audioBuffer = await elRes.arrayBuffer();
                const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

                socket.send(JSON.stringify({
                  event: "media",
                  stream_sid: streamSid,
                  media: { payload: base64Audio }
                }));

                socket.send(JSON.stringify({
                  event: "mark",
                  stream_sid: streamSid,
                  mark: { name: "greeting_done" }
                }));
                return;
              }
            }

            // Fallback to OpenAI Echo HD
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
                  voice: "echo",
                  response_format: "pcm",
                  speed: 1.0
                })
              });

              if (ttsRes.ok) {
                const audioBuffer = await ttsRes.arrayBuffer();
                const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

                socket.send(JSON.stringify({
                  event: "media",
                  stream_sid: streamSid,
                  media: { payload: base64Audio }
                }));

                socket.send(JSON.stringify({
                  event: "mark",
                  stream_sid: streamSid,
                  mark: { name: "greeting_done" }
                }));
              }
            }
          } catch (ttsErr) {
            console.error("Error synthesizing initial greeting:", ttsErr);
          }
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
