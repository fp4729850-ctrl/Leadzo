import https from 'https';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Load from root

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
    console.log(data);
  });
});
req.end();
