global.WebSocket = require("ws");
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const app = express();
app.use(cors());
app.use(express.json());

// Store active sessions: userId -> { client, qrBase64, status: 'pending'|'connected'|'disconnected' }
const sessions = new Map();

app.post('/api/connect', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // If already exists and connected or starting, return
  if (sessions.has(userId)) {
    const status = sessions.get(userId).status;
    if (status === 'connected' || status === 'starting') {
      return res.json({ status });
    }
    // Destroy old client if it exists but is disconnected
    const oldClient = sessions.get(userId).client;
    try { await oldClient.destroy(); } catch(e) {}
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userId }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1043020865-alpha.html',
    }
  });

  sessions.set(userId, { client, qrBase64: null, status: 'starting', token: req.body.token });

  client.on('qr', async (qr) => {
    console.log(`QR received for ${userId}`);
    try {
      const qrBase64 = await qrcode.toDataURL(qr, { scale: 10, margin: 4 });
      if (sessions.has(userId)) {
        sessions.get(userId).qrBase64 = qrBase64;
        sessions.get(userId).status = 'pending';
      }
    } catch (err) {
      console.error('QR generation error:', err);
    }
  });

  client.on('ready', () => {
    console.log(`Client is ready for ${userId}`);
    if (sessions.has(userId)) {
      sessions.get(userId).status = 'connected';
      sessions.get(userId).qrBase64 = null;
    }
  });

  client.on('message', async (msg) => {
    try {
      console.log(`New message received on ${userId}'s client:`, msg.body);
      const fromNumber = msg.from.replace(/[^0-9]/g, '');
      const content = msg.body;
      
      const sessionData = sessions.get(userId);
      const userSupabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${sessionData?.token}` } } }
      );
      
      // 1. Find or create lead for this user and number
      let { data: lead } = await userSupabase
        .from('leads')
        .select('id')
        .eq('user_id', userId)
        .eq('contact', fromNumber)
        .single();
        
      if (!lead) {
        // Create new lead since it doesn't exist
        const { data: newLead, error: insertError } = await userSupabase
          .from('leads')
          .insert({
            user_id: userId,
            name: fromNumber, // default to number if unknown
            contact: fromNumber,
            platform: 'whatsapp',
            status: 'New'
          })
          .select('id')
          .single();
        if (insertError) console.error("Lead Insert Error:", insertError);
        lead = newLead;
      }
      
      if (lead) {
        // 2. Insert message into messages table
        const { error: msgError } = await userSupabase.from('messages').insert({
          user_id: userId,
          lead_id: lead.id,
          content: content,
          sender: 'lead'
        });
        if (msgError) console.error("Message Insert Error:", msgError);
        else console.log(`Saved incoming message to Live Inbox for lead ${lead.id}`);
      }
    } catch (err) {
      console.error(`Error processing incoming message for ${userId}:`, err.message);
    }
  });

  client.on('disconnected', (reason) => {
    console.log(`Client disconnected for ${userId}:`, reason);
    if (sessions.has(userId)) {
      sessions.get(userId).status = 'disconnected';
    }
  });

  try {
    client.initialize().catch(err => {
      console.error(`Error in client.initialize for ${userId}:`, err);
    });
    res.json({ status: 'starting' });
  } catch (err) {
    console.error(`Error starting client for ${userId}:`, err);
    res.status(500).json({ error: 'Failed to start client' });
  }
});

app.get('/api/status/:userId', (req, res) => {
  const { userId } = req.params;
  if (!sessions.has(userId)) {
    return res.json({ status: 'disconnected' });
  }
  const session = sessions.get(userId);
  res.json({ status: session.status, qrCode: session.qrBase64 });
});


app.post('/api/send', async (req, res) => {
  const { userId, numbers, message } = req.body;
  if (!userId || !numbers || !message) return res.status(400).json({ error: 'Missing parameters' });

  if (!sessions.has(userId) || sessions.get(userId).status !== 'connected') {
    return res.status(401).json({ error: 'WhatsApp not connected' });
  }

  const client = sessions.get(userId).client;
  const results = [];

  for (let num of numbers) {
    try {
      // Format number to string e.g. 919876543210@c.us
      let cleanNum = num.replace(/[^0-9]/g, '');
      if (!cleanNum.endsWith('@c.us')) cleanNum += '@c.us';
      
      await client.sendMessage(cleanNum, message);
      results.push({ number: num, success: true });
      
      // Random delay between 5 to 10 seconds to avoid ban
      const delayMs = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
      await new Promise(r => setTimeout(r, delayMs));
    } catch (err) {
      console.error(`Failed to send to ${num}:`, err);
      results.push({ number: num, success: false, error: err.message });
    }
  }

  res.json({ status: 'success', results });
});

// Send media (image/video) from URL
app.post('/api/send-media', async (req, res) => {
  const { userId, numbers, mediaUrl, caption } = req.body;
  if (!userId || !numbers || !mediaUrl) return res.status(400).json({ error: 'Missing parameters' });

  if (!sessions.has(userId) || sessions.get(userId).status !== 'connected') {
    return res.status(401).json({ error: 'WhatsApp not connected' });
  }

  const client = sessions.get(userId).client;
  const { MessageMedia } = require('whatsapp-web.js');
  const results = [];

  for (let num of numbers) {
    try {
      let cleanNum = num.replace(/[^0-9]/g, '');
      if (!cleanNum.endsWith('@c.us')) cleanNum += '@c.us';

      // Download media from URL and send
      const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
      await client.sendMessage(cleanNum, media, { caption: caption || '' });
      results.push({ number: num, success: true });

      // Small delay to avoid ban
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Failed to send media to ${num}:`, err);
      results.push({ number: num, success: false, error: err.message });
    }
  }

  res.json({ status: 'success', results });
});


const PORT = 3001;
app.listen(PORT, () => {
  console.log(`wa-server running on http://localhost:${PORT}`);
});
