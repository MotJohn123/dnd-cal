// Script to generate PNG icons from SVG for PWA
// Run with: node scripts/generate-icons.js

const sharp = require('sharp');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  const icons = [
    { input: 'icon-192.svg', output: 'icon-192.png', size: 192 },
    { input: 'icon-512.svg', output: 'icon-512.png', size: 512 },
    { input: 'icon-maskable-192.svg', output: 'icon-maskable-192.png', size: 192 },
    { input: 'icon-maskable-512.svg', output: 'icon-maskable-512.png', size: 512 },
  ];

  for (const icon of icons) {
    const inputPath = path.join(iconsDir, icon.input);
    const outputPath = path.join(iconsDir, icon.output);

    try {
      await sharp(inputPath)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      console.log(`Generated: ${icon.output}`);
    } catch (error) {
      console.error(`Failed to generate ${icon.output}:`, error.message);
    }
  }

  console.log('Icon generation complete!');
}

generateIcons();
