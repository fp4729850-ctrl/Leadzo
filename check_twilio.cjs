const https = require('https');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const options = {
  hostname: 'api.twilio.com',
  path: `/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=3`,
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64')
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    for (const call of json.calls) {
      console.log(`Call SID: ${call.sid}, Status: ${call.status}, To: ${call.to}, Date: ${call.date_created}`);
    }
  });
});
req.end();
