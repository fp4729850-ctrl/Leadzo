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
    const { adCampaigns, launchedCampaigns } = await req.json()
    
    // We expect an array of campaigns to analyze
    if (!adCampaigns || !launchedCampaigns) {
       throw new Error("Missing campaign data");
    }
    
    // 1. Calculate some basic aggregates
    let totalSpend = 0;
    let totalRevenue = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    
    adCampaigns.forEach((c: any) => {
        totalSpend += (c.spend || 0);
        totalRevenue += (c.revenue || 0);
        totalClicks += (c.clicks || 0);
        totalImpressions += (c.impressions || 0);
    });
    
    const avgRoas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("HERCULES_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY is not set")

    // 2. Ask Gemini to extract learnings
    const systemPrompt = `You are a world-class AI Marketing Analyst.
You are given a list of campaigns that ran recently.
Analyze the data and extract the absolute best performing patterns (Learnings).

Respond ONLY with a JSON object exactly matching this structure:
{
  "aiSummary": "A 2-3 sentence summary of how campaigns are performing overall.",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "topHeadlines": [
    { "value": "The winning headline text", "metric": "roas", "metricValue": 3.5, "platform": "facebook", "campaignName": "Camp1" }
  ],
  "topCreatives": [
    { "value": "The winning creative description/hook", "metric": "ctr", "metricValue": 5.2, "platform": "google", "campaignName": "Camp2" }
  ]
}`;

    const userPrompt = `Launched Campaigns Config: ${JSON.stringify(launchedCampaigns)}\n\nAd Campaigns Metrics: ${JSON.stringify(adCampaigns)}`;

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { response_mime_type: "application/json", temperature: 0.2 }
    }

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    })
    
    if (!aiRes.ok) throw new Error(`Gemini failed: ${aiRes.status}`);
    const aiData = await aiRes.json();
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    const parsed = JSON.parse(aiText.replace(/```json/gi, "").replace(/```/g, "").trim());
    
    // 3. Save to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Save summary
        await supabase.from("learning_agent_data").insert({
            type: "summary",
            date: dateStr,
            totalSpend,
            totalRevenue,
            avgRoas,
            avgCtr,
            topPlatform: "facebook",
            aiSummary: parsed.aiSummary,
            keyInsights: parsed.keyInsights,
            metricValue: avgRoas
        });
        
        // Save headlines
        if (parsed.topHeadlines) {
            for (const h of parsed.topHeadlines) {
                await supabase.from("learning_agent_data").insert({
                    type: "headline",
                    value: h.value,
                    metric: h.metric,
                    metricValue: h.metricValue,
                    platform: h.platform,
                    campaignName: h.campaignName,
                    isUsed: false
                });
            }
        }
        
        // Save creatives
        if (parsed.topCreatives) {
            for (const c of parsed.topCreatives) {
                await supabase.from("learning_agent_data").insert({
                    type: "creative",
                    value: c.value,
                    metric: c.metric,
                    metricValue: c.metricValue,
                    platform: c.platform,
                    campaignName: c.campaignName,
                    isUsed: false
                });
            }
        }
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
