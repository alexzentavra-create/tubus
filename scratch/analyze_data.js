// scratch/analyze_data.js
const https = require('https');

const clientId = 'f0433788933f43c2b63cbcf59824ff29';
const clientSecret = 'A49c4180737440e6b75F61577d2cbf79';

const url = `https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositionsSimple?client_id=${clientId}&client_secret=${clientSecret}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Total buses fetched:', parsed.length);
      
      const countsByRouteId = {};
      const countsByRouteShortName = {};
      
      parsed.forEach(bus => {
        countsByRouteId[bus.route_id] = (countsByRouteId[bus.route_id] || 0) + 1;
        countsByRouteShortName[bus.route_short_name] = (countsByRouteShortName[bus.route_short_name] || 0) + 1;
      });

      console.log('Sample counts by route_id:', Object.entries(countsByRouteId).slice(0, 30));
      console.log('Sample counts by route_short_name:', Object.entries(countsByRouteShortName).slice(0, 30));

      const targets = ['12', '28', '37', '39', '59', '60', '102', '152'];
      targets.forEach(t => {
        const matchingId = parsed.filter(b => b.route_id === t);
        const matchingShortName = parsed.filter(b => b.route_short_name === t);
        console.log(`Target Line ${t}: matched by route_id=${matchingId.length}, matched by route_short_name=${matchingShortName.length}`);
        if (matchingShortName.length > 0) {
          console.log(`  Sample:`, matchingShortName[0]);
        }
      });
    } catch (e) {
      console.error('Failed to parse:', e.message);
    }
  });
});
