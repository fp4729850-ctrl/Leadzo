const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080/stream?use_cloned_voice=true&profile_id=748a12cf-7f35-405f-bb50-119f67e51d93');

ws.on('open', () => {
  console.log("Connected to local ws-server for Voicebox Clone test!");
  ws.send(JSON.stringify({
    event: "start",
    sequenceNumber: "1",
    start: { streamSid: "MZ1234567890", accountSid: "AC", callSid: "CA", tracks: ["inbound"], mediaFormat: { encoding: "audio/x-mulaw", sampleRate: 8000, channels: 1 } }
  }));
});

let packetsReceived = 0;
ws.on('message', (data) => {
  const res = JSON.parse(data.toString());
  if (res.event === 'media') {
    packetsReceived++;
    if (packetsReceived === 1) {
      console.log("SUCCESS! Received first media payload from AI via Voicebox Clone:", res.media.payload.substring(0, 50) + "...");
    }
  } else if (res.event === 'mark') {
    console.log("Received mark:", res);
    console.log(`Total media packets received: ${packetsReceived}`);
    console.log("Test completed successfully!");
    process.exit(0);
  } else {
    console.log("Received Twilio command:", res);
  }
});

ws.on('error', console.error);

setTimeout(() => {
  if (packetsReceived > 0) {
    console.log(`Test completed with ${packetsReceived} media packets received.`);
    process.exit(0);
  } else {
    console.log("Test failed or timed out. No media packets received.");
    process.exit(1);
  }
}, 10000);
