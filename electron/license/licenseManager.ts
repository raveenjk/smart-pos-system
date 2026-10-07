import os from 'os';
import crypto from 'crypto';
import { BrowserWindow } from 'electron';
import { getDb } from '../database/schema';

// Master secret for signing license keys and trial payloads (Private to software vendor)
const LICENSE_SECRET = 'POS_SYSTEM_SL_MASTER_KEY_2026_SECURE_AUTH';

// Vendor contact details requested by user
export const VENDOR_WHATSAPP = '0705224007';
export const VENDOR_HOTLINE = '070 522 4007';

export type LicenseStatusCode = 'ACTIVE' | 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'SETUP_REQUIRED' | 'TAMPERED';

export interface LicenseStatus {
  status: LicenseStatusCode;
  isActivated: boolean;
  isTrial: boolean;
  isExpired: boolean;
  tier: string; // 'LIFETIME' | 'ANNUAL' | 'MONTHLY' | 'TRIAL' | 'NONE'
  machineId: string;
  licenseKey: string;
  daysLeft: number;
  trialStart: string | null;
  trialEnd: string | null;
  expiresAt?: string | null;
  whatsappNumber: string;
  hotline: string;
  message: string;
}

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
  } catch {
    return 'POS-NODE-DEFAULT-ID';
  }
}

export function generateLicenseKey(
  machineId: string,
  tier: 'LIFETIME' | 'ANNUAL' | 'MONTHLY' = 'LIFETIME'
): string {
  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const tierPrefix = tier === 'MONTHLY' ? 'MNTH' : tier === 'ANNUAL' ? 'ANNU' : 'LIFE';
  const payload = `${cleanId}:${tier}`;
  const hmac = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').toUpperCase();
  const signature = hmac.slice(0, 8);
  return `POS-${tierPrefix}-${cleanId.slice(0, 6)}-${signature}`;
}

export function verifyLicenseKey(
  key: string,
  machineId: string
): { valid: boolean; tier?: 'LIFETIME' | 'ANNUAL' | 'MONTHLY'; error?: string } {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'License key is required' };
  }

  const parts = key.trim().toUpperCase().split('-');
  if (parts.length !== 4 || parts[0] !== 'POS') {
    return { valid: false, error: 'Invalid license key format' };
  }

  const [_, tierPrefix, midPrefix, signature] = parts;
  let tier: 'LIFETIME' | 'ANNUAL' | 'MONTHLY' | null = null;
  if (tierPrefix === 'LIFE') tier = 'LIFETIME';
  else if (tierPrefix === 'ANNU') tier = 'ANNUAL';
  else if (tierPrefix === 'MNTH') tier = 'MONTHLY';

  if (!tier) {
    return { valid: false, error: 'Unrecognized license tier' };
  }

  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!cleanId.startsWith(midPrefix)) {
    return { valid: false, error: 'This license key is not issued for this computer hardware' };
  }

  const expectedKey = generateLicenseKey(machineId, tier);
  if (expectedKey.toUpperCase() === key.trim().toUpperCase()) {
    return { valid: true, tier };
  }

  return { valid: false, error: 'Invalid cryptographic signature' };
}

function computeTrialSignature(machineId: string, start: string, end: string, days: number): string {
  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const payload = `TRIAL:${cleanId}:${start}:${end}:${days}`;
  return crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').toUpperCase();
}

function computeSubscriptionSignature(machineId: string, tier: string, expiresAt: string): string {
  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const payload = `SUBSCRIPTION:${cleanId}:${tier}:${expiresAt}`;
  return crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex').toUpperCase();
}

function getStoredSetting(key: string, defaultVal: string = ''): string {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row?.value ?? defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStoredSetting(key: string, value: string) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, value);
  } catch (err) {
    console.error('Error saving setting:', key, err);
  }
}

