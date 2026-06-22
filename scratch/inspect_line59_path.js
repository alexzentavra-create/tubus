// scratch/inspect_line59_path.js
const fs = require('fs');
const path = require('path');

const tsFilePath = path.join(__dirname, '../src/lib/officialRoutes.ts');
const tsContent = fs.readFileSync(tsFilePath, 'utf8');
const match = tsContent.match(/export const OFFICIAL_ROUTES: Record<string, OfficialRoute> = ({[\s\S]*})/);
const OFFICIAL_ROUTES = eval('(' + match[1] + ')');

const line59 = OFFICIAL_ROUTES['59'];
console.log('Line 59 route details:');
console.log(`  Name: ${line59.routeName}`);
console.log(`  Ida: path length = ${line59.ida?.path?.length || 0}, stops = ${line59.ida?.stops?.length || 0}`);
console.log(`  Vuelta: path length = ${line59.vuelta?.path?.length || 0}, stops = ${line59.vuelta?.stops?.length || 0}`);

if (line59.ida?.path?.length > 0) {
  const lats = line59.ida.path.map(p => p.lat);
  const lngs = line59.ida.path.map(p => p.lng);
  console.log('  Ida Path Bounds:');
  console.log(`    Lats: ${Math.min(...lats)} to ${Math.max(...lats)}`);
  console.log(`    Lngs: ${Math.min(...lngs)} to ${Math.max(...lngs)}`);
}

if (line59.vuelta?.path?.length > 0) {
  const lats = line59.vuelta.path.map(p => p.lat);
  const lngs = line59.vuelta.path.map(p => p.lng);
  console.log('  Vuelta Path Bounds:');
  console.log(`    Lats: ${Math.min(...lats)} to ${Math.max(...lats)}`);
  console.log(`    Lngs: ${Math.min(...lngs)} to ${Math.max(...lngs)}`);
}
