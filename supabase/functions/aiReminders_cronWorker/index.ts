// Supabase Edge Function: aiReminders_cronWorker
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") 
    const vapiApiKey = Deno.env.get("VAPI_API_KEY")
    const vapiPhoneNumberId = Deno.env.get("VAPI_PHONE_NUMBER_ID")

    if (!supabaseUrl || !supabaseKey || !vapiApiKey || !vapiPhoneNumberId) {
      throw new Error("Missing environment variables.")
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: reminders, error } = await supabase
      .from("call_reminders")
      .select("*")
      .eq("status", "pending")
      .eq("is_active", true)
      .lte("due_date", new Date().toISOString().split('T')[0])

    if (error) throw error

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No pending reminders." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const results = []

    for (const reminder of reminders) {
      try {
        let formattedNumber = reminder.phone_number.trim()
        if (!formattedNumber.startsWith('+')) {
          formattedNumber = '+' + formattedNumber
        }

        const scriptTemplate = reminder.script_template || "Hello {name}, this is a reminder for {amount} due on {due_date}."
        const customPrompt = scriptTemplate
          .replace(/{name}/gi, reminder.client_name)
          .replace(/{amount}/gi, reminder.amount_or_context || "your payment")
          .replace(/{due_date}/gi, reminder.due_date)

        const systemPrompt = `You are a professional AI assistant making a reminder call. 
Your primary goal is to deliver this message clearly: "${customPrompt}"
If they ask questions, provide short and helpful answers. Speak mostly in ${reminder.language || 'Hindi or English'} as they prefer.`

        const vapiRes = await fetch("https://api.vapi.ai/call/phone", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phoneNumberId: vapiPhoneNumberId,
            customer: { number: formattedNumber },
            metadata: { reminderId: reminder.id, userId: reminder.user_id },
            assistant: {
              firstMessage: `नमस्ते, क्या मेरी बात ${reminder.client_name} जी से हो रही है?`,
              model: {
                provider: "groq",
                model: "llama3-70b-8192",
                messages: [{ role: "system", content: systemPrompt }],
                temperature: 0.4
              },
              voice: {
                provider: "vapi",
                voiceId: "Sagar"
              },
              transcriber: {
                provider: "11labs",
                language: "hi"
              },
              language: "hi"
            }
          })
        })

        const vapiData = await vapiRes.json()

        if (!vapiRes.ok) {
           await supabase.from("call_reminders").update({ status: 'failed' }).eq("id", reminder.id)
           results.push({ success: false, reminder: reminder.id, error: vapiData })
        } else {
           await supabase.from("call_reminders").update({ status: 'called', call_sid: vapiData.id }).eq("id", reminder.id)
           results.push({ success: true, reminder: reminder.id, callSid: vapiData.id })
        }
      } catch (err: any) {
         results.push({ success: false, reminder: reminder.id, error: err.message })
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: any) {
    console.error("Cron worker error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
