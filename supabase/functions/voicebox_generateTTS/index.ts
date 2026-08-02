import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase config");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Invalid token");

    const { text, voice_id } = await req.json();

    if (!text) {
        throw new Error("Missing text script to generate TTS");
    }

    const voiceboxUrl = Deno.env.get("VOICEBOX_URL") || "http://localhost:8000";
    
    // Voicebox TTS API expects JSON body with text and optional voice_id
    const payload: any = { text: text };
    if (voice_id) {
        payload.voice_id = voice_id;
    }

    const vbRes = await fetch(`${voiceboxUrl}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!vbRes.ok) {
        throw new Error(`Voicebox server failed: ${vbRes.statusText}`);
    }

    // Voicebox returns the raw audio data (e.g. audio/wav or audio/mpeg)
    // We can just proxy this binary buffer directly back to the frontend
    const audioBuffer = await vbRes.arrayBuffer();

    return new Response(audioBuffer, {
        headers: {
            ...corsHeaders,
            "Content-Type": vbRes.headers.get("Content-Type") || "audio/wav",
            "Content-Length": String(audioBuffer.byteLength),
        }
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
