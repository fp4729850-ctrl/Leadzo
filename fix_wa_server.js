const fs = require('fs');
let code = fs.readFileSync('/root/wa-server/index.js', 'utf8');

// The block we want to replace
const targetStr = `      try {
        const response = await fetch(\`\${process.env.VITE_SUPABASE_URL}/functions/v1/whatsapp_local_webhook\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, accountId, fromNumber, content, contactName })
        });`;

// What we want to replace it with
const replaceStr = `      try {
        const accountInfo = userAccounts[userId]?.find(a => a.id === accountId);
        const response = await fetch(\`\${process.env.VITE_SUPABASE_URL}/functions/v1/whatsapp_local_webhook\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, accountId, fromNumber, content, contactName, aiPrompt: accountInfo?.aiPrompt, isAiActive: accountInfo?.isAiActive })
        });`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('/root/wa-server/index.js', code);
    console.log("Successfully replaced");
} else {
    console.log("Target not found");
}
