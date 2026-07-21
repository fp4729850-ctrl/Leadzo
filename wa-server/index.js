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
      // Skip group messages
      if (msg.from.includes('@g.us')) return;

      console.log(`New message received on ${userId}'s client from ${msg.from}:`, msg.body);
      
      // Get the actual phone number - remove @c.us suffix and non-numeric chars
      const rawNumber = msg.from.replace('@c.us', '').replace(/[^0-9]/g, '');
      
      // Try to get contact's saved name from WhatsApp
      let contactName = rawNumber;
      try {
        const contact = await msg.getContact();
        // Use pushname (WhatsApp display name) or saved name, fallback to number
        contactName = contact.pushname || contact.name || `+${rawNumber}`;
      } catch(e) {
        contactName = `+${rawNumber}`;
      }
      
      const fromNumber = rawNumber;
      const content = msg.body;
      
      console.log(`From: ${contactName} (${fromNumber})`);
      
      // Send incoming message to Leadzo Edge Function (bypasses RLS automatically)
      try {
        const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/whatsapp_local_webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, fromNumber, content, contactName })
        });
        
        if (!response.ok) {
          console.error("Webhook failed:", await response.text());
        } else {
          console.log(`Saved incoming message from ${contactName} to Live Inbox`);
        }
      } catch (webhookErr) {
        console.error("Webhook fetch error:", webhookErr);
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


// Live Inbox reply — send to a single contact number
app.post('/api/reply', async (req, res) => {
  const { userId, toNumber, message } = req.body;
  if (!userId || !toNumber || !message) return res.status(400).json({ error: 'Missing parameters' });

  if (!sessions.has(userId) || sessions.get(userId).status !== 'connected') {
    return res.status(401).json({ error: 'WhatsApp not connected. Please scan QR code first.' });
  }

  const client = sessions.get(userId).client;
  try {
    let cleanNum = toNumber.replace(/[^0-9]/g, '');
    if (!cleanNum.endsWith('@c.us')) cleanNum += '@c.us';
    await client.sendMessage(cleanNum, message);
    console.log(`Reply sent to ${toNumber} for user ${userId}`);
    res.json({ status: 'sent' });
  } catch (err) {
    console.error(`Failed to reply to ${toNumber}:`, err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`wa-server running on http://localhost:${PORT}`);
});
