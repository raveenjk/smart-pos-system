import { BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { getDb } from '../database/schema';

interface ReceiptData {
  invoice_number: string;
  shop_name: string;
  shop_subtitle?: string;
  shop_logo?: string;
  shop_address: string;
  shop_phone: string;
  shop_br_number?: string;
  receipt_header?: string;
  cashier_name: string;
  customer_name?: string;
  items: {
    product_name: string;
    quantity: number | string;
    unit_price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  change_amount: number;
  payment_method: string;
  footer: string;
  date: string;
  branding_enabled?: boolean;
  branding_text?: string;
}

function buildReceiptHTML(data: ReceiptData): string {
  let brandingEnabled = data.branding_enabled;
  let brandingText = data.branding_text;
  if (brandingEnabled === undefined || !brandingText) {
    try {
      const db = getDb();
      if (brandingEnabled === undefined) {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'receipt_branding_enabled'").get() as any;
        brandingEnabled = row ? row.value !== 'false' : true;
      }
      if (!brandingText) {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'receipt_branding_text'").get() as any;
        brandingText = row?.value || 'System by JK Soft - 070 522 4007';
      }
    } catch {
      brandingEnabled = brandingEnabled ?? true;
      brandingText = brandingText || 'System by JK Soft - 070 522 4007';
    }
  }

  const itemsHTML = data.items
    .map(
      (item) => `
      <tr>
        <td class="item-name">${item.product_name}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">${item.unit_price.toFixed(2)}</td>
        <td class="item-total">${item.total.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 280px;
    padding: 8px;
    color: #000;
  }
  .center { text-align: center; }
  .shop-name { font-size: 16px; font-weight: bold; text-transform: uppercase; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .double-divider { border-top: 2px solid #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; border-bottom: 1px solid #000; padding: 2px 0; font-size: 11px; }
  td { padding: 2px 0; font-size: 11px; vertical-align: top; }
  .item-name { width: 45%; }
  .item-qty { width: 10%; text-align: center; }
  .item-price { width: 20%; text-align: right; }
  .item-total { width: 25%; text-align: right; }
  .totals { margin-top: 4px; }
  .totals tr td:first-child { font-weight: normal; }
  .totals tr td:last-child { text-align: right; }
  .total-row td { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 3px; }
  .footer { text-align: center; margin-top: 8px; font-size: 11px; }
  .invoice { font-size: 10px; color: #555; }
</style>
</head>
<body>
  <div class="center">
    ${data.shop_logo ? `<img src="${data.shop_logo}" style="max-height: 48px; max-width: 140px; margin-bottom: 4px; filter: grayscale(100%);" /><br/>` : ''}
    <div class="shop-name">${data.shop_name}</div>
    ${data.shop_subtitle ? `<div style="font-size:11px; margin-top:2px;">${data.shop_subtitle}</div>` : ''}
    ${data.shop_address ? `<div style="font-size:11px; margin-top:2px;">${data.shop_address}</div>` : ''}
    ${data.shop_phone ? `<div style="font-size:11px;">Tel: ${data.shop_phone}</div>` : ''}
    ${data.shop_br_number ? `<div style="font-size:10px; color:#333;">${data.shop_br_number}</div>` : ''}
    ${data.receipt_header ? `<div style="font-size:11px; font-style:italic; margin-top:3px;">${data.receipt_header}</div>` : ''}
  </div>
  <div class="divider"></div>
  <div>${data.date}</div>
  <div class="invoice">Invoice: ${data.invoice_number}</div>
  <div>Cashier: ${data.cashier_name}</div>
  ${data.customer_name ? `<div>Customer: ${data.customer_name}</div>` : ''}
  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th class="item-name">Item</th>
        <th class="item-qty">Qty</th>
        <th class="item-price">Price</th>
        <th class="item-total">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="divider"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td>LKR ${data.subtotal.toFixed(2)}</td></tr>
    ${data.discount > 0 ? `<tr><td>Discount</td><td>- LKR ${data.discount.toFixed(2)}</td></tr>` : ''}
    ${data.tax > 0 ? `<tr><td>Tax</td><td>LKR ${data.tax.toFixed(2)}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td>LKR ${data.total.toFixed(2)}</td></tr>
    <tr><td>Paid (${data.payment_method.toUpperCase()})</td><td>LKR ${data.amount_paid.toFixed(2)}</td></tr>
    ${data.change_amount > 0 ? `<tr><td>Change</td><td>LKR ${data.change_amount.toFixed(2)}</td></tr>` : ''}
  </table>

  <div class="double-divider"></div>
  <div class="footer">${data.footer || 'Thank you for shopping!'}</div>
  ${brandingEnabled ? `<div class="footer" style="margin-top:8px; font-size:8.5px; color:#444; letter-spacing:0.3px; font-weight:bold;">${brandingText}</div>` : ''}
</body>
</html>`;
}

export function registerPrinterHandlers() {
  // Print receipt using Electron's built-in print (works with any printer)
  ipcMain.handle('printer:printReceipt', async (_event, data: ReceiptData & { silent?: boolean }) => {
    return new Promise((resolve) => {
      const printWindow = new BrowserWindow({
        width: 400,
        height: 600,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      const html = buildReceiptHTML(data);
      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.once('did-finish-load', () => {
        printWindow.webContents.print(
          {
            silent: Boolean(data.silent),
            printBackground: false,
            margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
          },
          (success, errorType) => {
            printWindow.close();
            resolve({ success, error: errorType });
          }
        );
      });
    });
  });

  // Save receipt as PDF
  ipcMain.handle('printer:savePDF', async (_event, data: ReceiptData) => {
    return new Promise((resolve) => {
      const printWindow = new BrowserWindow({
        width: 400,
        height: 800,
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      const html = buildReceiptHTML(data);
      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      printWindow.webContents.once('did-finish-load', async () => {
        try {
          const pdf = await printWindow.webContents.printToPDF({
            pageSize: { width: 72000, height: 200000 },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          });
          printWindow.close();
          resolve({ success: true, data: pdf.toString('base64') });
        } catch (err) {
          printWindow.close();
          resolve({ success: false, error: String(err) });
        }
      });
    });
  });

  // Get available printers
  ipcMain.handle('printer:getList', async (_event) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return [];
    return await win.webContents.getPrintersAsync();
  });
}
