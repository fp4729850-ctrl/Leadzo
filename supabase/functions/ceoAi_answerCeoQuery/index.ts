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
    const { question, metrics } = await req.json()
    if (!question) throw new Error("Question is required")

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("HERCULES_API_KEY") || Deno.env.get("OPENAI_API_KEY")
    if (!apiKey) throw new Error("API Key is missing. Please set GEMINI_API_KEY or HERCULES_API_KEY in Secrets.")

    const systemPrompt = `You are an expert Chief Executive Officer (CEO) and Chief Marketing Officer (CMO) AI assistant for a business using the Leadzo platform.
You are given the company's real-time advertising and CRM metrics.
Answer the CEO's query concisely, professionally, and with actionable insights based strictly on the provided metrics. Keep it under 100 words. Be direct.

Context Metrics:
Total Spend: ₹${metrics.totalSpend}
Total Revenue: ₹${metrics.totalRevenue}
ROAS: ${metrics.roas}
CPL (Cost Per Lead): ₹${metrics.cpl}
Total Conversions: ${metrics.totalConversions}
Total Impressions: ${metrics.totalImpressions}
Total Clicks: ${metrics.totalClicks}
CTR: ${metrics.ctr}%`

    const userPrompt = `Query: ${question}`

    const callGeminiModel = async (model: string) => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }]
        })
      })
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini ${model} failed: ${response.status} ${errText}`)
      }
      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    }

    let answer = "";
    const models = ["gemini-2.0-flash-001", "gemini-2.0-flash-lite-001", "gemini-flash-latest"];
    let lastError: any = null;
    for (const model of models) {
      try {
        answer = await callGeminiModel(model);
        break;
      } catch (e) {
        lastError = e;
      }
    }
    
    if (!answer && lastError) {
       throw lastError;
    }

    return new Response(
      JSON.stringify(answer),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("AI Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
