// Global types for the POS system

export interface Product {
  id: number;
  name: string;
  barcode?: string;
  category_id?: number;
  category_name?: string;
  price: number;
  cost_price: number;
  stock: number;
  low_stock_alert: number;
  unit: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyalty_points: number;
  credit_limit: number;
  outstanding_credit: number;
  created_at: string;
}

export interface Employee {
  id: number;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
  phone?: string;
  is_active: boolean;
}

export interface CartItem {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  total: number;
  unit: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_id?: number;
  customer_name?: string;
  employee_id?: number;
  employee_name?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  change_amount: number;
  payment_method: 'cash' | 'card' | 'qr';
  status: 'completed' | 'voided' | 'held';
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface AppSettings {
  shop_name: string;
  shop_subtitle?: string;
  shop_logo?: string;
  shop_address: string;
  shop_phone: string;
  shop_br_number?: string;
  receipt_header?: string;
  currency: string;
  tax_rate: string;
  receipt_footer: string;
  auto_print_receipt?: string;
  silent_print?: string;
  low_stock_alert: string;
  supabase_url: string;
  supabase_key: string;
  license_key: string;
  license_activated: string;
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'error';

// Electron IPC API exposed via preload
declare global {
  interface Window {
    api: {
      // Products
      getProducts: () => Promise<Product[]>;
      getProduct: (id: number) => Promise<Product>;
      createProduct: (data: Partial<Product>) => Promise<Product>;
      updateProduct: (id: number, data: Partial<Product>) => Promise<Product>;
      deleteProduct: (id: number) => Promise<{ success: boolean }>;
      searchProducts: (query: string) => Promise<Product[]>;
      getProductByBarcode: (barcode: string) => Promise<Product | null>;
      getCategories: () => Promise<Category[]>;
      createCategory: (data: Partial<Category>) => Promise<Category>;
      getLowStockProducts: () => Promise<Product[]>;
      // Sales
      createSale: (data: any) => Promise<{ id: number; invoice_number: string }>;
      getSales: (filters?: any) => Promise<Sale[]>;
      getSaleById: (id: number) => Promise<Sale>;
      getdailySummary: (date: string) => Promise<any>;
      // Customers
      getCustomers: () => Promise<Customer[]>;
      getCustomer: (id: number) => Promise<Customer>;
      createCustomer: (data: Partial<Customer>) => Promise<Customer>;
      updateCustomer: (id: number, data: Partial<Customer>) => Promise<Customer>;
      searchCustomers: (query: string) => Promise<Customer[]>;
      // Employees
      getEmployees: () => Promise<Employee[]>;
      createEmployee: (data: any) => Promise<Employee>;
      updateEmployee: (id: number, data: any) => Promise<Employee>;
      deleteEmployee: (id: number) => Promise<{ success: boolean }>;
      verifyEmployeePin: (id: number, pin: string) => Promise<{ success: boolean; employee: Employee | null }>;
      // Reports
      getSalesReport: (filters?: any) => Promise<any[]>;
      getTopProducts: (filters?: any) => Promise<any[]>;
      getProfitReport: (filters?: any) => Promise<any[]>;
      // Settings
      getSettings: () => Promise<AppSettings>;
      updateSettings: (data: Partial<AppSettings>) => Promise<{ success: boolean }>;
      // Sync
      getSyncStatus: () => Promise<{ pending_sync: number }>;
      forcSync: () => Promise<{ success: boolean }>;
      onSyncStatusChange: (callback: (status: SyncStatus) => void) => void;
      // Printer
      printReceipt: (data: any) => Promise<{ success: boolean; error?: string }>;
      savePDF: (data: any) => Promise<{ success: boolean; data?: string; error?: string }>;
      getPrinters: () => Promise<any[]>;
      // Barcode
      generateBarcode: (text: string, format?: string) => Promise<{ success: boolean; data?: string }>;
      generateUniqueBarcode: () => Promise<string>;
      // Hold Bills
      holdSave: (data: any) => Promise<{ id: number | bigint }>;
      holdGetAll: () => Promise<any[]>;
      holdRecall: (id: number) => Promise<{ cart: any; customer: any; label: string } | null>;
      holdDelete: (id: number) => Promise<{ success: boolean }>;
      // License
      getLicenseStatus: () => Promise<{ isActivated: boolean; machineId: string; licenseKey: string; tier: string }>;
      getMachineId: () => Promise<string>;
      activateLicense: (key: string) => Promise<{ success: boolean; message: string }>;
    };
  }
}
