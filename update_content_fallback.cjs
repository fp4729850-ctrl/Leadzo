const fs = require('fs');

const path = './supabase/functions/seoAi_generateContent/index.ts';
let content = fs.readFileSync(path, 'utf-8');

const newFallback = `
    // Advanced Two-Step Fallback to Pollinations AI
    try {
        // 1. Get Meta Info (JSON)
        const metaPayload = {
            messages: [
                { role: "system", content: "You are an SEO expert. Respond ONLY with valid JSON containing EXACTLY keys: metaTitle (50-60 chars) and metaDescription (150-160 chars)." },
                { role: "user", content: "Based on this instruction, generate the meta title and description:\\n" + systemPrompt }
            ],
            jsonMode: true, model: "openai"
        };
        const metaRes = await fetch("https://text.pollinations.ai/", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metaPayload)
        });
        const metaText = await metaRes.text();
        let jsonStr = metaText.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start !== -1 && end !== -1) jsonStr = jsonStr.substring(start, end + 1);
        let metaInfo = { metaTitle: "Blog Post", metaDescription: "Read our latest blog post." };
        try {
            metaInfo = JSON.parse(jsonStr);
        } catch(e) {}

        // 2. Get Blog Content (No JSON mode!)
        const contentPayload = {
            messages: [
                { role: "system", content: "You are an expert SEO Content Writer. Respond ONLY with the raw Markdown content. Do not output JSON. Do not include any reasoning or introductory text." },
                { role: "user", content: "Write a comprehensive, long-form blog post (500+ words) using H1, H2, and bullet points, based on these instructions:\\n" + systemPrompt }
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
    
    throw new Error(lastError?.message || "All AI models failed, including fallback.");
`;

const replaceRegex = /throw new Error\(lastError\?\.message[^)]*\);/;
content = content.replace(replaceRegex, newFallback);
fs.writeFileSync(path, content);
console.log("Updated fallback in generateContent!");
