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
  earliest_expiry?: string | null;
  active_batch_count?: number;
  days_until_expiry?: number | null;
}

export interface ProductBatch {
  id: number;
  product_id: number;
  product_name?: string;
  product_barcode?: string;
  product_unit?: string;
  batch_number: string;
  quantity_received: number;
  quantity_remaining: number;
  cost_price: number;
  selling_price: number;
  expiry_date?: string | null;
  received_date: string;
  supplier_note?: string;
  is_active: boolean;
  days_left?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReceiveBatchPayload {
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
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  product_count?: number;
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

export type UserRole = 'admin' | 'manager' | 'cashier';

export type PermissionKey =
  | 'view_dashboard'
  | 'access_pos'
  | 'manage_inventory'
  | 'view_cost_price'
  | 'manage_customers'
  | 'manage_employees'
  | 'view_reports'
  | 'access_settings'
  | 'apply_custom_discount'
  | 'void_bills';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    'view_dashboard',
    'access_pos',
    'manage_inventory',
    'view_cost_price',
    'manage_customers',
    'manage_employees',
    'view_reports',
    'access_settings',
    'apply_custom_discount',
    'void_bills',
  ],
  manager: [
    'view_dashboard',
    'access_pos',
    'manage_inventory',
    'manage_customers',
    'view_reports',
    'apply_custom_discount',
    'void_bills',
  ],
  cashier: [
    'access_pos',
    'manage_customers',
  ],
};

export function checkPermission(role: UserRole | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export interface Employee {
  id: number;
  name: string;
  role: UserRole;
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
  receipt_branding_enabled?: string;
  receipt_branding_text?: string;
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
      createCategory: (data: Partial<Category>) => Promise<{ success: boolean; id?: number; name?: string; message?: string }>;
      deleteCategory: (id: number) => Promise<{ success: boolean; message?: string }>;
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
      // Stock Batches & Expiry (FIFO)
      receiveStockBatch: (data: ReceiveBatchPayload) => Promise<{ success: boolean; batch_id?: number; batch_number?: string; error?: string }>;
      getProductBatches: (productId: number) => Promise<ProductBatch[]>;
      getExpiringProducts: (days?: number) => Promise<ProductBatch[]>;
      adjustStockBatch: (data: { batch_id: number; new_quantity: number; reason: string; employee_id?: number }) => Promise<{ success: boolean; error?: string }>;
      // Hold Bills
      holdSave: (data: any) => Promise<{ id: number | bigint }>;
      holdGetAll: () => Promise<any[]>;
      holdRecall: (id: number) => Promise<{ cart: any; customer: any; label: string } | null>;
      holdDelete: (id: number) => Promise<{ success: boolean }>;
      // License & Trial
      getLicenseStatus: () => Promise<LicenseStatus>;
      getMachineId: () => Promise<string>;
      activateLicense: (key: string) => Promise<{ success: boolean; message: string; status?: LicenseStatus }>;
      startTrial: (days: number) => Promise<{ success: boolean; message: string; status?: LicenseStatus }>;
      extendTrial: (days: number) => Promise<{ success: boolean; message: string; status?: LicenseStatus }>;
      endTrial: () => Promise<{ success: boolean; message: string; status?: LicenseStatus }>;
      onLicenseUpdate: (callback: (status: LicenseStatus) => void) => void;
      // Maintenance & Developer Portal
      getMaintenanceStatus: () => Promise<{ active: boolean; message: string }>;
      openDeveloperPortal: () => Promise<{ success: boolean }>;
      onMaintenanceUpdate: (callback: (status: { active: boolean; message: string }) => void) => void;
    };
  }
}

export type LicenseStatusCode = 'ACTIVE' | 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'SETUP_REQUIRED' | 'TAMPERED';

export interface LicenseStatus {
  status: LicenseStatusCode;
  isActivated: boolean;
  isTrial: boolean;
  isExpired: boolean;
  tier: string;
  machineId: string;
  licenseKey: string;
  daysLeft: number;
  trialStart: string | null;
  trialEnd: string | null;
  whatsappNumber: string;
  hotline: string;
  message: string;
}
