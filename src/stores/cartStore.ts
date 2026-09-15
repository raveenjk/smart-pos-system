import { create } from 'zustand';
import type { CartItem, Customer, Product } from '../types';

interface CartStore {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  taxRate: number;
  paymentMethod: 'cash' | 'card' | 'qr';
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemDiscount: (productId: number, discount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  setTaxRate: (rate: number) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'qr') => void;
  clearCart: () => void;
  subtotal: () => number;
  taxAmount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  taxRate: 0,
  paymentMethod: 'cash',

  addItem: (product: Product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product_id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === product.id
              ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unit_price * (1 - i.discount / 100) }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            product_id: product.id,
            product_name: product.name,
            unit_price: product.price,
            quantity: 1,
            discount: 0,
            total: product.price,
            unit: product.unit,
          },
        ],
      };
    });
  },

  removeItem: (productId: number) => {
    set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) }));
  },

  updateQuantity: (productId: number, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity, total: quantity * i.unit_price * (1 - i.discount / 100) }
          : i
      ),
    }));
  },

  updateItemDiscount: (productId: number, discount: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === productId
          ? { ...i, discount, total: i.quantity * i.unit_price * (1 - discount / 100) }
          : i
      ),
    }));
  },

  setCustomer: (customer) => set({ customer }),
  setDiscount: (discount) => set({ discount }),
  setTaxRate: (taxRate) => set({ taxRate }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  clearCart: () => set({ items: [], customer: null, discount: 0, paymentMethod: 'cash' }),

  subtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.total, 0);
  },

  taxAmount: () => {
    const { taxRate } = get();
    return get().subtotal() * (taxRate / 100);
  },

  total: () => {
    const { discount } = get();
    return get().subtotal() + get().taxAmount() - discount;
  },
}));
