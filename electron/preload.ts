import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Products
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  getProduct: (id: number) => ipcRenderer.invoke('products:getById', id),
  createProduct: (data: unknown) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id: number, data: unknown) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id: number) => ipcRenderer.invoke('products:delete', id),
  searchProducts: (query: string) => ipcRenderer.invoke('products:search', query),
  getProductByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
  getCategories: () => ipcRenderer.invoke('products:getCategories'),
  createCategory: (data: unknown) => ipcRenderer.invoke('products:createCategory', data),
  deleteCategory: (id: number) => ipcRenderer.invoke('products:deleteCategory', id),
  getLowStockProducts: () => ipcRenderer.invoke('products:getLowStock'),

  // Sales
  createSale: (data: unknown) => ipcRenderer.invoke('sales:create', data),
  getSales: (filters: unknown) => ipcRenderer.invoke('sales:getAll', filters),
  getSaleById: (id: number) => ipcRenderer.invoke('sales:getById', id),
  getdailySummary: (date: string) => ipcRenderer.invoke('sales:dailySummary', date),

  // Customers
  getCustomers: () => ipcRenderer.invoke('customers:getAll'),
  getCustomer: (id: number) => ipcRenderer.invoke('customers:getById', id),
  createCustomer: (data: unknown) => ipcRenderer.invoke('customers:create', data),
  updateCustomer: (id: number, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
  searchCustomers: (query: string) => ipcRenderer.invoke('customers:search', query),

  // Employees
  getEmployees: () => ipcRenderer.invoke('employees:getAll'),
  createEmployee: (data: unknown) => ipcRenderer.invoke('employees:create', data),
  updateEmployee: (id: number, data: unknown) => ipcRenderer.invoke('employees:update', id, data),
  deleteEmployee: (id: number) => ipcRenderer.invoke('employees:delete', id),
  verifyEmployeePin: (id: number, pin: string) => ipcRenderer.invoke('employees:verifyPin', id, pin),

  // Reports
  getSalesReport: (filters: unknown) => ipcRenderer.invoke('reports:sales', filters),
  getTopProducts: (filters: unknown) => ipcRenderer.invoke('reports:topProducts', filters),
  getProfitReport: (filters: unknown) => ipcRenderer.invoke('reports:profit', filters),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: unknown) => ipcRenderer.invoke('settings:update', data),

  // Sync
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  forcSync: () => ipcRenderer.invoke('sync:force'),
  onSyncStatusChange: (callback: (status: string) => void) => {
    ipcRenderer.on('sync:statusUpdate', (_event, status) => callback(status));
  },

  // Printer
  printReceipt: (data: unknown) => ipcRenderer.invoke('printer:printReceipt', data),
  savePDF: (data: unknown) => ipcRenderer.invoke('printer:savePDF', data),
  getPrinters: () => ipcRenderer.invoke('printer:getList'),

  // Barcode
  generateBarcode: (text: string, format?: string) => ipcRenderer.invoke('barcode:generate', text, format),
  generateUniqueBarcode: () => ipcRenderer.invoke('barcode:generateUnique'),

  // Hold bills
  holdSave: (data: unknown) => ipcRenderer.invoke('hold:save', data),
  holdGetAll: () => ipcRenderer.invoke('hold:getAll'),
  holdRecall: (id: number) => ipcRenderer.invoke('hold:recall', id),
  holdDelete: (id: number) => ipcRenderer.invoke('hold:delete', id),

  // License
  getLicenseStatus: () => ipcRenderer.invoke('license:getStatus'),
  getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
  activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),

  // System & Maintenance
  getMaintenanceStatus: () => ipcRenderer.invoke('system:getMaintenanceStatus'),
  openDeveloperPortal: () => ipcRenderer.invoke('system:openDeveloperPortal'),
  onMaintenanceUpdate: (callback: (status: { active: boolean; message: string }) => void) => {
    ipcRenderer.on('system:maintenanceUpdate', (_event, status) => callback(status));
  },
});
