import { ipcMain } from 'electron';
import { getDb } from '../database/schema';

export function registerReportHandlers() {
  const db = getDb();

  ipcMain.handle('reports:sales', (_event, filters: any = {}) => {
    const from = filters.from_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = filters.to_date || new Date().toISOString().slice(0, 10);

    return db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as transactions,
        SUM(total) as revenue,
        SUM(discount) as discounts,
        SUM(tax) as tax
      FROM sales
      WHERE date(created_at) BETWEEN ? AND ? AND status = 'completed'
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(from, to);
  });

  ipcMain.handle('reports:topProducts', (_event, filters: any = {}) => {
    const from = filters.from_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = filters.to_date || new Date().toISOString().slice(0, 10);

    return db.prepare(`
      SELECT
        si.product_name,
        si.product_id,
        SUM(si.quantity) as total_quantity,
        SUM(si.total) as total_revenue,
        COUNT(DISTINCT si.sale_id) as sale_count
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY si.product_id, si.product_name
      ORDER BY total_revenue DESC
      LIMIT 20
    `).all(from, to);
  });

  ipcMain.handle('reports:profit', (_event, filters: any = {}) => {
    const from = filters.from_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = filters.to_date || new Date().toISOString().slice(0, 10);

    return db.prepare(`
      SELECT
        si.product_name,
        si.product_id,
        SUM(si.quantity) as total_qty,
        SUM(si.total) as revenue,
        SUM(si.quantity * p.cost_price) as cost,
        SUM(si.total) - SUM(si.quantity * p.cost_price) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE date(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY si.product_id, si.product_name
      ORDER BY profit DESC
    `).all(from, to);
  });
}
