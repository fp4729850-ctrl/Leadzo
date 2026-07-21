import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const payload = await req.json()
    const eventType = payload.event_type

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (eventType === 'transaction.completed' || eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const data = payload.data
      const userId = data.custom_data?.user_id
      if (!userId) throw new Error('Missing user_id in custom_data')
      
      // Update or create subscription
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan_name: data.custom_data?.plan_name || 'pro',
        status: data.status || 'active',
        provider: 'paddle',
        provider_subscription_id: data.subscription_id || data.id
      }, { onConflict: 'user_id' })

      if (eventType === 'transaction.completed') {
        // Record payment
        await supabase.from('payments').insert({
          user_id: userId,
          amount: parseFloat(data.details?.totals?.grand_total) / 100, // Paddle returns amount in cents
          currency: data.currency_code,
          status: 'paid',
          provider: 'paddle',
          provider_payment_id: data.id
        })
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(
      `Webhook Error: ${err.message}`,
      { status: 400 }
    )
  }
})
