// Supabase Edge Function: bulkCalling_makeBulkCalls
// UPDATED: Now uses Twilio directly instead of Vapi
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
    const { numbers, message, voice, ttsEngine: reqTtsEngine } = await req.json()

    // Twilio Credentials from Supabase Secrets
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")
    const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "+14787807948"

    // Our custom Render WebSocket server
    const wsServerUrl = Deno.env.get("WS_SERVER_URL") || "https://leadzo-e0wy.onrender.com"

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error("Missing Twilio credentials in Supabase secrets.")
    }

    // Dynamically truncate the message so its encoded length fits well within Twilio's 4000 char limit
    let truncatedMessage = typeof message === 'string' ? message : '';
    let systemPrompt = encodeURIComponent(truncatedMessage);
    
    // Twilio has a strict 4000 char limit for both Url and Twiml length. 
    // We leave ~1000 chars room for the XML tags, voice parameter, and URL structure.
    while (systemPrompt.length > 2500) {
      truncatedMessage = truncatedMessage.slice(0, -50);
      systemPrompt = encodeURIComponent(truncatedMessage);
    }

    if (!truncatedMessage) {
      systemPrompt = encodeURIComponent("You are a helpful AI sales agent for Leadzo. Keep responses short and helpful.");
    }
    const selectedVoice = encodeURIComponent(voice || "rachel");
    const ttsEngine = encodeURIComponent(reqTtsEngine || "elevenlabs");

    const results = []

    for (const number of numbers) {
      // Call Twilio REST API to initiate outbound call
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`
      
      const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`)
      
      const formData = new URLSearchParams()
      formData.append("To", number)
      formData.append("From", twilioFromNumber)
      
      // We pass the TwiML directly instead of providing a Url to bypass the 4000 char Url limit
      const wssUrl = wsServerUrl.replace('http', 'ws');
      
      const promptText = typeof message === 'string' ? message : "You are a helpful AI sales agent.";
      let promptId = "";
      
      try {
        const regRes = await fetch(`${wsServerUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/register-prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptText })
        });
        if (regRes.ok) {
          const { promptId: id } = await regRes.json();
          promptId = id;
        }
      } catch (e) {
        console.error("Failed to register prompt", e);
      }

      const twiml = `<Response><Connect><Stream url="${wssUrl}/stream?voice=${selectedVoice}&amp;ttsEngine=${ttsEngine}&amp;promptId=${promptId}" /></Connect></Response>`;
      formData.append("Twiml", twiml)

      const twilioRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      const twilioData = await twilioRes.json()

      if (!twilioRes.ok) {
        console.error(`Failed to call ${number}:`, twilioData)
        results.push({ success: false, number, error: twilioData.message })
      } else {
        console.log(`✅ Call initiated to ${number}, SID: ${twilioData.sid}`)
        results.push({ success: true, number, callSid: twilioData.sid })
      }

      // Small delay between calls to avoid rate limiting
      if (numbers.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error("Edge function error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: corsHeaders
    })
  }
})
