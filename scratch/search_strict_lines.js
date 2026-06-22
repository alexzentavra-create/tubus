// scratch/search_strict_lines.js
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
      
      const targets = ['12', '28', '37', '39', '59', '60', '102', '152'];
      targets.forEach(t => {
        const regex = new RegExp(`^${t}[A-Z]?$`, 'i');
        const matches = parsed.filter(b => regex.test(b.route_short_name));
        console.log(`Line ${t}: matched ${matches.length} buses strictly`);
        if (matches.length > 0) {
          const uniqueCombos = [...new Set(matches.map(m => `route_short_name: ${m.route_short_name} | agency: ${m.agency_name}`))];
          console.log(`  Combos:`, uniqueCombos);
        }
      });
    } catch (e) {
      console.error('Error:', e.message);
    }
  });
});
