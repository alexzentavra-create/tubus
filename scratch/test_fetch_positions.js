// scratch/test_fetch_positions.js
const https = require('https');

const clientId = 'f0433788933f43c2b63cbcf59824ff29';
const clientSecret = 'A49c4180737440e6b75F61577d2cbf79';

const url = `https://api-transporte.buenosaires.gob.ar/colectivos/vehiclePositions?client_id=${clientId}&client_secret=${clientSecret}`;

console.log('Fetching:', url.replace(clientSecret, '***'));

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = [];
  res.on('data', (chunk) => { data.push(chunk); });
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    console.log('Response buffer length:', buffer.length);
    console.log('First 200 bytes as string:', buffer.toString('utf8', 0, Math.min(buffer.length, 200)));
  });
}).on('error', (err) => {
  console.error('Fetch error:', err);
});
