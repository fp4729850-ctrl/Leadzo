// Supabase Edge Function: bulkCalling_makeBulkCalls
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    let vapiPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID")

    // Fetch user-specific phone number if authenticated
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        const { data: phoneData } = await supabaseClient
          .from('user_phone_numbers')
          .select('vapi_phone_number_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
        
        if (phoneData?.vapi_phone_number_id) {
          vapiPhoneNumberId = phoneData.vapi_phone_number_id
        }
      }
    }

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
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "hi"
            },
            model: {
              provider: "openai",
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: message || "You are an AI assistant."
                }
              ]
            },
            firstMessage: "Hello?",
            voice: { provider: "11labs", voiceId: voice || "rachel" }
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
