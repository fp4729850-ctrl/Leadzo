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
      if(file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('/Users/mac/Downloads/hercules_source/Leadzo/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if(content.includes('<Unauthenticated>')) {
    content = content.replace(/<Unauthenticated>[\s\S]*?<\/Unauthenticated>/g, '');
    changed = true;
  }
  if(content.includes('<Authenticated>')) {
    content = content.replace(/<Authenticated>/g, '<>');
    content = content.replace(/<\/Authenticated>/g, '</>');
    changed = true;
  }
  
  if(changed) {
    fs.writeFileSync(file, content);
    console.log('Bypassed auth in:', file);
  }
});
