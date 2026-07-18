const WebSocket = require('ws');
const ws = new WebSocket('wss://leadzo-e0wy.onrender.com/stream?voice=rachel&ttsEngine=deepgram');

ws.on('open', () => {
  console.log("Connected to local ws-server");
  ws.send(JSON.stringify({
    event: "start",
    sequenceNumber: "1",
    start: { streamSid: "MZ1234567890", accountSid: "AC", callSid: "CA", tracks: ["inbound"], mediaFormat: { encoding: "audio/x-mulaw", sampleRate: 8000, channels: 1 } }
  }));
});

ws.on('message', (data) => {
  const res = JSON.parse(data.toString());
  if (res.event === 'media') {
    console.log("Received media payload from AI:", res.media.payload.substring(0, 50) + "...");
  } else {
    console.log("Received Twilio command:", res);
  }
});
