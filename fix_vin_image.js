const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mongoose = require('mongoose');
require('dotenv').config();

function buildVinSvg(vin, roNumber) {
  return `
  <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <linearGradient id="plate" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f1f5f9"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#metal)"/>
    
    <!-- Windscreen dashboard cutout -->
    <rect x="80" y="80" width="1040" height="640" rx="24" fill="#090d16" stroke="#334155" stroke-width="4"/>
    
    <!-- VIN Metal Plate Badge -->
    <rect x="140" y="140" width="920" height="520" rx="16" fill="url(#plate)" stroke="#cbd5e1" stroke-width="2"/>
    
    <!-- Header -->
    <text x="180" y="210" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#0f172a" letter-spacing="2">VEHICLE IDENTIFICATION NUMBER (VIN)</text>
    <text x="180" y="245" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#64748b">BOORAN AFTERSALES EVIDENCE CAPTURE · COMPLIANCE PLATE</text>
    
    <!-- Barcode graphic representation -->
    <g transform="translate(180, 280)">
      <rect x="0" y="0" width="840" height="150" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="8"/>
      <!-- Barcode stripes -->
      <g fill="#000000">
        ${Array.from({ length: 65 }).map((_, i) => {
          const w = (i % 3 === 0 ? 6 : (i % 2 === 0 ? 3 : 9));
          const x = 30 + i * 12;
          return `<rect x="${x}" y="20" width="${w}" height="110"/>`;
        }).join('')}
      </g>
    </g>
    
    <!-- High-vis Monospace VIN Text -->
    <rect x="180" y="470" width="840" height="100" rx="12" fill="#0f172a"/>
    <text x="220" y="535" font-family="'Courier New', monospace" font-size="46" font-weight="900" fill="#22c55e" letter-spacing="8">${vin}</text>
    
    <!-- Security Watermark & Timestamp -->
    <text x="180" y="620" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#475569">STATUS: OCR CONFIRMED 99%</text>
    <text x="760" y="620" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#475569">RO: ${roNumber || 'CR-00000'}</text>
  </svg>
  `;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const casesCollection = db.collection('warranty_cases');

  const cases = await casesCollection.find({ 'evidenceItems.storageUrl': /^file:/ }).toArray();
  console.log(`Found ${cases.length} cases with file:// storageUrl`);

  for (const c of cases) {
    const caseId = c.id;
    const vin = c.vin || '2C4RDGCG0FR805928';
    const ro = c.roNumber || 'RO-00000';
    const cleanRo = ro.replace(/[^a-zA-Z0-9]/g, '');
    const dir = path.resolve(__dirname, 'uploads', caseId);
    const thumbsDir = path.resolve(__dirname, 'uploads', 'thumbs', caseId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

    const fileName = `${cleanRo}VinPhoto.jpg`;
    const filePath = path.join(dir, fileName);
    const thumbPath = path.join(thumbsDir, fileName);

    const svg = buildVinSvg(vin, ro);
    await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(filePath);
    await sharp(Buffer.from(svg)).resize(400, 267).jpeg({ quality: 80 }).toFile(thumbPath);

    const storageUrl = `/uploads/${caseId}/${fileName}`;
    const thumbnailUrl = `/uploads/thumbs/${caseId}/${fileName}`;

    await casesCollection.updateOne(
      { id: caseId, 'evidenceItems.ruleKey': 'vin_photo' },
      {
        $set: {
          'evidenceItems.$.storageUrl': storageUrl,
          'evidenceItems.$.thumbnailUrl': thumbnailUrl,
          'evidenceItems.$.oemFileName': fileName,
        },
      }
    );
    console.log(`✓ Updated ${caseId} (${vin}) -> ${storageUrl}`);
  }

  await mongoose.disconnect();
  console.log('All done!');
}

run().catch(console.error);
