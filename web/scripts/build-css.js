const fs = require('fs');
const { execSync } = require('child_process');

console.log('Compiling TailwindCSS...');
execSync('npx tailwindcss -i ./src/index.css -o ./src/output.css', { stdio: 'inherit' });

console.log('Optimizing CSS (replacing infinity * 1px with 9999px)...');
const outputPath = './src/output.css';
if (fs.existsSync(outputPath)) {
  let content = fs.readFileSync(outputPath, 'utf8');
  content = content.replace(/infinity\s*\*\s*1px/g, '9999px');
  fs.writeFileSync(outputPath, content);
  console.log('CSS optimized successfully.');
} else {
  console.error('Error: output.css not found!');
  process.exit(1);
}
