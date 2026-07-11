// Supabase Edge Function: crmAi_generateSequence
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { prompt } = await req.json()
    const apiKey = Deno.env.get("OPENAI_API_KEY")

    if (apiKey) {
      // Logic for LLM based sequence generation goes here...
    }

    // Mock Sequence Fallback
    const sequenceSteps = [
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

    return new Response(JSON.stringify({
      steps: sequenceSteps,
      promptUsed: prompt
    }), { headers: { "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
