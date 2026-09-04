const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.stbqeiapgdaklktrlrjm:Santro2007%23@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function runMigration() {
  try {
    await client.connect();
    console.log("Connected successfully!");
    
    const query = `
      ALTER TABLE public.business_knowledge
      ADD COLUMN IF NOT EXISTS internal_api_key UUID DEFAULT gen_random_uuid();
      
      CREATE INDEX IF NOT EXISTS idx_business_internal_api_key ON public.business_knowledge (internal_api_key);
    `;
    
    await client.query(query);
    console.log("Migration pushed successfully via SQL!");
    
    await client.end();
  } catch (e) {
    console.error("Migration failed:", e.message);
  }
}

runMigration();
