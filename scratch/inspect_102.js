// scratch/inspect_102.js
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '../src/lib/officialRoutes.ts'), 'utf8');

// The file exports OFFICIAL_ROUTES. Let's find "102":
const startIdx = content.indexOf('"102":');
if (startIdx !== -1) {
  console.log('Found Line 102 in OFFICIAL_ROUTES!');
  // Let's print out the first 500 characters from this index
  console.log(content.substring(startIdx, startIdx + 800));
} else {
  console.log('Line 102 not found in officialRoutes.ts');
}
