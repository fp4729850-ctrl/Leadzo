const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.stbqeiapgdaklktrlrjm:Santro2007#@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function test() {
  try {
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
    await client.end();
  } catch (e) {
    console.error("Connection failed:", e.message);
  }
}

test();
