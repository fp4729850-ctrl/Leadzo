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
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing auth header")

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    if (authError || !user) throw new Error("Invalid token")

    // 0. Check token balance (Requires at least 12 tokens for 1 minute of call)
    const { data: balanceData } = await supabase
      .from("token_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentBalance = balanceData?.balance ? parseFloat(balanceData.balance) : 0;
    const requiredTokens = 12.00;
    if (currentBalance < requiredTokens) {
      throw new Error(`Insufficient tokens. A minimum of ${requiredTokens} tokens is required to start a call. Your balance: ${currentBalance}`);
    }

    const { leadId, script, engine = "vapi", voiceId = "nova" } = await req.json()
    // engine: "vapi" | "voicebox" | "voicebox_clone"
    if (!leadId) throw new Error("Missing leadId")

    // 1. Get the lead's phone number
    const { data: lead, error: leadErr } = await supabase
      .from("crm_leads")
      .select("phone, name")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .single()
    if (leadErr || !lead) throw new Error("Lead not found")
    if (!lead.phone) throw new Error("Lead has no phone number")
    const phone = lead.phone;
    const name = lead.name || "Lead";

    let callId = "unknown";
    const callScript = script || `Hi ${name || "there"}, this is a follow-up call from our team. We wanted to check in and see if you have any questions. Please call us back at your convenience. Thank you!`

    if (engine === "vapi") {
      // 2. Use Vapi to make the call
      const vapiApiKey = Deno.env.get("VAPI_API_KEY")
      const vapiPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID")

      if (!vapiApiKey || !vapiPhoneNumberId) throw new Error("VAPI config missing")

      let vapiVoice;
      // ── Voice Provider Map ──────────────────────────────────────────
      // ElevenLabs voices (premium quality, multilingual)
      if (voiceId === "aria") {
        vapiVoice = { provider: "11labs", voiceId: "9BWtsMINqrJLrRacOk9x", model: "eleven_multilingual_v2", stability: 0.5, similarityBoost: 0.75 };
      } else if (voiceId === "priya") {
        // ElevenLabs - Indian Female (Priya) - natural Hindi/Hinglish accent
        vapiVoice = { provider: "11labs", voiceId: "ThT5KcBeYPX3keUQqHPh", model: "eleven_multilingual_v2", stability: 0.5, similarityBoost: 0.75 };
      } else if (voiceId === "rachel") {
        // ElevenLabs - Rachel (warm natural female)
        vapiVoice = { provider: "11labs", voiceId: "21m00Tcm4TlvDq8ikWAM", model: "eleven_multilingual_v2", stability: 0.5, similarityBoost: 0.75 };
      // Cartesia voices (ultra-low latency, excellent quality)
      } else if (voiceId === "cartesia_female") {
        vapiVoice = { provider: "cartesia", voiceId: "79a125e8-cd45-4c13-8a67-188112f4dd22", model: "sonic-english" };
      } else if (voiceId === "cartesia_male") {
        vapiVoice = { provider: "cartesia", voiceId: "a0e99841-438c-4a64-b679-ae501e7d6091", model: "sonic-english" };
      } else if (voiceId === "cartesia_indian") {
        // Cartesia - Indian English accent
        vapiVoice = { provider: "cartesia", voiceId: "638efaaa-4d0c-442e-b701-3fae16aad012", model: "sonic-multilingual" };
      // Neets voices (cheapest, good Indian accent)
      } else if (voiceId === "neets_female") {
        vapiVoice = { provider: "neets", voiceId: "us-female-2" };
      } else if (voiceId === "neets_male") {
        vapiVoice = { provider: "neets", voiceId: "us-male-1" };
      // OpenAI voices (reliable, natural)
      } else if (voiceId === "nova") {
        vapiVoice = { provider: "openai", voiceId: "nova" };
      } else if (voiceId === "shimmer") {
        vapiVoice = { provider: "openai", voiceId: "shimmer" };
      } else if (voiceId === "alloy") {
        vapiVoice = { provider: "openai", voiceId: "alloy" };
      } else {
        // Default to Sagar (built-in Vapi Indian voice — Free!)
        vapiVoice = { provider: "vapi", voiceId: "Sagar" };
      }

      // Create outbound call via Vapi
      const vapiRes = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumberId: vapiPhoneNumberId,
          customer: {
            number: lead.phone,
            name: lead.name || "Lead",
          },
          assistant: {
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "en-US",
            },
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: callScript,
                }
              ],
            },
            voice: vapiVoice,
            firstMessage: `Hello, may I speak with ${name || "you"}? This is an automated follow-up from Leadzo AI.`,
            endCallFunctionEnabled: true,
          },
        }),
      })

      if (!vapiRes.ok) {
        const errText = await vapiRes.text()
        throw new Error(`Vapi call failed: ${errText}`)
      }

      const vapiData = await vapiRes.json()
      callId = vapiData.id
    } else {
      // Custom Voicebox Logic via Twilio (voicebox OR voicebox_clone)
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")
      const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER")
      
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) throw new Error("Twilio config missing for Voicebox engine")

      const wsServerBase = Deno.env.get("WS_SERVER_URL") || "https://your-ngrok-url.ngrok.app/twiml"
      // Build the webhook URL with query params
      const webhookUrl = new URL(wsServerBase)
      if (engine === "voicebox_clone") {
        webhookUrl.searchParams.set("use_cloned_voice", "true")
        if (voiceId) webhookUrl.searchParams.set("profile_id", voiceId)
      } else {
        if (voiceId) webhookUrl.searchParams.set("voice", voiceId)
      }
      const twimlWebhookUrl = webhookUrl.toString()

      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioPhoneNumber,
          Url: twimlWebhookUrl,
        })
      })

      if (!twilioRes.ok) {
        const errText = await twilioRes.text()
        throw new Error(`Twilio call failed: ${errText}`)
      }

      const twilioData = await twilioRes.json()
      callId = twilioData.sid
    }

    // 3. Log the call in the database
    if (leadId !== "test") {
      await supabase.from("crm_messages").insert({
        lead_id: leadId,
        platform: "ai_call",
        direction: "outbound",
        content: `📞 AI Call placed to ${phone} via ${engine === "voicebox_clone" ? "Voicebox Clone 🎤" : engine.toUpperCase()}. Script: "${callScript.substring(0, 100)}..."`,
      })
    }

    return new Response(
      JSON.stringify({ success: true, callId, message: "Call placed successfully! 🎉" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    console.error("callLead error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
