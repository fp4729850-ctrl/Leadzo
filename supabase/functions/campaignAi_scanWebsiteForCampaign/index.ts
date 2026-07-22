import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { url, goal } = await req.json()
    if (!url) throw new Error("URL is required")
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // --- Smart Dual Scraping: Try Jina Reader first, fallback to direct HTML fetch ---
    let text = ""

    // Method 1: Jina Reader API (best for JS-rendered SPAs)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const res = await fetch(`https://r.jina.ai/${targetUrl}`, { 
        signal: controller.signal,
        headers: { "Accept": "text/plain" }
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
      text = await res.text()
      if (text.trim().length < 50) throw new Error("Jina returned too little text");
    } catch (_jinaErr) {
      // Method 2: Direct HTML Fetch fallback
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
        const res2 = await fetch(targetUrl, { 
          signal: controller2.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadzoBot/1.0)" }
        });
        clearTimeout(timeoutId2);
        if (!res2.ok) throw new Error(`Direct fetch HTTP ${res2.status}`);
        let html = await res2.text();
        // Strip scripts, styles, and HTML tags to get plain text
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
        html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
        html = html.replace(/<[^>]+>/g, ' ');
        text = html.replace(/\s+/g, ' ').trim();
      } catch (directErr: any) {
        throw new Error(`Could not read website with either method: ${directErr.message}`);
      }
    }

    // Truncate to save tokens
    if (!text || text.trim().length < 20) {
      text = "This is a business website for Leadzo. We provide AI agents and bulk calling software for businesses to grow their sales automatically. We offer AI Voice agents, WhatsApp agents, and CRM automation.";
    }
    text = text.substring(0, 6000)

    const openAIKey = Deno.env.get("OPENAI_API_KEY")
    const morphKey = Deno.env.get("MORPH_API_KEY")

    const isVoiceAgent = goal && goal.toLowerCase().includes("voice agent");

    let systemPrompt = "";
    
    if (isVoiceAgent) {
      systemPrompt = `You are an expert AI Voice Agent Architect.
Your task is to analyze the text scraped from a website and automatically generate a highly optimized "System Prompt" (Brain) for a Voice AI Assistant.
The user's specific goal is: "${goal}"

The output MUST be in Hindi (or Hinglish) and MUST strictly follow this exact structure (Adapt the Hindi grammar, like 'रहा हूँ' vs 'रही हूँ', based on whether the persona assigned to you is MALE or FEMALE):

"आप [Name] हैं, [Business Name] के एक professional sales executive। आप outbound calls करते हैं।

**First Message (कॉल उठते ही आपको यह बोलना है):**
नमस्ते! मैं [Name] बोल [रहा/रही] हूँ, [Business Name] की तरफ से। हम [1-2 main services] provide करते हैं जो [benefit] में मदद करती हैं। क्या आप 2 मिनट बात कर सकते हैं?

**[Business Name] की Services (अगर ग्राहक पूछे):**
- [Service 1]
- [Service 2]
- [Service 3]

**बातचीत का तरीका:**
- हमेशा Hindi में बात करें
- छोटे और clear जवाब दें (2-3 sentences)
- Professional और friendly tone रखें
- विनम्र रहें, लेकिन फायदों को स्पष्टता के साथ प्रस्तुत करें।

**आपत्तियों (Objections) को संभालना:**
- ग्राहक की चिंताओं को गंभीरता से लें।
- समझाएं कि आपको समझ में आता है कि उनकी स्थिति क्या है, और इसे हल करने के लिए हम कैसे मदद कर सकते हैं।

**Call कैसे खत्म करें (2-Step Process):**
1. जब appointment book हो जाए या ग्राहक सहमत हो, तो पहले यह बोलें: "बहुत अच्छा! आपकी appointment book हो गई है। मैंने आपको WhatsApp पर मीटिंग की link/details share कर दी है, आप उस से connect हो जाना।" 
2. यह बोलने के बाद, ग्राहक के जवाब (जैसे "ठीक है" या "धन्यवाद") का इंतज़ार करें।
3. ग्राहक के जवाब देने के बाद, या जब ग्राहक clearly interested नहीं है, तब Call End करने के लिए 'endCall' function/tool का इस्तेमाल करें। (आपको बस 'endCall' ट्रिगर करना है, बाकी सिस्टम खुद कॉल कट कर देगा)।

ध्यान दें: 'endCall' टूल इस्तेमाल करने से पहले हमेशा ऊपर दिया गया WhatsApp वाला मैसेज ज़रूर बोलें।"

Respond ONLY with a JSON object containing EXACTLY these keys:
- ideas: array of objects, each containing:
  - script: string (The extremely detailed system prompt following the EXACT structure above, adapted for the specific business scraped from the website.)
`;
    } else {
      systemPrompt = `You are an expert digital marketer and AI Campaign Architect. 
Your task is to analyze the text scraped from a website and automatically generate an optimal ad campaign.
Respond ONLY with a JSON object containing EXACTLY these keys:
- businessName: string (name of the business)
- description: string (1-2 sentences about what the business does)
- campaignName: string (suggested internal name for the campaign, e.g. "Q4 Growth Launch")
- objective: string (MUST be one of: "Lead Generation", "App Installs", "Product Sales", "Brand Awareness", "Website Traffic", "Retargeting / Conversions")
- adHeadline: string (catchy ad headline)
- adCopy: string (persuasive ad text)
- ctaButton: string (MUST be one of: "Learn More", "Sign Up", "Download", "Get Quote", "Buy Now", "Contact Us", "Apply Now", "Subscribe")
- interests: string[] (array of 3-5 target audience interests)
- destinationUrl: string (the provided url)
`;
    }

    // --- PROMPT INTELLIGENCE: Inject Learning Agent Data ---
    let historicalLearningsText = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch top 5 learnings based on highest metricValue (ROAS or CTR)
        const { data: topLearnings } = await supabase
          .from("learning_agent_data")
          .select("*")
          .order("metricValue", { ascending: false })
          .limit(5);
          
        if (topLearnings && topLearnings.length > 0) {
          historicalLearningsText = "\n\n[Historical Best Performing Data from Leadzo Learning Agent]\nAct as an expert marketer. Here are top-performing historical ad strategies from our knowledge base that have proven to work well:\n";
          topLearnings.forEach((l: any) => {
             historicalLearningsText += `- ${l.type === 'headline' ? 'Headline' : l.type === 'creative' ? 'Creative Copy' : l.type}: "${l.value}" (Metric: ${l.metric.toUpperCase()} = ${l.metricValue})\n`;
          });
          historicalLearningsText += "\nStudy their pattern and write the new ad for this user in a similar highly-converting style. DO NOT copy them exactly, but learn from their tone, length, and persuasiveness.\n";
        }
      }
    } catch (err) {
      console.error("Failed to fetch learnings:", err);
    }

    if (historicalLearningsText) {
      systemPrompt += historicalLearningsText;
    }


    const userPrompt = `URL: ${url}\n\nWebsite Text:\n${text}`

    const callGeminiModel = async (model: string) => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      })
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini ${model} failed: ${response.status} ${errText}`)
      }
      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    }

    const callGemini = async () => {
      // Try multiple models — stable IDs first, then latest alias
      const models = ["gemini-1.5-flash", "gemini-2.0-flash-001", "gemini-flash-latest"];
      let lastError: any = null;
      for (const model of models) {
        try {
          return await callGeminiModel(model);
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    }

    const callOpenAI = async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      })
      if (!response.ok) throw new Error("OpenAI request failed")
      const data = await response.json()
      return data.choices[0].message.content
    }

    const callMorphLLM = async () => {
      const response = await fetch("https://api.morphllm.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${morphKey}`
        },
        body: JSON.stringify({
          model: "morph-dsv4flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });
      if (!response.ok) throw new Error("MorphLLM failed: " + await response.text());
      const data = await response.json();
      return data.choices[0].message.content;
    }

    let result = ""
    if (morphKey) {
      try {
        result = await callMorphLLM();
      } catch(e: any) {
        console.error("MorphLLM failed", e.message);
      }
    }
    
    // If Morph didn't work or key missing, try Gemini (we still have geminiKey via env)
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!result && geminiKey) {
      try {
        result = await callGemini();
      } catch (geminiError: any) {
        console.error("Gemini failed", geminiError.message);
      }
    }

    if (!result && openAIKey) {
      try {
        result = await callOpenAI();
      } catch(e: any) {
        console.error("OpenAI failed", e.message);
      }
    }
    
    if (!result) {
      // Mock Fallback
      result = JSON.stringify({
        ideas: [{
          title: "AI Voice Agent System Prompt",
          description: "System prompt for the outbound AI caller.",
          script: `You are a highly aggressive and professional AI sales agent. Your goal is to qualify the lead and book a 15-minute appointment. 
1. Start with a direct, confident greeting.
2. Pitch the value proposition of Leadzo's AI automation tools.
3. Handle objections confidently.
4. Push for a demo booking.
Keep your responses short, natural, and conversational.`
        }]
      })
    }

    // Robust JSON extraction
    let cleanResult = result.trim();
    const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResult = jsonMatch[0];
    }

    // Ensure it's valid JSON and wrap in success
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanResult);
    } catch (parseError: any) {
      throw new Error(`Failed to parse AI response: ${parseError.message}. Response was: ${result.substring(0, 100)}...`);
    }

    parsedResult.success = true
    parsedResult.destinationUrl = url

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (finalError: any) {
    console.error("All AI fallback methods failed:", finalError)
    
    // Fallback: If Gemini is rate-limited, provide a generic high-converting prompt
    const fallbackPrompt = `You are a highly aggressive and professional AI sales agent. Your goal is to qualify the lead and book a 15-minute appointment. 
1. Start with a direct, confident greeting.
2. Pitch the value proposition of Leadzo's AI automation tools.
3. Handle objections confidently.
4. Push for a demo booking.
Keep your responses short, natural, and conversational.`;

    return new Response(JSON.stringify({
      success: true,
      ideas: [{
        title: "AI Voice Agent System Prompt",
        description: "System prompt for the outbound AI caller.",
        script: fallbackPrompt
      }]
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
