import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) throw new Error("Missing URL parameter");

    // 1. Fetch website content
    let rawHtml = "";
    try {
        const response = await fetch(url);
        rawHtml = await response.text();
    } catch(e) {
        throw new Error("Failed to fetch the provided URL.");
    }

    // 2. Extract basic text (very naive extraction for demo)
    // Strip scripts and styles
    let textContent = rawHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ') // Strip HTML tags
        .replace(/\s+/g, ' ') // Compress whitespace
        .trim()
        .substring(0, 4000); // Limit to 4k chars to save tokens

    // 3. Call OpenAI (or mock if no key)
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    
    let generatedTemplate = {
        title: "Limited Time Offer",
        description: "Check out our latest products and deals on our website. Grab them before they run out!",
        suggestions: [{ text: "Visit Website", actionUrl: url, postbackData: "visit_site" }]
    };

    if (openAiKey) {
        const prompt = `
            Analyze the following text scraped from a website (${url}) and create a short promotional RCS message template for it.
            Return ONLY a valid JSON object matching this schema:
            {
                "title": "Short catchy title (max 30 chars)",
                "description": "Engaging description of the website/product (max 120 chars)",
                "suggestions": [
                    { "text": "Action button text (max 20 chars)", "actionUrl": "${url}", "postbackData": "action_1" }
                ]
            }
            Text: ${textContent}
        `;

        const openAiRes = await fetch(`${Deno.env.get("OMNIROUTE_URL") || "https://api.openai.com/v1"}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        if (openAiRes.ok) {
            const aiData = await openAiRes.json();
            try {
                const aiResultText = aiData.choices[0].message.content;
                generatedTemplate = JSON.parse(aiResultText);
            } catch (e) {
                console.error("Failed to parse AI JSON response", e);
            }
        } else {
            console.error("OpenAI Error:", await openAiRes.text());
        }
    } else {
        // If no API key, we simulate a small delay to make it feel like AI is thinking
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to find a title tag for a slightly better mock
        const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            generatedTemplate.title = titleMatch[1].substring(0, 30).trim();
            generatedTemplate.description = "Discover amazing deals and information on " + generatedTemplate.title + ". Click below to explore!";
        }
    }

    return new Response(JSON.stringify({ success: true, data: generatedTemplate }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
    })
  }
})
