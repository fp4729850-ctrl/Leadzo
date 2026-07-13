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
    text = text.substring(0, 6000)

    const openAIKey = Deno.env.get("OPENAI_API_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    const systemPrompt = `You are an expert digital marketer and AI Campaign Architect. 
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
`

    const userPrompt = `URL: ${url}\n\nWebsite Text:\n${text}`

    const callGemini = async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`, {
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
        throw new Error(`Gemini request failed: ${response.status} ${errText}`)
      }
      const data = await response.json()
      return data.candidates[0].content.parts[0].text
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

    let result = ""
    if (geminiKey) {
      try { 
        result = await callGemini() 
      } catch (geminiError: any) { 
        if (openAIKey) {
          result = await callOpenAI() 
        } else {
          throw new Error(`Gemini API failed: ${geminiError.message}`)
        }
      }
    } else if (openAIKey) {
      result = await callOpenAI()
    } else {
      // Mock Fallback
      result = JSON.stringify({
        businessName: "Leadzo AI",
        description: "An automated lead generation and CRM platform.",
        campaignName: "Leadzo Automated Outreach",
        objective: "Lead Generation",
        adHeadline: "Automate Your Lead Generation with Leadzo",
        adCopy: "Stop manually finding leads. Let our AI handle your outreach on Facebook, Google, and WhatsApp. Start your free trial today.",
        ctaButton: "Learn More",
        interests: ["Marketing Automation", "B2B Sales", "Artificial Intelligence", "Lead Generation"],
        destinationUrl: url
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
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})
