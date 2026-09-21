import { ipcMain } from 'electron';
import { getDb } from '../database/schema';

export function registerHoldHandlers() {
  const db = getDb();

  // Create held_bills table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS held_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      cart_data TEXT NOT NULL,
      customer_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Hold current bill
  ipcMain.handle('hold:save', (_event, data: { label?: string; cart: unknown; customer: unknown }) => {
    const result = db.prepare(`
      INSERT INTO held_bills (label, cart_data, customer_data)
      VALUES (?, ?, ?)
    `).run(
      data.label || `Bill #${Date.now()}`,
      JSON.stringify(data.cart),
      data.customer ? JSON.stringify(data.customer) : null
    );
    return { id: result.lastInsertRowid };
  });

  // Get all held bills
  ipcMain.handle('hold:getAll', () => {
    return db.prepare('SELECT * FROM held_bills ORDER BY created_at DESC').all();
  });

  // Recall a held bill
  ipcMain.handle('hold:recall', (_event, id: number) => {
    const bill = db.prepare('SELECT * FROM held_bills WHERE id = ?').get(id) as any;
    if (bill) {
      return {
        cart: JSON.parse(bill.cart_data),
        customer: bill.customer_data ? JSON.parse(bill.customer_data) : null,
        label: bill.label,
      };
    }
    return null;
  });

  // Delete a held bill
  ipcMain.handle('hold:delete', (_event, id: number) => {
    db.prepare('DELETE FROM held_bills WHERE id = ?').run(id);
    return { success: true };
  });
}
