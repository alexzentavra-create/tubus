// scratch/check_ids.js
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
      console.log('Total buses:', parsed.length);
      
      const targetIds = ['37', '39', '59', '102', '152'];
      targetIds.forEach(id => {
        const matches = parsed.filter(b => b.route_id === id);
        console.log(`\n=== Matches for route_id="${id}" (${matches.length} buses) ===`);
        if (matches.length > 0) {
          console.log('Sample:', matches[0]);
          const uniqueShortNames = [...new Set(matches.map(m => m.route_short_name))];
          const uniqueAgencies = [...new Set(matches.map(m => m.agency_name))];
          console.log('Unique route_short_names:', uniqueShortNames);
          console.log('Unique agencies:', uniqueAgencies);
        }
      });
    } catch (e) {
      console.error(e);
    }
  });
});
