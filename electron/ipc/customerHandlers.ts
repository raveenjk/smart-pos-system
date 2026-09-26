import { ipcMain } from 'electron';
import { getDb } from '../database/schema';

export function registerCustomerHandlers() {
  const db = getDb();

  ipcMain.handle('customers:getAll', () => {
    return db.prepare('SELECT * FROM customers ORDER BY name').all();
  });

  ipcMain.handle('customers:getById', (_event, id: number) => {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (customer) {
      (customer as any).recent_sales = db.prepare(`
        SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10
      `).all(id);
    }
    return customer;
  });

  ipcMain.handle('customers:search', (_event, query: string) => {
    return db.prepare(`
      SELECT * FROM customers
      WHERE name LIKE ? OR phone LIKE ?
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`);
  });

  ipcMain.handle('customers:create', (_event, data: any) => {
    const result = db.prepare(`
      INSERT INTO customers (name, phone, email, address, credit_limit)
      VALUES (@name, @phone, @email, @address, @credit_limit)
    `).run(data);
    return { id: result.lastInsertRowid, ...data };
  });

  ipcMain.handle('customers:update', (_event, id: number, data: any) => {
    db.prepare(`
      UPDATE customers SET
        name = @name, phone = @phone, email = @email,
        address = @address, credit_limit = @credit_limit,
        updated_at = datetime('now'), synced = 0
      WHERE id = @id
    `).run({ ...data, id });
    return { id, ...data };
  });
}

export function registerEmployeeHandlers() {
  const db = getDb();

  ipcMain.handle('employees:getAll', () => {
    return db.prepare("SELECT id, name, role, phone, is_active, created_at FROM employees WHERE is_active = 1").all();
  });

  ipcMain.handle('employees:create', (_event, data: any) => {
    const result = db.prepare(`
      INSERT INTO employees (name, role, pin, phone) VALUES (@name, @role, @pin, @phone)
    `).run(data);
    return { id: result.lastInsertRowid, ...data };
  });

  ipcMain.handle('employees:update', (_event, id: number, data: any) => {
    db.prepare(`
      UPDATE employees SET name = @name, role = @role, phone = @phone,
        updated_at = datetime('now') WHERE id = @id
    `).run({ ...data, id });
    return { id, ...data };
  });

  ipcMain.handle('employees:delete', (_event, id: number) => {
    db.prepare("UPDATE employees SET is_active = 0 WHERE id = ?").run(id);
    return { success: true };
  });

  ipcMain.handle('employees:verifyPin', (_event, id: number, pin: string) => {
    const employee = db.prepare("SELECT * FROM employees WHERE id = ? AND pin = ? AND is_active = 1").get(id, pin);
    return { success: !!employee, employee: employee || null };
  });
}