export function notifyWindowsLicenseUpdate() {
  try {
    const current = getLicenseStatus();
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('license:statusUpdate', current);
    });
  } catch (err) {
    console.error('Error broadcasting license update:', err);
  }
}

export function getLicenseStatus(): LicenseStatus {
  const machineId = getMachineId();
  const licenseKey = getStoredSetting('license_key', '');
  const isMarkedActive = getStoredSetting('license_activated', 'false') === 'true';

  // 1. Check Full / Subscription License Key first
  if (licenseKey && isMarkedActive) {
    const check = verifyLicenseKey(licenseKey, machineId);
    if (check.valid && check.tier) {
      const tier = check.tier;

      if (tier === 'LIFETIME') {
        return {
          status: 'ACTIVE',
          isActivated: true,
          isTrial: false,
          isExpired: false,
          tier: 'LIFETIME',
          machineId,
          licenseKey,
          daysLeft: 9999,
          trialStart: null,
          trialEnd: null,
          expiresAt: null,
          whatsappNumber: VENDOR_WHATSAPP,
          hotline: VENDOR_HOTLINE,
          message: 'System fully licensed and active (Lifetime).',
        };
      }

      // Check subscription (MONTHLY or ANNUAL)
      const expiresAt = getStoredSetting('license_expires_at', '');
      const expirySig = getStoredSetting('license_expiry_sig', '');

      if (expiresAt && expirySig) {
        const expectedSig = computeSubscriptionSignature(machineId, tier, expiresAt);
        if (expirySig !== expectedSig) {
          return {
            status: 'TAMPERED',
            isActivated: false,
            isTrial: false,
            isExpired: true,
            tier: 'TAMPERED',
            machineId,
            licenseKey,
            daysLeft: 0,
            trialStart: null,
            trialEnd: expiresAt,
            expiresAt,
            whatsappNumber: VENDOR_WHATSAPP,
            hotline: VENDOR_HOTLINE,
            message: 'Security verification failed: License expiry tampering detected.',
          };
        }

        // Anti-clock rollback check
        const now = Date.now();
        const lastClockStr = getStoredSetting('last_known_clock', '');
        if (lastClockStr) {
          const lastClock = new Date(lastClockStr).getTime();
          if (now < lastClock - 15 * 60 * 1000) {
            return {
              status: 'TAMPERED',
              isActivated: false,
              isTrial: false,
              isExpired: true,
              tier: 'TAMPERED',
              machineId,
              licenseKey,
              daysLeft: 0,
              trialStart: null,
              trialEnd: expiresAt,
              expiresAt,
              whatsappNumber: VENDOR_WHATSAPP,
              hotline: VENDOR_HOTLINE,
              message: 'System clock rollback detected. Please restore correct system time or contact vendor.',
            };
          }
        }
        setStoredSetting('last_known_clock', new Date().toISOString());

        const expMs = new Date(expiresAt).getTime();
        if (now > expMs) {
          // Subscription Expired!
          return {
            status: 'TRIAL_EXPIRED',
            isActivated: false,
            isTrial: false,
            isExpired: true,
            tier,
            machineId,
            licenseKey,
            daysLeft: 0,
            trialStart: null,
            trialEnd: expiresAt,
            expiresAt,
            whatsappNumber: VENDOR_WHATSAPP,
            hotline: VENDOR_HOTLINE,
            message: `${tier === 'MONTHLY' ? 'Monthly' : 'Annual'} license has expired. Please renew your subscription to continue.`,
          };
        }

        // Subscription currently active
        const diffMs = expMs - now;
        const daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          status: 'ACTIVE',
          isActivated: true,
          isTrial: false,
          isExpired: false,
          tier,
          machineId,
          licenseKey,
          daysLeft,
          trialStart: null,
          trialEnd: expiresAt,
          expiresAt,
          whatsappNumber: VENDOR_WHATSAPP,
          hotline: VENDOR_HOTLINE,
          message: `${tier === 'MONTHLY' ? 'Monthly' : 'Annual'} license active: ${daysLeft} day(s) remaining (Expires on ${new Date(expiresAt).toLocaleDateString()}).`,
        };
      }
    }
  }

  // 2. Check Trial Mode
  const trialActive = getStoredSetting('trial_active', 'false') === 'true';
  const trialStart = getStoredSetting('trial_start', '');
  const trialEnd = getStoredSetting('trial_end', '');
  const trialDaysStr = getStoredSetting('trial_days', '0');
  const trialSig = getStoredSetting('trial_signature', '');

  if (trialActive && trialStart && trialEnd && trialSig) {
    const trialDays = parseInt(trialDaysStr, 10) || 0;
    const expectedSig = computeTrialSignature(machineId, trialStart, trialEnd, trialDays);

    // Tamper check: Did someone manually edit SQLite?
    if (trialSig !== expectedSig) {
      return {
        status: 'TAMPERED',
        isActivated: false,
        isTrial: true,
        isExpired: true,
        tier: 'TAMPERED',
        machineId,
        licenseKey: '',
        daysLeft: 0,
        trialStart,
        trialEnd,
        whatsappNumber: VENDOR_WHATSAPP,
        hotline: VENDOR_HOTLINE,
        message: 'Security verification failed: Trial data tampering detected.',
      };
    }

    // Clock rollback anti-cheat check
    const now = Date.now();
    const lastClockStr = getStoredSetting('last_known_clock', '');
    if (lastClockStr) {
      const lastClock = new Date(lastClockStr).getTime();
      // If system clock is set back by more than 15 minutes
      if (now < lastClock - 15 * 60 * 1000) {
        return {
          status: 'TAMPERED',
          isActivated: false,
          isTrial: true,
          isExpired: true,
          tier: 'TAMPERED',
          machineId,
          licenseKey: '',
          daysLeft: 0,
          trialStart,
          trialEnd,
          whatsappNumber: VENDOR_WHATSAPP,
          hotline: VENDOR_HOTLINE,
          message: 'System clock rollback detected. Please restore correct system time or contact vendor.',
        };
      }
    }
    // Update last known clock
    setStoredSetting('last_known_clock', new Date().toISOString());

    const endDate = new Date(trialEnd);
    const endMs = endDate.getTime();

    // Has trial expired?
    if (now > endMs) {
      return {
        status: 'TRIAL_EXPIRED',
        isActivated: false,
        isTrial: true,
        isExpired: true,
        tier: 'TRIAL_EXPIRED',
        machineId,
        licenseKey: '',
        daysLeft: 0,
        trialStart,
        trialEnd,
        whatsappNumber: VENDOR_WHATSAPP,
        hotline: VENDOR_HOTLINE,
        message: 'Your test run period has expired. Please contact support to activate your full license.',
      };
    }

    // Trial is currently valid & running
    const diffMs = endMs - now;
    const daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      status: 'TRIAL_ACTIVE',
      isActivated: false,
      isTrial: true,
      isExpired: false,
      tier: 'TRIAL',
      machineId,
      licenseKey: '',
      daysLeft,
      trialStart,
      trialEnd,
      whatsappNumber: VENDOR_WHATSAPP,
      hotline: VENDOR_HOTLINE,
      message: `Test run active: ${daysLeft} day(s) remaining.`,
    };
  }

  // 3. Fresh installation or Unconfigured mode (Setup Required)
  return {
    status: 'SETUP_REQUIRED',
    isActivated: false,
    isTrial: false,
    isExpired: true,
    tier: 'UNREGISTERED',
    machineId,
    licenseKey: '',
    daysLeft: 0,
    trialStart: null,
    trialEnd: null,
    whatsappNumber: VENDOR_WHATSAPP,
    hotline: VENDOR_HOTLINE,
    message: 'License activation required. Please contact vendor or configure via Developer Portal.',
  };
}

