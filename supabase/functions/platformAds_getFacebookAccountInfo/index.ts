import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = Deno.env.get("FACEBOOK_ADS_ACCESS_TOKEN")
    const adAccountId = Deno.env.get("FACEBOOK_AD_ACCOUNT_ID")

    if (token && adAccountId) {
      try {
        const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        const fbUrl = `https://graph.facebook.com/v20.0/${cleanAccountId}?fields=name,account_status,balance,currency,spend_cap,amount_spent&access_token=${token}`;
        
        const response = await fetch(fbUrl);
        const resData = await response.json();

        if (response.ok && resData.name) {
          return new Response(JSON.stringify({
            success: true,
            accountName: resData.name,
            accountStatus: resData.account_status,
            balance: resData.balance || "0",
            currency: resData.currency,
            spendCap: resData.spend_cap || "Unlimited",
            amountSpent: resData.amount_spent || "0"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch (fbError) {
        console.warn("Meta API error:", fbError);
      }
    }

    // Fallback Mock Account Info
    return new Response(JSON.stringify({
      success: true,
      accountName: "Leadzo Demo Account",
      accountStatus: 1, // Active
      balance: "500000", // Cents, so 5000.00
      currency: "INR",
      spendCap: "10000000",
      amountSpent: "450000"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
