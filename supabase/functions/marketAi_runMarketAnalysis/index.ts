// Supabase Edge Function: marketAi_runMarketAnalysis
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { keyword } = await req.json()
    
    // Mock Market Intelligence Report
    const mockReport = {
      keyword: keyword || "Artificial Intelligence",
      searchVolume: "246K monthly queries",
      competition: "High",
      cpc: "$3.42",
      trends: [
        { month: "Jan", interest: 65 },
        { month: "Feb", interest: 70 },
        { month: "Mar", interest: 85 },
        { month: "Apr", interest: 90 },
        { month: "May", interest: 99 }
      ],
      competitorAds: [
        { company: "Apex Solutions", text: "Automate leads instantly using AI." },
        { company: "Vanguard Tech", text: "Scale customer support agents dynamically." }
      ],
      demographics: {
        countries: [
          { name: "United States", share: "45%" },
          { name: "United Kingdom", share: "18%" },
          { name: "India", share: "15%" }
        ],
        devices: { desktop: "60%", mobile: "40%" }
      }
    }

    return new Response(JSON.stringify(mockReport), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
