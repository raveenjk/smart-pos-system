import type { Product, Category, Customer, Employee, Sale, AppSettings } from '../types';

const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: 'Beverages', description: 'Soft drinks, juices, water' },
  { id: 2, name: 'Snacks & Biscuits', description: 'Chips, biscuits, crackers' },
  { id: 3, name: 'Groceries', description: 'Rice, dhal, sugar, spices' },
  { id: 4, name: 'Dairy & Bakery', description: 'Bread, milk, cheese, butter' },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Munchee Super Cream Cracker 490g',
    barcode: '4792022001010',
    category_id: 2,
    category_name: 'Snacks & Biscuits',
    price: 360,
    cost_price: 310,
    stock: 45,
    low_stock_alert: 10,
    unit: 'pcs',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Highland Fresh Milk 1L',
    barcode: '4792022001027',
    category_id: 4,
    category_name: 'Dairy & Bakery',
    price: 480,
    cost_price: 420,
    stock: 24,
    low_stock_alert: 5,
    unit: 'pcs',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Elephant House Cream Soda 400ml',
    barcode: '4792022001034',
    category_id: 1,
    category_name: 'Beverages',
    price: 150,
    cost_price: 120,
    stock: 60,
    low_stock_alert: 15,
    unit: 'pcs',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Araliya Keeri Samba Rice 5kg',
    barcode: '4792022001041',
    category_id: 3,
    category_name: 'Groceries',
    price: 1450,
    cost_price: 1320,
    stock: 18,
    low_stock_alert: 5,
    unit: 'pack',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Watawala Pure Ceylon Tea 400g',
    barcode: '4792022001058',
    category_id: 1,
    category_name: 'Beverages',
    price: 620,
    cost_price: 540,
    stock: 30,
    low_stock_alert: 8,
    unit: 'pcs',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    name: 'White Sugar 1kg',
    barcode: '4792022001065',
    category_id: 3,
    category_name: 'Groceries',
    price: 275,
    cost_price: 245,
    stock: 4,
    low_stock_alert: 10,
    unit: 'kg',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 1,
    name: 'Kasun Perera',
    phone: '0771234567',
    email: 'kasun@gmail.com',
    address: 'Kandy Road, Kiribathgoda',
    loyalty_points: 145,
    credit_limit: 10000,
    outstanding_credit: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Sanduni Jayasinghe',
    phone: '0719876543',
    email: 'sanduni@yahoo.com',
    address: 'Station Road, Kelaniya',
    loyalty_points: 80,
    credit_limit: 5000,
    outstanding_credit: 1200,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Admin', role: 'admin', phone: '0770000000', is_active: true },
  { id: 2, name: 'Saman (Cashier)', role: 'cashier', phone: '0761112233', is_active: true },
  { id: 3, name: 'Nalaka (Manager)', role: 'manager', phone: '0783334455', is_active: true },
];

