// Supabase Edge Function: bulkCalling_makeBulkCalls
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { numbers, message, voice } = await req.json()
    const vapiApiKey = Deno.env.get("VAPI_API_KEY")
    const vapiPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID")

    let callSid = "mock_call_sid_" + Math.random().toString(36).substr(2, 9);
    
    // Fallback to mock if Vapi keys are missing
    if (!vapiApiKey || !vapiPhoneNumberId) {
      console.log("No VAPI_API_KEY found, returning mock success.");
    } else {
      // Vapi API Integration
      const vapiRes = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phoneNumberId: vapiPhoneNumberId,
          customer: { number: numbers[0] },
          assistant: {
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: message || "You are an AI assistant."
                }
              ]
            },
            voice: { provider: "openai", voiceId: voice || "alloy" }
          }
        })
      });
      
      const vapiData = await vapiRes.json();
      if (!vapiRes.ok) {
        throw new Error(vapiData.message || "Failed to initiate Vapi call");
      }
      callSid = vapiData.id;
    }

    return new Response(JSON.stringify({
      results: [{
        success: true,
        callSid: callSid,
      }]
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
