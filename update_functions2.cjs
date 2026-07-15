const fs = require('fs');

const dirs = [
  'seoAi_crawlAndAudit',
  'seoAi_researchKeywords',
  'seoAi_generateContent',
  'seoAi_generatePublishPlan',
  'seoAi_generateMonitorReport'
];

for (const dir of dirs) {
  const path = `./supabase/functions/${dir}/index.ts`;
  let content = fs.readFileSync(path, 'utf-8');
  content = content.replace(/jsonMode: true/g, 'jsonMode: true, model: "openai"');
  fs.writeFileSync(path, content);
}
console.log("Updated model to openai!");
