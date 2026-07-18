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
    const { numbers, message, voice } = await req.json()

    // Twilio Credentials from Supabase Secrets
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")
    const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "+14787807948"

    // Our custom Render WebSocket server
    const wsServerUrl = Deno.env.get("WS_SERVER_URL") || "https://leadzo-e0wy.onrender.com"

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error("Missing Twilio credentials in Supabase secrets.")
    }

    // Use the full message for the AI prompt
    const systemPrompt = encodeURIComponent(message || "You are a helpful AI sales agent for Leadzo. Keep responses short and helpful.");
    const selectedVoice = encodeURIComponent(voice || "rachel");

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
      const twiml = `<Response><Connect><Stream url="${wssUrl}/stream?voice=${selectedVoice}&amp;prompt=${systemPrompt}" /></Connect></Response>`;
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
