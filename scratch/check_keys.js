// scratch/check_keys.js
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../src/lib/officialRoutes.ts'), 'utf8');

const keys = [];
const regex = /"([0-9a-zA-Z\-]+)":\s*\{/g;
let match;
while ((match = regex.exec(content)) !== null) {
  keys.push(match[1]);
}
console.log('Found route keys:', keys);
