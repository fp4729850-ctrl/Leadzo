// Supabase Edge Function: ai_classifyLead
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { message } = await req.json()
    const openAIKey = Deno.env.get("OPENAI_API_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    const systemPrompt = "Classify this lead inquiry message. Respond ONLY with a JSON object: { intent: string, score: number, isScam: boolean, scamReason: string, isUrgent: boolean, language: string }"
    const userPrompt = message

    const callOpenAI = async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      })
      if (!response.ok) throw new Error("OpenAI request failed")
      const data = await response.json()
      return data.choices[0].message.content
    }

    const callGemini = async () => {
      // Gemini 1.5 Flash supports JSON response mode
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      })
      if (!response.ok) throw new Error("Gemini request failed")
      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    }

    let result = ""

    if (openAIKey && geminiKey) {
      if (Math.random() > 0.5) {
        try { result = await callOpenAI() } catch { result = await callGemini() }
      } else {
        try { result = await callGemini() } catch { result = await callOpenAI() }
      }
    } else if (openAIKey) {
      result = await callOpenAI()
    } else if (geminiKey) {
      result = await callGemini()
    } else {
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

      result = JSON.stringify({
        intent, score, isScam, scamReason, isUrgent, language: "en"
      })
    }

    return new Response(result, {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