export function startTrial(days: number = 7): { success: boolean; message: string; status: LicenseStatus } {
  const machineId = getMachineId();
  const validDays = Math.max(1, Math.min(365, Math.floor(days || 7)));
  const now = new Date();
  const trialStart = now.toISOString();
  const trialEnd = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000).toISOString();
  const sig = computeTrialSignature(machineId, trialStart, trialEnd, validDays);

  setStoredSetting('trial_active', 'true');
  setStoredSetting('trial_start', trialStart);
  setStoredSetting('trial_end', trialEnd);
  setStoredSetting('trial_days', String(validDays));
  setStoredSetting('trial_signature', sig);
  setStoredSetting('last_known_clock', trialStart);
  // Clear full license if starting trial
  setStoredSetting('license_activated', 'false');
  setStoredSetting('license_key', '');

  notifyWindowsLicenseUpdate();

  const status = getLicenseStatus();
  return {
    success: true,
    message: `Test run trial of ${validDays} days started successfully! Expires on ${new Date(trialEnd).toLocaleDateString()}.`,
    status,
  };
}

export function extendTrial(additionalDays: number = 3): { success: boolean; message: string; status: LicenseStatus } {
  const machineId = getMachineId();
  const validAddDays = Math.max(1, Math.min(90, Math.floor(additionalDays || 3)));
  
  const currentEndStr = getStoredSetting('trial_end', '');
  let baseMs = Date.now();
  if (currentEndStr) {
    const curEndMs = new Date(currentEndStr).getTime();
    if (curEndMs > baseMs) {
      baseMs = curEndMs; // Extend from current expiration date
    }
  }

  const now = new Date();
  const trialStart = getStoredSetting('trial_start', now.toISOString());
  const newTrialEnd = new Date(baseMs + validAddDays * 24 * 60 * 60 * 1000).toISOString();
  
  // Calculate total duration in days
  const totalDays = Math.max(1, Math.ceil((new Date(newTrialEnd).getTime() - new Date(trialStart).getTime()) / (1000 * 60 * 60 * 24)));
  const sig = computeTrialSignature(machineId, trialStart, newTrialEnd, totalDays);

  setStoredSetting('trial_active', 'true');
  setStoredSetting('trial_start', trialStart);
  setStoredSetting('trial_end', newTrialEnd);
  setStoredSetting('trial_days', String(totalDays));
  setStoredSetting('trial_signature', sig);
  setStoredSetting('last_known_clock', now.toISOString());

  notifyWindowsLicenseUpdate();

  const status = getLicenseStatus();
  return {
    success: true,
    message: `Trial extended by +${validAddDays} days! New expiry: ${new Date(newTrialEnd).toLocaleDateString()}.`,
    status,
  };
}

