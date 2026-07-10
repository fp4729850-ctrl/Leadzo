const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('/Users/mac/Downloads/hercules_source/Leadzo/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if(content.includes('"convex/react"')) {
    content = content.replace(/"convex\/react"/g, '"@/lib/convex-supabase-adapter.ts"');
    fs.writeFileSync(file, content);
    console.log('Replaced import in:', file);
  }
});
