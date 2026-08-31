const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/mac/Downloads/hercules_source/Leadzo/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Sign in as test user to get a valid auth token, then call the edge function
async function test() {
  // Use service role to get a user session token
  const serviceSupabase = createClient(
    supabaseUrl,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFlaWFwZ2Rha2xrdHJscmptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzcxNjE4OCwiZXhwIjoyMDk5MjkyMTg4fQ.yvHagIyGm35RXx24j8oOcJMuixXZwnJ9AxH7-h8cGw4'
  );

  // List users to get a user ID
  const { data: { users } } = await serviceSupabase.auth.admin.listUsers({ perPage: 1 });
  if (!users || users.length === 0) { console.log('No users found'); return; }
  const userId = users[0].id;
  console.log('Using user:', users[0].email);

  // Create a temporary session token for this user
  const { data: linkData } = await serviceSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: users[0].email
  });
  
  if (!linkData?.properties?.access_token) {
    console.log('Could not generate token, trying direct Twilio call via edge function...');
    // Try calling the function directly without auth (the SUPABASE_SERVICE_ROLE_KEY is available inside)
    const res = await fetch(`${supabaseUrl}/functions/v1/voicebox_callLead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFlaWFwZ2Rha2xrdHJscmptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzcxNjE4OCwiZXhwIjoyMDk5MjkyMTg4fQ.yvHagIyGm35RXx24j8oOcJMuixXZwnJ9AxH7-h8cGw4`
      },
      body: JSON.stringify({
        leadId: userId,
        engine: 'voicebox',
        script: 'Aap Pooja hain, Leadzo ki sales executive. Customer se Hinglish mein baat karo.',
        testMode: true,
        testPhone: '+919726846660'
      })
    });
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    return;
  }

  const token = linkData.properties.access_token;
  console.log('Got token, placing call...');

  // Now call voicebox_callLead with real auth
  const res = await fetch(`${supabaseUrl}/functions/v1/voicebox_callLead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      leadId: 'test-lead-id',
      engine: 'voicebox',
      script: 'Aap Pooja hain, Leadzo ki professional sales executive. Customer se Hinglish mein baat karo.'
    })
  });
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
