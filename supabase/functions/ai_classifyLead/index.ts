// Supabase Edge Function: ai_classifyLead
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { message } = await req.json()
    const apiKey = Deno.env.get("OPENAI_API_KEY")

    if (apiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Classify this lead inquiry message. Respond ONLY with a JSON object: { intent: string, score: number, isScam: boolean, scamReason: string, isUrgent: boolean, language: string }" },
            { role: "user", content: message }
          ]
        })
      })
      const data = await response.json()
      return new Response(data.choices[0].message.content, {
        headers: { "Content-Type": "application/json" }
      })
    }

    // Mock Fallback
    const lower = (message || "").toLowerCase()
    let intent = "inquiry"
    let score = 50
    let isUrgent = false
    let isScam = false
    let scamReason = ""

    if (lower.includes("price") || lower.includes("cost") || lower.includes("buy")) {
      intent = "purchasing interest"
      score = 90
      isUrgent = true
    } else if (lower.includes("crypto") || lower.includes("rich") || lower.includes("earn $")) {
      intent = "spam"
      score = 10
      isScam = true
      scamReason = "Prompts get-rich-quick themes or crypto schemes"
    } else if (lower.includes("demo") || lower.includes("schedule")) {
      intent = "demo request"
      score = 80
    }

    return new Response(JSON.stringify({
      intent,
      score,
      isScam,
      scamReason,
      isUrgent,
      language: "en"
    }), { headers: { "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
