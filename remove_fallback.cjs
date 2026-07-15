const fs = require('fs');
const path = './supabase/functions/seoAi_generateContent/index.ts';
let content = fs.readFileSync(path, 'utf-8');

// We will replace the entire fallback block back to just throwing the error.
const fallbackStart = content.indexOf("// Fallback to Pollinations AI");
if (fallbackStart !== -1) {
    const fallbackEnd = content.indexOf("throw new Error(lastError?.message || \"All AI models failed, including fallback.\");") + "throw new Error(lastError?.message || \"All AI models failed, including fallback.\");".length;
    const newEnding = `throw new Error(lastError?.message || "Failed to generate content");`;
    content = content.substring(0, fallbackStart) + newEnding + content.substring(fallbackEnd);
    fs.writeFileSync(path, content);
    console.log("Removed fallback from generateContent!");
} else {
    console.log("Fallback not found!");
}
