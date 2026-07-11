// Supabase Edge Function: ai_generateReply
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { messageContext, leadName } = await req.json()
    const apiKey = Deno.env.get("OPENAI_API_KEY")

    if (apiKey) {
      // If a real OpenAI Key is configured, make a request
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are an AI sales agent assisting ${leadName || 'a customer'}. Generate a professional, short reply (max 2 sentences) to the message context.` },
            { role: "user", content: messageContext || "Hi" }
          ]
        })
      })
      const data = await response.json()
      return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    // Mock Fallback
    const mockReplies = [
      `Thanks for reaching out, ${leadName || 'there'}! I'd love to share our pricing details. Can we hop on a quick call?`,
      `Hi ${leadName || 'there'}, yes, our automation agent is compatible with Supabase. Let me send over the integration doc.`,
      `Got your message! Let me check availability for a demo and get back to you shortly.`
    ]
    const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)]

    return new Response(JSON.stringify({ reply: randomReply }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
