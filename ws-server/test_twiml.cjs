const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/mac/Downloads/hercules_source/Leadzo/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.functions.invoke('bulkCalling_makeBulkCalls', {
    body: { numbers: ['+1234567890'], message: 'Test message', voice: 'rachel', ttsEngine: 'deepgram' }
  });
  console.log("Data:", data);
  console.log("Error:", error);
}
test();
