

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, language, tone, websiteUrl, count = 3 } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    let websiteContent = "";
    if (websiteUrl) {
      try {
        console.log(`Fetching website content from: ${websiteUrl}`);
        const jinaRes = await fetch(`https://r.jina.ai/${websiteUrl}`, {
          headers: {
            "Accept": "text/plain",
          }
        });
        if (jinaRes.ok) {
          websiteContent = await jinaRes.text();
          // Limit to first 10,000 characters to avoid huge prompts
          websiteContent = websiteContent.slice(0, 10000);
        }
      } catch (err) {
        console.error("Failed to fetch website content", err);
      }
    }

    const systemPrompt = `You are an expert marketing copywriter. Write ${count} highly engaging WhatsApp promotional message templates.
    
Language: ${language} (If hinglish, use a mix of Hindi and English words written in English alphabet)
Tone: ${tone}

The user's campaign goal is: "${prompt}"

${websiteContent ? `Here is the user's website content that you must use to understand their business and extract key offerings/benefits to include in the message:\n\n${websiteContent}\n\n` : ""}

Rules:
1. Messages MUST be very clean, elegant, and professional. Avoid clutter and too many emojis ("gich gich wala nahi").
2. The message MUST be detailed, comprehensive, and LONG. It should be at least 15 lines minimum. Do not write short messages.
3. Use clear line breaks and white space to make it easy to read.
4. Make it highly persuasive but polite and direct. Explain the value proposition clearly.
${websiteUrl ? `5. At the very end of the message, you MUST include this exact link for the user to visit: ${websiteUrl}` : `5. Include placeholders like [Name] or [Link] where appropriate.`}
6. Output ONLY a valid JSON array of strings, where each string is a template. DO NOT wrap in markdown \`\`\`json or output anything else.`;

    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("HERCULES_API_KEY");
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      }
    };

    const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite-001", "gemini-flash-latest"];
    let geminiData = null;
    let lastError = null;

    for (const model of models) {
        try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
            
            if (geminiRes.status === 429) {
                lastError = "429 Quota Exceeded";
                continue;
            }
            if (!geminiRes.ok) {
                lastError = `${geminiRes.status} Error`;
                continue;
            }
            
            geminiData = await geminiRes.json();
            if (geminiData.error) {
                lastError = geminiData.error.message;
                continue;
            }
            
            // Success!
            break;
        } catch (e) {
            lastError = e.message;
        }
    }

    if (!geminiData || geminiData.error || !geminiData.candidates) {
      // Fallback to Pollinations AI
      console.log("Gemini failed, falling back to Pollinations AI");
      try {
        const polliPayload = {
          messages: [
            { role: "system", content: `You are an expert marketing copywriter. You must respond ONLY with a valid JSON array of strings, where each string is a promotional template message. DO NOT wrap in markdown. Messages MUST be extremely clean, professional, and elegant. The message MUST be detailed, comprehensive, and LONG (at least 15 lines minimum).${websiteUrl ? ` At the very end of the message, you MUST include this exact link for the user to visit: ${websiteUrl}` : ''}` },
            { role: "user", content: systemPrompt }
          ],
          jsonMode: true,
          model: "openai"
        };
        const polliRes = await fetch("https://text.pollinations.ai/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(polliPayload)
        });
        const polliText = await polliRes.text();
        
        let jsonStr = polliText.replace(/\r\n/g, "").replace(/\n/g, "").replace(/```json/gi, "").replace(/```/g, "").trim();
        const start = jsonStr.indexOf("[");
        const end = jsonStr.lastIndexOf("]");
        if (start !== -1 && end !== -1) jsonStr = jsonStr.substring(start, end + 1);
        
        let templates = [];
        try {
          templates = JSON.parse(jsonStr);
        } catch(e) {
          templates = [jsonStr];
        }
        
        return new Response(JSON.stringify(templates), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (polliErr) {
        console.error("Pollinations fallback failed:", polliErr);
      }
      
      throw new Error(`All AI models failed. Last error: ${lastError}`);
    }

    let templatesText = geminiData.candidates[0].content.parts[0].text;
    
    // Parse the JSON array
    let templates = [];
    try {
      templates = JSON.parse(templatesText);
    } catch (e) {
      // Fallback if not strict JSON
      templates = [templatesText];
    }

    return new Response(JSON.stringify(templates), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error generating template:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
