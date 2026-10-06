import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, X, Plus, Minus, Trash2, CreditCard, Banknote,
  QrCode, User, PauseCircle, PlayCircle, Grid3X3, Lock
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import type { Product, Customer, Category } from '../types';
import PaymentModal from '../components/pos/PaymentModal';
import HoldBillsPanel from '../components/pos/HoldBillsPanel';
import ManagerApprovalModal from '../components/shared/ManagerApprovalModal';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const { can, clearOverrides } = useAuthStore();
  const [showDiscountApproval, setShowDiscountApproval] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Barcode buffer for USB scanner (types fast)
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Direct quantity input tracking: maps product_id -> typed string
  const [editingQty, setEditingQty] = useState<Record<number, string>>({});
  // Ref map for cart item quantity inputs
  const qtyInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  // Trigger to auto-focus and select quantity for recently scanned/added item
  const [focusTrigger, setFocusTrigger] = useState<{ id: number; timestamp: number } | null>(null);

  const focusItemQty = useCallback((productId: number) => {
    setFocusTrigger({ id: productId, timestamp: Date.now() });
  }, []);

  const {
    items, customer, discount, paymentMethod,
    addItem, removeItem, updateQuantity,
    setCustomer, setDiscount, setPaymentMethod,
    clearCart, subtotal, taxAmount, total,
  } = useCartStore();

  const formatLKR = (v: number) => `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

  // Load products & categories
  useEffect(() => {
    if (!window.api) return;
    Promise.all([window.api.getProducts(), window.api.getCategories()]).then(([prods, cats]) => {
      setProducts(prods || []);
      setCategories(cats || []);
      setFilteredProducts((prods || []).slice(0, 60));
    });
  }, []);

  // Filter by category + search
  useEffect(() => {
    let result = products;
    if (selectedCategory !== null) {
      result = result.filter((p) => p.category_id === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q));
    }
    setFilteredProducts(result.slice(0, 60));
  }, [searchQuery, selectedCategory, products]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length >= 2) {
      window.api.searchCustomers(customerSearch).then(setCustomerResults);
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  // Auto-focus and select quantity input when an item is scanned or added
  useEffect(() => {
    if (!focusTrigger) return;
    const timer = setTimeout(() => {
      const input = qtyInputRefs.current[focusTrigger.id];
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        input.focus();
        input.select();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [focusTrigger, items]);

  // Global barcode scanner listener (keyboard wedge / USB scanner sends keystrokes fast)
  useEffect(() => {
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture when search not focused
      if (document.activeElement === searchRef.current) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      // If rapid scanner keystrokes are coming into an already-focused qty input, prevent them from corrupting the qty
      const isQtyInput = (document.activeElement as HTMLElement)?.hasAttribute('data-qty-input');
      if (isQtyInput && timeDiff < 45 && e.key.length === 1) {
        e.preventDefault();
      }

      if (e.key === 'Enter') {
        const barcode = barcodeBuffer.current.trim();
        if (barcode.length >= 3) {
          e.preventDefault();
          // Clean up any stray scanner characters in active qty input
          const activeProductId = (document.activeElement as HTMLElement)?.getAttribute('data-product-id');
          if (activeProductId) {
            const pid = Number(activeProductId);
            setEditingQty((prev) => {
              const next = { ...prev };
              delete next[pid];
              return next;
            });
          }

          window.api.getProductByBarcode(barcode).then((product) => {
            if (product) {
              addItem(product);
              focusItemQty(product.id);
            }
          });
        }
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addItem, focusItemQty]);

  // Hold bill
  const handleHoldBill = useCallback(async () => {
    if (items.length === 0) return;
    const label = `Table ${Math.floor(Math.random() * 99) + 1}`;
    await window.api.holdSave({ label, cart: items, customer });
    clearCart();
  }, [items, customer, clearCart]);

  // Recall held bill
  const handleRecall = useCallback(async (id: number) => {
    const bill = await window.api.holdRecall(id);
    if (bill) {
      clearCart();
      bill.cart.forEach((item: any) => {
        const mockProduct = { id: item.product_id, name: item.product_name, price: item.unit_price, unit: item.unit, stock: 99, low_stock_alert: 0, cost_price: 0, is_active: true, created_at: '', updated_at: '' } as Product;
        addItem(mockProduct);
      });
      if (bill.customer) setCustomer(bill.customer);
      await window.api.holdDelete(id);
      setShowHold(false);
    }
  }, [clearCart, addItem, setCustomer]);

  return (
    <div className="flex h-full">
      {/* LEFT: Products Panel */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Search */}
        <div className="p-3 bg-white border-b flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search product or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 px-3 py-2 bg-white border-b overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Grid3X3 size={12} className="inline mr-1" />All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredProducts.map((product) => {
              const cartItem = items.find((i) => i.product_id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => {
                    addItem(product);
                    focusItemQty(product.id);
                  }}
                  disabled={product.stock <= 0}
                  className={`relative bg-white rounded-xl p-3 text-left shadow-sm border-2 transition-all hover:border-blue-400 hover:shadow-md active:scale-95 ${
                    product.stock <= 0 ? 'opacity-40 cursor-not-allowed border-transparent' : cartItem ? 'border-blue-200' : 'border-transparent'
                  }`}
                >
                  {cartItem && (
                    <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none shadow-sm">
                      {cartItem.quantity}
                    </span>
                  )}
                  <div className="w-full h-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center mb-2 text-xl">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : '📦'}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">{formatLKR(product.price)}</p>
                  <p className={`text-xs mt-0.5 ${product.stock <= product.low_stock_alert ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {product.stock} {product.unit}
                  </p>
                </button>
              );
            })}

          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart Panel */}
      <div className="w-80 xl:w-96 bg-white border-l flex flex-col shadow-lg">
        {/* Customer Search */}
        <div className="p-3 border-b relative">
          {customer ? (
            <div className="flex items-center justify-between bg-blue-50 p-2.5 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-800">{customer.name}</p>
                  <p className="text-xs text-blue-500">⭐ {customer.loyalty_points} pts</p>
                </div>
              </div>
              <button onClick={() => setCustomer(null)} className="text-blue-300 hover:text-blue-600">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Customer (optional)..."
                value={customerSearch}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-xl z-20 mt-1 overflow-hidden">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => { setCustomer(c); setCustomerSearch(''); }}
                      className="w-full px-3 py-2.5 text-left text-xs hover:bg-blue-50 flex items-center gap-2"
                    >
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{c.name}</p>
                        <p className="text-gray-400">{c.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-300 select-none">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Click a product or scan barcode</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {items.map((item, index) => {
                const isSelected = focusTrigger?.id === item.product_id;
                return (
                  <div
                    key={item.product_id}
                    className={`rounded-xl p-2.5 border transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-300/60 shadow-sm'
                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <span className="text-xs text-gray-400 font-mono mt-0.5 shrink-0">{index + 1}.</span>
                        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{item.product_name}</p>
                      </div>
                      <button onClick={() => removeItem(item.product_id)} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors shrink-0"
                        >
                          <Minus size={10} />
                        </button>
                        {/* Direct editable quantity: auto-selects on click/focus so typing any digit instantly replaces current value */}
                        <input
                          ref={(el) => { qtyInputRefs.current[item.product_id] = el; }}
                          data-qty-input="true"
                          data-product-id={item.product_id}
                          type="number"
                          min={1}
                          value={editingQty[item.product_id] !== undefined ? editingQty[item.product_id] : item.quantity}
                          onFocus={(e) => {
                            e.target.select();
                            setFocusTrigger({ id: item.product_id, timestamp: Date.now() });
                          }}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingQty((prev) => ({ ...prev, [item.product_id]: val }));
                            const parsed = parseInt(val, 10);
                            if (!isNaN(parsed) && parsed > 0) {
                              updateQuantity(item.product_id, parsed);
                            }
                          }}
                          onBlur={() => {
                            const raw = editingQty[item.product_id];
                            if (raw !== undefined) {
                              const parsed = parseInt(raw, 10);
                              if (isNaN(parsed) || parsed <= 0) {
                                updateQuantity(item.product_id, 1);
                              }
                              setEditingQty((prev) => {
                                const next = { ...prev };
                                delete next[item.product_id];
                                return next;
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className={`w-11 text-center font-bold text-sm rounded-lg py-0.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${
                            isSelected
                              ? 'bg-white border-2 border-blue-500 shadow-sm ring-1 ring-blue-400'
                              : 'bg-white border border-gray-300 hover:border-blue-400 focus:border-blue-500'
                          }`}
                          title="Click to type quantity"
                        />
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-green-100 hover:text-green-600 flex items-center justify-center transition-colors shrink-0"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800">{formatLKR(item.total)}</p>
                        <p className="text-xs text-gray-400">{formatLKR(item.unit_price)} × {item.quantity}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="border-t p-3 space-y-3">
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Items ({items.reduce((s, i) => s + i.quantity, 0)})</span>
              <span>{formatLKR(subtotal())}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                Discount (LKR)
                {!can('apply_custom_discount') && (
                  <span className="text-amber-500" title="Manager approval required">
                    <Lock size={12} />
                  </span>
                )}
              </span>
              {can('apply_custom_discount') ? (
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-20 text-right border rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                  min={0}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDiscountApproval(true)}
                  className="px-2 py-0.5 border border-dashed border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Lock size={11} />
                  {discount > 0 ? `LKR ${discount}` : 'Authorize'}
                </button>
              )}
            </div>
            {taxAmount() > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax</span>
                <span>{formatLKR(taxAmount())}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t-2 border-dashed">
              <span>Total</span>
              <span className="text-blue-600">{formatLKR(total())}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { method: 'cash' as const, icon: Banknote, label: 'Cash' },
              { method: 'card' as const, icon: CreditCard, label: 'Card' },
              { method: 'qr' as const, icon: QrCode, label: 'QR' },
            ]).map(({ method, icon: Icon, label }) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all ${
                  paymentMethod === method
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={15} className="mb-0.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={clearCart}
              disabled={items.length === 0}
              className="py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleHoldBill}
              disabled={items.length === 0}
              className="py-2 rounded-xl border border-orange-200 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-30 flex items-center justify-center gap-1 transition-colors"
            >
              <PauseCircle size={13} /> Hold
            </button>
            <button
              onClick={() => setShowHold(true)}
              className="py-2 rounded-xl border border-green-200 text-xs font-medium text-green-600 hover:bg-green-50 flex items-center justify-center gap-1 transition-colors"
            >
              <PlayCircle size={13} /> Recall
            </button>
          </div>

          <button
            onClick={() => setShowPayment(true)}
            disabled={items.length === 0}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-blue-200"
          >
            💳 Charge {items.length > 0 ? formatLKR(total()) : ''}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={total()}
          paymentMethod={paymentMethod}
          cartItems={items}
          customer={customer}
          discount={discount}
          subtotal={subtotal()}
          tax={taxAmount()}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setShowPayment(false); clearCart(); clearOverrides(); }}
        />
      )}

      {/* Hold Bills Panel */}
      {showHold && (
        <HoldBillsPanel
          onClose={() => setShowHold(false)}
          onRecall={handleRecall}
        />
      )}

      {/* Discount Manager Approval Modal */}
      <ManagerApprovalModal
        isOpen={showDiscountApproval}
        permission="apply_custom_discount"
        actionTitle="Custom Discount"
        onClose={() => setShowDiscountApproval(false)}
        onApproved={() => setShowDiscountApproval(false)}
      />
    </div>
  );
}
