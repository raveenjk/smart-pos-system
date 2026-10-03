import { ipcMain } from 'electron';
import { getDb } from '../database/schema';

export function registerProductHandlers() {
  const db = getDb();

  // Get all products
  ipcMain.handle('products:getAll', () => {
    return db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.name
    `).all();
  });

  // Get product by ID
  ipcMain.handle('products:getById', (_event, id: number) => {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  });

  // Get product by barcode
  ipcMain.handle('products:getByBarcode', (_event, barcode: string) => {
    return db.prepare('SELECT * FROM products WHERE barcode = ? AND is_active = 1').get(barcode);
  });

  // Search products
  ipcMain.handle('products:search', (_event, query: string) => {
    return db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND (p.name LIKE ? OR p.barcode LIKE ?)
      LIMIT 50
    `).all(`%${query}%`, `%${query}%`);
  });

  // Create product
  ipcMain.handle('products:create', (_event, data: any) => {
    const stmt = db.prepare(`
      INSERT INTO products (name, barcode, category_id, price, cost_price, stock, low_stock_alert, unit, description, image_url)
      VALUES (@name, @barcode, @category_id, @price, @cost_price, @stock, @low_stock_alert, @unit, @description, @image_url)
    `);
    const result = stmt.run(data);
    return { id: result.lastInsertRowid, ...data };
  });

  // Update product
  ipcMain.handle('products:update', (_event, id: number, data: any) => {
    const existing: any = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return null;
    const merged = { ...existing, ...data, id };
    const stmt = db.prepare(`
      UPDATE products SET
        name = @name,
        barcode = @barcode,
        category_id = @category_id,
        price = @price,
        cost_price = @cost_price,
        stock = @stock,
        low_stock_alert = @low_stock_alert,
        unit = @unit,
        description = @description,
        updated_at = datetime('now'),
        synced = 0
      WHERE id = @id
    `);
    stmt.run(merged);
    return merged;
  });

  // Delete product (soft delete)
  ipcMain.handle('products:delete', (_event, id: number) => {
    db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    return { success: true };
  });

  // Get categories with product count
  ipcMain.handle('products:getCategories', () => {
    return db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c
      ORDER BY c.name
    `).all();
  });

  // Create category
  ipcMain.handle('products:createCategory', (_event, data: any) => {
    try {
      const stmt = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
      const result = stmt.run(data.name.trim(), data.description ? data.description.trim() : null);
      return { success: true, id: result.lastInsertRowid, name: data.name.trim() };
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE')) {
        return { success: false, message: 'A category with this name already exists' };
      }
      return { success: false, message: err.message || 'Failed to create category' };
    }
  });

  // Delete category
  ipcMain.handle('products:deleteCategory', (_event, id: number) => {
    if (id === 1) {
      return { success: false, message: 'Cannot delete the default General category' };
    }
    db.prepare('UPDATE products SET category_id = 1 WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return { success: true };
  });

  // Get low stock products
  ipcMain.handle('products:getLowStock', () => {
    return db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.stock <= p.low_stock_alert
      ORDER BY p.stock ASC
    `).all();
  });
}
