import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { url } = await req.json()
    if (!url) throw new Error("URL is required")

    // Fetch the website HTML
    let html = ""
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      html = await res.text()
    } catch (e: any) {
      throw new Error(`Failed to fetch website: ${e.message}`)
    }

    // Very basic text extraction (strip script, style, and html tags)
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    text = text.replace(/<[^>]+>/g, ' ')
    text = text.replace(/\s+/g, ' ').trim()
    
    // Truncate to first 5000 characters to save tokens/avoid limits
    text = text.substring(0, 5000)

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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      })
      if (!response.ok) throw new Error("Gemini request failed")
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
      try { result = await callGemini() } catch { if (openAIKey) result = await callOpenAI() }
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

    // Ensure it's valid JSON and wrap in success
    const parsedResult = JSON.parse(result)
    parsedResult.success = true
    parsedResult.destinationUrl = url

    return new Response(JSON.stringify(parsedResult), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    })
  }
})
