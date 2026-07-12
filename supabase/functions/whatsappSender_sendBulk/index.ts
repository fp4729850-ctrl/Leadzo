import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { numbers, message, templateName, apiType } = await req.json()
    
    if (apiType === "meta") {
      const token = Deno.env.get("META_WHATSAPP_API_TOKEN") || Deno.env.get("WHATSAPP_API_TOKEN");
      const phoneId = Deno.env.get("META_WHATSAPP_PHONE_ID") || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      
      if (!token || !phoneId) {
        throw new Error("Meta WhatsApp credentials not found in environment variables");
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
              language: { code: "en_US" } // Defaulting to en_US for now
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
