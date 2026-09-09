const fs = require('fs');
const path = require('path');

const filePath = path.join('d:/booran-warranty-new/app/(portal)/cases/new/page.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
console.log(lines.slice(0, 100).join('\n'));
