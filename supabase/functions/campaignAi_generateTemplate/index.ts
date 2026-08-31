const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded OpenAI API Key provided by user
const OPENAI_API_KEY = Deno.env.get('HERCULES_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, language, tone, websiteUrl, count = 3 } = await req.json();

    if (!prompt && !websiteUrl) {
      throw new Error("Either Prompt or Website URL is required");
    }

    let websiteContent = "";
    if (websiteUrl) {
      try {
        console.log(`Fetching website content from: ${websiteUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const jinaRes = await fetch(`https://r.jina.ai/${websiteUrl}`, {
          headers: { "Accept": "text/plain" },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (jinaRes.ok) {
          websiteContent = await jinaRes.text();
          // Limit to first 4,000 characters for GPT-4o context
          websiteContent = websiteContent.slice(0, 4000);
        }
      } catch (err) {
        console.error("Failed to fetch website content, skipping...", err);
      }
    }

    // Fetch Centralized AI Brain Knowledge
    let brainContext = "";
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.38.4");
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: brainData } = await supabase
            .from('business_knowledge')
            .select('company_name, business_details')
            .eq('user_id', user.id)
            .single();
          if (brainData) {
            brainContext = `Company Name: ${brainData.company_name}\nBusiness Details & Policies:\n${brainData.business_details}\n\n`;
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch brain context", err);
    }

    const systemPrompt = `You are an expert marketing copywriter. Write ${count} highly engaging WhatsApp promotional message templates.
    
${brainContext ? `CENTRAL AI BRAIN KNOWLEDGE (Use this to understand the business):\n${brainContext}` : ""}
    
Language: ${language} (If hinglish, use a mix of Hindi and English words written in English alphabet)
Tone: ${tone}

The user's campaign goal is: "${prompt || 'Analyze the provided website content and write a highly persuasive promotional message to attract customers and promote the business.'}"

${websiteContent ? `CRITICAL INSTRUCTION: Here is the user's website content. You MUST read it carefully and explain exactly what services, products, features, or prices are available on this website. Make the message specific to the website's actual content!\n\n--- WEBSITE CONTENT START ---\n${websiteContent}\n--- WEBSITE CONTENT END ---\n\n` : ""}

Rules:
1. Messages MUST be very clean, elegant, and professional. Avoid clutter and too many emojis ("gich gich wala nahi").
2. The message MUST be detailed, comprehensive, and LONG. It should be at least 15 lines minimum. Do not write short messages.
3. Use clear line breaks and white space to make it easy to read.
4. Make it highly persuasive but polite and direct. Explain the value proposition clearly based on the website.
${websiteUrl ? `5. At the very end of the message, you MUST include this exact link for the user to visit: ${websiteUrl}` : `5. Include placeholders like [Name] or [Link] where appropriate.`}
6. Output ONLY a valid JSON array of strings, where each string is a template. DO NOT wrap in markdown \`\`\`json or output anything else.`;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
      })
    });

    const openAiData = await openAiResponse.json();

    if (!openAiResponse.ok || !openAiData.choices || !openAiData.choices.length) {
      console.error("OpenAI Error:", openAiData);
      throw new Error(openAiData.error?.message || "Failed to generate from OpenAI");
    }

    let templatesText = openAiData.choices[0].message.content.trim();
    
    // Clean markdown if GPT accidentally added it
    if (templatesText.startsWith("```json")) {
      templatesText = templatesText.replace(/^```json\n/, "").replace(/\n```$/, "");
    }
    
    let templates = [];
    try {
      templates = JSON.parse(templatesText);
    } catch (e) {
      console.error("Failed to parse JSON, falling back to array string", e);
      templates = [templatesText];
    }

    return new Response(JSON.stringify(templates), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating template:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
