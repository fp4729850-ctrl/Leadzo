// Supabase Edge Function: razorpay-webhook
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

    const eventType = body.event
    console.log(`Received Razorpay event: ${eventType}`)

    if (eventType === 'order.paid') {
      const orderEntity = body.payload?.order?.entity || {}
      const paymentEntity = body.payload?.payment?.entity || {}
      
      const orderId = orderEntity.id
      const notes = orderEntity.notes || {}
      const userId = notes.user_id
      const planName = notes.plan_name

      console.log(`Processing order.paid for user ${userId}, plan: ${planName}, orderId: ${orderId}`)

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
            provider: 'nowpayments', // Map to standard providers in schema
            provider_subscription_id: orderId,
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
            amount: (orderEntity.amount || 0) / 100,
            currency: orderEntity.currency || 'INR',
            status: 'paid',
            provider: 'nowpayments',
            provider_payment_id: paymentEntity.id || orderId,
            description: `Paid for Leadzo ${planName} Plan (via Razorpay)`
          })

        if (payErr) {
          console.error("Payment insert error:", payErr)
        }

        console.log(`✅ Successfully provisioned Razorpay checkout for user: ${userId}, Plan: ${planName}`)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error("Razorpay Webhook Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
