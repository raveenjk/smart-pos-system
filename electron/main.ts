import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { initDatabase } from './database/schema';
import { registerProductHandlers } from './ipc/productHandlers';
import { registerSaleHandlers } from './ipc/saleHandlers';
import { registerCustomerHandlers, registerEmployeeHandlers } from './ipc/customerHandlers';
import { registerReportHandlers } from './ipc/reportHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import { registerPrinterHandlers } from './ipc/printerHandlers';
import { registerBarcodeHandlers } from './ipc/barcodeHandlers';
import { registerHoldHandlers } from './ipc/holdHandlers';
import { registerLicenseHandlers } from './ipc/licenseHandlers';
import { startSyncEngine } from './sync/syncEngine';
import { startDeveloperServer, getDeveloperServerPort } from './server/developerServer';
import { getDb } from './database/schema';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    icon: join(__dirname, '../assets/icon.png'),
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools();
    }
    // Secret developer shortcut: Ctrl + Alt + D
    if (input.control && input.alt && input.key.toLowerCase() === 'd') {
      shell.openExternal(`http://localhost:${getDeveloperServerPort()}/developer`);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  // Initialize SQLite database
  initDatabase();

  // Register all IPC handlers
  registerProductHandlers();
  registerSaleHandlers();
  registerCustomerHandlers();
  registerEmployeeHandlers();
  registerReportHandlers();
  registerSettingsHandlers();
  registerPrinterHandlers();
  registerBarcodeHandlers();
  registerHoldHandlers();
  registerLicenseHandlers();

  // Maintenance & Developer Portal IPC
  ipcMain.handle('system:getMaintenanceStatus', () => {
    try {
      const db = getDb();
      const active = (db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get() as any)?.value === 'true';
      const message = (db.prepare("SELECT value FROM settings WHERE key = 'maintenance_message'").get() as any)?.value || 'System maintenance in progress. Please contact your vendor.';
      return { active, message };
    } catch {
      return { active: false, message: '' };
    }
  });

  ipcMain.handle('system:openDeveloperPortal', () => {
    shell.openExternal(`http://localhost:${getDeveloperServerPort()}/developer`);
    return { success: true };
  });

  createWindow();

  // Start cloud sync engine
  startSyncEngine();

  // Start Developer Super Admin HTTP Server
  await startDeveloperServer(4800);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
