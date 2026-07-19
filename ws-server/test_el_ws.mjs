import WebSocket from 'ws';
const ELEVENLABS_API_KEY = "sk_5f8b1cc0df76cb6eb94db78b1f53c36c0c1cdea6342da6f8";
const elevenVoiceId = "21m00Tcm4TlvDq8ikWAM";
const elUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}/stream-input?model_id=eleven_turbo_v2_5&output_format=ulaw_8000`;

const elWs = new WebSocket(elUrl);
elWs.on('open', () => {
    console.log("Connected!");
    elWs.send(JSON.stringify({
      text: " ",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      xi_api_key: ELEVENLABS_API_KEY,
    }));
    elWs.send(JSON.stringify({ text: "Hello from ElevenLabs!", try_trigger_generation: true }));
    elWs.send(JSON.stringify({ text: "" }));
});
elWs.on('message', (data) => {
    let res = JSON.parse(data.toString());
    if (res.audio) console.log("Received audio chunk! Length:", res.audio.length);
    if (res.isFinal) console.log("Finished streaming");
});
elWs.on('close', (code, reason) => {
    console.log("Closed:", code, reason.toString());
});
elWs.on('error', (err) => console.error("Error:", err));
