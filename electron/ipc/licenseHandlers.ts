import { ipcMain } from 'electron';
import {
  getLicenseStatus,
  activateLicense,
  getMachineId,
  generateLicenseKey,
  renewMonthlyLicense,
  startTrial,
  extendTrial,
  endTrial,
  deactivateLicense,
} from '../license/licenseManager';

export function registerLicenseHandlers() {
  ipcMain.handle('license:getStatus', () => {
    return getLicenseStatus();
  });

  ipcMain.handle('license:getMachineId', () => {
    return getMachineId();
  });

  ipcMain.handle('license:activate', (_event, licenseKey: string) => {
    return activateLicense(licenseKey);
  });

  ipcMain.handle('license:renewMonthly', (_event, days?: number) => {
    return renewMonthlyLicense(days);
  });

  ipcMain.handle('license:generateKey', (_event, machineId: string, tier: 'LIFETIME' | 'ANNUAL' | 'MONTHLY') => {
    return generateLicenseKey(machineId, tier);
  });

  ipcMain.handle('license:startTrial', (_event, days: number) => {
    return startTrial(days);
  });

  ipcMain.handle('license:extendTrial', (_event, days: number) => {
    return extendTrial(days);
  });

  ipcMain.handle('license:endTrial', () => {
    return endTrial();
  });

  ipcMain.handle('license:deactivate', () => {
    return deactivateLicense();
  });
}
