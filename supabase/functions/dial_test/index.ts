import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!

  const body = await req.json().catch(() => ({}))
  const to = body.to || "+919726846660"

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return new Response(JSON.stringify({ error: "Twilio config missing" }), { status: 400 })
  }

  // Use the active localhost.run tunnel URL
  const wsBase = "https://0c588b3c75dc07.lhr.life/twiml"
  const twimlUrl = `${wsBase}?use_cloned_voice=true&profile_id=kQvSCFzCwO6z2RCFMNRE`

  const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      To: to,
      From: TWILIO_PHONE_NUMBER,
      Url: twimlUrl,
    })
  })

  const result = await twilioRes.json()
  return new Response(JSON.stringify({ success: twilioRes.ok, callSid: result.sid, status: result.status, error: result.message }), {
    headers: { "Content-Type": "application/json" }
  })
})
