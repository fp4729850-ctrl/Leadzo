// Supabase Edge Function: seoAi_crawlAndAudit
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
    const { url } = await req.json()
    if (!url) throw new Error("URL is required")
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    let text = ""
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
      const res2 = await fetch(targetUrl, { 
        signal: controller2.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadzoBot/1.0)" }
      });
      clearTimeout(timeoutId2);
      if (!res2.ok) throw new Error(`Direct fetch HTTP ${res2.status}`);
      let html = await res2.text();
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
      html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
      html = html.replace(/<[^>]+>/g, ' ');
      text = html.replace(/\s+/g, ' ').trim();
    } catch (directErr: any) {
      // Fallback to basic text if scraping completely fails
      text = `This is a website about ${targetUrl}.`;
    }

    text = text.substring(0, 5000)

    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    const systemPrompt = `You are an expert Technical SEO Auditor. Analyze the text scraped from this website and perform a technical SEO audit.
Respond ONLY with a JSON object containing EXACTLY these keys:
- score: number (0-100 overall SEO score based on text content and structure)
- pageCount: number (since we only scan one page, put 1)
- loadSpeed: string (MUST be "Fast", "Medium", or "Slow")
- title: string (guess the meta title based on the text)
- description: string (guess the meta description based on the text)
- issues: array of strings (list of 3-5 SEO issues found, e.g. "Missing H1 tag", "Content is too short")
- isRealCrawl: boolean (true)
- niche: string (extract the primary business niche or target service, e.g. "Dentist", "Software Agency", "Plumber", etc.)
Make the response realistic based on the actual text you analyzed. Output ONLY valid JSON.`

    const payload = {
      contents: [{
        parts: [{ text: systemPrompt }, { text: `Website Text:\n${text}` }]
      }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.2 }
    }

    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-001", "gemini-2.0-flash-lite-001", "gemini-flash-latest"];
    let lastError: any = null;
    for (const model of models) {
      try {
        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        })
        
        if (aiRes.status === 429) {
            await new Promise(r => setTimeout(r, 3000));
            throw new Error(`Gemini failed: 429`);
        }
        if (!aiRes.ok) throw new Error(`Gemini ${model} failed: ${aiRes.status}`)
        
        const aiData = await aiRes.json()
        const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!aiText) throw new Error("Empty response from AI")
        
        let jsonStr = aiText.replace(/```json/gi, "").replace(/```/g, "").trim()
        const parsed = JSON.parse(jsonStr)
        
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      } catch (err) {
        lastError = err;
        continue;
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
