// Supabase Edge Function: seoAi_generateContent
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
    const { keyword, tone, contextData } = await req.json()

    if (!keyword) throw new Error("Keyword is required")

    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not set")

    const systemPrompt = `You are an expert SEO Content Writer.
Write a highly optimized, engaging blog post targeting the keyword: "${keyword}".
The tone should be: ${tone || 'Professional'}.
Context about the website: ${JSON.stringify(contextData || {})}.
If 'internal_links_to_include' is present in the context, you MUST try to naturally hyperlink at least 1-3 of those previous articles in your HTML content using the format: <a href="/blog/slug-here">Relevant Text</a>.

Respond ONLY with a JSON object containing EXACTLY this structure:
{
  "metaTitle": "string (50-60 characters)",
  "metaDescription": "string (150-160 characters)",
  "content": "string (The full blog post content formatted in beautiful Markdown. Use H1, H2, H3, bullet points, and bold text. Make it long and comprehensive, at least 500 words.)"
}`

    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
    }

    const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-001", "gemini-2.0-flash-lite-001", "gemini-flash-latest"];
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
    
    
    // Advanced Two-Step Fallback to Pollinations AI
    try {
        // Extract keyword
        const extractedKeyword = systemPrompt.match(/keyword: "(.*?)"/)?.[1] || "digital marketing";
        
        // 1. Get Meta Info (JSON)
        const metaPayload = {
            messages: [
                { role: "system", content: "You are an SEO expert. Respond ONLY with valid JSON containing EXACTLY keys: metaTitle (50-60 chars) and metaDescription (150-160 chars)." },
                { role: "user", content: "Based on this instruction, generate the meta title and description:\n" + systemPrompt }
            ],
            jsonMode: true, model: "openai"
        };
        const metaRes = await fetch("https://text.pollinations.ai/", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metaPayload)
        });
        const metaText = await metaRes.text();
        let jsonStr = metaText.replace(/\r\n/g, "").replace(/\n/g, "").replace(/```json/gi, "").replace(/```/g, "").trim();
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start !== -1 && end !== -1) jsonStr = jsonStr.substring(start, end + 1);
        let metaInfo = { metaTitle: "Blog Post: " + extractedKeyword, metaDescription: "Read our latest highly optimized blog post about " + extractedKeyword + "." };
        try {
            metaInfo = JSON.parse(jsonStr);
        } catch(e) {}

        // 2. Get Blog Content (No JSON mode, No JSON instructions!)
        const contentPayload = {
            messages: [
                { role: "system", content: "You are an expert SEO Content Writer." },
                { role: "user", content: `Write a highly optimized, engaging blog post targeting the keyword: "${extractedKeyword}".\nThe tone should be: Professional.\n\nRespond ONLY with the raw Markdown content. Do not output JSON. Do not include any reasoning, introduction, or comments. Just write the blog post using H1, H2, and bullet points. Make it comprehensive and long.` }
            ],
            jsonMode: false, model: "openai"
        };
        const contentRes = await fetch("https://text.pollinations.ai/", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contentPayload)
        });
        const blogContent = await contentRes.text();
        
        const finalParsed = {
            metaTitle: metaInfo.metaTitle || "Blog Post",
            metaDescription: metaInfo.metaDescription || "Read our latest blog post.",
            content: blogContent
        };
        
        return new Response(JSON.stringify(finalParsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (polliErr) {
        console.error("Pollinations fallback failed:", polliErr);
    }
    
    throw new Error(lastError?.message || "Failed to generate content");



  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
