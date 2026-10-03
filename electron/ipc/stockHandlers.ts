import { ipcMain } from 'electron';
import { getDb } from '../database/schema';

export function registerStockHandlers() {
  const db = getDb();

  // 1. Receive Stock / Inward Batch (GRN)
  ipcMain.handle('stock:receiveBatch', (_event, data: {
    product_id: number;
    batch_number?: string;
    quantity: number;
    cost_price?: number;
    selling_price?: number;
    expiry_date?: string;
    received_date?: string;
    supplier_note?: string;
    update_master_price?: boolean;
    employee_id?: number;
  }) => {
    try {
      const receiveTx = db.transaction(() => {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(data.product_id) as any;
        if (!prod) throw new Error('Product not found');

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const autoBatch = `B${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
        const batchNo = data.batch_number?.trim() || autoBatch;
        const qty = Number(data.quantity) || 0;
        const cost = data.cost_price !== undefined ? Number(data.cost_price) : Number(prod.cost_price || 0);
        const price = data.selling_price !== undefined ? Number(data.selling_price) : Number(prod.price || 0);
        const expiry = data.expiry_date?.trim() || null;
        const received = data.received_date?.trim() || now.toISOString().slice(0, 10);

        // Insert into product_batches
        const batchStmt = db.prepare(`
          INSERT INTO product_batches (
            product_id, batch_number, quantity_received, quantity_remaining,
            cost_price, selling_price, expiry_date, received_date, supplier_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const batchResult = batchStmt.run(
          data.product_id,
          batchNo,
          qty,
          qty,
          cost,
          price,
          expiry,
          received,
          data.supplier_note || null
        );

        // Update product stock
        if (data.update_master_price) {
          db.prepare(`
            UPDATE products
            SET stock = stock + ?, cost_price = ?, price = ?, updated_at = datetime('now'), synced = 0
            WHERE id = ?
          `).run(qty, cost, price, data.product_id);
        } else {
          db.prepare(`
            UPDATE products
            SET stock = stock + ?, updated_at = datetime('now'), synced = 0
            WHERE id = ?
          `).run(qty, data.product_id);
        }

        // Audit log in stock_adjustments
        db.prepare(`
          INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, reason, employee_id)
          VALUES (?, 'BATCH_IN', ?, ?, ?)
        `).run(
          data.product_id,
          qty,
          `Batch: ${batchNo}${expiry ? ` (Exp: ${expiry})` : ''}`,
          data.employee_id || null
        );

        return {
          success: true,
          batch_id: batchResult.lastInsertRowid,
          batch_number: batchNo,
        };
      });

      return receiveTx();
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  });

  // 2. Get all batches for a specific product
  ipcMain.handle('stock:getBatches', (_event, productId: number) => {
    try {
      const batches = db.prepare(`
        SELECT *,
          CAST(julianday(expiry_date) - julianday('now') AS INTEGER) as days_left
        FROM product_batches
        WHERE product_id = ?
        ORDER BY
          quantity_remaining > 0 DESC,
          CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END,
          expiry_date ASC,
          id DESC
      `).all(productId);
      return batches;
    } catch (err) {
      console.error('Error fetching batches:', err);
      return [];
    }
  });

  // 3. Get expiring products and batches within days
  ipcMain.handle('stock:getExpiring', (_event, days = 30) => {
    try {
      const expiring = db.prepare(`
        SELECT b.*,
          p.name as product_name,
          p.barcode as product_barcode,
          p.unit as product_unit,
          CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) as days_left
        FROM product_batches b
        JOIN products p ON b.product_id = p.id
        WHERE b.is_active = 1
          AND b.quantity_remaining > 0
          AND b.expiry_date IS NOT NULL
          AND b.expiry_date != ''
          AND b.expiry_date <= date('now', '+' || ? || ' days')
        ORDER BY b.expiry_date ASC
      `).all(days);
      return expiring;
    } catch (err) {
      console.error('Error fetching expiring items:', err);
      return [];
    }
  });

  // 4. Adjust a specific batch (damages, count correction, expired write-off)
  ipcMain.handle('stock:adjustBatch', (_event, data: {
    batch_id: number;
    new_quantity: number;
    reason: string;
    employee_id?: number;
  }) => {
    try {
      const adjustTx = db.transaction(() => {
        const batch = db.prepare('SELECT * FROM product_batches WHERE id = ?').get(data.batch_id) as any;
        if (!batch) throw new Error('Batch not found');

        const diff = Number(data.new_quantity) - Number(batch.quantity_remaining);

        // Update batch remaining
        db.prepare(`
          UPDATE product_batches
          SET quantity_remaining = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(data.new_quantity, data.batch_id);

        // Update master product stock by difference
        db.prepare(`
          UPDATE products
          SET stock = stock + ?, updated_at = datetime('now'), synced = 0
          WHERE id = ?
        `).run(diff, batch.product_id);

        // Audit log
        db.prepare(`
          INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, reason, employee_id)
          VALUES (?, 'BATCH_ADJUST', ?, ?, ?)
        `).run(
          batch.product_id,
          diff,
          `Batch ${batch.batch_number}: ${data.reason}`,
          data.employee_id || null
        );

        return { success: true };
      });

      return adjustTx();
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  });
}
