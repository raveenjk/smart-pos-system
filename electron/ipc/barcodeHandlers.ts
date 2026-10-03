import { ipcMain } from 'electron';
import bwipjs from 'bwip-js';

export function registerBarcodeHandlers() {
  // Generate barcode as base64 PNG
  ipcMain.handle('barcode:generate', async (_event, text: string, format = 'CODE128') => {
    try {
      const isQr = format.toLowerCase() === 'qr';
      const options: any = {
        bcid: isQr ? 'qrcode' : 'code128',
        text: text,
        scale: isQr ? 4 : 3,
      };
      if (!isQr) {
        options.height = 10;
        options.includetext = true;
        options.textxalign = 'center';
        options.textyoffset = 2;
      }
      const png = await bwipjs.toBuffer(options);
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