export function endTrial(): { success: boolean; message: string; status: LicenseStatus } {
  const machineId = getMachineId();
  const now = new Date();
  // Set expiration to 1 minute in the past
  const expiredEnd = new Date(now.getTime() - 60 * 1000).toISOString();
  const trialStart = getStoredSetting('trial_start', now.toISOString());
  const sig = computeTrialSignature(machineId, trialStart, expiredEnd, 0);

  setStoredSetting('trial_active', 'true');
  setStoredSetting('trial_end', expiredEnd);
  setStoredSetting('trial_days', '0');
  setStoredSetting('trial_signature', sig);

  notifyWindowsLicenseUpdate();

  const status = getLicenseStatus();
  return {
    success: true,
    message: 'Trial ended manually. App lockout is now active.',
    status,
  };
}

export function activateLicense(licenseKey: string): { success: boolean; message: string; status: LicenseStatus } {
  const machineId = getMachineId();
  const result = verifyLicenseKey(licenseKey, machineId);

  if (!result.valid || !result.tier) {
    return {
      success: false,
      message: result.error || 'Activation failed',
      status: getLicenseStatus(),
    };
  }

  const tier = result.tier;
  setStoredSetting('license_key', licenseKey.trim().toUpperCase());
  setStoredSetting('license_activated', 'true');
  setStoredSetting('license_tier', tier);
  // Deactivate trial mode since full license is activated
  setStoredSetting('trial_active', 'false');

  if (tier === 'LIFETIME') {
    setStoredSetting('license_expires_at', '');
    setStoredSetting('license_expiry_sig', '');
  } else {
    // For MONTHLY (+30 days) or ANNUAL (+365 days)
    const durationDays = tier === 'MONTHLY' ? 30 : 365;
    const curExpiresStr = getStoredSetting('license_expires_at', '');
    let baseTime = Date.now();
    if (curExpiresStr) {
      const curMs = new Date(curExpiresStr).getTime();
      // If still valid, extend from current expiry date!
      if (curMs > baseTime) {
        baseTime = curMs;
      }
    }
    const newExpiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const sig = computeSubscriptionSignature(machineId, tier, newExpiresAt);
    setStoredSetting('license_expires_at', newExpiresAt);
    setStoredSetting('license_expiry_sig', sig);
    setStoredSetting('last_known_clock', new Date().toISOString());
  }

  notifyWindowsLicenseUpdate();

  const status = getLicenseStatus();
  return {
    success: true,
    message: tier === 'LIFETIME'
      ? 'Activated successfully as Lifetime License!'
      : tier === 'MONTHLY'
      ? `Activated / Renewed successfully for 1 Month (Expires: ${new Date(status.expiresAt || '').toLocaleDateString()})!`
      : `Activated successfully as 1-Year Annual License (Expires: ${new Date(status.expiresAt || '').toLocaleDateString()})!`,
    status,
  };
}

