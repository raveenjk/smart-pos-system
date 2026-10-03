const crypto = require('crypto');

async function testWebCrypto() {
  const LICENSE_SECRET = 'POS_SYSTEM_SL_MASTER_KEY_2026_SECURE_AUTH';
  const machineId = 'A4F1-89C2-D31E';
  const tier = 'LIFETIME';

  // 1. Node.js crypto
  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const payload = `${cleanId}:${tier}`;
  const hmac = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').toUpperCase();
  const nodeKey = `POS-${tier.slice(0, 4)}-${cleanId.slice(0, 6)}-${hmac.slice(0, 8)}`;

  // 2. Web Crypto API (browser standard)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(LICENSE_SECRET);
  const msgData = encoder.encode(payload);
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await globalThis.crypto.subtle.sign('HMAC', key, msgData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const webKey = `POS-${tier.slice(0, 4)}-${cleanId.slice(0, 6)}-${hex.slice(0, 8)}`;

  console.log('Node key    :', nodeKey);
  console.log('WebCrypto key:', webKey);
  console.log('Match?      :', nodeKey === webKey ? '✅ 100% MATCH' : '❌ MISMATCH');
}

testWebCrypto();
