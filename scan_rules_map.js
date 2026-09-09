const fs = require('fs');
const path = require('path');

const srcDir = 'd:/booran-warranty-new';

function scan(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (item === 'node_modules' || item === '.next' || item === '.git') continue;
    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('.map((rule') || content.includes('.map((ruleKey')) {
        console.log('Found map on rules in:', full);
      }
    }
  }
}

scan(srcDir);
