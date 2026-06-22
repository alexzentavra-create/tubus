// scratch/find_closest_line_to_screenshot.js
const fs = require('fs');
const path = require('path');

const tsFilePath = path.join(__dirname, '../src/lib/officialRoutes.ts');
const tsContent = fs.readFileSync(tsFilePath, 'utf8');
const match = tsContent.match(/export const OFFICIAL_ROUTES: Record<string, OfficialRoute> = ({[\s\S]*})/);
const OFFICIAL_ROUTES = eval('(' + match[1] + ')');

// In the screenshot, we see coordinates around:
// Lat: -34.595 to -34.615
// Lng: -58.39 to -58.41
// Let's print for each of our 8 lines:
// How many points of its 'ida' or 'vuelta' path fall within this bounding box?

const bbox = {
  minLat: -34.62,
  maxLat: -34.585,
  minLng: -58.41,
  maxLng: -58.38
};

Object.keys(OFFICIAL_ROUTES).forEach(lineKey => {
  const line = OFFICIAL_ROUTES[lineKey];
  
  const idaPoints = (line.ida?.path || []).filter(p => 
    p.lat >= bbox.minLat && p.lat <= bbox.maxLat &&
    p.lng >= bbox.minLng && p.lng <= bbox.maxLng
  );

  const vueltaPoints = (line.vuelta?.path || []).filter(p => 
    p.lat >= bbox.minLat && p.lat <= bbox.maxLat &&
    p.lng >= bbox.minLng && p.lng <= bbox.maxLng
  );

  console.log(`Line ${lineKey}:`);
  console.log(`  Ida points in box: ${idaPoints.length}`);
  if (idaPoints.length > 0) {
    console.log(`    Sample: (${idaPoints[0].lat.toFixed(4)}, ${idaPoints[0].lng.toFixed(4)}) to (${idaPoints[idaPoints.length-1].lat.toFixed(4)}, ${idaPoints[idaPoints.length-1].lng.toFixed(4)})`);
  }
  console.log(`  Vuelta points in box: ${vueltaPoints.length}`);
  if (vueltaPoints.length > 0) {
    console.log(`    Sample: (${vueltaPoints[0].lat.toFixed(4)}, ${vueltaPoints[0].lng.toFixed(4)}) to (${vueltaPoints[vueltaPoints.length-1].lat.toFixed(4)}, ${vueltaPoints[vueltaPoints.length-1].lng.toFixed(4)})`);
  }
});
