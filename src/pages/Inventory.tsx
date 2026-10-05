import { useEffect, useState } from 'react';
import {
  Plus, Search, Edit2, Trash2, AlertTriangle, Barcode, X, RefreshCw, Lock, Tags,
  PackagePlus, Layers, Calendar, Clock, CheckCircle
} from 'lucide-react';
import type { Product, Category } from '../types';
import { useAuthStore } from '../stores/authStore';
import CategoryModal from '../components/inventory/CategoryModal';
import BarcodeModal from '../components/inventory/BarcodeModal';
import StockInModal from '../components/inventory/StockInModal';
import BatchHistoryModal from '../components/inventory/BatchHistoryModal';

export default function Inventory() {
  const { can } = useAuthStore();
  const canViewCost = can('view_cost_price');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'low_stock' | 'expiring_soon' | 'expired'>('all');
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [batchHistoryProduct, setBatchHistoryProduct] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', barcode: '', category_id: 1, price: 0,
    cost_price: 0, stock: 0, low_stock_alert: 10, unit: 'pcs', description: '',
  });

  const load = async () => {
    if (!window.api) return;
    const [prods, cats] = await Promise.all([window.api.getProducts(), window.api.getCategories()]);
    setProducts(prods || []);
    setCategories(cats || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    const matchCat = selectedCategory === null || p.category_id === selectedCategory;

    let matchFilter = true;
    if (filterMode === 'low_stock') {
      matchFilter = p.stock <= p.low_stock_alert;
    } else if (filterMode === 'expiring_soon') {
      matchFilter =
        p.days_until_expiry !== null &&
        p.days_until_expiry !== undefined &&
        p.days_until_expiry >= 0 &&
        p.days_until_expiry <= 30;
    } else if (filterMode === 'expired') {
      matchFilter =
        p.days_until_expiry !== null &&
        p.days_until_expiry !== undefined &&
        p.days_until_expiry < 0;
    }

    return matchSearch && matchCat && matchFilter;
  });

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Product name is required'); return; }
    if (editing) {
      await window.api.updateProduct(editing.id, form as any);
    } else {
      await window.api.createProduct(form as any);
    }
    closeForm();
    load();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', barcode: '', category_id: 1, price: 0, cost_price: 0, stock: 0, low_stock_alert: 10, unit: 'pcs', description: '' });
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, barcode: p.barcode || '', category_id: p.category_id || 1,
      price: p.price, cost_price: p.cost_price, stock: p.stock,
      low_stock_alert: p.low_stock_alert, unit: p.unit, description: p.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this product?')) { await window.api.deleteProduct(id); load(); }
  };

  const generateBarcode = async () => {
    const code = await window.api.generateUniqueBarcode();
    setForm((f) => ({ ...f, barcode: code }));
  };

  const showBarcode = (product: Product) => {
    setSelectedBarcodeProduct(product);
  };

  const profitMargin = (p: Product) => {
    if (!p.cost_price || p.cost_price === 0) return null;
    return (((p.price - p.cost_price) / p.price) * 100).toFixed(0);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          <p className="text-sm text-gray-400">{products.length} products</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setStockInProduct(null);
              setShowStockInModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-emerald-200 cursor-pointer"
          >
            <PackagePlus size={16} /> Receive Stock
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <Tags size={16} /> Categories
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 cursor-pointer"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={selectedCategory ?? ''}
          onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-600"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Stats & Quick Filter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {[
          { id: 'all', label: 'All Products', count: products.length, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100', activeRing: 'ring-2 ring-blue-600' },
          { id: 'low_stock', label: 'Low Stock', count: products.filter((p) => p.stock <= p.low_stock_alert).length, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100', activeRing: 'ring-2 ring-orange-600' },
          { id: 'expiring_soon', label: 'Expiring Soon (30d)', count: products.filter((p) => p.days_until_expiry !== null && p.days_until_expiry !== undefined && p.days_until_expiry >= 0 && p.days_until_expiry <= 30).length, color: 'bg-amber-50 text-amber-800 hover:bg-amber-100', activeRing: 'ring-2 ring-amber-600' },
          { id: 'expired', label: 'Expired Stock', count: products.filter((p) => p.days_until_expiry !== null && p.days_until_expiry !== undefined && p.days_until_expiry < 0).length, color: 'bg-red-50 text-red-700 hover:bg-red-100', activeRing: 'ring-2 ring-red-600' },
          { id: 'categories', label: 'Categories', count: categories.length, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100', activeRing: '' },
        ].map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (s.id === 'categories') {
                setShowCategoryModal(true);
              } else {
                setFilterMode((curr) => (curr === s.id ? 'all' : (s.id as any)));
              }
            }}
            className={`${s.color} ${(s.id as string) !== 'categories' && filterMode === s.id ? s.activeRing : ''} rounded-xl px-4 py-2.5 text-center transition-all cursor-pointer text-left shadow-2xs`}
          >
            <p className="text-xl font-black">{s.count}</p>
            <p className="text-xs font-semibold opacity-80">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                {['Name', 'Barcode', 'Category', 'Price', 'Cost / Margin', 'Stock / Batches', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400 truncate max-w-32">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.barcode || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{p.category_name || 'General'}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-600">LKR {p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {canViewCost ? (
                      <>
                        <p className="text-gray-500 text-xs">LKR {p.cost_price.toFixed(2)}</p>
                        {profitMargin(p) !== null && (
                          <span className="text-xs font-semibold text-green-600">{profitMargin(p)}% margin</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs italic flex items-center gap-1">
                        <Lock size={11} className="text-gray-400" /> Protected
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className={`flex items-center gap-1 font-semibold text-sm ${p.stock === 0 ? 'text-red-600' : p.stock <= p.low_stock_alert ? 'text-orange-500' : 'text-green-600'}`}>
                        {p.stock <= p.low_stock_alert && <AlertTriangle size={12} />}
                        {p.stock} <span className="text-xs font-normal text-gray-400">{p.unit}</span>
                      </div>

                      {/* Batches indicator & Earliest Expiry Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.active_batch_count !== undefined && p.active_batch_count > 0 && (
                          <button
                            type="button"
                            onClick={() => setBatchHistoryProduct(p)}
                            title="Click to inspect all active batches"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <Layers size={10} /> {p.active_batch_count} {p.active_batch_count === 1 ? 'Batch' : 'Batches'}
                          </button>
                        )}

                        {p.earliest_expiry && p.days_until_expiry !== null && p.days_until_expiry !== undefined && (
                          p.days_until_expiry < 0 ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-red-700 bg-red-100 animate-pulse" title={`Expired on ${p.earliest_expiry}`}>
                              <AlertTriangle size={10} /> Expired ({p.earliest_expiry})
                            </span>
                          ) : p.days_until_expiry <= 30 ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-amber-800 bg-amber-100" title={`Expires on ${p.earliest_expiry}`}>
                              <Clock size={10} /> Exp: {p.days_until_expiry}d ({p.earliest_expiry})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-emerald-800 bg-emerald-50" title={`Expires on ${p.earliest_expiry}`}>
                              <Calendar size={10} /> {p.earliest_expiry}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setStockInProduct(p);
                          setShowStockInModal(true);
                        }}
                        title="Receive Stock / Add Batch (+ GRN)"
                        className="text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer p-1.5 hover:bg-emerald-50 rounded-lg"
                      >
                        <PackagePlus size={16} />
                      </button>
                      <button
                        onClick={() => setBatchHistoryProduct(p)}
                        title="View Batches & Expiry Dates"
                        className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg"
                      >
                        <Layers size={16} />
                      </button>
                      <button
                        onClick={() => showBarcode(p)}
                        title="Barcode & QR Tag Studio (Sticker / Clothing)"
                        className="text-gray-400 hover:text-purple-600 transition-colors cursor-pointer p-1.5 hover:bg-purple-50 rounded-lg"
                      >
                        <Barcode size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        title="Edit Product"
                        className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer p-1.5 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        title="Delete Product"
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-1.5 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <p className="text-5xl mb-3">📦</p>
              <p className="text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-[520px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg text-gray-800">{editing ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">PRODUCT NAME *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" placeholder="e.g. Coca Cola 500ml" />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">BARCODE</label>
                  <div className="flex gap-2">
                    <input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} className="flex-1 border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-mono" placeholder="Scan or enter barcode" />
                    <button onClick={generateBarcode} title="Generate barcode" className="px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                <div className={canViewCost ? "" : "col-span-2"}>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">SELLING PRICE (LKR) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" min={0} />
                </div>
                {canViewCost && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">COST PRICE (LKR)</label>
                    <input type="number" value={form.cost_price} onChange={(e) => setForm((f) => ({ ...f, cost_price: Number(e.target.value) }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" min={0} />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">STOCK QUANTITY</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" min={0} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">LOW STOCK ALERT</label>
                  <input type="number" value={form.low_stock_alert} onChange={(e) => setForm((f) => ({ ...f, low_stock_alert: Number(e.target.value) }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" min={0} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">UNIT</label>
                  <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400">
                    {['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen', 'pair'].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-500 block">CATEGORY</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={12} /> New
                    </button>
                  </div>
                  <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: Number(e.target.value) }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400">
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">DESCRIPTION (optional)</label>
                  <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" placeholder="Short description" />
                </div>
              </div>

              {/* Profit preview */}
              {form.price > 0 && form.cost_price > 0 && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl text-sm">
                  <span className="text-green-700 font-medium">
                    Profit: LKR {(form.price - form.cost_price).toFixed(2)} ({(((form.price - form.cost_price) / form.price) * 100).toFixed(1)}% margin)
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={closeForm} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200">
                {editing ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode & Clothing QR Price Tag Studio Modal */}
      {/* Stock In / Receive Batch Modal */}
      <StockInModal
        isOpen={showStockInModal}
        onClose={() => {
          setShowStockInModal(false);
          setStockInProduct(null);
        }}
        products={products}
        selectedProduct={stockInProduct}
        onStockReceived={load}
      />

      {/* Batch History Inspector Modal */}
      <BatchHistoryModal
        product={batchHistoryProduct}
        isOpen={Boolean(batchHistoryProduct)}
        onClose={() => setBatchHistoryProduct(null)}
        onOpenReceiveStock={(prod) => {
          setStockInProduct(prod);
          setShowStockInModal(true);
        }}
        onBatchAdjusted={load}
      />

      {/* Barcode & Clothing QR Price Tag Studio Modal */}
      <BarcodeModal
        product={selectedBarcodeProduct}
        isOpen={Boolean(selectedBarcodeProduct)}
        onClose={() => setSelectedBarcodeProduct(null)}
        onProductUpdated={load}
      />

      {/* Category Management Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryChanged={load}
      />
    </div>
  );
}
