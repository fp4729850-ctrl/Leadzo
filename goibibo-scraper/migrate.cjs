const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Santro2007%23@db.stbqeiapgdaklktrlrjm.supabase.co:5432/postgres'
});

async function runMigration() {
  try {
    await client.connect();
    
    const query = `
      CREATE TABLE IF NOT EXISTS public.scraper_cookies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        platform TEXT NOT NULL,
        cookies_json JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await client.query(query);
    console.log("Table created!");
    await client.end();
  } catch (e) {
    console.error("Migration failed:", e.message);
  }
}

runMigration();
