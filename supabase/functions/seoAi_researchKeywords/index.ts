// Supabase Edge Function: seoAi_researchKeywords
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
    const { url, niche } = await req.json()

    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not set")

    const systemPrompt = `You are an expert SEO Strategist and Keyword Researcher.
The user wants to rank their website (${url || 'Unknown URL'}) in the niche of "${niche || 'General Business'}".
Generate a highly targeted and realistic keyword research report.
Respond ONLY with a JSON object containing EXACTLY this structure:
{
  "isReal": true,
  "clusters": [
    {
      "name": "string (e.g. Core Service Keywords)",
      "keywords": [
        {
          "term": "string (the keyword)",
          "volume": "string (e.g. 10K - 100K)",
          "difficulty": "Low" | "Medium" | "High",
          "intent": "Informational" | "Commercial" | "Transactional" | "Navigational",
          "cpc": "$1.50"
        }
      ]
    }
  ]
}
Generate exactly 3 clusters, each with exactly 4 keywords that are highly relevant to the niche.`

    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.5 }
    }

    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-001", "gemini-2.0-flash-lite-001", "gemini-flash-latest"];
    let lastError: any = null;
    
    for (const model of models) {
        try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            })
            
            if (aiRes.status === 429) {
                // Rate limited. Wait 3 seconds and try the next model.
                await new Promise(r => setTimeout(r, 3000));
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
    
    
    // Fallback to Pollinations AI (Completely Free, No limits)
    try {
        const userText = payload.contents[0].parts.length > 1 ? payload.contents[0].parts[1].text : "Proceed with the request based on the system prompt.";
        const polliPayload = {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userText }
            ],
            jsonMode: true, model: "openai"
        };
        const polliRes = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(polliPayload)
        });
        if (polliRes.ok) {
            const aiText = await polliRes.text();
            let jsonStr = aiText.replace(/\r\n/g, "").replace(/\n/g, "").replace(/```json/gi, "").replace(/```/g, "").trim();
            const start = jsonStr.indexOf("{");
            const end = jsonStr.lastIndexOf("}");
            if (start !== -1 && end !== -1) {
                jsonStr = jsonStr.substring(start, end + 1);
            }
            const parsed = JSON.parse(jsonStr);
            return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    } catch (polliErr) {
        console.error("Pollinations fallback failed:", polliErr);
    }
    
    throw new Error(lastError?.message || "All AI models failed, including fallback.");


  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
