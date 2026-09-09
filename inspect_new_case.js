const fs = require('fs');
const path = require('path');

const filePath = path.join('d:/booran-warranty-new/app/(portal)/cases/new/page.tsx');
if (fs.existsSync(filePath)) {
  console.log(fs.readFileSync(filePath, 'utf8'));
} else {
  console.log('File not found:', filePath);
}
