const fs = require('fs');
const path = require('path');

const frontendRoot = 'd:/booran-warranty-new';

function printFile(rel) {
  const p = path.join(frontendRoot, rel);
  if (fs.existsSync(p)) {
    console.log('=== ' + rel + ' ===');
    console.log(fs.readFileSync(p, 'utf8'));
  }
}

printFile('components/header.tsx');
