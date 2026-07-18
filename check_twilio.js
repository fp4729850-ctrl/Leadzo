const twilio = require('twilio');
require('dotenv').config();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
async function run() {
  const calls = await client.calls.list({limit: 3});
  for (const call of calls) {
    console.log("Call SID:", call.sid);
    console.log("Status:", call.status);
    console.log("To:", call.to);
    console.log("Date:", call.dateCreated);
    const notifs = await client.calls(call.sid).notifications().list({limit: 1});
    if (notifs.length > 0) {
      console.log("Errors:", notifs[0].messageText);
    }
  }
}
run();
