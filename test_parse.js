import fs from 'fs';

const test = async (model) => {
  const content = Buffer.from('Client Name,Phone Number\nRahul Sharma,+919876543210').toString('base64');
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: "Parse this" }, { inlineData: { mimeType: "text/csv", data: content } }] }
      ]
    })
  });
  
  console.log(`Model: ${model} -> Status:`, res.status, await res.text().catch(e=>e.message));
};

const run = async () => {
  // Let's get the gemini key from supabase via curl
  // Wait, I can just use a dummy text to test the edge function directly, but I need the edge function to test the model.
  // Actually, I can just change the edge function to use `gemini-1.5-flash-latest`.
}
run();
