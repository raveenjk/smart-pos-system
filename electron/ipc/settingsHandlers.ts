import { ipcMain } from 'electron';
import { getDb } from '../database/schema';

export function registerSettingsHandlers() {
  const db = getDb();

  ipcMain.handle('settings:get', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });

  ipcMain.handle('settings:update', (_event, data: Record<string, string>) => {
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    const updateMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        upsert.run(key, String(value));
      }
    });
    updateMany(Object.entries(data));
    return { success: true };
  });

  ipcMain.handle('sync:status', () => {
    const pending = (getDb().prepare("SELECT COUNT(*) as count FROM products WHERE synced = 0").get() as any).count
      + (getDb().prepare("SELECT COUNT(*) as count FROM sales WHERE synced = 0").get() as any).count;
    return { pending_sync: pending };
  });

  ipcMain.handle('sync:force', () => {
    // Trigger sync - handled by syncEngine
    return { success: true };
  });
}
