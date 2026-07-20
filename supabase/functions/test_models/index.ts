// Supabase Edge Function: test_models
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`)
    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
