// Supabase Edge Function: bulkCalling_makeBulkCalls
// UPDATED: Reverted to Vapi.ai for best-in-class AI voice quality
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

    if (!vapiApiKey || !vapiPhoneNumberId) {
      throw new Error("Missing VAPI_API_KEY or VAPI_PHONE_NUMBER_ID in Supabase secrets.")
    }

    const systemPrompt = message || `आप Pooja हैं, Leadzo AI की एक professional sales executive। आप outbound calls करती हैं।

**Leadzo AI की Services (अगर ग्राहक पूछे):**
- Bulk WhatsApp Messaging - हजारों customers को एक साथ message
- Bulk AI Calling - AI से automated voice calls
- Instagram Campaigns & Insta DM Campaigns - Instagram पर ads और direct messages
- Facebook Campaigns - FB पर target audience तक पहुँचना
- Google Campaigns - Google search और display ads
- Bulk Email - mass email marketing
- CRM & Lead Management - leads को track करना
- Analytics Dashboard - business performance देखना  
- SEO AI Agent - website की Google ranking improve करना

**बातचीत का तरीका:**
- हमेशा Hindi में बात करें
- छोटे और clear जवाब दें (2-3 sentences)
- Professional और friendly tone रखें
- विनम्र रहें, लेकिन Leadzo AI के फायदों को स्पष्टता के साथ प्रस्तुत करें।

**आपत्तियों (Objections) को संभालना:**
- ग्राहक की चिंताओं को गंभीरता से लें।
- समझाएं कि आपको समझ में आता है कि उनकी स्थिति क्या है, और इसे हल करने के लिए Leadzo AI कैसे मदद कर सकता है।
- उदाहरणों के साथ उत्तर देने की कोशिश करें कि कैसे आपकी सेवाएं उनके व्यवसाय के लिए फायदेमंद हो सकती हैं।

**Appointment Booking:**
जब customer interest दिखाए:
1. उनसे सुविधाजनक समय (convenient time) पूछें।
2. अपॉइंटमेंट के फायदे बताएं।
3. Confirm करें: "तो मैं [time] के लिए आपका appointment book कर देती हूँ?"
4. Confirmation मिलने पर यह बोलें: "बहुत अच्छा! आपकी appointment book हो गई है। मैंने आपको WhatsApp पर मीटिंग की link share कर दी है, आप उस से connect हो जाना।"

**Call कब खत्म करें:**
इन situations में call तुरंत end करें:
1. जब customer कहे "ठीक है, बाद में बात करते हैं" या "अभी busy हूँ"
2. जब appointment successfully book हो जाए - WhatsApp link वाली बात बोलकर और धन्यवाद कहकर call end करें
3. जब customer clearly interested नहीं है और "नहीं चाहिए" कह दे
4. जब customer ने सभी सवाल पूछ लिए और conversation naturally खत्म हो

Call end करने से पहले हमेशा कहें: "आपका समय देने के लिए बहुत-बहुत धन्यवाद! Leadzo AI के बारे में कोई भी जानकारी के लिए हमसे फिर से संपर्क करें। नमस्ते!"`

    // ElevenLabs Hindi-capable voice via Vapi
    // Using ElevenLabs "Aria" multilingual model - natural Hindi female voice
    const vapiVoice = {
      provider: "11labs",
      voiceId: "9BWtsMINqrJLrRacOk9x", // Aria - multilingual, natural Hindi
      model: "eleven_multilingual_v2",
      stability: 0.5,
      similarityBoost: 0.75
    }

    const results = []

    for (const number of numbers) {
      try {
        const vapiRes = await fetch("https://api.vapi.ai/call/phone", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phoneNumberId: vapiPhoneNumberId,
            customer: { number },
            assistant: {
              firstMessage: "नमस्ते! मैं Pooja बोल रही हूँ, Leadzo AI की तरफ से। हम AI-powered lead management और bulk calling जैसी services provide करते हैं जो आपके business को grow करने में मदद करती हैं। क्या आप 2 मिनट बात कर सकते हैं?",
              model: {
                provider: "openai",
                model: "gpt-4o",
                messages: [
                  {
                    role: "system",
                    content: systemPrompt
                  }
                ],
                temperature: 0.7
              },
              voice: vapiVoice,
              transcriber: {
                provider: "deepgram",
                model: "nova-2-general",
                language: "hi"
              },
              language: "hi",
              recordingEnabled: false
            }
          })
        })

        const vapiData = await vapiRes.json()

        if (!vapiRes.ok) {
          console.error(`Failed to call ${number}:`, vapiData)
          results.push({ success: false, number, error: vapiData.message || "Vapi call failed" })
        } else {
          console.log(`✅ Vapi call initiated to ${number}, ID: ${vapiData.id}`)
          results.push({ success: true, number, callSid: vapiData.id })
        }
      } catch (e: any) {
        results.push({ success: false, number, error: e.message })
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
