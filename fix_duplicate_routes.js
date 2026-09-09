const fs = require('fs');
const path = require('path');

const frontendRoot = 'd:/booran-warranty-new';

// Check if app/login exists and delete it if app/(portal)/login exists
const directLogin = path.join(frontendRoot, 'app/login');
const portalLogin = path.join(frontendRoot, 'app/(portal)/login');

if (fs.existsSync(directLogin) && fs.existsSync(portalLogin)) {
  fs.rmSync(directLogin, { recursive: true, force: true });
  console.log('✅ Removed duplicate direct route:', directLogin);
} else {
  console.log('No duplicate login found or already resolved.');
}
