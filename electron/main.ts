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

  createWindow();

  // Start cloud sync engine
  startSyncEngine();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
