async function run() {
  const systemPrompt = `You are an expert SEO Content Writer.
Write a highly optimized, engaging blog post targeting the keyword: "ai marketing".
The tone should be: Professional.
Context about the website: {}.

Respond ONLY with a JSON object containing EXACTLY this structure:
{
  "metaTitle": "string (50-60 characters)",
  "metaDescription": "string (150-160 characters)",
  "content": "string (The full blog post content formatted in beautiful Markdown. Use H1, H2, H3, bullet points, and bold text. Make it SHORT and comprehensive, about 250 words.)"
}`;
  const userText = "Proceed with the request based on the system prompt.";
  
  const polliPayload = {
      messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
      ],
      jsonMode: true, model: "openai"
  };
  
  console.log("Fetching...");
  const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(polliPayload)
  });
  
  const text = await res.text();
  console.log("Response:", text);
}
run();
