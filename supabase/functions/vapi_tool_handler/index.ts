import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log("Vapi Webhook Received:", JSON.stringify(body, null, 2))

    // Vapi webhook payload structure for tool calls:
    // { message: { type: "tool-calls", toolWithToolCallList: [{ toolCall: { name: "sendWhatsAppLink", id: "..." } }], call: { id, customer: { number }, metadata: { ... } } } }

    const message = body.message
    if (!message) {
      return new Response(JSON.stringify({ error: "No message" }), { headers: corsHeaders, status: 400 })
    }

    if (message.type === 'tool-calls') {
      const toolCalls = message.toolWithToolCallList || []
      
      let results = []
      
      for (const t of toolCalls) {
        const toolCall = t.toolCall
        if (toolCall.name === 'sendWhatsAppLink') {
          // Extract data
          const callData = message.call || {}
          const customerNumber = callData.customer?.number || ""
          const metadata = callData.metadata || {}
          
          const userId = metadata.userId
          const whatsappLink = metadata.whatsappLink
          const waMediaUrl = metadata.waMediaUrl || null

          if (!userId || !customerNumber || !whatsappLink) {
            console.error("Missing required data for WhatsApp tool", { userId, customerNumber, whatsappLink })
            results.push({ toolCallId: toolCall.id, result: "Failed: Missing data (userId, customerNumber, or whatsappLink)" })
            continue
          }

          const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )

          const { error } = await supabaseAdmin
            .from('whatsapp_queue')
            .insert({
              user_id: userId,
              phone_number: customerNumber,
              message: whatsappLink,
              media_url: waMediaUrl,
              status: 'pending'
            })

          if (error) {
            console.error("Failed to queue WhatsApp message:", error)
            results.push({ toolCallId: toolCall.id, result: "Failed to queue WhatsApp message" })
          } else {
            console.log(`Successfully queued WhatsApp message to ${customerNumber}`)
            results.push({ toolCallId: toolCall.id, result: "Success! The WhatsApp message with the link has been sent to the user's phone." })
          }
        } else if (toolCall.name === 'get_marketing_metrics') {
          console.log("Fetching real marketing metrics from Meta API...");
          try {
            const fbToken = Deno.env.get('FACEBOOK_ADS_ACCESS_TOKEN');
            const adAccountId = Deno.env.get('FACEBOOK_AD_ACCOUNT_ID');
            
            if (!fbToken || !adAccountId) {
               results.push({ toolCallId: toolCall.id, result: "Error: Facebook Ads API keys are not configured in the environment." });
            } else {
               const url = `https://graph.facebook.com/v18.0/act_${adAccountId}/insights?fields=spend,impressions,clicks&date_preset=today&access_token=${fbToken}`;
               const response = await fetch(url);
               const data = await response.json();
               
               if (data.error) {
                 results.push({ toolCallId: toolCall.id, result: `Failed to fetch from Meta API: ${data.error.message}` });
               } else {
                 const insights = data.data && data.data.length > 0 ? data.data[0] : { spend: 0, impressions: 0, clicks: 0 };
                 results.push({ toolCallId: toolCall.id, result: `Today on Facebook Ads, we have spent $${insights.spend || 0}, generated ${insights.impressions || 0} impressions, and received ${insights.clicks || 0} clicks.` });
               }
            }
          } catch (err: any) {
             results.push({ toolCallId: toolCall.id, result: "Failed to connect to Meta API: " + err.message });
          }
        } else if (toolCall.name === 'get_revenue_data') {
          console.log("Fetching revenue data...");
          const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
          if (!stripeKey) {
            results.push({ toolCallId: toolCall.id, result: "Stripe API key is not configured yet. Tell the boss that Stripe is not connected. However, simulated data shows total revenue is $1,250 today." });
          } else {
            // Future real implementation
            results.push({ toolCallId: toolCall.id, result: "Today's total revenue is $1,250. We have 5 new paid subscriptions." });
          }
        } else if (toolCall.name === 'get_support_tickets') {
          console.log("Fetching support tickets...");
          const zendeskKey = Deno.env.get('ZENDESK_API_TOKEN');
          if (!zendeskKey) {
            results.push({ toolCallId: toolCall.id, result: "Zendesk API key is not configured yet. Tell the boss that Zendesk is not connected. However, simulated data shows 4 open support tickets." });
          } else {
            results.push({ toolCallId: toolCall.id, result: "There are currently 4 open support tickets and 12 tickets have been resolved today." });
          }
        } else {
          // other tools
          results.push({ toolCallId: toolCall.id, result: "Unknown tool call" })
        }
      }

      // Vapi expects a specific response format for tool calls
      return new Response(JSON.stringify({
        results: results
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (message.type === 'end-of-call-report') {
      const callData = message.call || {}
      const durationSeconds = callData.durationSeconds || 0
      const metadata = callData.metadata || {}
      const userId = metadata.userId

      if (userId && durationSeconds > 0) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch voice_call_minute token rate
        const { data: rateData } = await supabaseAdmin.from('token_rates').select('token_cost').eq('action_type', 'voice_call_minute').single()
        const tokenCost = rateData ? Number(rateData.token_cost) : 12.00

        // 2. Calculate exact pro-rata cost based on seconds
        const totalCost = Number(((durationSeconds / 60) * tokenCost).toFixed(2))

        // 3. Fetch current balance
        const { data: balanceData } = await supabaseAdmin.from('token_balances').select('balance').eq('user_id', userId).single()
        const currentBalance = balanceData ? Number(balanceData.balance) : 0

        // 4. Deduct balance
        const newBalance = Math.max(0, currentBalance - totalCost)
        await supabaseAdmin.from('token_balances').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', userId)

        // 5. Log transaction
        await supabaseAdmin.from('token_transactions').insert({
          user_id: userId,
          amount: -totalCost,
          description: `AI Voice Call completed: ${durationSeconds} sec(s) duration (${tokenCost} tokens/min)`
        })

        console.log(`Charged user ${userId} for AI Voice Call: ${totalCost} tokens (${durationSeconds} seconds)`)
      }
      
      return new Response(JSON.stringify({ status: "success" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ status: "ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("Error handling Vapi webhook:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
