// Supabase Edge Function: crmAi_generateSequence
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { prompt } = await req.json()
    const openAIKey = Deno.env.get("OPENAI_API_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    const systemPrompt = "You are a CRM expert. Create a sequence of 3 message steps based on the user's prompt. Respond ONLY with a JSON array: [{ step: number, delay: string, channel: string, template: string }]"
    const userPrompt = prompt || "Create a general follow-up sequence."

    const callOpenAI = async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" }, // We expect array, but OpenAI JSON mode usually requires object. Let's use standard mode or ask for object with { steps: [...] }
          messages: [
            { role: "system", content: "You are a CRM expert. Create a sequence of 3 message steps based on the user's prompt. Respond ONLY with a JSON object: { \"steps\": [{ \"step\": number, \"delay\": string, \"channel\": string, \"template\": string }] }" },
            { role: "user", content: userPrompt }
          ]
        })
      })
      if (!response.ok) throw new Error("OpenAI request failed")
      const data = await response.json()
      const parsed = JSON.parse(data.choices[0].message.content)
      return parsed.steps || parsed
    }

    const callGemini = async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are a CRM expert. Create a sequence of 3 message steps based on the user's prompt. Respond ONLY with a JSON object: { \"steps\": [{ \"step\": number, \"delay\": string, \"channel\": string, \"template\": string }] }" }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      })
      if (!response.ok) throw new Error("Gemini request failed")
      const data = await response.json()
      const parsed = JSON.parse(data.candidates[0].content.parts[0].text)
      return parsed.steps || parsed
    }

    let sequenceSteps: any = null

    if (openAIKey && geminiKey) {
      if (Math.random() > 0.5) {
        try { sequenceSteps = await callOpenAI() } catch { sequenceSteps = await callGemini() }
      } else {
        try { sequenceSteps = await callGemini() } catch { sequenceSteps = await callOpenAI() }
      }
    } else if (openAIKey) {
      sequenceSteps = await callOpenAI()
    } else if (geminiKey) {
      sequenceSteps = await callGemini()
    }

    if (!sequenceSteps || !Array.isArray(sequenceSteps)) {
      // Mock Sequence Fallback
      sequenceSteps = [
        {
          step: 1,
          delay: "1 hour",
          channel: "WhatsApp",
          template: `Hello, thanks for expressing interest in our services. Here is a brief introductory deck: [link]`
        },
        {
          step: 2,
          delay: "1 day",
          channel: "Email",
          template: `Hi there,\n\nI wanted to follow up on my previous message. Are you free for a 10 minute call tomorrow at 3 PM?\n\nBest,\nSales Team`
        },
        {
          step: 3,
          delay: "3 days",
          channel: "WhatsApp",
          template: `Hey! Just wanted to share a quick case study of how we helped a similar startup double their sales. Let me know if you are interested!`
        }
      ]
    }

    return new Response(JSON.stringify({
      steps: sequenceSteps,
      promptUsed: prompt
    }), { headers: { "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
