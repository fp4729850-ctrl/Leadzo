// Supabase Edge Function: seoAi_generatePublishPlan
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
    const { url, niche, keywords } = await req.json()
    
    if (!url || !niche) {
      throw new Error("Missing url or niche for publishing plan")
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not set")

    const systemPrompt = `You are an expert SEO Content Strategist.
Create a 3-month SEO publishing calendar for the website ${url} in the ${niche} niche.
Use these target keywords: ${keywords?.join(", ")}.
Respond ONLY with a JSON object containing EXACTLY this structure:
{
  "weeks": [
    {
      "week": "Week 1",
      "task": "Title/Topic of the content",
      "type": "Blog Post | Landing Page | Social Media",
      "keywords": ["keyword1", "keyword2"],
      "priority": "High | Medium | Low"
    }
  ]
}
Generate exactly 4-6 weeks of content ideas.`

    const payload = {
      contents: [{
        parts: [
          { text: systemPrompt },
          { text: "Generate the plan now." }
        ]
      }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.6 }
    }

    // Using multiple models to bypass rate limits!
    const models = [
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash", 
      "gemini-1.5-flash", 
      "gemini-1.5-pro", 
      "gemini-flash-latest"
    ];
    let lastError: any = null;
    
    for (const model of models) {
        try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            })
            
            if (aiRes.status === 429) {
                await new Promise(r => setTimeout(r, 2000));
                throw new Error(`Gemini failed: 429`);
            }
            if (!aiRes.ok) throw new Error(`Gemini failed: ${aiRes.status}`)
            
            const aiData = await aiRes.json()
            const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text
            if (!aiText) throw new Error("Empty response from AI")
            
            const parsed = JSON.parse(aiText.replace(/```json/gi, "").replace(/```/g, "").trim())
            
            return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        } catch (err) {
            lastError = err;
        }
    }
    
    
    console.error("All AI models failed:", lastError?.message);
    console.log("Falling back to Pollinations AI...");
    
    try {
        const fallbackPayload = {
            messages: [
                { role: "system", content: "You are an expert SEO Content Strategist. Respond ONLY with valid JSON." },
                { role: "user", content: systemPrompt }
            ],
            jsonMode: true,
            model: "openai"
        };
        
        const fallbackRes = await fetch("https://text.pollinations.ai/", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fallbackPayload)
        });
        
        const fallbackText = await fallbackRes.text();
        let jsonStr = fallbackText.replace(/\r\n/g, "").replace(/\n/g, "").replace(/```json/gi, "").replace(/```/g, "").trim();
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start !== -1 && end !== -1) jsonStr = jsonStr.substring(start, end + 1);
        
        const parsed = JSON.parse(jsonStr);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (fallbackErr) {
        console.error("Pollinations fallback also failed:", fallbackErr);
        
        // If everything fails, check if original error was rate limit
        if (lastError?.message?.includes("429") || lastError?.message?.includes("quota")) {
          return new Response(JSON.stringify({ error: "Google Gemini API Daily Limit Reached! Please try again tomorrow or upgrade your API key." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        return new Response(JSON.stringify({ error: lastError?.message || "All AI models failed." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
