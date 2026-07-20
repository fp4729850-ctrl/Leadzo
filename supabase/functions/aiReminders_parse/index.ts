// Supabase Edge Function: aiReminders_parse
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { fileData, mimeType } = await req.json()
    const geminiKey = Deno.env.get("GEMINI_API_KEY")

    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is not set.")
    }

    if (!fileData || !mimeType) {
      throw new Error("fileData and mimeType are required.")
    }

    const systemPrompt = `You are a data extraction assistant. Extract all clients that require reminders from the provided document.
Output MUST be a valid JSON array of objects, with NO markdown formatting, NO \`\`\`json wrappers. 
Each object must have these exactly keys:
- client_name: string
- phone_number: string
- due_date: string (YYYY-MM-DD format)
- amount_or_context: string (e.g. "$500 Premium", "Loan EMI")`

    const openAIKey = Deno.env.get("OPENAI_API_KEY")

    const callGemini = async () => {
      const model = "gemini-3.5-flash"
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              parts: [
                { text: "Extract the data according to the system instructions." },
                { inlineData: { mimeType: mimeType, data: fileData } }
              ]
            }
          ],
          generationConfig: { responseMimeType: "application/json" }
        })
      })
      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    }

    const callOpenAI = async () => {
      // Decode base64 if it's text/csv to send as text prompt since OpenAI doesn't support CSV via image URL
      let contentText = "Extract data from this file."
      if (mimeType.includes("csv") || mimeType.includes("text")) {
        const decodedString = atob(fileData)
        contentText = `Here is the CSV data:\n\n${decodedString}`
      } else {
        throw new Error("OpenAI fallback only supports text/csv currently.")
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt + "\nRespond with a JSON object containing a 'data' array." },
            { role: "user", content: contentText }
          ]
        })
      })
      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      const content = data.choices[0].message.content
      const parsed = JSON.parse(content)
      return JSON.stringify(parsed.data || parsed)
    }

    let extractedText = ""
    try {
      extractedText = await callGemini()
    } catch (e: any) {
      console.warn("Gemini failed, trying OpenAI:", e.message)
      if (openAIKey) {
        extractedText = await callOpenAI()
      } else {
        throw new Error(`Gemini request failed: ${e.message}`)
      }
    }
    
    let cleanedText = extractedText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();
    
    let parsedData = []
    try {
      parsedData = JSON.parse(cleanedText)
    } catch (e) {
      console.error("Failed to parse JSON", extractedText)
      throw new Error("AI returned invalid JSON format")
    }

    return new Response(JSON.stringify({ data: parsedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (error: any) {
    console.error("Parse Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
