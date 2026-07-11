// Supabase Edge Function: platformAds_getFacebookAdsInsights
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { preset } = await req.json()
    // Simulated Facebook Marketing API data
    const mockInsights = {
      preset: preset || "last_30_days",
      totalSpend: 1540.23,
      totalRevenue: 4980.50,
      roas: 3.23,
      cpl: 4.12,
      totalConversions: 373,
      totalImpressions: 89400,
      totalClicks: 2150,
      ctr: 2.40,
      dailyTrend: [
        { date: "Day 1", spend: 45, conversions: 10 },
        { date: "Day 2", spend: 50, conversions: 12 },
        { date: "Day 3", spend: 48, conversions: 15 },
        { date: "Day 4", spend: 55, conversions: 14 }
      ],
      platformBreakdown: [
        { name: "Facebook Feed", value: 45000 },
        { name: "Instagram Stories", value: 30000 },
        { name: "Audience Network", value: 14400 }
      ],
      topCampaigns: [
        { id: "1", name: "AI Lead Gen - Tier 1", spend: 400, conversions: 98, roas: 3.4 },
        { id: "2", name: "Retargeting - High Intent", spend: 200, conversions: 54, roas: 4.1 }
      ]
    }

    return new Response(JSON.stringify(mockInsights), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
