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
    const { templateType, language } = await req.json()
    const openAIKey = Deno.env.get("OPENAI_API_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    if (!templateType) {
      throw new Error("templateType is required.")
    }

    const systemPrompt = `You are an expert AI conversation designer for an automated calling system. 
Generate a short, natural, and polite phone script for a '${templateType}' call.
The script must be in ${language || 'English'}, but keep the variable names exactly as {name}, {amount}, and {due_date}.
Limit the response to 2-3 sentences. Return ONLY the raw text script, no quotes, no markdown.`

    const callGemini = async () => {
      const model = "gemini-3.5-flash"
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: `Generate a script for: ${templateType} in language: ${language}` }] }],
        })
      })
      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    }

    const callOpenAI = async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate a script for: ${templateType} in language: ${language}` }
          ]
        })
      })
      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      return data.choices[0].message.content
    }

    let generatedScript = ""
    try {
      if (geminiKey) generatedScript = await callGemini()
      else if (openAIKey) generatedScript = await callOpenAI()
      else throw new Error("No AI keys configured")
    } catch (e: any) {
      console.warn("Gemini failed, trying OpenAI:", e.message)
      if (openAIKey) {
        generatedScript = await callOpenAI()
      } else {
        throw new Error(`AI generation failed: ${e.message}`)
      }
    }

    // Clean up response if AI added quotes
    generatedScript = generatedScript.replace(/^["']|["']$/g, '').trim()

    return new Response(JSON.stringify({ script: generatedScript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: any) {
    console.error("Generate Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
