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

    return new Response(JSON.stringify({ status: "ignored" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("Error handling Vapi webhook:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
