const fs = require('fs');

const dirs = [
  'seoAi_crawlAndAudit',
  'seoAi_researchKeywords',
  'seoAi_generateContent',
  'seoAi_generatePublishPlan',
  'seoAi_generateMonitorReport'
];

for (const dir of dirs) {
  const path = `./supabase/functions/${dir}/index.ts`;
  let content = fs.readFileSync(path, 'utf-8');
  
  const pollinationsFallback = `
    // Fallback to Pollinations AI (Completely Free, No limits)
    try {
        const userText = payload.contents[0].parts.length > 1 ? payload.contents[0].parts[1].text : "Proceed with the request based on the system prompt.";
        const polliPayload = {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userText }
            ],
            jsonMode: true
        };
        const polliRes = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(polliPayload)
        });
        if (polliRes.ok) {
            const aiText = await polliRes.text();
            let jsonStr = aiText.replace(/\\r\\n/g, "").replace(/\\n/g, "").replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
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
`;

  content = content.replace(/throw new Error\(lastError\?\.message[^)]*\);/, pollinationsFallback);
  content = content.replace(/throw new Error\(\`Gemini API failed: \$\{lastError\?\.message\}\`\);/, pollinationsFallback);
  content = content.replace(/throw new Error\(\`Gemini API failed: \$\{lastError\}\`\);/, pollinationsFallback);
  fs.writeFileSync(path, content);
}
console.log("Updated all functions!");
