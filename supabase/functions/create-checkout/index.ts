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

    const { planId, gateway, priceId } = await req.json()

    // Map plans for Crypto
    const plans: Record<string, number> = {
      basic: 23,
      pro: 55,
      agency: 135
    }
    const amount = plans[planId]
    if (!amount) throw new Error('Invalid plan')

    if (gateway === 'paddle') {
      // Create Paddle Transaction (Checkout)
      const paddlePayload = {
        items: [
          {
            price_id: priceId, // Pass the Paddle Price ID from frontend
            quantity: 1
          }
        ],
        custom_data: {
          user_id: user.id,
          plan_name: planId
        }
      }

      const isSandbox = Deno.env.get('PADDLE_ENVIRONMENT') === 'sandbox'
      const apiUrl = isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'

      const paddleResponse = await fetch(`${apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PADDLE_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paddlePayload)
      })
      
      const transaction = await paddleResponse.json()
      if (transaction.error) throw new Error(transaction.error.detail || 'Paddle error')
      
      // We return the transaction ID so the frontend can open the Paddle Checkout overlay
      return new Response(JSON.stringify({ transactionId: transaction.data.id }), {
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
    } else if (gateway === 'stripe') {
      const stripePayload = new URLSearchParams({
        "success_url": `${req.headers.get('origin')}/dashboard?payment=success`,
        "cancel_url": `${req.headers.get('origin')}/pricing?payment=cancelled`,
        "mode": "subscription",
        "client_reference_id": user.id,
        "subscription_data[metadata][user_id]": user.id,
        "subscription_data[metadata][plan_name]": planId,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1"
      })

      const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY')
      if (!stripeApiKey) throw new Error('Stripe secret key missing in secrets')

      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeApiKey}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: stripePayload.toString()
      })

      const session = await stripeResponse.json()
      if (session.error) throw new Error(session.error.message || "Stripe checkout session failed")

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } else if (gateway === 'razorpay') {
      const rzpKeyId = Deno.env.get('RAZORPAY_KEY_ID')
      const rzpKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
      if (!rzpKeyId || !rzpKeySecret) throw new Error('Razorpay configuration missing on backend')

      // Convert USD to INR (e.g. 1 USD = 84 INR) for domestic Indian gateway compatibility
      const inrAmount = amount * 84
      const amountInPaisa = Math.round(inrAmount * 100)

      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${rzpKeyId}:${rzpKeySecret}`),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPaisa,
          currency: 'INR',
          receipt: `receipt_${user.id.slice(0, 10)}_${Date.now()}`,
          notes: {
            user_id: user.id,
            plan_name: planId
          }
        })
      })

      const order = await rzpResponse.json()
      if (order.error) throw new Error(order.error.description || 'Razorpay order creation failed')

      return new Response(JSON.stringify({ 
        orderId: order.id, 
        amount: order.amount, 
        currency: order.currency,
        keyId: rzpKeyId
      }), {
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
