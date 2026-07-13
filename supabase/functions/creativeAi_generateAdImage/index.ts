import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  try {
    const { businessName, adHeadline, adCopy, platform, objective, websiteDescription } = await req.json()
    const openAIKey = Deno.env.get("OPENAI_API_KEY")

    // Construct a highly visual conceptual prompt
    const shortDesc = (websiteDescription || '').substring(0, 150);
    const prompt = `A highly engaging, abstract, and conceptual 3D illustration representing: ${businessName} - ${shortDesc}.
Core Theme: ${adHeadline || 'Premium Services'}.
Style: Modern SaaS landing page aesthetic, futuristic tech vibe, glowing neon accents, 3D digital art, clean studio lighting.
Subjects: Floating 3D icons, blockchain or data nodes, digital screens, no generic people.
CRITICAL: Absolutely NO TEXT, NO ALPHABETS, NO WORDS, NO LETTERS, NO LOGOS.`

    if (!openAIKey) {
      console.warn("OPENAI_API_KEY is not set. Using free Pollinations AI fallback.")
      const encodedPrompt = encodeURIComponent(prompt)
      const randomSeed = Math.floor(Math.random() * 1000000)
      const freeImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}`
      
      return new Response(JSON.stringify({ 
        success: true, 
        imageUrl: freeImageUrl 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Call OpenAI DALL-E 3 API
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      })
    })

    if (!response.ok) {
      console.warn(`OpenAI request failed: ${response.status}. Returning placeholder image.`)
      return new Response(JSON.stringify({ 
        success: true, 
        imageUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1024&auto=format&fit=crop" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const data = await response.json()
    const imageUrl = data.data[0].url

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: imageUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})
