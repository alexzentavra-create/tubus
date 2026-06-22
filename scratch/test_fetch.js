// scratch/test_fetch.js
const https = require('https');

const clientId = 'f0433788933f43c2b63cbcf59824ff29';
const clientSecret = 'A49c4180737440e6b75F61577d2cbf79';

const url = `https://api-transporte.buenosaires.gob.ar/colectivos/vehiclePositionsSimple?client_id=${clientId}&client_secret=${clientSecret}`;

console.log('Fetching:', url.replace(clientSecret, '***'));

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      console.log('Response length:', data.length);
      const parsed = JSON.parse(data);
      console.log('Array length:', parsed.length);
      if (parsed.length > 0) {
        console.log('First element sample:', JSON.stringify(parsed[0], null, 2));
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      console.log('First 500 chars of response:', data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err);
});
