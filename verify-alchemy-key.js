const crypto = require('crypto');

const WALLET_KEY = process.env.WALLET_ENCRYPTION_KEY || '';
console.log('WALLET_ENCRYPTION_KEY set:', WALLET_KEY.length > 0 ? 'YES (' + WALLET_KEY.substring(0, 8) + '...)' : 'MISSING');

if (!WALLET_KEY) {
  console.error('ERROR: WALLET_ENCRYPTION_KEY not set in environment');
  process.exit(1);
}

const keyBuf = Buffer.alloc(32);
Buffer.from(WALLET_KEY).copy(keyBuf);

// Test decryption of existing Render value
const existingEncrypted = 'cc094b51edd0f068d5be543e108ad23a:698dc2f71fb0db23ed52517b2f3f62b6:5306c84c5307c763dc84e7872c919f3840d590bed4';
const parts = existingEncrypted.split(':');
if (parts.length === 3) {
  const [ivHex, tagHex, ciphertextHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    console.log('Current decrypted value:', decrypted);
  } catch (e) {
    console.log('Decryption failed:', e.message);
  }
}

// Encrypt the new key
const newKey = 'rATpflTDTWP3DfgM9XgMn';
const ivNew = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, ivNew);
const enc = Buffer.concat([cipher.update(newKey, 'utf8'), cipher.final()]);
const tagNew = cipher.getAuthTag();
const encryptedNew = 'enc:' + ivNew.toString('hex') + ':' + tagNew.toString('hex') + ':' + enc.toString('hex');
console.log('\nNew encrypted ALCHEMY_API_KEY:');
console.log(encryptedNew);
console.log('Total length:', encryptedNew.length, 'chars');

// Verify by decrypting
const innerParts = encryptedNew.slice(4).split(':');
const [iv2Hex, tag2Hex, ct2Hex] = innerParts;
const iv2 = Buffer.from(iv2Hex, 'hex');
const tag2 = Buffer.from(tag2Hex, 'hex');
const ct2 = Buffer.from(ct2Hex, 'hex');
const decipher2 = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv2);
decipher2.setAuthTag(tag2);
const reDecrypted = Buffer.concat([decipher2.update(ct2), decipher2.final()]).toString('utf8');
console.log('Re-decrypted matches original:', reDecrypted === newKey ? 'YES' : 'NO (' + reDecrypted + ')');

// Test with Alchemy API
async function testAlchemyConnection() {
  const url = `https://eth-mainnet.g.alchemy.com/v2/${newKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    const data = await res.json();
    if (data.result) {
      console.log('\nAlchemy connection: OK — block:', data.result);
    } else {
      console.log('\nAlchemy connection response:', JSON.stringify(data));
    }
  } catch (e) {
    console.log('\nAlchemy connection test failed:', e.message);
  }
}
testAlchemyConnection();