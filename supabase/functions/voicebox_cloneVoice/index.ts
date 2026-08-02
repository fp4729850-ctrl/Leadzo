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

    // We expect multipart/form-data for audio upload
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    const voiceName = formData.get("name") || "Custom Voice";

    if (!audioFile || !(audioFile instanceof File)) {
        throw new Error("Missing audio file");
    }

    // Proxy the request to our self-hosted Voicebox Server
    // Voicebox usually runs on localhost:8000 or similar
    const voiceboxUrl = Deno.env.get("VOICEBOX_URL") || "http://localhost:8000";
    
    // Convert to standard form data for Voicebox
    const vbFormData = new FormData();
    vbFormData.append("audio", audioFile);
    vbFormData.append("name", voiceName);

    const vbRes = await fetch(`${voiceboxUrl}/api/clone`, {
        method: "POST",
        body: vbFormData,
    });

    if (!vbRes.ok) {
        throw new Error(`Voicebox server failed: ${vbRes.statusText}`);
    }

    const vbData = await vbRes.json();
    
    if (!vbData.voice_id) {
        throw new Error("Voicebox did not return a voice_id");
    }

    // Save the voice ID to user settings/profile
    await supabase.from("users").update({
        custom_voice_id: vbData.voice_id,
        custom_voice_name: voiceName
    }).eq("id", user.id);

    return new Response(JSON.stringify({ success: true, voice_id: vbData.voice_id, message: "Voice cloned successfully!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
