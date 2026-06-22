// scratch/download_gtfs_v2.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const clientId = 'f0433788933f43c2b63cbcf59824ff29';
const clientSecret = 'A49c4180737440e6b75F61577d2cbf79';

const url = `https://apitransporte.buenosaires.gob.ar/colectivos/feed-gtfs?client_id=${clientId}&client_secret=${clientSecret}`;

console.log('Downloading static feed from apitransporte...');

const destPath = path.join(__dirname, 'feed-gtfs.zip');
const file = fs.createWriteStream(destPath);

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  if (res.statusCode !== 200) {
    console.error('Failed to download: status ' + res.statusCode);
    res.resume();
    return;
  }

  res.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('Download completed. File saved at:', destPath);
    const stats = fs.statSync(destPath);
    console.log('File size in bytes:', stats.size);
  });
}).on('error', (err) => {
  fs.unlink(destPath, () => {});
  console.error('Download error:', err.message);
});
