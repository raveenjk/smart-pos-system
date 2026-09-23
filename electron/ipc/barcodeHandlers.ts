import { ipcMain } from 'electron';

export function registerBarcodeHandlers() {
  // Generate barcode as base64 PNG
  ipcMain.handle('barcode:generate', async (_event, text: string, format = 'CODE128') => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bwipjs = require('bwip-js');
      const png = await bwipjs.toBuffer({
        bcid: format.toLowerCase() === 'qr' ? 'qrcode' : 'code128',
        text: text,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
        textyoffset: 2,
      });
      return { success: true, data: png.toString('base64') };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Generate unique barcode for a product
  ipcMain.handle('barcode:generateUnique', async () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp.slice(-9)}${random}`;
  });
}
