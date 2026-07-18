import WebSocket from 'ws';
const ws = new WebSocket('wss://leadzo-e0wy.onrender.com/stream');
ws.on('open', () => {
  console.log('Connected!');
  ws.send(JSON.stringify({ event: 'start', start: { streamSid: 'TEST_SID_123' } }));
});
ws.on('message', (msg) => {
  console.log('Message:', msg.toString());
});
ws.on('error', (err) => console.error(err));
ws.on('close', (code, reason) => console.log('Closed', code, reason.toString()));
