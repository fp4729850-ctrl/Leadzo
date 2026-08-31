import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    // 1. Fetch website
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch website: ${res.statusText}`)
    const html = await res.text()

    // 2. Extract text (basic regex to remove scripts, styles, and HTML tags)
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim()
    
    // Limit to ~20000 characters to fit in LLM context safely
    text = text.substring(0, 20000)

    // 3. Generate summary via OpenAI
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI tasked with creating a knowledge base and instructions for a WhatsApp Sales Agent based on a website\'s content. Extract the core offering, pricing, key features, and tone. Format it as a concise set of instructions for the sales agent to use as their system prompt.' },
          { role: 'user', content: `Here is the text extracted from the website (${url}):\n\n${text}` }
        ]
      })
    })

    const aiData = await aiRes.json()
    if (aiData.error) throw new Error(aiData.error.message)
    const promptText = aiData.choices[0].message.content

    return new Response(JSON.stringify({ prompt: promptText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
