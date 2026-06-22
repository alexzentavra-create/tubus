// scratch/list_all_short_names.js
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
        console.log('Excerpt:', data.substring(0, 500));
        return;
      }
      console.log('Total buses:', parsed.length);
      
      const allShortNames = [...new Set(parsed.map(b => b.route_short_name).filter(Boolean))].sort();
      console.log('Total unique short names:', allShortNames.length);
      
      const matches37 = allShortNames.filter(name => name.includes('37'));
      console.log('Short names containing 37:', matches37);
      
      const matches102 = allShortNames.filter(name => name.includes('102'));
      console.log('Short names containing 102:', matches102);

      const matches39 = allShortNames.filter(name => name.includes('39'));
      console.log('Short names containing 39:', matches39);
      
      const matches59 = allShortNames.filter(name => name.includes('59'));
      console.log('Short names containing 59:', matches59);
      
      const matches12 = allShortNames.filter(name => name.includes('12'));
      console.log('Short names containing 12:', matches12);
      
      const matches28 = allShortNames.filter(name => name.includes('28'));
      console.log('Short names containing 28:', matches28);
      
    } catch (e) {
      console.error('JSON Error:', e.message);
      console.log('Excerpt:', data.substring(0, 500));
    }
  });
});
