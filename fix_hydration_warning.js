const fs = require('fs');
const path = require('path');

const layoutPath = 'd:/booran-warranty-new/app/layout.tsx';

const content = `import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Booran Warranty Review Portal · OmniSuiteAI",
  description: "Workshop-first multi-brand warranty evidence capture, verification, and OEM submission portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={\`\${inter.variable} \${jetbrainsMono.variable} dark\`} suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#081225] text-[#cbd5e1] antialiased selection:bg-[#00f0ff]/20 selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
`;

fs.writeFileSync(layoutPath, content.trim() + '\n', 'utf8');
console.log('✅ Added suppressHydrationWarning to app/layout.tsx');
