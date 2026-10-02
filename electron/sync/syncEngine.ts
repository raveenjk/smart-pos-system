import { BrowserWindow } from 'electron';
import { getDb } from '../database/schema';

let syncInterval: NodeJS.Timeout | null = null;
let isOnline = false;

function getSupabaseConfig() {
  const db = getDb();
  const url = (db.prepare("SELECT value FROM settings WHERE key = 'supabase_url'").get() as any)?.value;
  const key = (db.prepare("SELECT value FROM settings WHERE key = 'supabase_key'").get() as any)?.value;
  return { url, key };
}

function notifyRenderer(status: string) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('sync:statusUpdate', status);
  });
}

async function checkOnlineStatus(): Promise<boolean> {
  try {
    const { net } = await import('electron');
    return net.isOnline();
  } catch {
    return false;
  }
}

async function syncUnsyncedRecords() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || url === '' || key === '') return;

  const db = getDb();

  try {
    notifyRenderer('syncing');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, key);

    // Sync products
    const unsyncedProducts = db.prepare("SELECT * FROM products WHERE synced = 0").all();
    for (const product of unsyncedProducts) {
      const p = product as any;
      const { error } = await supabase.from('products').upsert({
        local_id: p.id,
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        cost_price: p.cost_price,
        stock: p.stock,
        is_active: p.is_active === 1,
        updated_at: p.updated_at,
      });
      if (!error) {
        db.prepare("UPDATE products SET synced = 1 WHERE id = ?").run(p.id);
      }
    }

    // Sync sales
    const unsyncedSales = db.prepare("SELECT * FROM sales WHERE synced = 0").all();
    for (const sale of unsyncedSales) {
      const s = sale as any;
      const items = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(s.id);
      const { error } = await supabase.from('sales').upsert({
        local_id: s.id,
        invoice_number: s.invoice_number,
        total: s.total,
        payment_method: s.payment_method,
        created_at: s.created_at,
        items: JSON.stringify(items),
      });
      if (!error) {
        db.prepare("UPDATE sales SET synced = 1 WHERE id = ?").run(s.id);
      }
    }

    notifyRenderer('synced');
  } catch (err) {
    console.error('Sync error:', err);
    notifyRenderer('error');
  }
}

export function startSyncEngine() {
  // Check connectivity and sync every 30 seconds
  syncInterval = setInterval(async () => {
    const online = await checkOnlineStatus();
    if (online !== isOnline) {
      isOnline = online;
      notifyRenderer(online ? 'online' : 'offline');
    }
    if (online) {
      await syncUnsyncedRecords();
    }
  }, 30000);

  // Initial check
  checkOnlineStatus().then((online) => {
    isOnline = online;
    notifyRenderer(online ? 'online' : 'offline');
    if (online) syncUnsyncedRecords();
  });
}

export function stopSyncEngine() {
  if (syncInterval) clearInterval(syncInterval);
}
