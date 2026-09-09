const fs = require('fs');
const content = fs.readFileSync('d:/booran-warranty-new/app/(portal)/brand-packs/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.map((rule')) {
    console.log(lines.slice(Math.max(0, idx - 2), idx + 20).join('\n'));
  }
});
