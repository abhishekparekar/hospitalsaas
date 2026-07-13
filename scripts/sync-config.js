const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../shared/firebase-config.json');
const destWeb = path.join(__dirname, '../web/src/firebase-config.json');
const destMobile = path.join(__dirname, '../mobile/src/firebase-config.json');

try {
  // Ensure the shared directory and file exist
  if (!fs.existsSync(srcPath)) {
    console.error(`Config source file not found at: ${srcPath}`);
    process.exit(1);
  }

  // Ensure target directories exist before copying
  fs.mkdirSync(path.dirname(destWeb), { recursive: true });
  fs.mkdirSync(path.dirname(destMobile), { recursive: true });

  fs.copyFileSync(srcPath, destWeb);
  console.log(`Synced firebase config to Web: ${destWeb}`);

  fs.copyFileSync(srcPath, destMobile);
  console.log(`Synced firebase config to Mobile: ${destMobile}`);
} catch (error) {
  console.error('Failed to sync config files:', error);
  process.exit(1);
}
