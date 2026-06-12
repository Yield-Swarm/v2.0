const https = require('https');
const crypto = require('crypto');

function decrypt(encrypted) {
  const keyHex = 'a75a27b8b6cf1e7a66cbc44a4378c48fc800e9d729cc9e430d19a5d087';
  const key = Buffer.from(keyHex, 'hex');
  const parts = encrypted.split(':');
  if (parts.length !== 3) return encrypted;
  const [ivHex, tagHex, ctHex] = parts;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

const rawAppId = 'enc:adafddfaa34309a5f05275e15da5a364:0f614a122fe3c4145cf7d108b197fecd:a75a27b8b6cf1e7a66cbc44a4378c48fc800e9d729cc9e430d19a5d087';
const rawToken = 'enc:7e6dbc20b07fe484b1a11698f573860f:b5668314de6991edc68af68aae614121:d6ba1c52a960089500dc53c7c40040aa492e5dbb4d2d3151d57aeeab42192087102e518467793ace9cdb9342098e5a42f7865cde1bb3255e3175f670ac1e6680';

const appId = decrypt(rawAppId);
const token = decrypt(rawToken);

console.log('APP_ID:', appId ? appId.slice(0, 20) + '...' : 'DECRYPT FAILED');
console.log('TOKEN:', token ? token.slice(0, 20) + '...' : 'DECRYPT FAILED');

function squareReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'connect.squareup.com', path, method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Square-Version': '2026-05-20',
      },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${d.slice(0, 300)}`);
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

squareReq('GET', '/v2/catalog/list', null)
  .then(() => {
    console.log('--- Catalog test done ---');
  })
  .catch(e => console.error('Error:', e.message));