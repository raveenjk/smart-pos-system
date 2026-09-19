import { ipcMain } from 'electron';
import { getDb } from '../database/schema';

export function registerSaleHandlers() {
  const db = getDb();

  function generateInvoiceNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.getTime().toString().slice(-6);
    return `INV-${date}-${time}`;
  }

  // Create a new sale (full transaction)
  ipcMain.handle('sales:create', (_event, data: any) => {
    const createSale = db.transaction((saleData: any) => {
      const invoiceNumber = generateInvoiceNumber();

      // Insert sale header
      const saleResult = db.prepare(`
        INSERT INTO sales (invoice_number, customer_id, employee_id, subtotal, discount, tax, total, amount_paid, change_amount, payment_method, notes)
        VALUES (@invoice_number, @customer_id, @employee_id, @subtotal, @discount, @tax, @total, @amount_paid, @change_amount, @payment_method, @notes)
      `).run({
        invoice_number: invoiceNumber,
        customer_id: saleData.customer_id || null,
        employee_id: saleData.employee_id || null,
        subtotal: saleData.subtotal,
        discount: saleData.discount || 0,
        tax: saleData.tax || 0,
        total: saleData.total,
        amount_paid: saleData.amount_paid,
        change_amount: saleData.change_amount || 0,
        payment_method: saleData.payment_method || 'cash',
        notes: saleData.notes || '',
      });

      const saleId = saleResult.lastInsertRowid;

      // Insert sale items & update stock
      for (const item of saleData.items) {
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, discount, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.discount || 0, item.total);

        // Deduct stock
        if (item.product_id) {
          db.prepare("UPDATE products SET stock = stock - ?, updated_at = datetime('now'), synced = 0 WHERE id = ?")
            .run(item.quantity, item.product_id);
        }
      }

      // Update customer loyalty points
      if (saleData.customer_id) {
        const points = Math.floor(saleData.total / 100); // 1 point per LKR 100
        db.prepare("UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?")
          .run(points, saleData.customer_id);
      }

      return { id: saleId, invoice_number: invoiceNumber };
    });

    return createSale(data);
  });

  // Get all sales with filters
  ipcMain.handle('sales:getAll', (_event, filters: any = {}) => {
    let query = `
      SELECT s.*, c.name as customer_name, e.name as employee_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN employees e ON s.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.from_date) { query += ' AND date(s.created_at) >= ?'; params.push(filters.from_date); }
    if (filters.to_date) { query += ' AND date(s.created_at) <= ?'; params.push(filters.to_date); }
    if (filters.payment_method) { query += ' AND s.payment_method = ?'; params.push(filters.payment_method); }

    query += ' ORDER BY s.created_at DESC LIMIT 200';
    return db.prepare(query).all(...params);
  });

  // Get sale by ID with items
  ipcMain.handle('sales:getById', (_event, id: number) => {
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name, e.name as employee_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN employees e ON s.employee_id = e.id
      WHERE s.id = ?
    `).get(id);

    if (sale) {
      (sale as any).items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
    }
    return sale;
  });

  // Daily summary
  ipcMain.handle('sales:dailySummary', (_event, date: string) => {
    return db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(total) as total_revenue,
        SUM(discount) as total_discounts,
        SUM(tax) as total_tax,
        AVG(total) as avg_transaction,
        payment_method,
        COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_count,
        COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_count
      FROM sales
      WHERE date(created_at) = ? AND status = 'completed'
    `).get(date);
  });
}
