const fs = require('fs');

const nextConfig = `import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://warranty-evidence.omnisuiteai.com';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: \`\${BACKEND_URL}/api/v1/:path*\`,
      },
      {
        source: '/uploads/:path*',
        destination: \`\${BACKEND_URL}/uploads/:path*\`,
      },
    ];
  },
};

export default nextConfig;
`;

fs.writeFileSync('d:/booran-warranty-new/next.config.ts', nextConfig.trim() + '\n', 'utf8');
console.log('Updated next.config.ts port to 4000');
