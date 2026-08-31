import fetch from 'node-fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://stbqeiapgdaklktrlrjm.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
// The user token from the request to simulate a logged-in user
const USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (we don't have the real JWT of a user, wait!)";

// Actually we don't have a valid user JWT to test the Brain fetching logic because the Edge function uses `req.headers.get('Authorization')` which requires a real User session JWT, not the Anon key!
// Let me write a test that simply uses the ANON key, but it might not fetch the Brain if there's no user id.
// If it fails to fetch Brain, it will still generate a template based on the default prompt, which proves the API is alive.

async function testAPI() {
  console.log("Testing campaignAi_generateTemplate...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/campaignAi_generateTemplate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}` // No real user JWT, but let's pass ANON key
      },
      body: JSON.stringify({
        prompt: 'Sell our amazing Leadzo AI software',
        language: 'Hinglish',
        tone: 'Friendly',
        count: 1
      })
    });
    
    const text = await response.text();
    console.log("Response Status:", response.status);
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testAPI();
