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

    const { leadId, script } = await req.json()
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

    // 2. Use Vapi to make the call (since VAPI is already configured in Leadzo)
    const vapiApiKey = Deno.env.get("VAPI_API_KEY")
    const vapiPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID")

    if (!vapiApiKey || !vapiPhoneNumberId) throw new Error("VAPI config missing")

    const callScript = script || `Hi ${lead.name || "there"}, this is a follow-up call from our team. We wanted to check in and see if you have any questions. Please call us back at your convenience. Thank you!`

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
          voice: {
            provider: "11labs",
            voiceId: "paula",
          },
          firstMessage: `Hello, may I speak with ${lead.name || "you"}? This is an automated follow-up from Leadzo AI.`,
          endCallFunctionEnabled: true,
        },
      }),
    })

    if (!vapiRes.ok) {
      const errText = await vapiRes.text()
      throw new Error(`Vapi call failed: ${errText}`)
    }

    const vapiData = await vapiRes.json()

    // 3. Log the call in the database (optional)
    await supabase.from("crm_messages").insert({
      lead_id: leadId,
      platform: "ai_call",
      direction: "outbound",
      content: `📞 AI Call placed to ${lead.phone}. Script: "${callScript.substring(0, 100)}..."`,
    })

    return new Response(
      JSON.stringify({ success: true, callId: vapiData.id, message: "Call placed successfully! 🎉" }),
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
