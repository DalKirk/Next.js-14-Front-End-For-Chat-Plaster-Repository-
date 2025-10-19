const https = require('https');

const url = 'https://web-production-3ba7e.up.railway.app/health';

const req = https.get(url, (res) => {
  console.log('STATUS_CODE:', res.statusCode);
  console.log('HEADERS:', res.headers);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', body);
    process.exit(res.statusCode === 200 ? 0 : 2);
  });
});

req.on('error', (e) => {
  console.error('REQUEST_ERROR:', e.message);
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.error('REQUEST_TIMEOUT');
  req.destroy(new Error('Request timeout'));
});
