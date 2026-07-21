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
      basic: 29,
      pro: 99,
      agency: 299
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
    }

    throw new Error('Invalid gateway')

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
