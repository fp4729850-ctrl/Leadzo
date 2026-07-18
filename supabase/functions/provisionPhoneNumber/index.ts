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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Missing auth header")

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) throw new Error(`Unauthorized: ${authError?.message || 'No user found in token'}`)

    // Check if user already has an active number
    const { data: existing } = await supabaseClient
      .from('user_phone_numbers')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existing) {
      throw new Error("You already have an active phone number.")
    }

    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN")
    const vapiApiKey = Deno.env.get("VAPI_API_KEY")

    if (!twilioSid || !twilioAuth || !vapiApiKey) {
      throw new Error("Server configuration error (missing keys)")
    }

    const twilioAuthHeader = "Basic " + btoa(`${twilioSid}:${twilioAuth}`)

    // 1. Search for available US local numbers
    const searchRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/AvailablePhoneNumbers/US/Local.json?Limit=1`, {
      method: "GET",
      headers: { "Authorization": twilioAuthHeader }
    })
    
    if (!searchRes.ok) {
      throw new Error("Failed to search Twilio numbers: " + await searchRes.text())
    }
    
    const searchData = await searchRes.json()
    if (!searchData.available_phone_numbers || searchData.available_phone_numbers.length === 0) {
      throw new Error("No available phone numbers found right now.")
    }
    
    const targetNumber = searchData.available_phone_numbers[0].phone_number

    // 2. Buy the number
    const buyRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`, {
      method: "POST",
      headers: {
        "Authorization": twilioAuthHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ PhoneNumber: targetNumber }).toString()
    })

    if (!buyRes.ok) {
      const errText = await buyRes.text()
      // If it's a trial account error, handle it gracefully
      if (errText.includes("Upgrade your account")) {
        throw new Error("Twilio Trial Accounts cannot buy numbers. Please upgrade your Twilio account first.")
      }
      throw new Error("Failed to purchase Twilio number: " + errText)
    }

    // 3. Import number into Vapi
    const vapiRes = await fetch("https://api.vapi.ai/phone-number", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        provider: "twilio",
        number: targetNumber,
        twilioAccountSid: twilioSid,
        twilioAuthToken: twilioAuth,
        name: `Leadzo User ${user.id.substring(0,6)}`
      })
    })

    if (!vapiRes.ok) {
      throw new Error("Failed to import number to Vapi: " + await vapiRes.text())
    }

    const vapiData = await vapiRes.json()
    const vapiPhoneId = vapiData.id

    // 4. Save to Supabase
    const { error: dbError } = await supabaseClient
      .from('user_phone_numbers')
      .insert({
        user_id: user.id,
        phone_number: targetNumber,
        vapi_phone_number_id: vapiPhoneId,
        status: 'active'
      })

    if (dbError) throw new Error("Failed to save to database: " + dbError.message)

    return new Response(JSON.stringify({
      success: true,
      phoneNumber: targetNumber,
      message: "Phone number successfully provisioned!"
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("Provisioning error:", error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})
