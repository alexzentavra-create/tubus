// scratch/find_bus_info.js
const https = require('https');

const clientId = 'f0433788933f43c2b63cbcf59824ff29';
const clientSecret = 'A49c4180737440e6b75F61577d2cbf79';

const url = `https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositionsSimple?client_id=${clientId}&client_secret=${clientSecret}`;

https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        console.error('Parsed response is not an array:', typeof parsed, parsed);
        return;
      }
      console.log('Total buses:', parsed.length);
      
      const searchTerms = ['39', '59', '60', '152'];
      searchTerms.forEach(term => {
        console.log(`\n=== Matches for "${term}" ===`);
        const matches = parsed.filter(b => {
          const rId = String(b.route_id || '').toLowerCase();
          const rShort = String(b.route_short_name || '').toLowerCase();
          const agency = String(b.agency_name || '').toLowerCase();
          const headsign = String(b.trip_headsign || '').toLowerCase();
          return rId.includes(term) || rShort.includes(term) || agency.includes(term) || headsign.includes(term);
        });
        console.log(`Found ${matches.length} matches`);
        if (matches.length > 0) {
          console.log('Unique route_id values:', [...new Set(matches.map(m => m.route_id))]);
          console.log('Unique route_short_name values:', [...new Set(matches.map(m => m.route_short_name))]);
          console.log('Unique agency_name values:', [...new Set(matches.map(m => m.agency_name))]);
          console.log('Sample matching bus:', matches[0]);
        }
      });
    } catch (e) {
      console.error('Failed to parse:', e.message);
      console.log('Response excerpt:', data.substring(0, 500));
    }
  });
});