function getStored<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(`pos_mock_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`pos_mock_${key}`, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

export function setupBrowserMockApi() {
  if (typeof window === 'undefined' || window.api) return;

  console.log('🌐 Browser environment detected: Initializing POS Mock API');

  let products = getStored<Product[]>('products', INITIAL_PRODUCTS);
  let categories = getStored<Category[]>('categories', INITIAL_CATEGORIES);
  let customers = getStored<Customer[]>('customers', INITIAL_CUSTOMERS);
  let employees = getStored<Employee[]>('employees', INITIAL_EMPLOYEES);
  let sales: any[] = getStored<any[]>('sales', []);
  let heldBills: any[] = getStored<any[]>('held_bills', []);

  let settings: AppSettings = getStored<AppSettings>('settings', {
    shop_name: 'Super City Mart (Demo)',
    shop_subtitle: 'Retail & Supermarket',
    shop_address: '124 Galle Road, Colombo 03',
    shop_phone: '+94 11 234 5678',
    shop_br_number: 'BR No: PV-12345',
    receipt_header: 'Welcome to our store! Happy to serve you.',
    currency: 'LKR',
    tax_rate: '0',
    receipt_footer: 'Thank you for shopping with us! Please come again.',
    low_stock_alert: '10',
    supabase_url: '',
    supabase_key: '',
    license_key: 'POS-LIFE-DEMO01-B60F0227',
    license_activated: 'true',
  });

  window.api = {
    // Products
    getProducts: async () => products.filter((p) => p.is_active),
    getProduct: async (id: number) => products.find((p) => p.id === id) as Product,
    createProduct: async (data: Partial<Product>) => {
      const newP: Product = {
        id: Date.now(),
        name: data.name || '',
        barcode: data.barcode || `${Date.now()}`.slice(-10),
        category_id: data.category_id || 1,
        category_name: categories.find((c) => c.id === data.category_id)?.name || 'General',
        price: data.price || 0,
        cost_price: data.cost_price || 0,
        stock: data.stock || 0,
        low_stock_alert: data.low_stock_alert || 10,
        unit: data.unit || 'pcs',
        description: data.description || '',
        image_url: data.image_url,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      products = [newP, ...products];
      setStored('products', products);
      return newP;
    },
    updateProduct: async (id: number, data: Partial<Product>) => {
      products = products.map((p) => (p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p));
      setStored('products', products);
      return products.find((p) => p.id === id) as Product;
    },
    deleteProduct: async (id: number) => {
      products = products.filter((p) => p.id !== id);
      setStored('products', products);
      return { success: true };
    },
    searchProducts: async (q: string) => {
      const lower = q.toLowerCase();
      return products.filter((p) => p.name.toLowerCase().includes(lower) || p.barcode?.includes(lower));
    },
    getProductByBarcode: async (barcode: string) => {
      return products.find((p) => p.barcode === barcode && p.is_active) || null;
    },
    getCategories: async () => categories,
    createCategory: async (data: Partial<Category>) => {
      const newC: Category = { id: Date.now(), name: data.name || '', description: data.description };
      categories = [...categories, newC];
      setStored('categories', categories);
      return newC;
    },
    getLowStockProducts: async () => products.filter((p) => p.stock <= p.low_stock_alert),

    // Sales
    createSale: async (data: any) => {
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
      const newSale = { id: Date.now(), invoice_number: invoiceNumber, ...data, created_at: new Date().toISOString() };
      sales = [newSale, ...sales];
      setStored('sales', sales);

      // Deduct stock in mock
      if (data.items) {
        data.items.forEach((item: any) => {
          const prod = products.find((p) => p.id === item.product_id);
          if (prod) prod.stock = Math.max(0, prod.stock - item.quantity);
        });
        setStored('products', products);
      }

      return { id: newSale.id, invoice_number: invoiceNumber };
    },
    getSales: async () => sales,
    getSaleById: async (id: number) => sales.find((s) => s.id === id),
    getdailySummary: async () => {
      const totalRev = sales.reduce((s, i) => s + (i.total || 0), 0) + 12840;
      return {
        total_transactions: sales.length + 8,
        total_revenue: totalRev,
        total_discounts: 450,
        avg_transaction: Math.round(totalRev / (sales.length + 8 || 1)),
      };
    },

    // Customers
    getCustomers: async () => customers,
    getCustomer: async (id: number) => customers.find((c) => c.id === id) as Customer,
    createCustomer: async (data: Partial<Customer>) => {
      const newC: Customer = {
        id: Date.now(),
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        loyalty_points: 0,
        credit_limit: data.credit_limit || 0,
        outstanding_credit: 0,
        created_at: new Date().toISOString(),
      };
      customers = [newC, ...customers];
      setStored('customers', customers);
      return newC;
    },
    updateCustomer: async (id: number, data: Partial<Customer>) => {
      customers = customers.map((c) => (c.id === id ? { ...c, ...data } : c));
      setStored('customers', customers);
      return customers.find((c) => c.id === id) as Customer;
    },
    searchCustomers: async (q: string) => {
      const lower = q.toLowerCase();
      return customers.filter((c) => c.name.toLowerCase().includes(lower) || c.phone?.includes(lower));
    },

    // Employees
    getEmployees: async () => employees,
    createEmployee: async (data: any) => {
      const newE: Employee = { id: Date.now(), name: data.name, role: data.role, phone: data.phone, is_active: true };
      employees = [...employees, newE];
      setStored('employees', employees);
      return newE;
    },
    updateEmployee: async (id: number, data: any) => {
      employees = employees.map((e) => (e.id === id ? { ...e, ...data } : e));
      setStored('employees', employees);
      return employees.find((e) => e.id === id) as Employee;
    },
    deleteEmployee: async (id: number) => {
      employees = employees.filter((e) => e.id !== id);
      setStored('employees', employees);
      return { success: true };
    },
    verifyEmployeePin: async (id: number, _pin: string) => {
      const emp = employees.find((e) => e.id === id);
      return { success: true, employee: emp || null };
    },

    // Reports
    getSalesReport: async () => [
      { date: '2026-09-17', transactions: 14, revenue: 18500 },
      { date: '2026-09-18', transactions: 19, revenue: 24200 },
      { date: '2026-09-19', transactions: 25, revenue: 32400 },
      { date: '2026-09-20', transactions: 22, revenue: 28900 },
      { date: '2026-09-21', transactions: 31, revenue: 41200 },
      { date: '2026-09-22', transactions: 28, revenue: 36700 },
    ],
    getTopProducts: async () => [
      { product_name: 'Munchee Super Cream Cracker', total_quantity: 42, total_revenue: 15120 },
      { product_name: 'Araliya Keeri Samba Rice 5kg', total_quantity: 9, total_revenue: 13050 },
      { product_name: 'Elephant House Cream Soda', total_quantity: 65, total_revenue: 9750 },
      { product_name: 'Highland Fresh Milk 1L', total_quantity: 18, total_revenue: 8640 },
    ],
    getProfitReport: async () => [
      { product_name: 'Munchee Super Cream Cracker', revenue: 15120, cost: 13020, profit: 2100 },
      { product_name: 'Araliya Keeri Samba Rice 5kg', revenue: 13050, cost: 11880, profit: 1170 },
      { product_name: 'Elephant House Cream Soda', revenue: 9750, cost: 7800, profit: 1950 },
    ],

    // Settings
    getSettings: async () => settings,
    updateSettings: async (data: Partial<AppSettings>) => {
      settings = { ...settings, ...data };
      setStored('settings', settings);
      return { success: true };
    },

    // Sync
    getSyncStatus: async () => ({ pending_sync: 0 }),
    forcSync: async () => ({ success: true }),
    onSyncStatusChange: () => {},

    // Printer
    printReceipt: async () => {
      window.print();
      return { success: true };
    },
    savePDF: async () => ({ success: false, error: 'PDF save available in Desktop App' }),
    getPrinters: async () => [{ name: 'Default Thermal Printer' }],

    // Barcode
    generateBarcode: async (_text: string) => ({ success: false }),
    generateUniqueBarcode: async () => `${Date.now()}`.slice(-10),

    // Hold Bills
    holdSave: async (data: any) => {
      const newHeld = { id: Date.now(), cart_data: JSON.stringify(data.cart), customer_data: JSON.stringify(data.customer), label: data.label, created_at: new Date().toISOString() };
      heldBills = [newHeld, ...heldBills];
      setStored('held_bills', heldBills);
      return { id: newHeld.id };
    },
    holdGetAll: async () => heldBills,
    holdRecall: async (id: number) => {
      const b = heldBills.find((h) => h.id === id);
      if (!b) return null;
      return { cart: JSON.parse(b.cart_data), customer: b.customer_data ? JSON.parse(b.customer_data) : null, label: b.label };
    },
    holdDelete: async (id: number) => {
      heldBills = heldBills.filter((h) => h.id !== id);
      setStored('held_bills', heldBills);
      return { success: true };
    },

    // License
    getLicenseStatus: async () => ({
      isActivated: true,
      machineId: 'DEMO-BROWSER-PREVIEW',
      licenseKey: 'POS-LIFE-DEMO01-B60F0227',
      tier: 'LIFETIME (Browser Preview)',
    }),
    getMachineId: async () => 'DEMO-BROWSER-PREVIEW',
    activateLicense: async () => ({ success: true, message: 'Browser demo preview active!' }),
  };
}
