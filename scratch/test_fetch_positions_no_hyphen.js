// scratch/test_fetch_positions_no_hyphen.js
const https = require('https');

const clientId = 'f0433788933f43c2b63cbcf59824ff29';
const clientSecret = 'A49c4180737440e6b75F61577d2cbf79';

const url = `https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositions?client_id=${clientId}&client_secret=${clientSecret}`;

console.log('Fetching:', url.replace(clientSecret, '***'));

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = [];
  res.on('data', (chunk) => { data.push(chunk); });
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    console.log('Response buffer length:', buffer.length);
    const bodyStr = buffer.toString('utf8');
    try {
      const parsed = JSON.parse(bodyStr);
      console.log('Is array:', Array.isArray(parsed));
      if (Array.isArray(parsed)) {
        console.log('Total buses:', parsed.length);
        if (parsed.length > 0) {
          console.log('Sample element:', JSON.stringify(parsed[0], null, 2));
        }
      } else {
        console.log('Not an array, preview:', bodyStr.substring(0, 500));
      }
    } catch (e) {
      console.error('Failed to parse:', e.message);
      console.log('Preview:', bodyStr.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err);
});
