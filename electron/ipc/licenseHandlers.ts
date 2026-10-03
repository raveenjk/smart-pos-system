import { ipcMain } from 'electron';
import { getLicenseStatus, activateLicense, getMachineId } from '../license/licenseManager';

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
}
