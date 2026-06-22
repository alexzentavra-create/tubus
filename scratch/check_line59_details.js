// scratch/check_line59_details.js
const fs = require('fs');
const path = require('path');

const tsFilePath = path.join(__dirname, '../src/lib/officialRoutes.ts');
const tsContent = fs.readFileSync(tsFilePath, 'utf8');
const match = tsContent.match(/export const OFFICIAL_ROUTES: Record<string, OfficialRoute> = ({[\s\S]*})/);
const OFFICIAL_ROUTES = eval('(' + match[1] + ')');

const line59 = OFFICIAL_ROUTES['59'];
console.log('Line 59 Route Name:', line59.routeName);
console.log('\nFirst 10 stops for Line 59 Ida:');
line59.ida.stops.slice(0, 10).forEach(s => {
  console.log(`  Stop: ${s.name} at (${s.lat}, ${s.lng})`);
});

console.log('\nFirst 10 path points for Line 59 Ida:');
line59.ida.path.slice(0, 10).forEach((p, idx) => {
  console.log(`  Point ${idx}: (${p.lat}, ${p.lng})`);
});
