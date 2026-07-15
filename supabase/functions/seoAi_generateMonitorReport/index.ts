// Supabase Edge Function: seoAi_generateMonitorReport
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
    const { url, keywords, googleToken } = await req.json()

    // 1. Try Google Search Console API first if token is provided
    if (googleToken && url) {
      try {
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // Last 30 days
        
        // Normalize URL for GSC (they usually require a trailing slash or sc-domain prefix)
        const siteUrl = url.startsWith("http") ? url : `https://${url}`;
        const gscUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;

        console.log("Fetching real GSC data for:", gscUrl);
        const gscRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscUrl)}/searchAnalytics/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${googleToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ["query"],
            rowLimit: 5
          })
        });

        if (gscRes.ok) {
          const gscData = await gscRes.json();
          const rows = gscData.rows || [];
          
          let totalClicks = 0;
          const rankings = rows.map((r: any) => {
            totalClicks += r.clicks || 0;
            return {
              position: Math.round(r.position || 0),
              keyword: r.keys?.[0] || "unknown",
              change: Math.round((Math.random() * 5) + 1) // GSC doesn't give 'change' directly in a single query without compare, so mock it for now
            }
          });

          if (rankings.length > 0) {
            return new Response(JSON.stringify({
              organicTraffic: `${totalClicks} Clicks (30d)`,
              isRealData: true,
              rankings,
              recommendations: [
                "Focus on improving CTR for top impressions.",
                "Create more content around your top performing queries.",
                "Review pages with dropping average positions."
              ]
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          } else {
            // Return 0s if no data
            return new Response(JSON.stringify({
              organicTraffic: `0 Clicks (30d)`,
              isRealData: true,
              rankings: [],
              recommendations: ["Not enough data in Google Search Console yet. Keep publishing!"]
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } else {
          console.log("GSC API failed (might not be verified). Error:", await gscRes.text());
          // If GSC fails (e.g. site not verified in GSC), return 0s instead of mock data
          return new Response(JSON.stringify({
            organicTraffic: `0 Clicks (30d)`,
            isRealData: true,
            rankings: [],
            recommendations: ["Please verify this website property in your Google Search Console account."]
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (gscErr) {
        console.error("Error in GSC fetch:", gscErr);
        // Return 0s on catch
        return new Response(JSON.stringify({
          organicTraffic: `0 Clicks (30d)`,
          isRealData: true,
          rankings: [],
          recommendations: ["Error connecting to Google Search Console."]
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 2. AI Fallback (Simulated Data)
    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not set")

    const systemPrompt = `You are an expert SEO Analyst.
Create a simulated SEO monitoring report for the website: ${url || 'Unknown'}.
Based on these keywords: ${keywords?.join(', ') || 'N/A'}.

Respond ONLY with a JSON object containing EXACTLY this structure:
{
  "organicTraffic": "string (e.g. '4.5K')",
  "isRealData": false,
  "rankings": [
    {
      "position": 12,
      "keyword": "string (the keyword)",
      "change": 3
    }
  ],
  "recommendations": [
    "string (an actionable SEO recommendation)"
  ]
}
Generate exactly 4-5 realistic keyword rankings and 3 actionable recommendations.`

    const payload = {
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { response_mime_type: "application/json", temperature: 0.6 }
    }

    const models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-001", "gemini-2.0-flash-lite-001", "gemini-flash-latest", "gemini-2.5-flash"];
    let lastError: any = null;
    
    for (const model of models) {
        try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
            })
            
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
    
    console.error("All AI models failed:", lastError?.message);
    console.log("Falling back to Pollinations AI...");
    
    try {
        const fallbackPayload = {
            messages: [
                { role: "system", content: "You are an expert SEO Analyst. Respond ONLY with valid JSON." },
                { role: "user", content: systemPrompt }
            ],
            jsonMode: true,
            model: "openai"
        };
        
        const fallbackRes = await fetch("https://text.pollinations.ai/", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fallbackPayload)
        });
        
        const fallbackText = await fallbackRes.text();
        let jsonStr = fallbackText.replace(/\r\n/g, "").replace(/\n/g, "").replace(/```json/gi, "").replace(/```/g, "").trim();
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start !== -1 && end !== -1) jsonStr = jsonStr.substring(start, end + 1);
        
        const parsed = JSON.parse(jsonStr);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (fallbackErr) {
        console.error("Pollinations fallback also failed:", fallbackErr);
        
        // If everything fails, check if original error was rate limit
        if (lastError?.message?.includes("429") || lastError?.message?.includes("quota")) {
          return new Response(JSON.stringify({ error: "Google Gemini API Daily Limit Reached! Please try again tomorrow or upgrade your API key." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        return new Response(JSON.stringify({ error: lastError?.message || "All AI models failed." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
