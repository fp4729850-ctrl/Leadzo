import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Expect multipart/form-data with audio file
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error("Missing audio file");
    }

    // Forward to Voicebox STT endpoint (self‑hosted)
    const voiceboxUrl = Deno.env.get("VOICEBOX_URL") || "http://localhost:8000";
    const vbForm = new FormData();
    vbForm.append("audio", audioFile);

    const vbRes = await fetch(`${voiceboxUrl}/api/transcribe`, {
      method: "POST",
      body: vbForm,
    });
    if (!vbRes.ok) {
      const txt = await vbRes.text();
      throw new Error(`Voicebox transcribe failed: ${vbRes.status} ${txt}`);
    }
    const vbData = await vbRes.json();
    const transcription = vbData.transcription || vbData.text || "";

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: corsHeaders,
    });
  }
});
