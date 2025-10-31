const fs = require('fs');
const { execSync } = require('child_process');

const pushConfig = JSON.parse(fs.readFileSync('push.json', 'utf8'));

pushConfig.include.forEach(file => {
  try { execSync(`git add ${file}`); console.log(`added ${file}`)} catch {}
});

try { execSync('git commit -m "Auto commit via push.json"'); } catch {}
execSync('git push origin main');
