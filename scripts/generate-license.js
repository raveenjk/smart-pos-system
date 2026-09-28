#!/usr/bin/env node

/**
 * POS System - Shop License Key Generator CLI
 * Run this tool whenever a shop buys your POS software.
 * 
 * Usage:
 *   node scripts/generate-license.js <MACHINE_ID> [TIER]
 * 
 * Example:
 *   node scripts/generate-license.js A4F1-89C2-D31E LIFETIME
 */

const crypto = require('crypto');

const LICENSE_SECRET = 'POS_SYSTEM_SL_MASTER_KEY_2026_SECURE_AUTH';

function generateLicenseKey(machineId, tier = 'LIFETIME') {
  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const payload = `${cleanId}:${tier}`;
  const hmac = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').toUpperCase();
  const signature = hmac.slice(0, 8);
  return `POS-${tier.slice(0, 4)}-${cleanId.slice(0, 6)}-${signature}`;
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\n======================================================');
  console.log('   🔑 POS System - License Key Generator');
  console.log('======================================================');
  console.log('Usage:');
  console.log('  node scripts/generate-license.js <MACHINE_ID> [LIFETIME|ANNUAL]\n');
  console.log('Example:');
  console.log('  node scripts/generate-license.js 3D9F-78A1-4C2E LIFETIME\n');
  process.exit(1);
}

const machineId = args[0];
const tier = (args[1] || 'LIFETIME').toUpperCase();

if (!['LIFETIME', 'ANNUAL'].includes(tier)) {
  console.error('❌ Error: Tier must be either LIFETIME or ANNUAL');
  process.exit(1);
}

const key = generateLicenseKey(machineId, tier);

console.log('\n======================================================');
console.log('   🎉 LICENSE KEY GENERATED SUCCESSFULLY');
console.log('======================================================');
console.log(`Machine ID : ${machineId}`);
console.log(`Plan Tier  : ${tier}`);
console.log(`License Key: \x1b[32m\x1b[1m${key}\x1b[0m`);
console.log('======================================================\n');
