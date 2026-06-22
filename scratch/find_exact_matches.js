// scratch/find_exact_matches.js
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
      
      const lines = ['12', '28', '37', '39', '59', '60', '102', '152'];
      
      // Let's print out all unique route_short_name and agency_name combinations that match our lines
      lines.forEach(l => {
        console.log(`\n--- SEARCHING FOR LINE ${l} ---`);
        const matches = parsed.filter(b => {
          const rShort = String(b.route_short_name || '').toLowerCase();
          const rId = String(b.route_id || '').toLowerCase();
          const agency = String(b.agency_name || '').toLowerCase();
          const headsign = String(b.trip_headsign || '').toLowerCase();
          
          // Check if the short name starts with the line number or is equal, e.g. "12", "12A", "152", etc.
          // Or if agency name matches the known company
          if (rShort === l || rShort.startsWith(l) && isNaN(rShort.substring(l.length))) {
            return true;
          }
          if (l === '12' && agency.includes('callao')) return true;
          if (l === '28' && agency.includes('dota')) return true;
          if (l === '37' && agency.includes('septiembre')) return true;
          if (l === '39' && agency.includes('santa fe')) return true;
          if (l === '59' && agency.includes('ciudad de bs')) return true;
          if (l === '60' && agency.includes('norte')) return true;
          if (l === '102' && agency.includes('sargento')) return true;
          if (l === '152' && agency.includes('tandilense')) return true;
          
          return false;
        });
        
        console.log(`Found ${matches.length} matches`);
        if (matches.length > 0) {
          const uniqueCombos = {};
          matches.forEach(m => {
            const key = `route_short_name: ${m.route_short_name} | agency: ${m.agency_name} | route_id: ${m.route_id}`;
            uniqueCombos[key] = (uniqueCombos[key] || 0) + 1;
          });
          console.log('Combinations found:', uniqueCombos);
        }
      });
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});
