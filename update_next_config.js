const fs = require('fs');

const nextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
`;

fs.writeFileSync('d:/booran-warranty-new/next.config.ts', nextConfig.trim() + '\n', 'utf8');
console.log('Updated next.config.ts port to 4000');
