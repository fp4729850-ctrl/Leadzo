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
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-001", "gemini-2.0-flash-lite-001", "gemini-flash-latest", "gemini-pro"];
    let lastError: any = null;
    
    // First try all Gemini models
    for (const model of models) {
      try {
        answer = await callGeminiModel(model);
        break;
      } catch (e) {
        lastError = e;
      }
    }
    
    // Fallback to OpenAI if Gemini is overloaded and OPENAI_API_KEY is available
    if (!answer) {
       const openaiKey = Deno.env.get("OPENAI_API_KEY");
       if (openaiKey) {
         try {
           const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
             method: "POST",
             headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
             body: JSON.stringify({
               model: "gpt-4o-mini",
               messages: [
                 { role: "system", content: systemPrompt },
                 { role: "user", content: userPrompt }
               ]
             })
           });
           if (openAiResponse.ok) {
             const openaiData = await openAiResponse.json();
             answer = openaiData.choices[0].message.content;
           }
         } catch (e) {
           console.error("OpenAI fallback failed", e);
         }
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
