const { OFFICIAL_ROUTES } = require('./src/lib/officialRoutes.js');

const lines = ['12', '28', '37', '39', '59', '60', '102', '152'];

lines.forEach(num => {
  const route = OFFICIAL_ROUTES[num];
  if (route) {
    const idaStops = route.ida?.stops?.length || 0;
    const vueltaStops = route.vuelta?.stops?.length || 0;
    console.log(`Line ${num}: ida=${idaStops}, vuelta=${vueltaStops}, total_unique_stops_approx=${idaStops + vueltaStops}`);
  } else {
    console.log(`Line ${num} not found in OFFICIAL_ROUTES`);
  }
});
