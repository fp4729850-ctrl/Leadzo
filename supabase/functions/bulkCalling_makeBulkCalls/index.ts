// Supabase Edge Function: bulkCalling_makeBulkCalls
// UPDATED: Reverted to Vapi.ai for best-in-class AI voice quality
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
    const { numbers, message, voice, whatsappLink } = await req.json()

    // Get user id from token
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || ""

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

**बातचीत का तरीका (Human-like Conversational Style):**
- हमेशा Hindi में बात करें।
- बात करते समय इंसानों की तरह filler शब्दों का इस्तेमाल करें (जैसे: "जी...", "अच्छा...", "हाँ बिल्कुल...", "हम्म...")।
- छोटे और clear जवाब दें (2-3 sentences), न्यूज़ रीडर की तरह ना बोलें।
- वाक्यों के बीच में थोड़े pauses लें (कॉमा ',' और डॉट्स '...' का ज़्यादा इस्तेमाल करें)।
- Professional और friendly tone रखें।

**आपत्तियों (Objections) को संभालना:**
- ग्राहक की चिंताओं को गंभीरता से लें।
- समझाएं कि आपको समझ में आता है कि उनकी स्थिति क्या है, और इसे हल करने के लिए Leadzo AI कैसे मदद कर सकता है।
- उदाहरणों के साथ उत्तर देने की कोशिश करें कि कैसे आपकी सेवाएं उनके व्यवसाय के लिए फायदेमंद हो सकती हैं।

**Call कैसे खत्म करें (2-Step Process):**
1. जब appointment book हो जाए, तो पहले यह बोलें: "बहुत अच्छा! आपकी appointment book हो गई है। मैंने आपको WhatsApp पर मीटिंग की link share कर दी है, आप उस से connect हो जाना।" 
2. यह बोलने के बाद, ग्राहक के जवाब (जैसे "ठीक है" या "धन्यवाद") का इंतज़ार करें।
3. ग्राहक के जवाब देने के बाद, या जब ग्राहक clearly interested नहीं है, तब Call End करने का action (tool) trigger करें।

ध्यान दें: Call End करने का टूल इस्तेमाल करने से पहले हमेशा ऊपर दिया गया WhatsApp वाला मैसेज ज़रूर बोलें।`

    // Map UI voice parameter to actual voice model settings
    let vapiVoice;
    if (voice === "aria") {
      vapiVoice = {
        provider: "11labs",
        voiceId: "9BWtsMINqrJLrRacOk9x", // Aria
        model: "eleven_multilingual_v2",
        stability: 0.7,
        similarityBoost: 0.75
      };
    } else {
      // Default to Sagar
      vapiVoice = {
        provider: "vapi",
        voiceId: "Sagar"
      };
    }

    const results = []

    // Dynamically extract the "First Message" from the system prompt if it exists
    let extractedFirstMessage = "नमस्ते! मैं Pooja बोल रही हूँ, Leadzo AI की तरफ से। हम AI-powered lead management और bulk calling जैसी services provide करते हैं जो आपके business को grow करने में मदद करती हैं। क्या आप 2 मिनट बात कर सकते हैं?";
    const firstMsgMatch = systemPrompt.match(/\*\*First Message.*?\*\*\n(.*?)\n\n\*\*/s) || systemPrompt.match(/First Message.*?\n(.*?)\n\n/is);
    if (firstMsgMatch && firstMsgMatch[1] && firstMsgMatch[1].trim().length > 10) {
      extractedFirstMessage = firstMsgMatch[1].trim();
    }

    for (const number of numbers) {
      try {
        // Format number to E.164 (ensure it starts with +)
        let formattedNumber = number.trim();
        if (!formattedNumber.startsWith('+')) {
          formattedNumber = '+' + formattedNumber;
        }

        const vapiRes = await fetch("https://api.vapi.ai/call/phone", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phoneNumberId: vapiPhoneNumberId,
            customer: { number: formattedNumber },
            metadata: { userId, whatsappLink: whatsappLink || "" },
            assistantOverrides: {
              firstMessage: extractedFirstMessage,
              model: {
                provider: "groq",
                model: "llama3-70b-8192",
                messages: [
                  {
                    role: "system",
                    content: systemPrompt
                  }
                ],
                temperature: 0.4,
                maxTokens: 250,
                toolIds: []
              },
              voice: {
                provider: "vapi",
                voiceId: "Sagar"
              },
              transcriber: {
                provider: "11labs",
                language: "hi"
              },
              language: "hi",
              recordingEnabled: false,
              backgroundSound: "off",
              backgroundDenoisingEnabled: true,
              backchannelingEnabled: true,
              endCallFunctionEnabled: true,
              endCallPhrases: ["धन्यवाद! नमस्ते", "धन्यवाद नमस्ते", "आपका समय देने के लिए बहुत-बहुत धन्यवाद"],
              endCallMessage: "आपका समय देने के लिए बहुत-बहुत धन्यवाद! नमस्ते!"
            },
            // Server-side tool that AI can trigger to send WhatsApp link
            ...(whatsappLink ? {
              tools: [
                {
                  type: "function",
                  function: {
                    name: "sendWhatsAppLink",
                    description: "जब कस्टमर agree करे तो इस tool को call करो ताकि उन्हें WhatsApp पर link मिल सके। यह tool call करो और साथ में बोलो: 'मैंने आपको WhatsApp पर link भेज दी है।'",
                    parameters: {
                      type: "object",
                      properties: {}
                    }
                  },
                  server: {
                    url: "https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/vapi_tool_handler"
                  }
                }
              ]
            } : {})
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