export function renewMonthlyLicense(days: number = 30): { success: boolean; message: string; status: LicenseStatus } {
  const machineId = getMachineId();
  const validDays = Math.max(1, Math.min(365, Math.floor(days || 30)));
  const monthlyKey = generateLicenseKey(machineId, 'MONTHLY');

  const curExpiresStr = getStoredSetting('license_expires_at', '');
  let baseTime = Date.now();
  if (curExpiresStr) {
    const curMs = new Date(curExpiresStr).getTime();
    if (curMs > baseTime) {
      baseTime = curMs; // Extend from current expiry!
    }
  }

  const newExpiresAt = new Date(baseTime + validDays * 24 * 60 * 60 * 1000).toISOString();
  const sig = computeSubscriptionSignature(machineId, 'MONTHLY', newExpiresAt);

  setStoredSetting('license_key', monthlyKey);
  setStoredSetting('license_activated', 'true');
  setStoredSetting('license_tier', 'MONTHLY');
  setStoredSetting('license_expires_at', newExpiresAt);
  setStoredSetting('license_expiry_sig', sig);
  setStoredSetting('trial_active', 'false');
  setStoredSetting('last_known_clock', new Date().toISOString());

  notifyWindowsLicenseUpdate();

  const status = getLicenseStatus();
  return {
    success: true,
    message: `Monthly License renewed by +${validDays} days! New expiry: ${new Date(newExpiresAt).toLocaleDateString()}.`,
    status,
  };
}

export function deactivateLicense(): { success: boolean; message: string; status: LicenseStatus } {
  setStoredSetting('license_key', '');
  setStoredSetting('license_activated', 'false');
  setStoredSetting('license_tier', '');
  setStoredSetting('license_expires_at', '');
  setStoredSetting('license_expiry_sig', '');
  setStoredSetting('trial_active', 'false');
  setStoredSetting('trial_start', '');
  setStoredSetting('trial_end', '');
  setStoredSetting('trial_signature', '');

  notifyWindowsLicenseUpdate();

  const status = getLicenseStatus();
  return {
    success: true,
    message: 'License revoked and reset to Unregistered / Setup Required mode.',
    status,
  };
}
