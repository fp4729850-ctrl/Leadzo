import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const META_APP_ID = "892432016516964"; // Updated to main App ID
const META_APP_SECRET = "3e6ba1068a5fbcc578c16c835516c026"; // Correct Main App Secret
const REDIRECT_URI = "https://www.leadzoai.com/auth/meta-callback";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return new Response(JSON.stringify({ error: "Missing code or userId" }), { headers: corsHeaders, status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://graph.facebook.com/v17.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`);
    
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Meta Token Error:", tokenData.error);
      return new Response(JSON.stringify({ error: tokenData.error.message }), { headers: corsHeaders, status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Get a long-lived token
    const longLivedResponse = await fetch(`https://graph.facebook.com/v17.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${accessToken}`);
    const longLivedData = await longLivedResponse.json();
    const finalToken = longLivedData.access_token || accessToken;

    // Save to database
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Save to convex-compatible users table, or native users table
    // Let's assume the user table is 'users' and we add a 'meta_access_token' field
    const { error: dbError } = await supabaseClient
      .from("users")
      .upsert({ id: userId, meta_access_token: finalToken });

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Internal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 });
  }
})
