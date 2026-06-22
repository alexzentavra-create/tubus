// scratch/print_line12_stops.js
const fs = require('fs');
const path = require('path');

const tsFilePath = path.join(__dirname, '../src/lib/officialRoutes.ts');
const tsContent = fs.readFileSync(tsFilePath, 'utf8');
const match = tsContent.match(/export const OFFICIAL_ROUTES: Record<string, OfficialRoute> = ({[\s\S]*})/);
const OFFICIAL_ROUTES = eval('(' + match[1] + ')');

const line12 = OFFICIAL_ROUTES['12'];
console.log('Line 12 stops:');
line12.ida.stops.forEach((s, idx) => {
  console.log(`  Stop ${idx+1}: ${s.name} at (${s.lat}, ${s.lng})`);
});
