import os from 'os';
import crypto from 'crypto';
import { getDb } from '../database/schema';

// Master secret for signing license keys (Keep private to your business)
const LICENSE_SECRET = 'POS_SYSTEM_SL_MASTER_KEY_2026_SECURE_AUTH';

export function getMachineId(): string {
  try {
    const networkInterfaces = os.networkInterfaces();
    let mac = '';
    for (const key of Object.keys(networkInterfaces)) {
      const net = networkInterfaces[key];
      if (net) {
        for (const item of net) {
          if (!item.internal && item.mac && item.mac !== '00:00:00:00:00:00') {
            mac = item.mac;
            break;
          }
        }
      }
      if (mac) break;
    }

    // Use permanent hardware identifiers: Physical MAC address + CPU processor model
    // This ensures that formatting the PC or reinstalling Windows will NOT change the Machine ID!
    const cpuModel = os.cpus()?.[0]?.model || 'GENERIC_CPU';
    const raw = `HW-${mac || 'NOMAC'}-${cpuModel}-${os.arch()}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();

    // Format as XXXX-XXXX-XXXX
    return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
  } catch (err) {
    return 'POS-NODE-DEFAULT-ID';
  }
}

export function generateLicenseKey(machineId: string, tier: 'LIFETIME' | 'ANNUAL' = 'LIFETIME'): string {
  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const payload = `${cleanId}:${tier}`;
  const hmac = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').toUpperCase();
  const signature = hmac.slice(0, 8);
  return `POS-${tier.slice(0, 4)}-${cleanId.slice(0, 6)}-${signature}`;
}

export function verifyLicenseKey(key: string, machineId: string): { valid: boolean; tier?: string; error?: string } {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'License key is required' };
  }

  const parts = key.trim().toUpperCase().split('-');
  if (parts.length !== 4 || parts[0] !== 'POS') {
    return { valid: false, error: 'Invalid license key format' };
  }

  const [_, tierPrefix, midPrefix, signature] = parts;
  const tier = tierPrefix === 'LIFE' ? 'LIFETIME' : tierPrefix === 'ANNU' ? 'ANNUAL' : null;
  if (!tier) {
    return { valid: false, error: 'Unrecognized license tier' };
  }

  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!cleanId.startsWith(midPrefix)) {
    return { valid: false, error: 'This license key is not issued for this computer hardware' };
  }

  const expectedKey = generateLicenseKey(machineId, tier as any);
  if (expectedKey.toUpperCase() === key.trim().toUpperCase()) {
    return { valid: true, tier };
  }

  return { valid: false, error: 'Invalid cryptographic signature' };
}

export function getLicenseStatus(): {
  isActivated: boolean;
  machineId: string;
  licenseKey: string;
  tier: string;
} {
  const db = getDb();
  const machineId = getMachineId();
  const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'license_key'").get() as any;
  const actRow = db.prepare("SELECT value FROM settings WHERE key = 'license_activated'").get() as any;

  const licenseKey = keyRow?.value || '';
  const isMarkedActive = actRow?.value === 'true';

  if (licenseKey && isMarkedActive) {
    const check = verifyLicenseKey(licenseKey, machineId);
    if (check.valid) {
      return {
        isActivated: true,
        machineId,
        licenseKey,
        tier: check.tier || 'LIFETIME',
      };
    }
  }

  return {
    isActivated: false,
    machineId,
    licenseKey,
    tier: 'Trial / Unregistered',
  };
}

export function activateLicense(licenseKey: string): { success: boolean; message: string } {
  const machineId = getMachineId();
  const result = verifyLicenseKey(licenseKey, machineId);

  if (!result.valid) {
    return { success: false, message: result.error || 'Activation failed' };
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES ('license_key', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(licenseKey.trim().toUpperCase());

  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES ('license_activated', 'true', datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = 'true', updated_at = datetime('now')
  `).run();

  return { success: true, message: `Activated successfully as ${result.tier}!` };
}
