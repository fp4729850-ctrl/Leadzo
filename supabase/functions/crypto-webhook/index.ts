import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const payload = await req.json()

    // NOWPayments sends payment_status
    if (payload.payment_status === 'finished') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // order_id was user.id_timestamp
      const userId = payload.order_id.split('_')[0]
      
      // Update or create subscription (manual renew for crypto)
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1)

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan_name: 'pro', // ideally parsed from order_description
        status: 'active',
        provider: 'nowpayments',
        provider_subscription_id: payload.payment_id,
        current_period_end: futureDate.toISOString()
      }, { onConflict: 'user_id' })

      // Record payment
      await supabase.from('payments').insert({
        user_id: userId,
        amount: payload.pay_amount,
        currency: payload.pay_currency,
        status: 'paid',
        provider: 'nowpayments',
        provider_payment_id: String(payload.payment_id)
      })
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
