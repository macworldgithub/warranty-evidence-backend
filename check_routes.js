const fs = require('fs');
const path = require('path');

const frontendRoot = 'd:/booran-warranty-new/app';

const appEntries = fs.readdirSync(frontendRoot);
console.log('Entries in app/:', appEntries);
