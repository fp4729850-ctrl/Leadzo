// Supabase Edge Function: stripe-webhook
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const bodyText = await req.text()
    const body = JSON.parse(bodyText)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const eventType = body.type
    console.log(`Received Stripe event: ${eventType}`)

    if (eventType === 'checkout.session.completed') {
      const session = body.data.object
      const userId = session.client_reference_id
      const subscriptionId = session.subscription
      
      // Extract metadata
      const metadata = session.metadata || {}
      const planName = metadata.plan_name || session.subscription_data?.metadata?.plan_name

      console.log(`Processing checkout.session.completed for user ${userId}, plan: ${planName}`)

      if (userId && planName) {
        // Calculate trial or subscription period end (default 30 days)
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 30)

        // Insert/Upsert subscription record to automatically trigger database token crediting
        const { error: subErr } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_name: planName,
            status: 'active',
            provider: 'stripe',
            provider_subscription_id: subscriptionId || session.id,
            current_period_end: periodEnd.toISOString()
          }, { onConflict: 'user_id' })

        if (subErr) {
          console.error("Subscription insert error:", subErr)
          throw subErr
        }

        // Log payment transaction details
        const { error: payErr } = await supabaseAdmin
          .from('payments')
          .insert({
            user_id: userId,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency || 'usd',
            status: 'paid',
            provider: 'stripe',
            provider_payment_id: session.payment_intent || session.id,
            description: `Paid for Leadzo ${planName} Plan`
          })

        if (payErr) {
          console.error("Payment insert error:", payErr)
        }

        console.log(`✅ Successfully provisioned Stripe checkout for user: ${userId}, Plan: ${planName}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error("Stripe Webhook Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
