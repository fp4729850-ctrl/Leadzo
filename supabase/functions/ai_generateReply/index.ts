// Supabase Edge Function: ai_generateReply
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { messageContext, leadName } = await req.json()
    const openAIKey = Deno.env.get("OPENAI_API_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    const systemPrompt = `You are an AI sales agent assisting ${leadName || 'a customer'}. Generate a professional, short reply (max 2 sentences) to the message context.`
    const userPrompt = messageContext || "Hi"

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
            { role: "user", content: userPrompt }
          ]
        })
      })
      if (!response.ok) throw new Error("OpenAI request failed")
      const data = await response.json()
      return data.choices[0].message.content
    }

    const callGemini = async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }]
        })
      })
      if (!response.ok) throw new Error("Gemini request failed")
      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    }

    let reply = ""

    if (openAIKey && geminiKey) {
      // Alternate
      if (Math.random() > 0.5) {
        try { reply = await callOpenAI() } catch { reply = await callGemini() }
      } else {
        try { reply = await callGemini() } catch { reply = await callOpenAI() }
      }
    } else if (openAIKey) {
      reply = await callOpenAI()
    } else if (geminiKey) {
      reply = await callGemini()
    } else {
      // Mock Fallback
      const mockReplies = [
        `Thanks for reaching out, ${leadName || 'there'}! I'd love to share our pricing details. Can we hop on a quick call?`,
        `Hi ${leadName || 'there'}, yes, our automation agent is compatible with Supabase. Let me send over the integration doc.`,
        `Got your message! Let me check availability for a demo and get back to you shortly.`
      ]
      reply = mockReplies[Math.floor(Math.random() * mockReplies.length)]
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
