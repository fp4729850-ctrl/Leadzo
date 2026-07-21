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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { planId, gateway } = await req.json()

    // Map plans
    const plans: Record<string, number> = {
      basic: 29,
      pro: 99,
      agency: 299
    }
    const amount = plans[planId]
    if (!amount) throw new Error('Invalid plan')

    if (gateway === 'stripe') {
      // Create Stripe Checkout Session
      // Using direct fetch to Stripe API since we're in Edge Function
      const stripeData = new URLSearchParams()
      stripeData.append('payment_method_types[0]', 'card')
      stripeData.append('mode', 'subscription')
      stripeData.append('success_url', `${req.headers.get('origin')}/dashboard?payment=success`)
      stripeData.append('cancel_url', `${req.headers.get('origin')}/pricing?payment=cancelled`)
      stripeData.append('customer_email', user.email || '')
      stripeData.append('client_reference_id', user.id)
      
      // We would ideally map to Stripe Price IDs here. For demo, we create price inline.
      stripeData.append('line_items[0][price_data][currency]', 'usd')
      stripeData.append('line_items[0][price_data][product_data][name]', `Leadzo ${planId} Plan`)
      stripeData.append('line_items[0][price_data][unit_amount]', String(amount * 100))
      stripeData.append('line_items[0][price_data][recurring][interval]', 'month')
      stripeData.append('line_items[0][quantity]', '1')

      const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: stripeData
      })
      
      const session = await stripeResponse.json()
      if (!session.url) throw new Error(session.error?.message || 'Stripe error')
      
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      
    } else if (gateway === 'nowpayments') {
      // NOWPayments logic
      const nowpaymentsPayload = {
        price_amount: amount,
        price_currency: "usd",
        pay_currency: "usdttrc20",
        order_id: user.id + '_' + Date.now(),
        order_description: `Leadzo ${planId} Plan (1 Month)`,
        success_url: `${req.headers.get('origin')}/dashboard?payment=success`,
        cancel_url: `${req.headers.get('origin')}/pricing?payment=cancelled`
      }

      const npResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': Deno.env.get('NOWPAYMENTS_API_KEY') || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nowpaymentsPayload)
      })

      const invoice = await npResponse.json()
      if (!invoice.invoice_url) throw new Error(invoice.message || 'NOWPayments error')

      return new Response(JSON.stringify({ url: invoice.invoice_url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Invalid gateway')

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
