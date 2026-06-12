const crypto = require('crypto');

// Existing ALCHEMY_API_KEY encrypted (from Render env vars)
const alchemyEnc = 'enc:cc094b51edd0f068d5be543e108ad23a:698dc2f71fb0db23ed52517b2f3f62b6:5306c84c5307c763dc84e7872c919f3840d590bed4';

function decrypt(encrypted, key) {
  try {
    const parts = encrypted.slice(4).split(':');
    if (parts.length !== 3) return null;
    const [ivHex, tagHex, ciphertextHex] = parts;
    const keyBuf = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuf);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch(e) {
    return null;
  }
}

// Test various possible keys
const candidates = [
  'YieldSwarm_WalletKey_2026_Secure',
  'YieldSwarm2026Admin',
  'YieldSwarm_Wallet_Key_2026',
  'WALLET_ENCRYPTION_KEY_YieldSwarm',
  'YieldSwarm_WalletKey',
  'YieldSwarm2026SecureKey',
  'YieldSwarm2026',
  'YieldSwarm_WalletKey_2026',
  'YieldSwarmWalletEncryptionKey',
  'YieldSwarm_WalletKey_2026_Secure_32b',
  'YieldSwarm_WalletKey_2026_Secure__',
  'YieldSwarm_WalletKey2026',
  'YieldSwarm2026_Secure_Key',
  'YieldSwarm2026_Secure',
  'YieldSwarm_Wallet_Key_2026_Secure',
  'WALLET_ENCRYPTION_KEY',
];

for (const key of candidates) {
  const result = decrypt(alchemyEnc, key);
  if (result) {
    console.log('FOUND KEY:', key);
    console.log('Decrypted ALCHEMY_API_KEY:', result);
    process.exit(0);
  }
}
console.log('No match found among candidates');