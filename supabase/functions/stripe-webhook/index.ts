import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    // For production, you should verify Stripe signature using stripe-node
    // Here we just parse the event for demonstration of the flow
    const payload = await req.json()
    const event = payload; // or stripe.webhooks.constructEvent

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.client_reference_id
      
      // Update or create subscription
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        plan_name: session.metadata?.plan_name || 'pro',
        status: 'active',
        provider: 'stripe',
        provider_subscription_id: session.subscription || session.id
      }, { onConflict: 'user_id' })

      // Record payment
      await supabase.from('payments').insert({
        user_id: userId,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: 'paid',
        provider: 'stripe',
        provider_payment_id: session.payment_intent
      })
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(
      `Webhook Error: ${err.message}`,
      { status: 400 }
    )
  }
})
