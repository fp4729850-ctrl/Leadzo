import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { numbers, message, templateName, apiType, billingMode } = await req.json()
    
    if (apiType === "meta") {
      let token = "";
      let phoneId = "";
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      const authHeader = req.headers.get("Authorization");
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader || "" } }
      });
      
      const { data: { user } } = await supabase.auth.getUser();

      if (billingMode === "wallet") {
        token = Deno.env.get("META_WHATSAPP_API_TOKEN") || Deno.env.get("WHATSAPP_API_TOKEN") || "";
        phoneId = Deno.env.get("META_WHATSAPP_PHONE_ID") || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
        
        if (user) {
          const { data: userData } = await supabase.from('users').select('credits').eq('id', user.id).single();
          const requiredCredits = numbers.length;
          if (!userData || userData.credits < requiredCredits) {
            return new Response(JSON.stringify({ error: "Insufficient Leadzo Credits" }), { status: 402, headers: corsHeaders });
          }
        }
      } else if (billingMode === "byot") {
        if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
        const { data: userData } = await supabase.from('users').select('whatsapp_api_token, whatsapp_phone_id').eq('id', user.id).single();
        if (!userData || !userData.whatsapp_api_token || !userData.whatsapp_phone_id) {
          return new Response(JSON.stringify({ error: "Meta API credentials not configured in Settings" }), { status: 400, headers: corsHeaders });
        }
        token = userData.whatsapp_api_token;
        phoneId = userData.whatsapp_phone_id;
      } else {
        token = Deno.env.get("META_WHATSAPP_API_TOKEN") || Deno.env.get("WHATSAPP_API_TOKEN") || "";
        phoneId = Deno.env.get("META_WHATSAPP_PHONE_ID") || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
      }
      
      if (!token || !phoneId) {
        throw new Error("Meta WhatsApp credentials missing");
      }
      
      const results = [];
      for (const number of numbers) {
        // Meta API requires phone number without '+'
        const cleanNumber = number.replace(/\D/g, '');
        
        const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanNumber,
            type: "template",
            template: {
              name: templateName,
              language: { code: templateName === "hello_world" ? "en_US" : "en" }
            }
          })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          results.push({ success: false, error: data.error?.message || "Meta API Error" });
        } else {
          results.push({ success: true });
        }
      }
      
      if (billingMode === "wallet" && user) {
        const successCount = results.filter(r => r.success).length;
        if (successCount > 0) {
          const { data: userData } = await supabase.from('users').select('credits').eq('id', user.id).single();
          if (userData) {
            await supabase.from('users').update({ credits: userData.credits - successCount }).eq('id', user.id);
          }
        }
      }
      
      return new Response(JSON.stringify({
        status: "success",
        sentCount: results.filter(r => r.success).length,
        results
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Green API (Mocked for now)
    const results = (numbers || []).map(() => ({ success: true }));
    return new Response(JSON.stringify({
      status: "success",
      sentCount: numbers ? numbers.length : 0,
      results,
      timestamp: new Date().toISOString(),
      details: "Bulk broadcast completed successfully (mocked)."
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
