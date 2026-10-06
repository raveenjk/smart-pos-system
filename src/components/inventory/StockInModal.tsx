import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Calendar, DollarSign, Tag, Check, Sparkles, Building2, AlertCircle } from 'lucide-react';
import type { Product } from '../../types';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
  onStockReceived: () => void;
}

export default function StockInModal({
  isOpen,
  onClose,
  products,
  selectedProduct,
  onStockReceived,
}: StockInModalProps) {
  const [productId, setProductId] = useState<number>(selectedProduct?.id || products[0]?.id || 0);
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState<number | string>(10);
  const [costPrice, setCostPrice] = useState<number | string>(0);
  const [sellingPrice, setSellingPrice] = useState<number | string>(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierNote, setSupplierNote] = useState('');
  const [updateMasterPrice, setUpdateMasterPrice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const activeProduct = products.find((p) => p.id === productId) || selectedProduct || products[0];

  // Auto-generate batch code and sync prices when product changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    const prod = selectedProduct || products.find((p) => p.id === productId) || products[0];
    if (prod) {
      setProductId(prod.id);
      setCostPrice(prod.cost_price || 0);
      setSellingPrice(prod.price || 0);
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    setBatchNumber(`B${today}-${rand}`);
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setQuantity(10);
    setExpiryDate('');
    setSupplierNote('');
  }, [isOpen, selectedProduct]);

  // Sync prices when user picks a different product in the dropdown
  const handleProductChange = (id: number) => {
    setProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setCostPrice(prod.cost_price || 0);
      setSellingPrice(prod.price || 0);
    }
  };

  // Preset date helpers (+1M, +3M, +6M, +1Y)
  const addMonthsToExpiry = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setExpiryDate(d.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) {
      alert('Please select a product');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid received quantity greater than 0');
      return;
    }

    setLoading(true);
    try {
      const res = await window.api.receiveStockBatch({
        product_id: activeProduct.id,
        batch_number: batchNumber.trim(),
        quantity: qty,
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        expiry_date: expiryDate.trim() || undefined,
        received_date: receivedDate.trim() || undefined,
        supplier_note: supplierNote.trim() || undefined,
        update_master_price: updateMasterPrice,
      });

      if (res.success) {
        onStockReceived();
        onClose();
      } else {
        alert(res.error || 'Failed to receive stock');
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving batch');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredProducts = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.barcode?.includes(search)
      )
    : products;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <PackagePlus size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Receive Stock / New Batch</h2>
              <p className="text-xs text-gray-500">Record new deliveries, batch numbers & expiry dates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* 1. Product Selection */}
          <div>
            <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
              Select Product *
            </label>
            {selectedProduct ? (
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{selectedProduct.name}</p>
                  <p className="text-gray-400 font-mono text-[11px]">{selectedProduct.barcode || 'No barcode'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-gray-500 block">Current Stock</span>
                  <span className="text-sm font-black text-emerald-600">
                    {selectedProduct.stock} {selectedProduct.unit}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full mb-1.5 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stock} in stock)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Batch Number & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Batch / Lot Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. B202610-01"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 font-mono font-semibold text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <Tag size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Received Quantity (+ {activeProduct?.unit || 'pcs'}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 24"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 font-bold text-emerald-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* 3. Expiry Date & Presets */}
          <div className="bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-600" /> Expiry Date (කල් ඉකුත්වන දිනය)
              </label>
              {expiryDate && (
                <button
                  type="button"
                  onClick={() => setExpiryDate('')}
                  className="text-[10px] text-amber-700 hover:text-amber-900 underline cursor-pointer"
                >
                  Clear Expiry
                </button>
              )}
            </div>

            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full border border-amber-200 rounded-xl px-3 py-2 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {/* Quick helper buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-amber-700 font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() => addMonthsToExpiry(1)}
                className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-[10px] transition-colors cursor-pointer"
              >
                +1 Mo
              </button>
              <button
                type="button"
                onClick={() => addMonthsToExpiry(3)}
                className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-[10px] transition-colors cursor-pointer"
              >
                +3 Mos
              </button>
              <button
                type="button"
                onClick={() => addMonthsToExpiry(6)}
                className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-[10px] transition-colors cursor-pointer"
              >
                +6 Mos
              </button>
              <button
                type="button"
                onClick={() => addMonthsToExpiry(12)}
                className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-[10px] transition-colors cursor-pointer"
              >
                +1 Year
              </button>
            </div>
          </div>

          {/* 4. Cost Price & Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Cost / Buy Price (LKR)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={costPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <DollarSign size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Selling Price (LKR)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={sellingPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-black text-blue-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <DollarSign size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* 5. Update Master Product Price Toggle */}
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={updateMasterPrice}
              onChange={(e) => setUpdateMasterPrice(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-400 cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-gray-700">
              Update Master Product prices to this batch (New Shelf Selling Price)
            </span>
          </label>

          {/* 6. Received Date & Supplier / Invoice Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Received Date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="font-bold text-gray-600 block mb-1.5 uppercase tracking-wider text-[11px]">
                Supplier / Invoice Ref
              </label>
              <input
                type="text"
                value={supplierNote}
                onChange={(e) => setSupplierNote(e.target.value)}
                placeholder="e.g. Inv #8402 / Distributor"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Summary Banner */}
          {Number(quantity) > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900">
              <div>
                <p className="font-bold text-xs">
                  Stock Addition: +{quantity} {activeProduct?.unit || 'pcs'}
                </p>
                <p className="text-[11px] text-emerald-700">
                  New Total Stock: {(activeProduct?.stock || 0) + Number(quantity)} {activeProduct?.unit || 'pcs'}
                </p>
              </div>
              {Number(costPrice) > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-emerald-600 uppercase font-semibold">Total Inward Cost</span>
                  <p className="font-black text-xs">LKR {(Number(quantity) * Number(costPrice)).toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-3 border-t flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl font-semibold text-gray-600 text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PackagePlus size={16} />
              {loading ? 'Receiving...' : 'Confirm Stock In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
